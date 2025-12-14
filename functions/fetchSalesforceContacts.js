/**
 * Fetch Salesforce Contacts
 *
 * Retrieves contacts from Salesforce CRM using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=100] - Maximum number of contacts to fetch
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, contacts: Array}>}
 */
module.exports = async function (params, context) {
  const { limit = 100 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "salesforce";

  context.log("Fetching Salesforce contacts", { userId, limit });

  try {
    // Step 1: Find the user's Salesforce connection
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
      throw new Error("Salesforce not connected. Please connect first.");
    }

    const connectionId = connections[0].connection_id;

    // Step 2: Get the access token and instance URL (Nango auto-refreshes if expired)
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

    const credentials = connResponse.data?.credentials;
    const accessToken = credentials?.access_token;
    const instanceUrl = credentials?.instance_url;

    if (!accessToken) {
      throw new Error("No access token found for Salesforce");
    }

    if (!instanceUrl) {
      throw new Error("No instance URL found for Salesforce");
    }

    // Step 3: Fetch contacts from Salesforce using SOQL query
    const soqlQuery = `SELECT Id, FirstName, LastName, Email, Phone, Account.Name, Title, CreatedDate FROM Contact ORDER BY CreatedDate DESC LIMIT ${Math.min(
      limit,
      200
    )}`;

    const salesforceResponse = await context.http.get(
      `${instanceUrl}/services/data/v59.0/query`,
      {
        params: {
          q: soqlQuery,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const records = salesforceResponse.data?.records || [];

    // Transform contacts to a simpler format
    const contacts = records.map((contact) => ({
      id: contact.Id,
      firstName: contact.FirstName || null,
      lastName: contact.LastName || null,
      email: contact.Email || null,
      phone: contact.Phone || null,
      accountName: contact.Account?.Name || null,
      title: contact.Title || null,
      createdAt: contact.CreatedDate || null,
    }));

    context.log("Salesforce contacts fetched successfully", {
      count: contacts.length,
    });

    return {
      success: true,
      contacts,
      total: salesforceResponse.data?.totalSize || contacts.length,
    };
  } catch (error) {
    context.error("Failed to fetch Salesforce contacts:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Salesforce authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required Salesforce permissions."
      );
    }

    throw new Error(
      error.response?.data?.[0]?.message ||
        error.message ||
        "Failed to fetch contacts"
    );
  }
};
