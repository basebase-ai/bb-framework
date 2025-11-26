# OAuth Integration Guide

The Basebase Framework provides a unified, secure OAuth system that works with multiple providers (Google, Microsoft, GitHub, etc.). Tokens are stored centrally in the `user-secrets` collection and are accessible to any app the user authorizes.

## Architecture

### Token Storage

All OAuth tokens are stored in the global `user-secrets` collection:

```
/user-secrets/{userId}
  ├── userId: string
  ├── services: {
  │     google: {
  │       accessToken: string (encrypted),
  │       refreshToken: string (encrypted),
  │       expiresAt: timestamp,
  │       tokenType: string,
  │       scope: string,
  │       grantedAt: timestamp
  │     },
  │     microsoft: { ... },
  │     github: { ... }
  │   }
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

**Key Benefits:**
- ✅ One document per user (userId as document ID)
- ✅ Tokens encrypted at rest (AES-256-GCM)
- ✅ Firestore rules ensure only the user can read their tokens
- ✅ Multiple providers in one document
- ✅ Shared across all apps (user grants access once)
- ✅ Automatic token refresh

### Security Rules

```javascript
match /user-secrets/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Frontend Integration

### Using the `useOAuth` Hook

```jsx
import { useOAuth, OAuthScopes } from "../../../framework/hooks/useOAuth.js";

function MyComponent() {
  const {
    isConnected,
    isExpired,
    tokens,
    loading,
    error,
    initiateOAuth,
    refreshAccessToken,
    disconnect,
  } = useOAuth("google");

  const handleConnect = () => {
    initiateOAuth({
      scopes: [
        OAuthScopes.google.gmail.readonly,
        OAuthScopes.google.gmail.modify,
      ],
      redirectUri: window.location.origin + window.location.pathname,
    });
  };

  if (loading) return <Loader />;

  return (
    <div>
      {isConnected ? (
        <>
          <Badge color="green">Connected</Badge>
          <Button onClick={disconnect}>Disconnect</Button>
        </>
      ) : (
        <Button onClick={handleConnect}>Connect Gmail</Button>
      )}
    </div>
  );
}
```

### Available OAuth Scopes

```javascript
// Google
OAuthScopes.google.gmail.readonly
OAuthScopes.google.gmail.modify
OAuthScopes.google.gmail.send
OAuthScopes.google.drive.readonly
OAuthScopes.google.calendar.readonly

// Microsoft
OAuthScopes.microsoft.mail.read
OAuthScopes.microsoft.mail.readWrite
OAuthScopes.microsoft.calendar.read

// GitHub
OAuthScopes.github.repo
OAuthScopes.github.user
```

## Backend Integration

### Using OAuth Tokens in Functions

```javascript
const { getOAuthToken, isOAuthConnected } = require("./lib/oauth-utils.js");

module.exports = async function (params, context) {
  const userId = context.auth.uid;

  // Check if user has Gmail connected
  const hasGmail = await isOAuthConnected(userId, "google", context);
  if (!hasGmail) {
    throw new Error("Gmail not connected");
  }

  // Get valid access token (auto-refreshes if expired)
  const accessToken = await getOAuthToken(userId, "google", context);

  // Use token to call Gmail API
  const { google } = require("googleapis");
  const gmail = google.gmail({ version: "v1" });
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await gmail.users.messages.list({
    userId: "me",
    auth: oauth2Client,
    maxResults: 10,
  });

  return {
    success: true,
    messages: response.data.messages,
  };
};
```

### OAuth Utility Functions

#### `getOAuthToken(userId, provider, context)`
Gets a valid access token, automatically refreshing if expired.

```javascript
const token = await getOAuthToken("user123", "google", context);
```

#### `isOAuthConnected(userId, provider, context)`
Checks if user has connected a specific provider.

```javascript
const connected = await isOAuthConnected("user123", "google", context);
```

#### `getConnectedProviders(userId, context)`
Gets list of all connected providers for a user.

```javascript
const providers = await getConnectedProviders("user123", context);
// Returns: ["google", "github"]
```

#### `getOAuthTokenInfo(userId, provider, context)`
Gets token metadata without the actual token.

```javascript
const info = await getOAuthTokenInfo("user123", "google", context);
// Returns: { provider, expiresAt, isExpired, tokenType, scope, grantedAt }
```

## Setup Instructions

### 1. Configure OAuth Provider

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select project
3. Enable APIs (Gmail, Drive, Calendar, etc.)
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:5173/apps/yourapp`
   - Production: `https://yourdomain.com/apps/yourapp`

#### Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com)
2. Register application in Azure AD
3. Configure redirect URIs
4. Add API permissions (Mail.Read, etc.)

#### GitHub OAuth

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL

### 2. Set Environment Variables

Add OAuth credentials as secrets (server-side only):

```bash
# Google (note: uses GMAIL prefix per framework convention)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret

# Microsoft
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Encryption key (32+ characters)
ENCRYPTION_KEY=your_secure_encryption_key_here
```

**Frontend environment variables** (for OAuth URLs):

These are used to construct the OAuth authorization URL. They can be public (included in frontend bundle).

```bash
# .env.local
VITE_GMAIL_CLIENT_ID=your_gmail_client_id
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

**Note about redirect URIs:** Redirect URIs are NOT stored as secrets because they vary per app. Each app passes its own redirect URI when initiating OAuth, and it's included in the state parameter for security.

### 3. Deploy Framework Functions

```bash
npm run function:commit oauthExchange
npm run function:commit oauthRefresh
npm run function:commit oauthRevoke
```

## OAuth Flow

### Complete Flow Diagram

```
1. User clicks "Connect Gmail"
   ↓
2. Frontend: initiateOAuth({ scopes: [...] })
   ↓
3. Redirect to Google OAuth consent screen
   ↓
4. User authorizes permissions
   ↓
5. Google redirects back: /apps/myapp?code=ABC123&state=...
   ↓
6. Frontend detects code in URL
   ↓
7. Frontend calls useFunction("oauthExchange")
   ↓
8. Backend exchanges code for tokens
   ↓
9. Backend encrypts and stores in user-secrets
   ↓
10. Frontend subscription updates (isConnected = true)
    ↓
11. User can now use connected features
```

### Automatic Token Refresh

When a backend function calls `getOAuthToken()`:

```
1. Check if token is expired
   ↓
2. If expired → call oauthRefresh function
   ↓
3. oauthRefresh uses refresh_token to get new access_token
   ↓
4. Update user-secrets with new token
   ↓
5. Return valid access_token
```

## Adding a New Provider

To add support for a new OAuth provider (e.g., Dropbox):

### 1. Update `useOAuth.js`

Add provider configuration in `buildOAuthUrl()`:

```javascript
dropbox: {
  authUrl: "https://www.dropbox.com/oauth2/authorize",
  params: {
    client_id: import.meta.env.VITE_DROPBOX_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  },
},
```

### 2. Update `oauthExchange.js`

Add token exchange configuration:

```javascript
dropbox: {
  tokenUrl: "https://api.dropbox.com/oauth2/token",
  clientId: await context.getSecret("DROPBOX_CLIENT_ID"),
  clientSecret: await context.getSecret("DROPBOX_CLIENT_SECRET"),
  grantType: "authorization_code",
},
```

### 3. Update `oauthRefresh.js` (if provider supports refresh)

Add refresh configuration:

```javascript
dropbox: {
  tokenUrl: "https://api.dropbox.com/oauth2/token",
  clientId: await context.getSecret("DROPBOX_CLIENT_ID"),
  clientSecret: await context.getSecret("DROPBOX_CLIENT_SECRET"),
},
```

### 4. Add OAuth Scopes

```javascript
export const OAuthScopes = {
  // ... existing scopes ...
  dropbox: {
    files: "files.content.read",
    account: "account_info.read",
  },
};
```

## Best Practices

### Security

- ✅ Always use HTTPS in production
- ✅ Never expose client secrets in frontend code
- ✅ Set strong `ENCRYPTION_KEY` (32+ characters)
- ✅ Use minimal required scopes
- ✅ Validate state parameter to prevent CSRF
- ✅ Rotate encryption keys periodically

### User Experience

- ✅ Show clear permission requests
- ✅ Explain why you need each scope
- ✅ Provide disconnect functionality
- ✅ Handle token expiration gracefully
- ✅ Show connection status clearly

### Error Handling

```javascript
const { initiateOAuth } = useOAuth("google");

const handleConnect = async () => {
  try {
    initiateOAuth({
      scopes: [OAuthScopes.google.gmail.readonly],
    });
  } catch (error) {
    if (error.message.includes("popup blocked")) {
      // Handle popup blocker
    } else if (error.message.includes("cancelled")) {
      // User cancelled OAuth
    } else {
      // Generic error
    }
  }
};
```

## Examples

### Example 1: Gmail Integration

See `/apps/nomail` for a complete Gmail integration example.

### Example 2: Using Multiple Providers

```javascript
function MultiProviderComponent() {
  const gmail = useOAuth("google");
  const outlook = useOAuth("microsoft");
  const github = useOAuth("github");

  return (
    <Stack>
      <EmailConnection oauth={gmail} provider="Gmail" />
      <EmailConnection oauth={outlook} provider="Outlook" />
      <CodeConnection oauth={github} provider="GitHub" />
    </Stack>
  );
}
```

### Example 3: Backend Function with OAuth

```javascript
// functions/syncGoogleCalendar.js
const { getOAuthToken } = require("./lib/oauth-utils.js");

module.exports = async function (params, context) {
  const userId = context.auth.uid;
  const token = await getOAuthToken(userId, "google", context);

  const { google } = require("googleapis");
  const calendar = google.calendar({ version: "v3" });
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });

  const events = await calendar.events.list({
    calendarId: "primary",
    auth: oauth2Client,
    timeMin: new Date().toISOString(),
    maxResults: 10,
  });

  return {
    success: true,
    events: events.data.items,
  };
};
```

## Troubleshooting

### "No OAuth tokens found"
- User hasn't connected the provider yet
- Check `isConnected` before calling OAuth functions

### "Token expired" errors
- Refresh token may be invalid
- User needs to re-authenticate
- Check provider's token expiration policies

### "Invalid client" errors
- Client ID/secret mismatch
- Check environment variables
- Ensure secrets are set in backend

### "Redirect URI mismatch"
- Redirect URI in code doesn't match provider settings
- Update provider configuration to include all URIs

## Resources

- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft OAuth Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [GitHub OAuth Guide](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)

