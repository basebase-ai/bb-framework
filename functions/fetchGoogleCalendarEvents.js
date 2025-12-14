/**
 * Fetch Google Calendar Events
 *
 * Retrieves upcoming events from Google Calendar using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.maxResults=25] - Maximum number of events
 * @param {number} [params.daysAhead=30] - Days ahead to fetch events
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, events: Array, calendars: Array}>}
 */
module.exports = async function (params, context) {
  const { maxResults = 25, daysAhead = 30 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "google-calendar";

  context.log("Fetching Google Calendar events", {
    userId,
    maxResults,
    daysAhead,
  });

  try {
    // Step 1: Find the user's Google Calendar connection
    const listResponse = await context.http.get(
      "https://api.nango.dev/connections",
      {
        params: {
          endUserId: userId,
          integrationId: integrationId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const connections = listResponse.data?.connections || [];

    if (connections.length === 0) {
      throw new Error("Google Calendar not connected. Please connect first.");
    }

    const connectionId = connections[0].connection_id;

    // Step 2: Get the access token (Nango auto-refreshes if expired)
    const connResponse = await context.http.get(
      `https://api.nango.dev/connections/${connectionId}`,
      {
        params: {
          provider_config_key: integrationId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const accessToken = connResponse.data?.credentials?.access_token;

    if (!accessToken) {
      throw new Error("No access token found for Google Calendar");
    }

    // Step 3: Fetch calendar list
    const calendarsResponse = await context.http.get(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const calendars = (calendarsResponse.data?.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
    }));

    // Step 4: Fetch events from primary calendar
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000
    ).toISOString();

    const eventsResponse = await context.http.get(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        params: {
          timeMin: timeMin,
          timeMax: timeMax,
          maxResults: Math.min(maxResults, 100),
          singleEvents: true,
          orderBy: "startTime",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const events = (eventsResponse.data?.items || []).map((event) => ({
      id: event.id,
      summary: event.summary || "No title",
      description: event.description || null,
      location: event.location || null,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime,
      htmlLink: event.htmlLink,
      status: event.status,
      organizer: event.organizer?.email || null,
      attendees: (event.attendees || []).length,
    }));

    context.log("Google Calendar events fetched successfully", {
      events: events.length,
      calendars: calendars.length,
    });

    return {
      success: true,
      events,
      calendars,
      total: events.length,
    };
  } catch (error) {
    context.error("Failed to fetch Google Calendar events:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Google Calendar authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have granted calendar permissions."
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch calendar events"
    );
  }
};
