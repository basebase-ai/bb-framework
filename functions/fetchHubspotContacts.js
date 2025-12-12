/**
 * Fetch HubSpot Contacts
 *
 * Retrieves contacts from HubSpot CRM using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=100] - Maximum number of contacts to fetch
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, contacts: Array}>}
 */
module.exports = async function (params, context) {
  const { limit = 100 } = params;
  // Support both context.auth.uid (Firebase) and context.userId (task-based execution)
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  // Get Nango secret key
  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "hubspot";

  context.log("Fetching HubSpot contacts", { userId, limit });

  try {
    // Step 1: Find the user's HubSpot connection
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
      throw new Error("HubSpot not connected. Please connect first.");
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
      throw new Error("No access token found for HubSpot");
    }

    // Step 3: Fetch contacts from HubSpot API
    const hubspotResponse = await context.http.get(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        params: {
          limit: Math.min(limit, 100),
          properties: "email,firstname,lastname,company,phone",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const results = hubspotResponse.data?.results || [];

    // Transform contacts to a simpler format
    const contacts = results.map((contact) => ({
      id: contact.id,
      email: contact.properties?.email || null,
      firstname: contact.properties?.firstname || null,
      lastname: contact.properties?.lastname || null,
      company: contact.properties?.company || null,
      phone: contact.properties?.phone || null,
      createdAt: contact.createdAt || null,
    }));

    context.log("HubSpot contacts fetched successfully", {
      count: contacts.length,
    });

    return {
      success: true,
      contacts,
      total: hubspotResponse.data?.total || contacts.length,
    };
  } catch (error) {
    context.error("Failed to fetch HubSpot contacts:", error);

    // Handle specific HubSpot API errors
    if (error.response?.status === 401) {
      throw new Error(
        "HubSpot authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required HubSpot permissions."
      );
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch contacts"
    );
  }
};
