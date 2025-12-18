/**
 * Fetch Coda Docs and Tables
 *
 * Retrieves docs and tables from Coda using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=20] - Maximum number of docs to return
 * @param {string} [params.query] - Optional search query
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, docs: Array, tables: Array}>}
 */
module.exports = async function (params, context) {
  const { limit = 20, query = "" } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "coda";

  context.log("Fetching Coda content", { userId, limit, query });

  try {
    // Step 1: Find the user's Coda connection
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
      throw new Error("Coda not connected. Please connect first.");
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
      throw new Error("No access token found for Coda");
    }

    // Step 3: Fetch docs from Coda
    /** @type {string | undefined} */
    let docsUrl = "https://coda.io/apis/v1/docs";
    const docsParams = {
      limit: Math.min(limit, 100),
    };

    if (query) {
      docsParams.query = query;
    }

    const docsResponse = await context.http.get(docsUrl, {
      params: docsParams,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const docsData = docsResponse.data?.items || [];

    // Step 4: Parse docs
    /** @type {Array<{id: string, name: string, href: string, browserLink: string, icon?: string, updatedAt?: string, folderName?: string}>} */
    const docs = docsData.map((doc) => ({
      id: doc.id,
      name: doc.name || "Untitled",
      href: doc.href,
      browserLink: doc.browserLink,
      icon: doc.icon?.browserLink || null,
      updatedAt: doc.updatedAt,
      folderName: doc.folder?.name || null,
    }));

    // Step 5: Fetch tables from the first doc (if any) as a sample
    /** @type {Array<{id: string, name: string, href: string, browserLink: string, tableType?: string, rowCount?: number}>} */
    let tables = [];

    if (docs.length > 0) {
      // Get tables from the first doc as a sample
      const firstDocId = docs[0].id;
      try {
        const tablesResponse = await context.http.get(
          `https://coda.io/apis/v1/docs/${firstDocId}/tables`,
          {
            params: { limit: 10 },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        const tablesData = tablesResponse.data?.items || [];
        tables = tablesData.map((table) => ({
          id: table.id,
          name: table.name || "Untitled",
          href: table.href,
          browserLink: table.browserLink,
          tableType: table.tableType,
          rowCount: table.rowCount,
        }));
      } catch (tableError) {
        // Tables fetch failed, but we still have docs
        context.log(
          "Failed to fetch tables from first doc:",
          tableError.message
        );
      }
    }

    context.log("Coda content fetched successfully", {
      docs: docs.length,
      tables: tables.length,
    });

    return {
      success: true,
      docs,
      tables,
      total: docs.length,
    };
  } catch (error) {
    context.error("Failed to fetch Coda content:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Coda authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you've granted access to your Coda workspace."
      );
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch Coda content"
    );
  }
};
