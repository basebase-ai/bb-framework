/**
 * Fetch Notion Pages and Databases
 *
 * Retrieves pages and databases from Notion using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.pageSize=20] - Maximum number of results
 * @param {string} [params.query] - Optional search query
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, pages: Array, databases: Array}>}
 */
module.exports = async function (params, context) {
  const { pageSize = 20, query = "" } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "notion";

  context.log("Fetching Notion content", { userId, pageSize, query });

  try {
    // Step 1: Find the user's Notion connection
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
      throw new Error("Notion not connected. Please connect first.");
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
      throw new Error("No access token found for Notion");
    }

    // Step 3: Search Notion for pages and databases
    const searchResponse = await context.http.post(
      "https://api.notion.com/v1/search",
      {
        query: query,
        page_size: Math.min(pageSize, 100),
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const results = searchResponse.data?.results || [];

    // Separate pages and databases
    const pages = [];
    const databases = [];

    for (const item of results) {
      if (item.object === "page") {
        // Extract page title from properties
        let title = "Untitled";
        const titleProp = item.properties?.title || item.properties?.Name;
        if (titleProp?.title?.[0]?.plain_text) {
          title = titleProp.title[0].plain_text;
        } else if (titleProp?.title?.[0]?.text?.content) {
          title = titleProp.title[0].text.content;
        }

        pages.push({
          id: item.id,
          title: title,
          url: item.url,
          icon: item.icon?.emoji || item.icon?.external?.url || null,
          lastEdited: item.last_edited_time,
          createdTime: item.created_time,
          parentType: item.parent?.type || null,
        });
      } else if (item.object === "database") {
        // Extract database title
        let title = "Untitled Database";
        if (item.title?.[0]?.plain_text) {
          title = item.title[0].plain_text;
        }

        databases.push({
          id: item.id,
          title: title,
          url: item.url,
          icon: item.icon?.emoji || item.icon?.external?.url || null,
          lastEdited: item.last_edited_time,
          createdTime: item.created_time,
        });
      }
    }

    context.log("Notion content fetched successfully", {
      pages: pages.length,
      databases: databases.length,
    });

    return {
      success: true,
      pages,
      databases,
      total: results.length,
    };
  } catch (error) {
    context.error("Failed to fetch Notion content:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Notion authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you've granted access to the pages you want to see."
      );
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch Notion content"
    );
  }
};

