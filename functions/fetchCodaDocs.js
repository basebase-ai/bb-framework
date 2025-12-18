/**
 * Fetch Coda Docs and Tables
 *
 * Retrieves docs and tables from Coda using stored API token credentials.
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

  context.log("Fetching Coda content", { userId, limit, query });

  const db = context.firestore();

  // Get stored credentials from user-secrets
  const userSecretsDoc = await db.collection("user-secrets").doc(userId).get();
  const codaCredentials = userSecretsDoc.exists
    ? userSecretsDoc.data()?.services?.coda
    : null;

  if (!codaCredentials) {
    throw new Error("Coda not connected. Please add your API token first.");
  }

  const apiToken = codaCredentials.apiToken;

  if (!apiToken) {
    throw new Error("No API token found for Coda");
  }

  try {
    // Step 2: Fetch docs from Coda
    const docsParams = new URLSearchParams({
      limit: String(Math.min(limit, 100)),
    });

    if (query) {
      docsParams.set("query", query);
    }

    const docsResponse = await context.http.get(
      `https://coda.io/apis/v1/docs?${docsParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const docsData = docsResponse.data?.items || [];

    // Step 3: Parse docs
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

    // Step 4: Fetch tables from the first doc (if any) as a sample
    /** @type {Array<{id: string, name: string, href: string, browserLink: string, tableType?: string, rowCount?: number}>} */
    let tables = [];

    if (docs.length > 0) {
      // Get tables from the first doc as a sample
      const firstDocId = docs[0].id;
      try {
        const tablesResponse = await context.http.get(
          `https://coda.io/apis/v1/docs/${firstDocId}/tables?limit=10`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
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
        "Coda authentication failed. Please check your API token."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure your API token has the required permissions."
      );
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch Coda content"
    );
  }
};
