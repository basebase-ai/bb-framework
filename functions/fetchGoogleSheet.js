/**
 * Fetch Google Sheet Data
 *
 * Retrieves data from a Google Spreadsheet using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.spreadsheetId - Google Spreadsheet ID (from URL)
 * @param {string} [params.range] - Range to fetch (e.g., "Sheet1!A1:Z100")
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, data: Array, headers: Array}>}
 */
module.exports = async function (params, context) {
  const { spreadsheetId, range = "Sheet1" } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  if (!spreadsheetId) {
    throw new Error("spreadsheetId is required");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "google-sheet";

  context.log("Fetching Google Sheet data", { userId, spreadsheetId, range });

  try {
    // Step 1: Find the user's Google Sheets connection
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
      throw new Error("Google Sheets not connected. Please connect first.");
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
      throw new Error("No access token found for Google Sheets");
    }

    // Step 3: Fetch spreadsheet data using Google Sheets API
    const encodedRange = encodeURIComponent(range);
    const sheetsResponse = await context.http.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const values = sheetsResponse.data?.values || [];

    if (values.length === 0) {
      return {
        success: true,
        headers: [],
        data: [],
        range: sheetsResponse.data?.range,
        spreadsheetId,
      };
    }

    // First row as headers, rest as data
    const headers = values[0] || [];
    const rows = values.slice(1).map((row, index) => {
      /** @type {Record<string, string>} */
      const rowData = { _rowIndex: String(index + 2) }; // 1-indexed, accounting for header
      headers.forEach((header, colIndex) => {
        rowData[header] = row[colIndex] || "";
      });
      return rowData;
    });

    context.log("Google Sheet data fetched successfully", {
      rowCount: rows.length,
      columnCount: headers.length,
    });

    return {
      success: true,
      headers,
      data: rows,
      range: sheetsResponse.data?.range,
      spreadsheetId,
      totalRows: rows.length,
    };
  } catch (error) {
    context.error("Failed to fetch Google Sheet:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Google Sheets authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have permission to access this spreadsheet."
      );
    } else if (error.response?.status === 404) {
      throw new Error(
        "Spreadsheet not found. Please check the spreadsheet ID."
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch spreadsheet"
    );
  }
};
