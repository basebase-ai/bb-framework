/**
 * Fetch Google Ads Data
 *
 * Retrieves Google Ads accounts, campaigns, and ad groups using Nango OAuth.
 * Uses the Google Ads API (REST) to fetch performance data.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.action - Action to perform: "listAccounts", "getCampaigns", "getAdGroups"
 * @param {string} [params.accountId] - Google Ads customer ID (required for getCampaigns/getAdGroups)
 * @param {string} [params.dateRange] - Date range: "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH" (default: "LAST_30_DAYS")
 * @param {Object} context - Function context
 * @returns {Promise<Object>}
 */
module.exports = async function (params, context) {
  const { action, accountId, dateRange = "LAST_30_DAYS" } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  if (!action) {
    throw new Error("action is required");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "google-ads";

  context.log("Fetching Google Ads data", { userId, action, accountId });

  try {
    // Step 1: Find the user's Google Ads connection
    context.log("Step 1: Finding Nango connection...");
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
    context.log("Connections found:", { count: connections.length });

    if (connections.length === 0) {
      throw new Error("Google Ads not connected. Please connect first.");
    }

    const connectionId = connections[0].connection_id;
    context.log("Using connection:", { connectionId });

    // Step 2: Get the access token
    context.log("Step 2: Getting access token...");
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
    context.log("Access token retrieved:", { hasToken: !!accessToken });

    if (!accessToken) {
      throw new Error("No access token found for Google Ads");
    }

    // Get the developer token for Google Ads API
    context.log("Step 3: Getting developer token...");
    const developerToken = await context.getSecret(
      "GOOGLE_ADS_DEVELOPER_TOKEN"
    );
    if (!developerToken) {
      throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN not configured");
    }
    context.log("Developer token retrieved:", {
      hasToken: !!developerToken,
      length: developerToken?.length,
    });

    // Common headers for Google Ads API
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };

    // Execute action
    switch (action) {
      case "listAccounts":
        return await listAccounts(context, headers);

      case "getCampaigns":
        if (!accountId) {
          throw new Error("accountId is required for getCampaigns");
        }
        return await getCampaigns(context, headers, accountId, dateRange);

      case "getAdGroups":
        if (!accountId) {
          throw new Error("accountId is required for getAdGroups");
        }
        return await getAdGroups(context, headers, accountId, dateRange);

      default:
        throw new Error(
          `Unknown action: ${action}. Use 'listAccounts', 'getCampaigns', or 'getAdGroups'`
        );
    }
  } catch (error) {
    context.error("Failed to fetch Google Ads data:", error);
    context.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      throw new Error(
        "Google Ads authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required permissions."
      );
    } else if (error.response?.status === 404) {
      throw new Error(
        `Google Ads API endpoint not found (404). URL: ${error.config?.url}. ` +
          `Response: ${JSON.stringify(error.response?.data)}`
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch Google Ads data"
    );
  }
};

/**
 * List accessible Google Ads accounts
 * @param {Object} context
 * @param {Object} headers
 * @returns {Promise<Object>}
 */
async function listAccounts(context, headers) {
  context.log("Listing Google Ads accounts");
  context.log("Calling Google Ads API: listAccessibleCustomers");

  // Use the Google Ads API to list accessible customers
  const apiUrl =
    "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers";
  context.log("API URL:", apiUrl);

  const response = await context.http.get(apiUrl, {
    headers,
    timeout: 30000,
  });

  context.log("API response status:", response.status);
  context.log("API response data:", response.data);

  const customerResourceNames = response.data?.resourceNames || [];

  // Fetch details for each customer
  /** @type {Array<{id: string, name: string, currencyCode: string}>} */
  const accounts = [];

  for (const resourceName of customerResourceNames) {
    const customerId = resourceName.replace("customers/", "");

    try {
      // Query customer details
      const detailResponse = await context.http.post(
        `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
        {
          query: `
            SELECT
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.status
            FROM customer
            LIMIT 1
          `,
        },
        {
          headers: {
            ...headers,
            "login-customer-id": customerId,
          },
          timeout: 30000,
        }
      );

      const results = detailResponse.data || [];
      if (results.length > 0 && results[0].results?.length > 0) {
        const customer = results[0].results[0].customer;
        accounts.push({
          id: customer.id,
          name: customer.descriptiveName || `Account ${customer.id}`,
          currencyCode: customer.currencyCode || "USD",
        });
      }
    } catch (err) {
      // Skip accounts we can't access (might be manager accounts)
      context.log(`Skipping customer ${customerId}: ${err.message}`);
    }
  }

  context.log("Google Ads accounts listed", { count: accounts.length });

  return {
    success: true,
    accounts,
  };
}

/**
 * Get campaigns with performance metrics
 * @param {Object} context
 * @param {Object} headers
 * @param {string} accountId
 * @param {string} dateRange
 * @returns {Promise<Object>}
 */
async function getCampaigns(context, headers, accountId, dateRange) {
  context.log("Fetching campaigns", { accountId, dateRange });

  // Remove dashes from account ID if present
  const customerId = accountId.replace(/-/g, "");

  const response = await context.http.post(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      query: `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr
        FROM campaign
        WHERE segments.date DURING ${dateRange}
        ORDER BY metrics.impressions DESC
        LIMIT 100
      `,
    },
    {
      headers: {
        ...headers,
        "login-customer-id": customerId,
      },
      timeout: 60000,
    }
  );

  const results = response.data || [];

  /** @type {Array<{id: string, name: string, status: string, impressions: number, clicks: number, cost: number, conversions: number, ctr: number}>} */
  const campaigns = [];

  for (const batch of results) {
    for (const row of batch.results || []) {
      const campaign = row.campaign;
      const metrics = row.metrics || {};

      campaigns.push({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        impressions: parseInt(metrics.impressions || "0", 10),
        clicks: parseInt(metrics.clicks || "0", 10),
        cost: parseInt(metrics.costMicros || "0", 10),
        conversions: parseFloat(metrics.conversions || "0"),
        ctr: parseFloat(metrics.ctr || "0"),
      });
    }
  }

  context.log("Campaigns fetched", { count: campaigns.length });

  return {
    success: true,
    campaigns,
  };
}

/**
 * Get ad groups with performance metrics
 * @param {Object} context
 * @param {Object} headers
 * @param {string} accountId
 * @param {string} dateRange
 * @returns {Promise<Object>}
 */
async function getAdGroups(context, headers, accountId, dateRange) {
  context.log("Fetching ad groups", { accountId, dateRange });

  // Remove dashes from account ID if present
  const customerId = accountId.replace(/-/g, "");

  const response = await context.http.post(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      query: `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros
        FROM ad_group
        WHERE segments.date DURING ${dateRange}
        ORDER BY metrics.impressions DESC
        LIMIT 100
      `,
    },
    {
      headers: {
        ...headers,
        "login-customer-id": customerId,
      },
      timeout: 60000,
    }
  );

  const results = response.data || [];

  /** @type {Array<{id: string, name: string, campaignName: string, status: string, impressions: number, clicks: number, cost: number}>} */
  const adGroups = [];

  for (const batch of results) {
    for (const row of batch.results || []) {
      const adGroup = row.adGroup;
      const campaign = row.campaign;
      const metrics = row.metrics || {};

      adGroups.push({
        id: adGroup.id,
        name: adGroup.name,
        campaignName: campaign.name,
        status: adGroup.status,
        impressions: parseInt(metrics.impressions || "0", 10),
        clicks: parseInt(metrics.clicks || "0", 10),
        cost: parseInt(metrics.costMicros || "0", 10),
      });
    }
  }

  context.log("Ad groups fetched", { count: adGroups.length });

  return {
    success: true,
    adGroups,
  };
}
