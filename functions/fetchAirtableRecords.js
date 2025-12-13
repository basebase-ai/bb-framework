/**
 * Fetch Airtable Records
 *
 * Fetches records from a specific table in Airtable using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.baseId - Airtable base ID
 * @param {string} params.tableId - Airtable table ID or name
 * @param {number} [params.maxRecords=100] - Maximum records to fetch
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, records: Array, fields: Array}>}
 */
module.exports = async function (params, context) {
  const { baseId, tableId, maxRecords = 100 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  if (!baseId) {
    throw new Error("baseId is required");
  }

  if (!tableId) {
    throw new Error("tableId is required");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "airtable";

  context.log("Fetching Airtable records", { userId, baseId, tableId });

  try {
    // Step 1: Find the user's Airtable connection
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
      throw new Error("Airtable not connected. Please connect first.");
    }

    const connectionId = connections[0].connection_id;

    // Step 2: Get the access token
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
      throw new Error("No access token found for Airtable");
    }

    // Step 3: Fetch records from the table
    const encodedTableId = encodeURIComponent(tableId);
    const airtableResponse = await context.http.get(
      `https://api.airtable.com/v0/${baseId}/${encodedTableId}`,
      {
        params: {
          maxRecords: Math.min(maxRecords, 100),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const rawRecords = airtableResponse.data?.records || [];

    // Extract field names from first record
    const fieldNames = new Set();
    rawRecords.forEach((record) => {
      Object.keys(record.fields || {}).forEach((key) => fieldNames.add(key));
    });

    const fields = Array.from(fieldNames);

    // Transform records to simpler format
    const records = rawRecords.map((record) => ({
      id: record.id,
      createdTime: record.createdTime,
      ...record.fields,
    }));

    context.log("Airtable records fetched successfully", {
      count: records.length,
      fieldCount: fields.length,
    });

    return {
      success: true,
      records,
      fields,
      baseId,
      tableId,
      totalRecords: records.length,
    };
  } catch (error) {
    context.error("Failed to fetch Airtable records:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Airtable authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required permissions."
      );
    } else if (error.response?.status === 404) {
      throw new Error("Table not found. Please check the base and table IDs.");
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch records"
    );
  }
};
