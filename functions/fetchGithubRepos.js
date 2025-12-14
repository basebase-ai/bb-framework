/**
 * Fetch GitHub Repositories
 *
 * Retrieves repositories from GitHub using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=30] - Maximum number of repos to fetch
 * @param {string} [params.sort="updated"] - Sort by: created, updated, pushed, full_name
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, repos: Array, user: Object}>}
 */
module.exports = async function (params, context) {
  const { limit = 30, sort = "updated" } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "github-getting-started";

  context.log("Fetching GitHub repos", { userId, limit, sort });

  try {
    // Step 1: Find the user's GitHub connection
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
      throw new Error("GitHub not connected. Please connect first.");
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
      throw new Error("No access token found for GitHub");
    }

    // Step 3: Fetch user info
    const userResponse = await context.http.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Basebase-App",
      },
      timeout: 10000,
    });

    const githubUser = {
      login: userResponse.data.login,
      name: userResponse.data.name,
      avatarUrl: userResponse.data.avatar_url,
      publicRepos: userResponse.data.public_repos,
      followers: userResponse.data.followers,
      following: userResponse.data.following,
    };

    // Step 4: Fetch repositories
    const reposResponse = await context.http.get(
      "https://api.github.com/user/repos",
      {
        params: {
          per_page: Math.min(limit, 100),
          sort: sort,
          direction: "desc",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Basebase-App",
        },
        timeout: 30000,
      }
    );

    const repos = (reposResponse.data || []).map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
    }));

    context.log("GitHub repos fetched successfully", {
      count: repos.length,
      user: githubUser.login,
    });

    return {
      success: true,
      user: githubUser,
      repos,
      total: repos.length,
    };
  } catch (error) {
    context.error("Failed to fetch GitHub repos:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "GitHub authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error("Access denied or rate limited. Please try again later.");
    }

    throw new Error(
      error.response?.data?.message || error.message || "Failed to fetch repos"
    );
  }
};
