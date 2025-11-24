# Server Functions

This directory contains example server functions that can be called from your apps.

## What are Server Functions?

Server functions run in a secure Node.js environment with access to:
- Firebase Admin SDK (full database access)
- External APIs (OpenAI, SendGrid, etc.)
- npm packages
- Sensitive credentials

They're perfect for:
- AI/LLM operations (GPT, Claude, etc.)
- Email sending
- PDF generation
- Data processing
- External API calls
- Complex calculations

## Function Structure

```javascript
/**
 * Brief description of what this function does
 * @param {Object} params - Function parameters
 * @param {string} params.someParam - Description
 * @param {Object} context - Function context
 * @param {Object} context.firebase - Firebase Admin SDK
 * @param {Function} context.log - Log function
 * @param {Function} context.error - Error logging
 * @param {Function} context.callFunction - Call another function
 * @returns {Promise<Object>} Result object with success flag
 */
module.exports = async function (params, context) {
  // 1. Validate parameters
  if (!params.someParam) {
    throw new Error("someParam is required");
  }

  // 2. Do work
  const result = await doSomething(params.someParam);

  // 3. Return result
  return {
    success: true,
    data: result,
  };
};
```

## Using Functions in Your App

```javascript
import { useFunction } from "../../../framework/hooks/useFunction.js";

function MyComponent() {
  const { call, loading, result, error } = useFunction("askLLM");

  const handleAskAI = async () => {
    const response = await call({
      provider: "openai",
      model: "gpt-4",
      systemPrompt: "You are a helpful assistant",
      message: "What is React?",
    });

    console.log(response.response);
  };

  return (
    <Button onClick={handleAskAI} loading={loading}>
      Ask AI
    </Button>
  );
}
```

## Managing Functions

### List Available Functions
```bash
npm run function:list
```

### Download a Function
```bash
npm run function:checkout askLLM
```

### Upload a Function
```bash
npm run function:commit askLLM
```

## Example Functions

### askLLM
Call any LLM (OpenAI, Anthropic) with a prompt.

```javascript
const response = await askLLM({
  provider: "openai",
  model: "gpt-4",
  systemPrompt: "You are a helpful assistant",
  message: "Explain React hooks",
  temperature: 0.7,
});
```

### enrichData
Enrich Firestore documents with AI-generated data.

```javascript
const result = await enrichData({
  collection: "crm_leads",
  query: { field: "status", operator: "==", value: "new" },
  inputFields: ["name", "company", "notes"],
  outputFields: ["aiSummary", "aiScore", "aiCategory"],
  systemPrompt: "Analyze this lead and return JSON with aiSummary, aiScore (0-100), and aiCategory (hot/warm/cold)",
  maxDocs: 50,
});
```

### sendEmail
Send transactional emails via SendGrid.

```javascript
const result = await sendEmail({
  to: "user@example.com",
  subject: "Welcome!",
  template: "welcome",
  data: { userName: "John" },
});
```

## Creating Custom Functions

1. Create a new file in `/functions` (e.g., `myFunction.js`)
2. Follow the function structure above
3. Test locally (functions run on server, not locally)
4. Upload to Firestore: `npm run function:commit myFunction`
5. Use in your app with `useFunction("myFunction")`

## Important Notes

- Functions run on the server with full Firebase Admin access
- They can access sensitive environment variables and API keys
- Always validate input parameters
- Return `{ success: true, ...data }` for successful results
- Throw errors for failures (they'll be caught and returned to client)
- Use `context.log()` for debugging (appears in server logs)

