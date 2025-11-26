/**
 * Framework Function: OAuth Token Revoke
 * 
 * Revokes OAuth access and removes tokens from user-secrets collection.
 * This disconnects the provider from the user's account.
 * 
 * @param {Object} params - Function parameters
 * @param {string} params.provider - OAuth provider (google, microsoft, github)
 * @param {string} [params.userId] - User ID (defaults to authenticated user)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Success result
 */
module.exports = async function (params, context) {
  const { provider } = params;
  const userId = params.userId || context.auth?.uid;

  if (!provider) {
    throw new Error("Provider is required");
  }
  if (!userId) {
    throw new Error("User ID is required");
  }

  context.log("Revoking OAuth access", { provider, userId });

  try {
    const db = context.firebase.firestore();

    // Get current tokens from user-secrets
    const secretRef = db.collection("user-secrets").doc(userId);
    const secretDoc = await secretRef.get();
    
    if (!secretDoc.exists) {
      context.log("No tokens found to revoke", { userId, provider });
      return {
        success: true,
        message: "No tokens found to revoke",
      };
    }

    const providerData = secretDoc.data().services?.[provider];
    
    if (!providerData) {
      context.log("Provider not connected", { userId, provider });
      return {
        success: true,
        message: `${provider} was not connected`,
      };
    }

    // Decrypt access token
    const { decryptToken } = require("./oauthExchange.js");
    let accessToken = null;
    
    try {
      accessToken = await decryptToken(providerData.accessToken, context);
    } catch (err) {
      context.log("Could not decrypt token, proceeding with removal", err);
    }

    // Revoke token with OAuth provider (optional but recommended)
    if (accessToken) {
      try {
        await revokeWithProvider(provider, accessToken, context);
      } catch (err) {
        context.log("Provider revocation failed, continuing with removal", err);
        // Continue even if provider revocation fails
      }
    }

    // Remove provider data from user-secrets
    const services = secretDoc.data().services || {};
    delete services[provider];

    if (Object.keys(services).length === 0) {
      // No more services, delete entire document
      await secretRef.delete();
    } else {
      // Still have other services, just remove this provider
      await secretRef.update({
        [`services.${provider}`]: context.firebase.firestore.FieldValue.delete(),
        updatedAt: new Date(),
      });
    }

    context.log("OAuth access revoked successfully", { provider, userId });

    return {
      success: true,
      provider,
      message: `${provider} disconnected successfully`,
    };
  } catch (error) {
    context.error("OAuth revoke failed:", error);
    throw error;
  }
};

/**
 * Revoke token with OAuth provider
 */
async function revokeWithProvider(provider, accessToken, context) {
  const configs = {
    google: {
      revokeUrl: "https://oauth2.googleapis.com/revoke",
      method: "POST",
      params: { token: accessToken },
    },
    microsoft: {
      // Microsoft doesn't have a revoke endpoint for user tokens
      // Tokens are revoked when removed from Azure AD
      skip: true,
    },
    github: {
      revokeUrl: `https://api.github.com/applications/${await context.getSecret("GITHUB_CLIENT_ID")}/token`,
      method: "DELETE",
      auth: {
        username: await context.getSecret("GITHUB_CLIENT_ID"),
        password: await context.getSecret("GITHUB_CLIENT_SECRET"),
      },
      data: { access_token: accessToken },
    },
  };

  const config = configs[provider.toLowerCase()];
  
  if (!config || config.skip) {
    context.log(`Provider ${provider} does not support token revocation`);
    return;
  }

  context.log("Revoking token with OAuth provider", { provider });

  try {
    const options = {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    };

    if (config.auth) {
      options.auth = config.auth;
    }

    if (config.method === "POST") {
      await context.http.post(config.revokeUrl, config.params, options);
    } else if (config.method === "DELETE") {
      await context.http.delete(config.revokeUrl, { ...options, data: config.data });
    }

    context.log("Token revoked with provider", { provider });
  } catch (error) {
    context.error("Provider revocation request failed:", error);
    // Don't throw - we'll still remove from database
  }
}

