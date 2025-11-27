// Import Buffer for base64 encoding
const { Buffer } = require("buffer");

/**
 * Helper function to create RFC 2822 formatted email message
 * @param {string} to - Recipient email address(es)
 * @param {string|null} from - Sender email address (null = use authenticated user)
 * @param {string} subject - Email subject
 * @param {string} bodyPlainText - Plain text email body
 * @param {string|null} bodyHtml - HTML email body (optional)
 * @param {string|null} cc - CC recipients
 * @param {string|null} bcc - BCC recipients
 * @param {string|null} replyTo - Reply-To address
 * @returns {string} RFC 2822 formatted email
 */
function createEmailMessage(
  to,
  from,
  subject,
  bodyPlainText,
  bodyHtml,
  cc,
  bcc,
  replyTo
) {
  const lines = [];

  // Add headers
  if (from) {
    lines.push(`From: ${from}`);
  }
  lines.push(`To: ${to}`);

  if (cc) {
    lines.push(`Cc: ${cc}`);
  }

  if (bcc) {
    lines.push(`Bcc: ${bcc}`);
  }

  if (replyTo) {
    lines.push(`Reply-To: ${replyTo}`);
  }

  lines.push(`Subject: ${subject}`);
  lines.push("MIME-Version: 1.0");

  // If HTML body is provided, create multipart/alternative message
  if (bodyHtml) {
    const boundary = "boundary_" + Date.now();
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: quoted-printable");
    lines.push("");
    lines.push(bodyPlainText);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: quoted-printable");
    lines.push("");
    lines.push(bodyHtml);
    lines.push("");
    lines.push(`--${boundary}--`);
  } else {
    // Plain text only
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: quoted-printable");
    lines.push("");
    lines.push(bodyPlainText);
  }

  return lines.join("\r\n");
}

/**
 * Helper function to encode email message in base64url format
 * @param {string} message - RFC 2822 formatted email message
 * @returns {string} Base64url encoded message
 */
function encodeBase64Url(message) {
  const base64 = Buffer.from(message, "utf-8").toString("base64");
  // Convert to base64url format (RFC 4648)
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Framework function: Send email via Gmail
 * @param {Object} params - Function parameters
 * @param {string} params.refreshToken - Gmail OAuth refresh token (long-lived, user-specific)
 * @param {string} params.to - Recipient email address(es) (comma-separated for multiple)
 * @param {string} params.subject - Email subject line
 * @param {string} params.body - Email body (plain text)
 * @param {string} [params.bodyHtml] - HTML version of email body (optional)
 * @param {string} [params.from] - Sender email address (defaults to authenticated user)
 * @param {string} [params.cc] - CC recipients (comma-separated for multiple)
 * @param {string} [params.bcc] - BCC recipients (comma-separated for multiple)
 * @param {string} [params.replyTo] - Reply-To address
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Send result with message ID
 *
 * @example
 * // Send a simple text email
 * sendGmail({
 *   refreshToken: "...",
 *   to: "recipient@example.com",
 *   subject: "Hello",
 *   body: "This is a test email"
 * })
 *
 * @example
 * // Send an HTML email with CC
 * sendGmail({
 *   refreshToken: "...",
 *   to: "recipient@example.com",
 *   cc: "copy@example.com",
 *   subject: "Newsletter",
 *   body: "Plain text version",
 *   bodyHtml: "<h1>HTML Version</h1>"
 * })
 */
module.exports = async function (params, context) {
  const { refreshToken, to, subject, body, bodyHtml, from, cc, bcc, replyTo } =
    params;

  // Validate required parameters
  if (!refreshToken) {
    throw new Error(
      "refreshToken parameter is required (user's Gmail OAuth refresh token)"
    );
  }

  if (!to) {
    throw new Error("to parameter is required (recipient email address)");
  }

  if (!subject) {
    throw new Error("subject parameter is required (email subject line)");
  }

  if (!body) {
    throw new Error("body parameter is required (email body text)");
  }

  // Validate email format for 'to' field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const toAddresses = to.split(",").map((addr) => addr.trim());
  for (const addr of toAddresses) {
    if (!emailRegex.test(addr)) {
      throw new Error(`Invalid email address in 'to' field: ${addr}`);
    }
  }

  // Validate email format for optional fields
  if (from && !emailRegex.test(from.trim())) {
    throw new Error(`Invalid email address in 'from' field: ${from}`);
  }

  if (cc) {
    const ccAddresses = cc.split(",").map((addr) => addr.trim());
    for (const addr of ccAddresses) {
      if (!emailRegex.test(addr)) {
        throw new Error(`Invalid email address in 'cc' field: ${addr}`);
      }
    }
  }

  if (bcc) {
    const bccAddresses = bcc.split(",").map((addr) => addr.trim());
    for (const addr of bccAddresses) {
      if (!emailRegex.test(addr)) {
        throw new Error(`Invalid email address in 'bcc' field: ${addr}`);
      }
    }
  }

  if (replyTo && !emailRegex.test(replyTo.trim())) {
    throw new Error(`Invalid email address in 'replyTo' field: ${replyTo}`);
  }

  context.log("Sending email via Gmail", {
    to,
    subject: subject.substring(0, 50),
    hasHtml: !!bodyHtml,
    hasCc: !!cc,
    hasBcc: !!bcc,
    bodyLength: body.length,
  });

  try {
    // Get fresh access token from refresh token
    const accessToken = await getAccessTokenFromRefreshToken(
      refreshToken,
      context
    );

    // Create RFC 2822 formatted email message
    const emailMessage = createEmailMessage(
      to,
      from || null,
      subject,
      body,
      bodyHtml || null,
      cc || null,
      bcc || null,
      replyTo || null
    );

    // Encode message in base64url format
    const encodedMessage = encodeBase64Url(emailMessage);

    context.log("Sending email via Gmail API", {
      messageLength: emailMessage.length,
      encodedLength: encodedMessage.length,
    });

    // Send email via Gmail API
    const response = await context.http.post(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        raw: encodedMessage,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // Check if Gmail API call was successful
    if (!response.data || !response.data.id) {
      throw new Error("Invalid response from Gmail API");
    }

    const result = {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId || null,
      labelIds: response.data.labelIds || [],
      to,
      subject,
      timestamp: new Date().toISOString(),
    };

    context.log("Email sent successfully via Gmail", {
      messageId: result.messageId,
      threadId: result.threadId,
    });

    return result;
  } catch (error) {
    context.error("Failed to send email via Gmail", error);

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 401) {
        throw new Error(
          "Invalid Gmail access token. Please refresh the token."
        );
      } else if (status === 403) {
        throw new Error(
          "Gmail API access forbidden. Check API permissions and quotas."
        );
      } else if (status === 400) {
        const errorMessage =
          errorData?.error?.message || "Invalid request parameters";
        throw new Error(`Gmail API error: ${errorMessage}`);
      } else if (status === 404) {
        throw new Error("Gmail API endpoint not found");
      } else if (status === 429) {
        throw new Error(
          "Gmail API rate limit exceeded. Please try again later."
        );
      } else if (errorData && errorData.error && errorData.error.message) {
        throw new Error(`Gmail API error: ${errorData.error.message}`);
      } else {
        throw new Error(`Gmail API error (${status}): ${error.message}`);
      }
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout for Gmail API");
    } else {
      throw new Error(`Network error calling Gmail API: ${error.message}`);
    }
  }
};

/**
 * Exchange refresh token for access token
 * @param {string} refreshToken - Gmail OAuth refresh token
 * @param {Object} context - Function context
 * @returns {Promise<string>} Access token
 */
async function getAccessTokenFromRefreshToken(refreshToken, context) {
  context.log("Refreshing Gmail access token");

  // Get OAuth credentials from secrets
  const clientId = await context.getSecret("GMAIL_CLIENT_ID");
  const clientSecret = await context.getSecret("GMAIL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET secrets."
    );
  }

  try {
    // Build form data manually
    const formData = `client_id=${encodeURIComponent(
      clientId
    )}&client_secret=${encodeURIComponent(
      clientSecret
    )}&refresh_token=${encodeURIComponent(
      refreshToken
    )}&grant_type=refresh_token`;

    const response = await context.http.post(
      "https://oauth2.googleapis.com/token",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );

    if (!response.data.access_token) {
      throw new Error("No access token received from Google OAuth");
    }

    context.log("Successfully refreshed access token");
    return response.data.access_token;
  } catch (error) {
    context.error("Failed to refresh access token", error);

    if (error.response) {
      const errorData = error.response.data;
      throw new Error(
        `Failed to refresh Gmail token: ${
          errorData.error_description || errorData.error || "Unknown error"
        }`
      );
    }

    throw new Error(`Failed to refresh Gmail token: ${error.message}`);
  }
}
