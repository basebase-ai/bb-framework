/**
 * Framework function: Send SMS via Twilio
 * @param {Object} params - Function parameters
 * @param {string} params.to - Recipient phone number (E.164 format, e.g. +1234567890)
 * @param {string} params.from - Sender phone number (your Twilio number)
 * @param {string} params.message - Message body (up to 1600 characters)
 * @param {string[]} [params.mediaUrl] - Optional array of media URLs for MMS
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Result object
 */
module.exports = async function (params, context) {
  const { to, from, message, mediaUrl } = params;

  // Validate required parameters
  if (!to) {
    throw new Error("To parameter is required (recipient phone number)");
  }
  if (!from) {
    throw new Error("From parameter is required (sender phone number)");
  }
  if (!message) {
    throw new Error("Message parameter is required");
  }

  // Validate phone number format
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(to)) {
    throw new Error(
      "Invalid 'to' phone number format. Use E.164 format (e.g., +1234567890)"
    );
  }
  if (!phoneRegex.test(from)) {
    throw new Error(
      "Invalid 'from' phone number format. Use E.164 format (e.g., +1234567890)"
    );
  }

  // Validate message length
  if (message.length > 1600) {
    throw new Error("Message cannot exceed 1600 characters");
  }

  context.log("Sending SMS via Twilio", {
    to,
    from,
    messageLength: message.length,
    hasMedia: !!mediaUrl,
  });

  // Get Twilio credentials from secrets
  const accountSid = await context.getSecret("TWILIO_ACCOUNT_SID");
  const authToken = await context.getSecret("TWILIO_AUTH_TOKEN");

  if (!accountSid) {
    throw new Error("Twilio Account SID not configured");
  }
  if (!authToken) {
    throw new Error("Twilio Auth Token not configured");
  }

  // Prepare Twilio API payload
  const payload = {
    To: to,
    From: from,
    Body: message,
  };

  // Add media URLs if provided
  if (mediaUrl && Array.isArray(mediaUrl) && mediaUrl.length > 0) {
    payload.MediaUrl = mediaUrl;
    context.log("Including media URLs", { count: mediaUrl.length });
  }

  // Convert payload to URL-encoded format (Twilio uses form data)
  const formBody = Object.keys(payload)
    .map((key) => {
      if (key === "MediaUrl" && Array.isArray(payload[key])) {
        // Handle media URL array
        return payload[key]
          .map((url) => `${encodeURIComponent(key)}=${encodeURIComponent(url)}`)
          .join("&");
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`;
    })
    .join("&");

  try {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    context.log("Calling Twilio API", {
      endpoint,
      to,
      from,
    });

    // Make HTTP request to Twilio API
    // Twilio uses Basic Auth - axios has built-in support
    const response = await context.http.post(endpoint, formBody, {
      auth: {
        username: accountSid,
        password: authToken,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 15000, // 15 second timeout
    });

    // Check if Twilio API call was successful
    if (!response.data || !response.data.sid) {
      throw new Error("Invalid response from Twilio API");
    }

    const result = {
      success: true,
      messageId: response.data.sid,
      to: response.data.to,
      from: response.data.from,
      status: response.data.status,
      direction: response.data.direction,
      price: response.data.price,
      priceUnit: response.data.price_unit,
      numSegments: response.data.num_segments,
      numMedia: response.data.num_media,
      timestamp: new Date().toISOString(),
      twilioResponse: {
        sid: response.data.sid,
        status: response.data.status,
        dateCreated: response.data.date_created,
        dateSent: response.data.date_sent,
        dateUpdated: response.data.date_updated,
      },
    };

    context.log("SMS sent successfully via Twilio", {
      messageId: result.messageId,
      status: result.status,
      segments: result.numSegments,
    });

    return result;
  } catch (error) {
    context.error("Failed to send SMS via Twilio", error);

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 401) {
        throw new Error(
          "Invalid Twilio credentials (Account SID or Auth Token)"
        );
      } else if (status === 400) {
        // Twilio returns detailed error messages in 400 responses
        const errorMessage = errorData?.message || "Invalid request parameters";
        const errorCode = errorData?.code || "unknown";
        throw new Error(`Twilio API error (${errorCode}): ${errorMessage}`);
      } else if (status === 403) {
        throw new Error(
          "Twilio account lacks permission or insufficient balance"
        );
      } else if (status === 404) {
        throw new Error("Twilio account or resource not found");
      } else if (status === 429) {
        throw new Error("Twilio rate limit exceeded. Please try again later.");
      } else if (errorData && errorData.message) {
        throw new Error(`Twilio API error (${status}): ${errorData.message}`);
      } else {
        throw new Error(`Twilio API error (${status}): ${error.message}`);
      }
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout for Twilio API");
    } else {
      throw new Error(`Network error calling Twilio: ${error.message}`);
    }
  }
};
