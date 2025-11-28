# Function Authoring Guide

A practical guide for developers creating Basebase serverless functions.

## 📋 Table of Contents

- [Function Structure](#function-structure)
- [Context Object](#context-object)
- [Parameters & Validation](#parameters--validation)
- [Secrets Management](#secrets-management)
- [Calling Other Functions](#calling-other-functions)
- [Firestore Access](#firestore-access)
- [HTTP Requests](#http-requests)
- [User Authentication](#user-authentication)
- [Logging & Error Handling](#logging--error-handling)
- [Module Restrictions](#module-restrictions)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Function Structure

Every Basebase function follows this signature:

```javascript
/**
 * Brief description of what this function does
 * 
 * @param {Object} params - Function parameters
 * @param {string} params.requiredParam - Description of required parameter
 * @param {string} [params.optionalParam] - Description of optional parameter
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Description of return value
 */
module.exports = async function (params, context) {
  // 1. Validate parameters
  const { requiredParam, optionalParam = 'default' } = params;
  
  if (!requiredParam) {
    throw new Error('requiredParam is required');
  }
  
  // 2. Your function logic here
  context.log('Processing request', { requiredParam });
  
  // 3. Return a result object
  return {
    success: true,
    data: 'your result'
  };
};
```

**Key Points:**
- Always use `async function`
- Export with `module.exports`
- Always validate required parameters
- Return meaningful result objects
- Throw errors with clear messages

## Context Object

The `context` object provides access to system capabilities and metadata:

### Methods

```javascript
// Call other Basebase functions
const result = await context.callFunction(functionId, params);

// Access secrets (app-level or Basebase-provided)
const apiKey = await context.getSecret('API_KEY');

// Get user document from system collection
const user = await context.getUser(userId);
// Returns: { id: 'user123', email: '...', name: '...', ... } or null if not found

// Get app document from system collection
const app = await context.getApp(appId);
// Returns: { id: 'app123', name: '...', secrets: {...}, ... } or null if not found

// Get current app document (using context.appId)
const currentApp = await context.getCurrentApp();
// Returns: { id: 'app123', name: '...', secrets: {...}, ... } or throws if no appId

// Namespaced Firestore access (for app data)
const doc = await context.firebase.collection('users').doc('123').get();

// Raw Firestore access (for system collections like user-secrets)
const db = context.firestore();
const userSecret = await db.collection('user-secrets').doc(userId).get();

// HTTP client (axios)
const response = await context.http.get('https://api.example.com/data');

// Logging
context.log('Info message', { data: value });
context.error('Error message', error);
```

### Metadata Properties

```javascript
context.taskId        // Current task ID
context.functionId    // Current function ID
context.appId         // App ID for multi-tenant isolation (null for framework)
context.userId        // User ID (if provided in task)
context.auth          // Firebase auth object (in some contexts)
context.timestamp     // ISO 8601 timestamp of execution start
```

### NPM Packages

```javascript
context.npm.lodash    // lodash utility library
context.npm.moment    // moment.js for date manipulation
context.npm.axios     // HTTP client (same as context.http)
```

## Parameters & Validation

### Strong Type Validation

Always validate parameters at the start of your function:

```javascript
module.exports = async function (params, context) {
  const { email, name, age } = params;
  
  // Check required parameters
  if (!email) {
    throw new Error('email is required');
  }
  
  if (!name) {
    throw new Error('name is required');
  }
  
  // Type validation
  if (typeof email !== 'string') {
    throw new Error('email must be a string');
  }
  
  if (age !== undefined && typeof age !== 'number') {
    throw new Error('age must be a number');
  }
  
  // Format validation
  if (!email.includes('@')) {
    throw new Error('email must be a valid email address');
  }
  
  // Range validation
  if (age !== undefined && (age < 0 || age > 150)) {
    throw new Error('age must be between 0 and 150');
  }
  
  // Your logic here...
};
```

### Default Values

```javascript
const {
  provider = 'openai',           // Simple default
  model = 'gpt-4',
  temperature = 0.7,
  maxTokens = 1000,
  options = {}                    // Object default
} = params;
```

## Secrets Management

Basebase has a two-tier secrets system:

### Secret Resolution Order

1. **App-level secrets** (in Firestore `apps/{appId}/secrets`)
2. **Basebase secrets** (in GCP Secret Manager)

### Usage

```javascript
// Get a secret (checks app secrets first, then Basebase secrets)
const apiKey = await context.getSecret('OPENAI_API_KEY');

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured');
}

// Use the secret
const response = await context.http.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
}, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});
```

### Common Secret Keys

**Framework secrets** (Basebase-provided):
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `SLACK_BOT_TOKEN` - Slack bot token
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `BRAVE_API_KEY` - Brave Search API key
- `AIRTABLE_API_KEY` - Airtable API key
- `GMAIL_CLIENT_ID` - Gmail OAuth client ID
- `GMAIL_CLIENT_SECRET` - Gmail OAuth client secret

**App secrets** (customer-provided):
- Any custom secret keys your app needs

## Calling Other Functions

Compose functionality by calling other Basebase functions:

```javascript
module.exports = async function (params, context) {
  // Call a single function
  const searchResults = await context.callFunction('webSearch', {
    query: params.query,
    limit: 5
  });
  
  // Call multiple functions in sequence
  const summary = await context.callFunction('askLLM', {
    provider: 'openai',
    model: 'gpt-4',
    message: `Summarize: ${JSON.stringify(searchResults)}`
  });
  
  await context.callFunction('postToSlack', {
    channel: params.channel,
    message: summary.response
  });
  
  return {
    success: true,
    searchResultCount: searchResults.results.length,
    summary: summary.response
  };
};
```

**Important:**
- `callFunction` creates a child task and waits for completion
- Child tasks inherit `userId` and `appId` from parent
- Failures in child tasks propagate to parent
- Default timeout: 5 minutes per call

## Firestore Access

Access Firestore with automatic app-level namespacing for data isolation:

### Direct Firebase API

```javascript
module.exports = async function (params, context) {
  // Write a document
  await context.firebase.collection('users').doc('user123').set({
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: context.firebase.FieldValue.serverTimestamp()
  });
  
  // Read a document
  const userDoc = await context.firebase.collection('users').doc('user123').get();
  const userData = userDoc.data();
  
  // Query a collection
  const activeUsersSnapshot = await context.firebase
    .collection('users')
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  
  const activeUsers = [];
  activeUsersSnapshot.forEach(doc => {
    activeUsers.push({ id: doc.id, ...doc.data() });
  });
  
  // Update a document
  await context.firebase.collection('users').doc('user123').update({
    lastActive: context.firebase.FieldValue.serverTimestamp()
  });
  
  // Delete a document
  await context.firebase.collection('users').doc('user123').delete();
  
  return {
    userData,
    activeCount: activeUsers.length,
    activeUsers
  };
};
```

### Using Framework Functions

```javascript
// Save data
await context.callFunction('saveToFirestore', {
  collection: 'users',
  documentId: 'user123',
  data: { name: 'John Doe', email: 'john@example.com' }
});

// Read data
const result = await context.callFunction('readFromFirestore', {
  collection: 'users',
  documentId: 'user123'
});

// Query data
const orders = await context.callFunction('readFromFirestore', {
  collection: 'orders',
  where: [
    { field: 'status', operator: '==', value: 'pending' },
    { field: 'total', operator: '>', value: 100 }
  ],
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 10
});
```

### Security & Namespacing

**Automatic namespacing (via `context.firebase`):**
- All collection names are prefixed with `{appId}_`
- Example: `users` becomes `myapp_users` in Firestore
- Ensures data isolation between apps

**Protected system collections:**
- Cannot access via `context.firebase`: `tasks`, `functions`, `apps`, `secrets`, `schedules`, `user-secrets`
- These are system collections

**Accessing system collections:**
- Use `context.firestore()` to get raw Firestore access
- Example: `const db = context.firestore(); await db.collection('user-secrets').doc(userId).get();`
- Only use for legitimate system operations (e.g., storing OAuth tokens in `user-secrets`)

**Requirements:**
- Functions must have an `appId` to use `context.firebase`
- Collection names must match `/^[a-zA-Z0-9_-]+$/`

## HTTP Requests

Make HTTP requests using the built-in axios client:

### GET Request

```javascript
const response = await context.http.get('https://api.example.com/data', {
  params: { limit: 10, page: 1 },
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

const data = response.data;
```

### POST Request

```javascript
const response = await context.http.post('https://api.example.com/create', {
  name: 'John Doe',
  email: 'john@example.com'
}, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000  // 10 second timeout
});
```

### Error Handling

```javascript
try {
  const response = await context.http.get('https://api.example.com/data');
  return response.data;
} catch (error) {
  if (error.response) {
    // Server responded with error status
    context.error('API error', {
      status: error.response.status,
      data: error.response.data
    });
    throw new Error(`API returned ${error.response.status}: ${error.response.data.message}`);
  } else if (error.request) {
    // Request made but no response
    throw new Error('No response from API');
  } else {
    // Request setup error
    throw new Error(`Request failed: ${error.message}`);
  }
}
```

## User Authentication

Functions can operate on behalf of specific users:

### Accessing User ID and User Document

```javascript
module.exports = async function (params, context) {
  const userId = context.auth?.uid || context.userId;
  
  if (!userId) {
    throw new Error('User must be authenticated');
  }
  
  context.log('Processing for user', { userId });
  
  // Get the full user document from the users collection
  const user = await context.getUser(userId);
  
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  
  context.log('User details', { 
    email: user.email, 
    name: user.name 
  });
  
  // Use userId in your logic
  await context.firebase.collection('user-data').doc(userId).set({
    lastAction: context.firebase.FieldValue.serverTimestamp()
  });
  
  return { success: true, userId, userName: user.name };
};
```

### Accessing App Configuration

Access the current app's configuration and settings:

```javascript
module.exports = async function (params, context) {
  // Get the current app document
  const app = await context.getCurrentApp();
  
  if (!app) {
    throw new Error('App not found');
  }
  
  context.log('App configuration', {
    appName: app.name,
    hasSecrets: !!app.secrets
  });
  
  // Access app-level secrets directly from the app document
  const apiKey = app.secrets?.CUSTOM_API_KEY;
  
  if (!apiKey) {
    throw new Error('CUSTOM_API_KEY not configured for this app');
  }
  
  // Your logic here...
  return { success: true, appName: app.name };
};
```

### User-Specific Secrets

Access secrets stored per-user (e.g., OAuth tokens):

```javascript
module.exports = async function (params, context) {
  const userId = context.userId;
  
  if (!userId) {
    throw new Error('User must be authenticated');
  }
  
  // Read user secrets from user-secrets collection (system collection)
  const db = context.firestore();
  const userSecretDoc = await db.collection('user-secrets').doc(userId).get();
  
  if (!userSecretDoc.exists) {
    throw new Error('User has not connected their account');
  }
  
  const userSecrets = userSecretDoc.data();
  const googleTokens = userSecrets.services?.google;
  
  if (!googleTokens) {
    throw new Error('User has not connected Google account');
  }
  
  // Use the access token
  const accessToken = googleTokens.accessToken; // May be encrypted
  
  // Your logic here...
};
```

## Logging & Error Handling

### Logging

```javascript
// Info logging
context.log('Processing started', { userId: '123', action: 'sync' });

// Error logging
context.error('Failed to fetch data', error);

// Structured logging
context.log('API call completed', {
  endpoint: '/api/data',
  duration: 1234,
  status: 200
});
```

### Error Handling

```javascript
module.exports = async function (params, context) {
  try {
    // Validate parameters
    if (!params.email) {
      throw new Error('email is required');
    }
    
    // Your logic
    const result = await someAsyncOperation();
    
    return { success: true, result };
    
  } catch (error) {
    // Log the error
    context.error('Function failed', error);
    
    // Re-throw with context
    throw new Error(`Failed to process ${params.email}: ${error.message}`);
  }
};
```

**Error propagation:**
- Thrown errors are caught by the task processor
- Task status becomes `failed` with error details
- Tasks are automatically retried (default: 3 attempts)
- Use clear error messages for debugging

## Module Restrictions

Functions run in a sandboxed VM with limited module access:

### Allowed Modules

```javascript
require('lodash')      // Utility functions
require('moment')      // Date/time manipulation
require('axios')       // HTTP client
require('buffer')      // Buffer operations
require('crypto')      // Encryption/hashing (Node.js built-in)
require('scrapingbee') // Web scraping service
```

### Not Allowed

- `fs` - File system access
- `child_process` - Process execution
- `net`, `http`, `https` - Direct network (use `context.http`)
- Custom npm packages (unless added to allowed list)

### Using Allowed Modules

```javascript
module.exports = async function (params, context) {
  const crypto = require('crypto');
  const _ = require('lodash');
  
  // Hash a password
  const hash = crypto.createHash('sha256').update(params.password).digest('hex');
  
  // Use lodash
  const grouped = _.groupBy(params.items, 'category');
  
  return { hash, grouped };
};
```

## Best Practices

### 1. Parameter Validation

Always validate at the top of your function:

```javascript
module.exports = async function (params, context) {
  // Validate early
  if (!params.email) throw new Error('email is required');
  if (!params.action) throw new Error('action is required');
  
  // Continue with logic...
};
```

### 2. Clear Error Messages

```javascript
// ❌ Bad
throw new Error('Invalid input');

// ✅ Good
throw new Error('email must be a valid email address');
throw new Error('age must be between 0 and 150');
throw new Error(`Unsupported action: ${action}. Use 'create', 'update', or 'delete'`);
```

### 3. Structured Returns

```javascript
// ✅ Always return objects with clear structure
return {
  success: true,
  data: result,
  metadata: {
    recordsProcessed: 10,
    duration: Date.now() - startTime
  }
};
```

### 4. Idempotency

Design functions to be safely retryable:

```javascript
// Check if operation already completed
const existing = await context.firebase
  .collection('orders')
  .doc(params.orderId)
  .get();

if (existing.exists && existing.data().status === 'completed') {
  context.log('Order already processed', { orderId: params.orderId });
  return { success: true, alreadyProcessed: true };
}

// Continue with operation...
```

### 5. Timeouts

Set reasonable timeouts for external calls:

```javascript
const response = await context.http.get('https://api.example.com/data', {
  timeout: 10000  // 10 seconds
});
```

### 6. Logging

Log key steps for debugging:

```javascript
context.log('Starting data sync', { source: 'api', destination: 'firestore' });

const data = await fetchData();
context.log('Data fetched', { recordCount: data.length });

await saveData(data);
context.log('Data saved successfully');
```

### 7. Secret Checking

Always check if secrets are available:

```javascript
const apiKey = await context.getSecret('API_KEY');

if (!apiKey) {
  throw new Error('API_KEY not configured. Please set up secrets.');
}
```

## Examples

### Example 1: Simple Data Processing

```javascript
/**
 * Process user data and save to Firestore
 * 
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {Object} params.data - Data to save
 * @param {Object} context
 * @returns {Promise<Object>}
 */
module.exports = async function (params, context) {
  const { userId, data } = params;
  
  // Validate
  if (!userId) throw new Error('userId is required');
  if (!data) throw new Error('data is required');
  
  context.log('Processing user data', { userId });
  
  // Save to Firestore
  await context.firebase.collection('user-data').doc(userId).set({
    ...data,
    updatedAt: context.firebase.FieldValue.serverTimestamp()
  });
  
  return {
    success: true,
    userId,
    recordsSaved: Object.keys(data).length
  };
};
```

### Example 2: API Integration

```javascript
/**
 * Fetch weather data from external API
 * 
 * @param {Object} params
 * @param {string} params.city - City name
 * @param {Object} context
 * @returns {Promise<Object>}
 */
module.exports = async function (params, context) {
  const { city } = params;
  
  if (!city) throw new Error('city is required');
  
  // Get API key
  const apiKey = await context.getSecret('WEATHER_API_KEY');
  if (!apiKey) {
    throw new Error('WEATHER_API_KEY not configured');
  }
  
  context.log('Fetching weather', { city });
  
  try {
    const response = await context.http.get('https://api.weather.com/v1/weather', {
      params: { city, apiKey },
      timeout: 10000
    });
    
    return {
      success: true,
      city,
      weather: response.data
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`City not found: ${city}`);
    }
    throw error;
  }
};
```

### Example 3: Function Composition

```javascript
/**
 * Research workflow: search web, analyze with LLM, post to Slack
 * 
 * @param {Object} params
 * @param {string} params.query - Search query
 * @param {string} params.channel - Slack channel
 * @param {Object} context
 * @returns {Promise<Object>}
 */
module.exports = async function (params, context) {
  const { query, channel } = params;
  
  if (!query) throw new Error('query is required');
  if (!channel) throw new Error('channel is required');
  
  context.log('Starting research workflow', { query });
  
  // Step 1: Web search
  const searchResults = await context.callFunction('webSearch', {
    query,
    limit: 5
  });
  
  context.log('Search completed', { resultCount: searchResults.results.length });
  
  // Step 2: LLM analysis
  const analysis = await context.callFunction('askLLM', {
    provider: 'openai',
    model: 'gpt-4',
    message: `Analyze these search results and provide key insights:\n\n${JSON.stringify(searchResults.results)}`
  });
  
  context.log('Analysis completed');
  
  // Step 3: Post to Slack
  await context.callFunction('postToSlack', {
    channel,
    message: `🔍 Research: ${query}\n\n${analysis.response}`
  });
  
  context.log('Posted to Slack');
  
  return {
    success: true,
    query,
    searchResultCount: searchResults.results.length,
    analysis: analysis.response,
    channel
  };
};
```

### Example 4: User-Specific Function

```javascript
/**
 * Sync user's calendar events
 * 
 * @param {Object} params
 * @param {string} params.calendarId - Calendar ID
 * @param {Object} context
 * @returns {Promise<Object>}
 */
module.exports = async function (params, context) {
  const { calendarId } = params;
  const userId = context.userId;
  
  // Require authentication
  if (!userId) {
    throw new Error('User must be authenticated');
  }
  
  if (!calendarId) {
    throw new Error('calendarId is required');
  }
  
  context.log('Syncing calendar', { userId, calendarId });
  
  // Get user's OAuth tokens from system collection
  const db = context.firestore();
  const userSecretDoc = await db.collection('user-secrets').doc(userId).get();
  
  if (!userSecretDoc.exists) {
    throw new Error('User has not connected their Google account');
  }
  
  const googleTokens = userSecretDoc.data().services?.google;
  if (!googleTokens) {
    throw new Error('Google account not connected');
  }
  
  // Fetch calendar events
  const response = await context.http.get(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      headers: {
        'Authorization': `Bearer ${googleTokens.accessToken}`
      },
      timeout: 15000
    }
  );
  
  const events = response.data.items;
  
  // Save to user's collection
  for (const event of events) {
    await context.firebase.collection('calendar-events').doc(event.id).set({
      userId,
      calendarId,
      title: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      syncedAt: context.firebase.FieldValue.serverTimestamp()
    });
  }
  
  context.log('Calendar synced', { eventCount: events.length });
  
  return {
    success: true,
    userId,
    calendarId,
    eventsSynced: events.length
  };
};
```

---

## 🚀 Next Steps

1. Write your function following this guide
2. Test locally using `node tests/testRunner.js yourFunction`
3. Upload to production (see deployment docs)
4. Create tasks or schedules to execute your function

## 📚 Additional Resources

- [READ_FUNCTION_STANDARD.md](functions/framework/READ_FUNCTION_STANDARD.md) - Detailed function standards
- [README.md](README.md) - Complete framework documentation
- Framework function examples in `functions/framework/`
- User function examples in `functions/user/`

