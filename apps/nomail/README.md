# NoMail - Smart Email Filtering

NoMail is an intelligent email management app that uses AI to filter your Gmail inbox and show only messages that actually need your attention.

## How It Works

1. **Connect Gmail**: Users authenticate with their Gmail account via OAuth 2.0
2. **AI Analysis**: Every hour, NoMail fetches new emails and sends them to an AI model
3. **Smart Filtering**: The AI identifies which emails need responses based on content, sender, and urgency
4. **Clean Inbox**: Users see only important emails that require their attention

## Features

- ✅ Gmail OAuth authentication
- 🤖 AI-powered email importance detection
- 📱 Optional SMS notifications for important emails
- 🔄 Automatic hourly inbox checking
- 📧 Clean, focused interface showing only what matters
- ✨ Mark as read and archive actions

## Setup Requirements

### 1. Google Cloud Project

To use Gmail integration, you need to set up a Google Cloud Project:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. OAuth 2.0 Credentials

Create OAuth credentials for your app:

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URIs:
   - Development: `http://localhost:5173/apps/nomail`
   - Production: `https://yourdomain.com/apps/nomail`
5. Save your Client ID and Client Secret

### 3. Environment Variables

The server environment should already have Gmail credentials configured as:

```bash
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
```

For the frontend (to construct OAuth URLs), add to `.env.local`:

```bash
VITE_GMAIL_CLIENT_ID=your_client_id_here
```

**Note:** No redirect URI environment variable is needed - each app provides its own redirect URI when initiating OAuth.

### 4. Required OAuth Scopes

- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.modify` - Mark emails as read

### 5. Backend Setup

Deploy the `checkEmails` function:

```bash
npm run function:commit checkEmails
```

Set up a scheduled task to run `checkEmails` hourly (no userId parameter for batch processing).

## Usage

### For Users

1. **Sign In**: Log in with your Basebase account
2. **Connect Gmail**: Go to Settings and click "Connect Gmail"
3. **Authorize**: Grant permissions to read your Gmail
4. **Optional**: Add your phone number for SMS notifications
5. **Done**: NoMail will automatically check your inbox every hour

### For Developers

#### Frontend Components

- `SettingsPanel.jsx` - Gmail OAuth setup and configuration
- `EmailList.jsx` - Display filtered important emails
- `EmailCard.jsx` - Individual email display with actions

#### Backend Functions

- `checkEmails.js` - Main function to fetch and analyze emails
  - Fetches new Gmail messages
  - Uses AI to determine importance
  - Stores important messages in Firestore

#### Schema

Collections:
- `nomail_user_configs` - User Gmail tokens and settings
- `nomail_emails` - Filtered important emails

## AI Filtering Logic

The AI considers emails important if they:

- ✅ Contain direct questions or requests
- ✅ Require action or decisions
- ✅ Are from important contacts (boss, clients, family)
- ✅ Contain time-sensitive information
- ✅ Are personal (not automated)

The AI ignores:

- ❌ Automated notifications and receipts
- ❌ Marketing and promotional emails
- ❌ Newsletters and updates
- ❌ FYI/informational only messages
- ❌ No-reply addresses

## Security

- OAuth tokens are stored securely in Firestore
- Access tokens expire after 1 hour
- Refresh tokens are used to obtain new access tokens
- All Gmail API calls are made server-side
- Client secrets are never exposed to the frontend

## Future Enhancements

- [ ] Implement full Gmail OAuth flow
- [ ] Add SMS notifications via Twilio
- [ ] Support for multiple email accounts
- [ ] Custom filtering rules
- [ ] Quick reply templates
- [ ] Email snoozing
- [ ] Priority levels (urgent, normal, low)
- [ ] Search and filters
- [ ] Email threading support

## Development

```bash
# Start development server
npm run dev

# Check for new emails manually
# (Will be automated in production)
```

## Production Deployment

1. Commit the app: `npm run app:commit nomail`
2. Commit the function: `npm run function:commit checkEmails`
3. Set up a cron job or scheduled task to call `checkEmails` every hour
4. Configure Google OAuth credentials in production environment

## Support

For issues or questions, contact the development team.

