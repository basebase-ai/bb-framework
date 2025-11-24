/**
 * Framework function: Scrape web calendars and extract event URLs
 *
 * This function reads from a calendars collection, checks which calendars need scraping
 * based on their scrape-interval, extracts event URLs using CSS selectors, and saves
 * them to an events collection.
 *
 * REQUIRED PARAMETERS:
 * @param {Object} params - Function parameters
 * @param {string} params.calendarsCollection - Name of the calendars collection
 * @param {string} params.eventsCollection - Name of the events collection where URLs will be saved
 *
 * OPTIONAL PARAMETERS:
 * @param {number} [params.maxCalendars] - Maximum number of calendars to scrape in this run (default: no limit)
 * @param {boolean} [params.forceRescrape=false] - Ignore scrape-interval and scrape all enabled calendars (default: false)
 * @param {Array<string>} [params.calendarIds] - Only scrape specific calendar IDs (default: scrape all due calendars)
 *
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Scraping results with statistics
 *
 * @example
 * // Scheduled execution (scrapes calendars that are due)
 * await context.callFunction('scrapeWebCalendars', {
 *   calendarsCollection: 'calendars',
 *   eventsCollection: 'events'
 * });
 *
 * @example
 * // Force scrape specific calendars
 * await context.callFunction('scrapeWebCalendars', {
 *   calendarsCollection: 'calendars',
 *   eventsCollection: 'events',
 *   calendarIds: ['calendar1', 'calendar2'],
 *   forceRescrape: true
 * });
 *
 * Calendar document schema:
 * {
 *   name: string,           // Display name of the calendar
 *   url: string,            // URL to scrape
 *   cssSelector: string,    // CSS selector for event links
 *   attribute: string,      // Attribute to extract (e.g., 'href')
 *   scrapeInterval: number, // Hours between scrapes
 *   enabled: boolean,       // Whether calendar is active
 *   timezone: string,       // IANA timezone (e.g., 'America/Los_Angeles') (optional, default: 'America/Los_Angeles')
 *   scrapedAt: Timestamp,   // Last successful scrape time (optional)
 *   useProxy: boolean,      // Use ScrapingBee proxy (optional, default: true)
 *   premiumProxy: boolean,  // Use premium proxy (optional, default: false)
 *   stealthProxy: boolean   // Use stealth proxy (optional, default: false)
 * }
 */
module.exports = async function (params, context) {
  const {
    calendarsCollection,
    eventsCollection,
    maxCalendars = null,
    forceRescrape = false,
    calendarIds = null,
  } = params;

  // Validate required parameters
  if (!calendarsCollection) {
    throw new Error("calendarsCollection parameter is required");
  }

  if (!eventsCollection) {
    throw new Error("eventsCollection parameter is required");
  }

  if (!context.firebase) {
    throw new Error(
      "Firebase is not available in context. Ensure appId is provided when creating context."
    );
  }

  context.log("Starting calendar scraper", {
    calendarsCollection,
    eventsCollection,
    maxCalendars,
    forceRescrape,
    specificCalendars: calendarIds ? calendarIds.length : null,
  });

  const startTime = Date.now();
  const results = {
    calendarsProcessed: 0,
    calendarsScraped: 0,
    calendarsFailed: 0,
    totalEventsFound: 0,
    totalEventsDuplicate: 0,
    totalEventsNew: 0,
    errors: [],
  };

  try {
    // Query calendars collection (get all, filter out enabled===false in JavaScript)
    const calendarsSnapshot = await context.firebase
      .collection(calendarsCollection)
      .get();

    if (calendarsSnapshot.empty) {
      context.log("No calendars found");
      return {
        success: true,
        ...results,
        duration: Date.now() - startTime,
      };
    }

    // Filter out calendars where enabled === false (allow null/undefined)
    let filteredDocs = calendarsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.enabled !== false;
    });

    context.log(
      `Found ${filteredDocs.length} calendar(s) (excluded ${
        calendarsSnapshot.size - filteredDocs.length
      } disabled)`
    );

    // Filter by specific calendar IDs if provided (done in JavaScript)
    if (calendarIds && Array.isArray(calendarIds) && calendarIds.length > 0) {
      const calendarIdsSet = new Set(calendarIds);
      filteredDocs = filteredDocs.filter((doc) => calendarIdsSet.has(doc.id));
      context.log(
        `Filtered to ${filteredDocs.length} calendar(s) matching provided IDs`
      );
    }

    // Process each calendar
    const calendarsToScrape = [];

    for (const calendarDoc of filteredDocs) {
      const calendarId = calendarDoc.id;
      const calendarData = calendarDoc.data();

      results.calendarsProcessed++;

      // Validate calendar data
      if (!calendarData.url || !calendarData.cssSelector) {
        context.log("Skipping calendar with missing required fields", {
          calendarId,
          hasUrl: !!calendarData.url,
          hasCssSelector: !!calendarData.cssSelector,
        });
        continue;
      }

      // Check if calendar needs scraping
      if (!forceRescrape && !calendarIds) {
        const scrapeInterval = calendarData.scrapeInterval || 24; // Default 24 hours

        if (calendarData.scrapedAt) {
          // Handle both Firestore Timestamp and ISO8601 string
          let scrapedAt;
          if (
            calendarData.scrapedAt.toDate &&
            typeof calendarData.scrapedAt.toDate === "function"
          ) {
            // Firestore Timestamp
            scrapedAt = calendarData.scrapedAt.toDate();
          } else {
            // ISO8601 string
            scrapedAt = new Date(calendarData.scrapedAt);
          }

          const hoursSinceLastScrape =
            (Date.now() - scrapedAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceLastScrape < scrapeInterval) {
            context.log("Calendar not due for scraping yet", {
              calendarId,
              name: calendarData.name,
              hoursSinceLastScrape: hoursSinceLastScrape.toFixed(2),
              scrapeInterval,
            });
            continue;
          }
        }
      }

      calendarsToScrape.push({ id: calendarId, data: calendarData });

      // Stop if we've reached maxCalendars
      if (maxCalendars && calendarsToScrape.length >= maxCalendars) {
        context.log(`Reached maxCalendars limit: ${maxCalendars}`);
        break;
      }
    }

    if (calendarsToScrape.length === 0) {
      context.log("No calendars need scraping at this time");
      return {
        success: true,
        ...results,
        duration: Date.now() - startTime,
      };
    }

    context.log(`Scraping ${calendarsToScrape.length} calendar(s)`);

    // Scrape each calendar
    for (const { id: calendarId, data: calendarData } of calendarsToScrape) {
      try {
        context.log("Scraping calendar", {
          calendarId,
          name: calendarData.name,
          url: calendarData.url,
          selector: calendarData.cssSelector,
        });

        // Call extractFromWebpage using context.callFunction
        const extractResult = await context.callFunction("extractFromWebpage", {
          url: calendarData.url,
          selector: calendarData.cssSelector,
          attribute: calendarData.attribute || "href",
          premiumProxy: calendarData.premiumProxy || false,
          stealthProxy: calendarData.stealthProxy || false,
          timeout: calendarData.timeout || 140000,
          wait: calendarData.wait || 0,
        });

        if (!extractResult.success) {
          throw new Error("Extract failed without success flag");
        }

        const extractedUrls = extractResult.items || [];
        context.log(`Extracted ${extractedUrls.length} URL(s) from calendar`, {
          calendarId,
          name: calendarData.name,
        });

        results.totalEventsFound += extractedUrls.length;

        // Convert relative URLs to absolute URLs and filter out invalid ones
        const baseUrl = calendarData.url;
        const validUrls = [
          ...new Set(
            extractedUrls
              .filter(
                (url) => url && typeof url === "string" && url.trim().length > 0
              )
              .map((url) => {
                try {
                  const trimmedUrl = url.trim();
                  // If URL is already absolute, return as-is
                  // If relative, convert to absolute using the calendar's base URL
                  const absoluteUrl = new URL(trimmedUrl, baseUrl).href;
                  context.log("Converted URL", {
                    original: trimmedUrl.substring(0, 100),
                    converted: absoluteUrl.substring(0, 100),
                  });
                  return absoluteUrl;
                } catch (error) {
                  context.error("Invalid URL, skipping", {
                    url: url ? url.substring(0, 100) : url,
                    calendarId,
                    error: error.message,
                  });
                  return null;
                }
              })
              .filter((url) => url !== null)
          ),
        ];

        context.log(
          `Saving ${validUrls.length} unique URL(s) to events collection`,
          {
            calendarId,
          }
        );

        // Save each URL to events collection
        let newCount = 0;
        let duplicateCount = 0;
        const now = new Date().toISOString();

        for (const eventUrl of validUrls) {
          try {
            // Create a deterministic document ID from the URL using a hash
            // This prevents duplicate events from same calendar
            // Use a simple hash function since crypto is not available in sandbox
            let hash = 0;
            for (let i = 0; i < eventUrl.length; i++) {
              const char = eventUrl.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32-bit integer
            }
            // Convert to positive number and then to base36 string
            const docId = 'event_' + Math.abs(hash).toString(36);

            // Check if document already exists
            const docRef = context.firebase
              .collection(eventsCollection)
              .doc(docId);
            const existingDoc = await docRef.get();

            if (existingDoc.exists) {
              // Skip duplicate - don't modify existing document
              duplicateCount++;
            } else {
              // Get timezone from calendar data, default to America/Los_Angeles
              const timezone = calendarData.timezone || "America/Los_Angeles";

              // Create new event document
              // Convert ISO8601 strings to Firestore Timestamps
              const discoveredTimestamp = context.firebase.Timestamp.fromDate(
                new Date(now)
              );

              await docRef.set({
                calendarId: calendarId,
                calendarName: calendarData.name,
                eventUrl: eventUrl,
                timezone: timezone,
                discoveredAt: discoveredTimestamp,
                status: "pending", // For downstream processing
                lastUpdated: discoveredTimestamp,
              });

              newCount++;
            }
          } catch (saveError) {
            context.error("Failed to save event URL", {
              calendarId,
              eventUrl,
              error: saveError.message,
            });
          }
        }

        results.totalEventsNew += newCount;
        results.totalEventsDuplicate += duplicateCount;

        // Update calendar's scrapedAt timestamp
        const scrapedTimestamp = context.firebase.Timestamp.fromDate(
          new Date(now)
        );

        await context.firebase
          .collection(calendarsCollection)
          .doc(calendarId)
          .update({
            scrapedAt: scrapedTimestamp,
            lastScrapeStatus: "success",
            lastScrapeCount: validUrls.length,
            lastScrapeNew: newCount,
            lastScrapeDuplicate: duplicateCount,
            lastError: null,
          });

        results.calendarsScraped++;

        context.log("Calendar scraping completed", {
          calendarId,
          name: calendarData.name,
          found: extractedUrls.length,
          new: newCount,
          duplicate: duplicateCount,
        });
      } catch (error) {
        results.calendarsFailed++;
        const errorMessage = error.message || "Unknown error";

        context.error("Failed to scrape calendar", {
          calendarId,
          name: calendarData.name,
          error: errorMessage,
        });

        results.errors.push({
          calendarId,
          name: calendarData.name || null,
          error: errorMessage,
        });

        // Update calendar with error status
        try {
          const errorTimestamp = context.firebase.Timestamp.now();

          await context.firebase
            .collection(calendarsCollection)
            .doc(calendarId)
            .update({
              lastScrapeStatus: "error",
              lastError: errorMessage,
              lastErrorAt: errorTimestamp,
            });
        } catch (updateError) {
          context.error("Failed to update calendar error status", {
            calendarId,
            error: updateError.message,
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    context.log("Calendar scraping completed", {
      calendarsProcessed: results.calendarsProcessed,
      calendarsScraped: results.calendarsScraped,
      calendarsFailed: results.calendarsFailed,
      totalEventsFound: results.totalEventsFound,
      totalEventsNew: results.totalEventsNew,
      totalEventsDuplicate: results.totalEventsDuplicate,
      duration: `${(duration / 1000).toFixed(2)}s`,
    });

    return {
      success: true,
      ...results,
      duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    context.error("Calendar scraper failed", error);
    throw new Error(`Calendar scraper failed: ${error.message}`);
  }
};
