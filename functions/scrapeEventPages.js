/**
 * Framework function: Scrape event pages and extract structured event data
 *
 * This function reads from an events collection, finds URLs that need scraping,
 * uses AI to extract structured event data from each page, and saves the results
 * back to the same documents.
 *
 * REQUIRED PARAMETERS:
 * @param {Object} params - Function parameters
 * @param {string} params.eventsCollection - Name of the events collection
 *
 * OPTIONAL PARAMETERS:
 * @param {number} [params.maxEvents] - Maximum number of events to scrape in this run (default: no limit)
 * @param {boolean} [params.forceRescrape=false] - Re-scrape events that were already scraped (default: false)
 * @param {Array<string>} [params.eventIds] - Only scrape specific event IDs (default: scrape all pending events)
 * @param {string} [params.aiProvider='openai'] - LLM provider: 'openai' or 'anthropic' (default: 'openai')
 * @param {string} [params.aiModel='gpt-4o-mini'] - LLM model to use (default: 'gpt-4o-mini')
 * @param {boolean} [params.useProxy=true] - Use ScrapingBee proxy (default: true)
 * @param {boolean} [params.premiumProxy=false] - Use premium proxy (default: false)
 * @param {boolean} [params.stealthProxy=false] - Use stealth proxy (default: false)
 * @param {number} [params.timeout=140000] - Request timeout in milliseconds (default: 140000)
 *
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Scraping results with statistics
 *
 * @example
 * // Scheduled execution (scrapes pending events)
 * await context.callFunction('scrapeEventPages', {
 *   eventsCollection: 'events'
 * });
 *
 * @example
 * // Force rescrape specific events
 * await context.callFunction('scrapeEventPages', {
 *   eventsCollection: 'events',
 *   eventIds: ['event1', 'event2'],
 *   forceRescrape: true
 * });
 *
 * Event document schema (before scraping):
 * {
 *   calendarId: string,
 *   calendarName: string,
 *   eventUrl: string,
 *   timezone: string (IANA timezone, e.g., 'America/Los_Angeles'),
 *   discoveredAt: Timestamp,
 *   status: 'pending',
 *   lastUpdated: Timestamp
 * }
 *
 * Event document schema (after scraping):
 * {
 *   ...previous fields,
 *   title: string,
 *   description: string,
 *   start: string (ISO8601 UTC),
 *   end: string (ISO8601 UTC),
 *   location: string,
 *   coordinates: { latitude: number, longitude: number } (optional, geocoded from location),
 *   geohash: string (optional, geohash of coordinates for efficient geospatial queries),
 *   imageUrl: string,
 *   scrapedAt: Timestamp,
 *   status: 'scraped',
 *   lastError: string (only if error occurred)
 * }
 */
module.exports = async function (params, context) {
  const {
    eventsCollection,
    maxEvents = null,
    forceRescrape = false,
    eventIds = null,
    aiProvider = "openai",
    aiModel = "gpt-4o-mini",
    useProxy = true,
    premiumProxy = false,
    stealthProxy = false,
    timeout = 140000,
  } = params;

  // Validate required parameters
  if (!eventsCollection) {
    throw new Error("eventsCollection parameter is required");
  }

  if (!context.firebase) {
    throw new Error(
      "Firebase is not available in context. Ensure appId is provided when creating context."
    );
  }

  context.log("Starting event page scraper", {
    eventsCollection,
    maxEvents,
    forceRescrape,
    specificEvents: eventIds ? eventIds.length : null,
    aiProvider,
    aiModel,
  });

  const startTime = Date.now();
  const results = {
    eventsProcessed: 0,
    eventsScraped: 0,
    eventsFailed: 0,
    errors: [],
  };

  try {
    // Query events collection
    let query = context.firebase.collection(eventsCollection);

    // Build query based on filters
    if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
      // If specific event IDs are provided, we'll filter in JavaScript after fetching
      // (can't use FieldPath.documentId() in this environment)
    } else if (!forceRescrape) {
      // Only get events that haven't been scraped yet
      query = query.where("status", "==", "pending");
    }

    // Limit results if maxEvents specified (apply a larger limit if filtering by IDs)
    if (maxEvents) {
      const limit =
        eventIds && eventIds.length > 0 ? maxEvents * 10 : maxEvents;
      query = query.limit(limit);
    }

    const eventsSnapshot = await query.get();

    // Filter by specific event IDs if provided (done in JavaScript)
    let filteredDocs = eventsSnapshot.docs;
    if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
      const eventIdsSet = new Set(eventIds);
      filteredDocs = eventsSnapshot.docs.filter((doc) =>
        eventIdsSet.has(doc.id)
      );

      // Apply maxEvents limit after filtering
      if (maxEvents && filteredDocs.length > maxEvents) {
        filteredDocs = filteredDocs.slice(0, maxEvents);
      }

      context.log(
        `Filtered to ${filteredDocs.length} event(s) matching provided IDs`
      );
    }

    if (filteredDocs.length === 0) {
      context.log("No events found to scrape");
      return {
        success: true,
        ...results,
        duration: Date.now() - startTime,
      };
    }

    context.log(`Found ${filteredDocs.length} event(s) to scrape`);

    // Define the AI schema for event extraction
    const aiSchema = {
      title: "The event title or name",
      description: "A description or summary of the event",
      start:
        "Event start date and time in ISO8601 UTC format (YYYY-MM-DDTHH:mm:ssZ)",
      end: "Event end date and time in ISO8601 UTC format (YYYY-MM-DDTHH:mm:ssZ)",
      location: "Physical address or unique place name where the event is held",
      imageUrl: "The canonical/main image URL for the event listing",
    };

    // Scrape each event
    for (const eventDoc of filteredDocs) {
      const eventId = eventDoc.id;
      const eventData = eventDoc.data();

      results.eventsProcessed++;

      try {
        // Validate event data
        if (!eventData.eventUrl) {
          context.log("Skipping event with missing URL", { eventId });
          continue;
        }

        // Get timezone from event data, default to America/Los_Angeles
        const eventTimezone = eventData.timezone || "America/Los_Angeles";

        // Create timezone-aware prompt
        const aiPrompt = `Extract event information from this webpage. When parsing dates and times, assume they are in the ${eventTimezone} timezone and convert them to ISO8601 UTC format.

Note: Image URLs appear in the text as [IMAGE: url]. Choose the most relevant image URL for the imageUrl field (typically the main event image or poster, not logos/icons).`;

        context.log("Scraping event page", {
          eventId,
          url: eventData.eventUrl,
          calendarName: eventData.calendarName,
          timezone: eventTimezone,
        });

        // Call fetchWebpage with AI analysis using context.callFunction
        const fetchResult = await context.callFunction("fetchWebpage", {
          url: eventData.eventUrl,
          useProxy: useProxy,
          premiumProxy: premiumProxy,
          stealthProxy: stealthProxy,
          timeout: timeout,
          wait: 3000, // Wait 3 seconds for JavaScript to load dynamic content
          aiPrompt: aiPrompt,
          aiSchema: aiSchema,
          aiProvider: aiProvider,
          aiModel: aiModel,
        });

        if (!fetchResult.success) {
          throw new Error("Fetch failed without success flag");
        }

        const analyzedData = fetchResult.analyzedData || {};

        context.log("Event data extracted", {
          eventId,
          hasTitle: !!analyzedData.title,
          hasStart: !!analyzedData.start,
          hasLocation: !!analyzedData.location,
        });

        // Geocode location if available
        let coordinates = null;
        let geohash = null;
        if (analyzedData.location && analyzedData.location.trim().length > 0) {
          try {
            // Add a small delay to respect Nominatim rate limit (1 req/sec)
            await new Promise((resolve) => setTimeout(resolve, 1100));

            const geocodeResult = await context.callFunction("geocodeAddress", {
              address: analyzedData.location,
              countryCode: eventTimezone.includes("America") ? "us" : null,
            });

            if (geocodeResult.found && geocodeResult.coordinates) {
              coordinates = geocodeResult.coordinates;

              // Generate geohash from coordinates
              const { geohashForLocation } = await import("geofire-common");
              geohash = geohashForLocation([
                coordinates.latitude,
                coordinates.longitude,
              ]);

              context.log("Location geocoded", {
                eventId,
                location: analyzedData.location,
                coordinates,
                geohash,
              });
            }
          } catch (geocodeError) {
            context.error("Failed to geocode location", {
              eventId,
              location: analyzedData.location,
              error: geocodeError.message,
            });
            // Continue without coordinates if geocoding fails
          }
        }

        // Update event document with extracted data
        // Convert ISO8601 strings to Firestore Timestamps
        const now = context.firebase.Timestamp.now();
        const startTimestamp = analyzedData.start
          ? context.firebase.Timestamp.fromDate(new Date(analyzedData.start))
          : null;
        const endTimestamp = analyzedData.end
          ? context.firebase.Timestamp.fromDate(new Date(analyzedData.end))
          : null;

        await context.firebase
          .collection(eventsCollection)
          .doc(eventId)
          .update({
            title: analyzedData.title || null,
            description: analyzedData.description || null,
            start: startTimestamp,
            end: endTimestamp,
            location: analyzedData.location || null,
            coordinates: coordinates || null,
            geohash: geohash || null,
            imageUrl: analyzedData.imageUrl || null,
            scrapedAt: now,
            status: "scraped",
            lastUpdated: now,
            lastError: null,
          });

        results.eventsScraped++;

        context.log("Event page scraping completed", {
          eventId,
          title: analyzedData.title,
          url: eventData.eventUrl,
        });
      } catch (error) {
        results.eventsFailed++;
        const errorMessage = error.message || "Unknown error";

        context.error("Failed to scrape event page", {
          eventId,
          url: eventData.eventUrl,
          error: errorMessage,
        });

        results.errors.push({
          eventId,
          url: eventData.eventUrl || null,
          error: errorMessage,
        });

        // Update event with error status
        try {
          const errorTimestamp = context.firebase.Timestamp.now();

          await context.firebase
            .collection(eventsCollection)
            .doc(eventId)
            .update({
              status: "error",
              lastError: errorMessage,
              lastUpdated: errorTimestamp,
            });
        } catch (updateError) {
          context.error("Failed to update event error status", {
            eventId,
            error: updateError.message,
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    context.log("Event page scraping completed", {
      eventsProcessed: results.eventsProcessed,
      eventsScraped: results.eventsScraped,
      eventsFailed: results.eventsFailed,
      duration: `${(duration / 1000).toFixed(2)}s`,
    });

    return {
      success: true,
      ...results,
      duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    context.error("Event page scraper failed", error);
    throw new Error(`Event page scraper failed: ${error.message}`);
  }
};
