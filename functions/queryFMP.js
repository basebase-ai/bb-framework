/**
 * Query Financial Modeling Prep API
 *
 * Fetches stock data from financialmodelingprep.com API.
 * Supports quotes, historical prices, company profiles, financials, and calendars.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.operation - Operation type: 'quote' | 'historical' | 'profile' | 'income-statement' | 'balance-sheet' | 'ratios' | 'rsi' | 'sma' | 'ema' | 'earnings-calendar' | 'dividend-calendar' | 'stock-split-calendar' | 'economic-calendar'
 * @param {string} [params.symbol] - Stock symbol (required for most operations)
 * @param {string} [params.from] - Start date YYYY-MM-DD (for historical/calendar operations)
 * @param {string} [params.to] - End date YYYY-MM-DD (for historical/calendar operations)
 * @param {number} [params.period] - Period for technical indicators (default: 14 for RSI, 50 for SMA, 12 for EMA)
 * @param {string} [params.timeframe] - Timeframe for technical indicators: '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour' | 'daily' (default: 'daily')
 * @param {'annual' | 'quarter'} [params.statementPeriod] - Period for financial statements (default: 'annual')
 * @param {number} [params.limit] - Limit for financial statements (default: 4)
 * @param {string} [params.collectionName] - Optional: Collection to write results to
 * @param {string} [params.documentId] - Optional: Document ID to use (auto-generated if not provided)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} API response with data and optional document reference
 */
module.exports = async function (params, context) {
  const {
    operation,
    symbol,
    from,
    to,
    period,
    timeframe = "daily",
    statementPeriod = "annual",
    limit = 4,
    collectionName,
    documentId,
  } = params;

  // Validate required parameters
  if (!operation) {
    throw new Error("operation parameter is required");
  }

  const validOperations = [
    "quote",
    "historical",
    "profile",
    "income-statement",
    "balance-sheet",
    "ratios",
    "rsi",
    "sma",
    "ema",
    "earnings-calendar",
    "dividend-calendar",
    "stock-split-calendar",
    "economic-calendar",
  ];

  if (!validOperations.includes(operation)) {
    throw new Error(
      `Invalid operation: ${operation}. Valid operations: ${validOperations.join(
        ", "
      )}`
    );
  }

  // Operations that require a symbol
  const symbolRequiredOps = [
    "quote",
    "historical",
    "profile",
    "income-statement",
    "balance-sheet",
    "ratios",
    "rsi",
    "sma",
    "ema",
  ];

  if (symbolRequiredOps.includes(operation) && !symbol) {
    throw new Error(`symbol parameter is required for operation: ${operation}`);
  }

  // Operations that require date range
  const dateRangeOps = [
    "earnings-calendar",
    "dividend-calendar",
    "stock-split-calendar",
    "economic-calendar",
  ];

  if (dateRangeOps.includes(operation) && (!from || !to)) {
    throw new Error(
      `from and to date parameters are required for operation: ${operation}`
    );
  }

  context.log("Querying FMP API", { operation, symbol, from, to });

  // Get FMP API key from secrets
  const apiKey = await context.getSecret("FMP_API_KEY");
  if (!apiKey) {
    throw new Error(
      "FMP_API_KEY not configured. Please set up the API key in app secrets."
    );
  }

  const BASE_URL = "https://financialmodelingprep.com/api/v3";
  const TIMEOUT_MS = 30000;

  try {
    /** @type {string} */
    let endpoint;
    /** @type {Record<string, string | number>} */
    const queryParams = { apikey: apiKey };

    // Build endpoint and params based on operation
    switch (operation) {
      case "quote":
        endpoint = `/quote/${symbol}`;
        break;

      case "historical":
        endpoint = `/historical-price-full/${symbol}`;
        if (from) queryParams.from = from;
        if (to) queryParams.to = to;
        break;

      case "profile":
        endpoint = `/profile/${symbol}`;
        break;

      case "income-statement":
        endpoint = `/income-statement/${symbol}`;
        queryParams.period = statementPeriod;
        queryParams.limit = limit;
        break;

      case "balance-sheet":
        endpoint = `/balance-sheet-statement/${symbol}`;
        queryParams.period = statementPeriod;
        queryParams.limit = limit;
        break;

      case "ratios":
        endpoint = `/ratios/${symbol}`;
        queryParams.period = statementPeriod;
        queryParams.limit = limit;
        break;

      case "rsi":
        endpoint = `/technical_indicator/${timeframe}/${symbol}`;
        queryParams.type = "rsi";
        queryParams.period = period ?? 14;
        break;

      case "sma":
        endpoint = `/technical_indicator/${timeframe}/${symbol}`;
        queryParams.type = "sma";
        queryParams.period = period ?? 50;
        break;

      case "ema":
        endpoint = `/technical_indicator/${timeframe}/${symbol}`;
        queryParams.type = "ema";
        queryParams.period = period ?? 12;
        break;

      case "earnings-calendar":
        endpoint = "/earning_calendar";
        queryParams.from = from;
        queryParams.to = to;
        break;

      case "dividend-calendar":
        endpoint = "/stock_dividend_calendar";
        queryParams.from = from;
        queryParams.to = to;
        break;

      case "stock-split-calendar":
        endpoint = "/stock_split_calendar";
        queryParams.from = from;
        queryParams.to = to;
        break;

      case "economic-calendar":
        endpoint = "/economic_calendar";
        queryParams.from = from;
        queryParams.to = to;
        break;

      default:
        throw new Error(`Unhandled operation: ${operation}`);
    }

    // Build query string
    const queryString = Object.entries(queryParams)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join("&");

    const url = `${BASE_URL}${endpoint}?${queryString}`;

    context.log("Making FMP API request", { endpoint, operation });

    const response = await context.http.get(url, {
      timeout: TIMEOUT_MS,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.data) {
      throw new Error(
        `No data received from FMP API for operation: ${operation}`
      );
    }

    // Process response based on operation
    /** @type {unknown} */
    let data;

    switch (operation) {
      case "quote":
      case "profile":
        // These return arrays, extract first element
        if (Array.isArray(response.data) && response.data.length > 0) {
          data = response.data[0];
        } else {
          throw new Error(`No ${operation} data found for symbol: ${symbol}`);
        }
        break;

      case "historical":
        // Historical returns { symbol, historical: [...] }
        data = response.data.historical ?? response.data;
        break;

      default:
        // All other operations return arrays directly
        data = response.data;
        break;
    }

    context.log("FMP API response received", {
      operation,
      symbol,
      recordCount: Array.isArray(data) ? data.length : 1,
    });

    /** @type {Object | null} */
    let docRef = null;

    // Optionally write to Firestore collection
    if (collectionName) {
      const documentData = {
        operation,
        symbol: symbol ?? null,
        data,
        fetchedAt: context.firebase.FieldValue.serverTimestamp(),
        params: {
          from: from ?? null,
          to: to ?? null,
          period: period ?? null,
          timeframe,
          statementPeriod,
          limit,
        },
      };

      if (documentId) {
        // Use specific document ID
        await context.firebase
          .collection(collectionName)
          .doc(documentId)
          .set(documentData, { merge: true });

        docRef = { id: documentId };
        context.log("Data saved to Firestore with specified ID", {
          collection: collectionName,
          docId: documentId,
        });
      } else {
        // Auto-generate document ID
        docRef = await context.firebase
          .collection(collectionName)
          .add(documentData);

        context.log("Data saved to Firestore", {
          collection: collectionName,
          docId: docRef.id,
        });
      }
    }

    return {
      success: true,
      operation,
      symbol: symbol ?? null,
      data,
      recordCount: Array.isArray(data) ? data.length : 1,
      ...(docRef && {
        docId: docRef.id,
        collection: collectionName,
      }),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    context.error("FMP API request failed", {
      operation,
      symbol,
      error: error.message,
    });

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      context.error("FMP API Error Response", {
        status,
        errorData: JSON.stringify(errorData),
      });

      if (status === 401 || status === 403) {
        throw new Error(
          "FMP API authentication failed. Please check your FMP_API_KEY."
        );
      } else if (status === 429) {
        throw new Error("FMP API rate limit exceeded. Please try again later.");
      } else if (status === 400) {
        throw new Error(
          `FMP API bad request: ${errorData?.message ?? "Invalid parameters"}`
        );
      } else {
        throw new Error(
          `FMP API error (${status}): ${errorData?.message ?? "Unknown error"}`
        );
      }
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new Error(`FMP API request timed out after ${TIMEOUT_MS}ms`);
    } else {
      throw new Error(`FMP API request failed: ${error.message}`);
    }
  }
};
