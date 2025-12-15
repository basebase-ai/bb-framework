/**
 * Fetch Stripe Data
 *
 * Retrieves customers and recent payments from Stripe using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=20] - Maximum number of results
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, customers: Array, payments: Array, balance: Object}>}
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

  const integrationId = "stripe";

  context.log("Fetching Stripe data", { userId, limit });

  try {
    // Step 1: Find the user's Stripe connection
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
      throw new Error("Stripe not connected. Please connect first.");
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
      throw new Error("No access token found for Stripe");
    }

    // Step 3: Fetch balance
    const balanceResponse = await context.http.get(
      "https://api.stripe.com/v1/balance",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      }
    );

    const balance = {
      available: (balanceResponse.data?.available || []).map((b) => ({
        amount: b.amount / 100,
        currency: b.currency.toUpperCase(),
      })),
      pending: (balanceResponse.data?.pending || []).map((b) => ({
        amount: b.amount / 100,
        currency: b.currency.toUpperCase(),
      })),
    };

    // Step 4: Fetch recent customers
    const customersResponse = await context.http.get(
      "https://api.stripe.com/v1/customers",
      {
        params: {
          limit: Math.min(limit, 100),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 30000,
      }
    );

    const customers = (customersResponse.data?.data || []).map((cust) => ({
      id: cust.id,
      email: cust.email,
      name: cust.name,
      phone: cust.phone,
      created: new Date(cust.created * 1000).toISOString(),
      currency: cust.currency?.toUpperCase() || null,
      balance: cust.balance ? cust.balance / 100 : 0,
    }));

    // Step 5: Fetch recent payments/charges
    const chargesResponse = await context.http.get(
      "https://api.stripe.com/v1/charges",
      {
        params: {
          limit: Math.min(limit, 100),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 30000,
      }
    );

    const payments = (chargesResponse.data?.data || []).map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      status: charge.status,
      description: charge.description,
      customerEmail: charge.billing_details?.email || charge.receipt_email,
      created: new Date(charge.created * 1000).toISOString(),
      paid: charge.paid,
      refunded: charge.refunded,
    }));

    context.log("Stripe data fetched successfully", {
      customers: customers.length,
      payments: payments.length,
    });

    return {
      success: true,
      balance,
      customers,
      payments,
    };
  } catch (error) {
    context.error("Failed to fetch Stripe data:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Stripe authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required Stripe permissions."
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch Stripe data"
    );
  }
};
