/**
 * List Google Sheets
 *
 * Lists spreadsheets from the user's Google Drive using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=20] - Maximum number of sheets to return
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, sheets: Array}>}
 */
module.exports = async function (params, context) {
  const { limit = 20 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "google-sheet";

  context.log("Listing Google Sheets", { userId, limit });

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

    // Step 3: List spreadsheets via Google Drive API
    // Query for Google Sheets files only
    const driveResponse = await context.http.get(
      "https://www.googleapis.com/drive/v3/files",
      {
        params: {
          q: "mimeType='application/vnd.google-apps.spreadsheet'",
          pageSize: Math.min(limit, 100),
          fields: "files(id,name,createdTime,modifiedTime,webViewLink)",
          orderBy: "modifiedTime desc",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const files = driveResponse.data?.files || [];

    const sheets = files.map((file) => ({
      id: file.id,
      name: file.name,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime,
      url: file.webViewLink,
    }));

    context.log("Google Sheets listed successfully", {
      count: sheets.length,
    });

    return {
      success: true,
      sheets,
    };
  } catch (error) {
    context.error("Failed to list Google Sheets:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Google Sheets authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required permissions."
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to list spreadsheets"
    );
  }
};
