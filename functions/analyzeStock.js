/**
 * Analyze a stock using the SageStocks API
 * @param {Object} params - Function parameters
 * @param {string} params.ticker - Stock ticker symbol (e.g., "AAPL")
 * @param {string} params.collectionName - Collection to store results (e.g., "stock-analyses")
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Analysis result with document ID
 */
module.exports = async function (params, context) {
  const { ticker, collectionName } = params;

  // Validate required parameters
  if (!ticker) {
    throw new Error("Ticker parameter is required");
  }
  if (!collectionName) {
    throw new Error("Collection name parameter is required");
  }

  context.log("Analyzing stock", { ticker, collectionName });

  // Get user ID from context
  const userId = context.userId;
  if (!userId) {
    throw new Error("User must be authenticated");
  }

  // Get user's email from their user document using convenience function
  const user = await context.getUser(userId);

  if (!user || !user.email) {
    throw new Error(
      "User email not found. Please ensure your profile is set up correctly."
    );
  }

  const userEmail = user.email;
  context.log("Using user email for API authentication", { email: userEmail });

  // Call SageStocks API
  const apiUrl = "https://sagestocks-rose.vercel.app/api/analyze";

  try {
    context.log("Calling SageStocks API", { ticker, email: userEmail });

    // TEMPORARY: Comment out real API call for testing
    const response = await context.http.post(
      apiUrl,
      { ticker: ticker.toUpperCase() },
      {
        headers: {
          "Content-Type": "application/json",
          "x-cron-user-email": userEmail,
        },
        timeout: 300000, // 5 minutes timeout (API is slow)
      }
    );

    // TEMPORARY: Use dummy data for testing
    // const response = {
    //   status: 200,
    //   data: {
    //     success: true,
    //     ticker: ticker.toUpperCase(),
    //     analysis: {
    //       summary: "This is a test analysis for " + ticker.toUpperCase(),
    //       recommendation: "TEST - This is dummy data",
    //       score: 7.5,
    //       metrics: {
    //         pe_ratio: 25.3,
    //         market_cap: "2.5T",
    //         dividend_yield: 0.5,
    //       },
    //     },
    //     timestamp: new Date().toISOString(),
    //   },
    // };

    context.log("SageStocks API response received", {
      ticker,
      success: response.data?.success,
      status: response.status,
      hasAnalysisContent: !!response.data?.analysisContent,
      analysisContentLength: response.data?.analysisContent?.length || 0,
      recommendation: response.data?.scores?.recommendation,
    });

    if (!response.data) {
      throw new Error("No data received from SageStocks API");
    }

    // Add timestamps to the response data
    const documentData = {
      ...response.data,
      createdAt: context.firebase.FieldValue.serverTimestamp(),
      updatedAt: context.firebase.FieldValue.serverTimestamp(),
    };

    // Save to Firestore using namespaced firebase (auto-prefixes with appId)
    const docRef = await context.firebase
      .collection(collectionName)
      .add(documentData);

    context.log("Analysis saved to Firestore", {
      ticker,
      docId: docRef.id,
      collection: collectionName,
    });

    return {
      success: true,
      ticker: ticker.toUpperCase(),
      docId: docRef.id,
      collection: collectionName,
      analysis: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    context.error("Failed to analyze stock", {
      ticker,
      error: error.message,
      stack: error.stack,
    });

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      context.error("SageStocks API Error Response:", {
        status,
        errorData: JSON.stringify(errorData),
      });

      if (status === 401 || status === 403) {
        throw new Error(
          `Authentication failed. Email "${userEmail}" may not be authorized for SageStocks API.`
        );
      } else if (status === 429) {
        throw new Error(
          "Rate limit exceeded for SageStocks API. Please try again later."
        );
      } else if (status === 400) {
        throw new Error(
          `Invalid ticker or request: ${errorData?.message || "Bad request"}`
        );
      } else {
        throw new Error(
          `SageStocks API error (${status}): ${
            errorData?.message || "Unknown error"
          }`
        );
      }
    } else if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timeout. SageStocks API took longer than 5 minutes. The analysis may still complete on their end."
      );
    } else {
      throw new Error(`Failed to analyze stock: ${error.message}`);
    }
  }
};
