# Basebase Framework

> Build real, connected, multi-user applications from day one. No mock data. No disconnected components. Just real apps with real data.

## What Is This?

Basebase is a web application development and deployment framework providing always-on database access, local state management, user authentication, third-party API access and more. When you build an app on Basebase, you can use any IDE and AI coding assistant, and you are guaranteed that your app is already connected to real data and APIs, and sharable to other users, from the very start.

**Key Features:**

- 🔥 Firebase-native (Firestore + Auth built-in)
- ⚡ Real-time data sync across all clients
- 🔒 Multi-tenant security (thousands of users, one Firebase project)
- 🚀 Optimistic UI updates by default
- 🤖 AI-friendly code structure
- 📦 No backend needed (direct Firestore access)

## Quick Start (2 minutes)

### 1. Clone and Install

Run

```bash
git clone https://github.com/basebase-ai/bb-framework.git
```

Then

```bash
cd bb-framework
npm install
```

### 2. Run an Example App

```bash
npm run dev
```

This starts the dev server. Then visit any of these example apps:

- **http://localhost:3000?app=starter-app** - Simple sticky notes board
- **http://localhost:3000?app=playground** - App marketplace browser
- **http://localhost:3000?app=basepedia** - Wiki with pages and rich content
- **http://localhost:3000?app=crm** - Customer relationship manager
- **http://localhost:3000?app=basetable** - Spreadsheet-style data manager

**Switch between apps** by changing the `?app=` parameter in the URL!

**What you'll see:**

- Sign up/sign in screen (use Google or email)
- Real-time data sync with Firestore
- Working examples of different app patterns

**💡 Pro Tip:** Look at the example apps in `/apps/{app-id}/` for inspiration! They show you how to:

- Structure components and data schemas
- Use framework hooks (`useCollection`, `useAuth`, etc.)
- Implement common UI patterns (tables, forms, modals)
- Handle user permissions and access control

### 3. How It Works

The Basebase Framework has two layers:

**1. The Framework (don't touch)**

- Lives in `/framework` folder
- Provides Firebase authentication, database access, and real-time sync
- Includes React hooks like `useCollection`, `useAuth`, `useDocument`
- Handles all the infrastructure so you can focus on your app

**2. Your Apps (this is yours)**

- Live in `/apps` folder - **create your app in `/apps/{app-id}/`**
- The framework comes with multiple example apps:
  - `starter-app` - Simple sticky notes board
  - `playground` - App marketplace browser
- Your React components, data schema, and business logic
- When developing locally: loaded from `/apps/{app-id}/` based on `?app=` URL param
- When published: loaded as data from Firestore on-the-fly
- **Note:** Firebase handles persistent data; use stores for temporary UI state (sidebar open/closed, etc.)

**The Magic:** When you run `npm run dev`, your app code loads from local `/apps/{app-id}/` files. When you deploy with `npm run app:commit {app-id}`, your app code is uploaded to Firestore. In production, the framework loads your app code dynamically from the database - enabling instant updates, version control, and A/B testing without redeploying servers.

**Important:** Only edit files in `/apps/{your-app-id}/`. Changes to `/framework` won't be included when you publish and will break in production.

## Scenario A: Creating Your Own App

### Step 1: Initialize Your App (Local only - no auth needed)

```bash
npm run app:init my-app-name
```

This creates `/apps/my-app-name/` and sets `APP_ID` in its `schema.js`. No Firebase account needed yet!

### Step 2: Start Development

```bash
npm run dev
```

Visit **http://localhost:3000?app=my-app-name** to see your app running locally.

**Note:** The `?app=` parameter tells the framework which app to load from `/apps/{app-id}/`

### Step 3: Create Firebase Account (Required before first commit)

When you're ready to save your work to the cloud:

1. At http://localhost:3000, click **"Sign up"** (Google or email/password)
2. Click **"Add Sample App"**
3. Enter: `my-app-name` (must match your app ID from Step 1)

**This creates:**

- Your Firebase user account
- An app document in Firestore (required for `npm run app:commit`)

### Step 4: Define Your Data Schema

Edit `apps/my-app-name/schema.js` to add your app-specific collections:

```javascript
// Your app's unique identifier (set by npm run app:init)
export const APP_ID = "my-app-name";

// Namespaced collection names
export const collections = {
  // Global collections (no namespace)
  apps: "apps",
  users: "users",

  // Your app-specific collections (automatically namespaced)
  todos: `${APP_ID}_todos`, // e.g., "my-app-name_todos"
  notes: `${APP_ID}_notes`, // e.g., "my-app-name_notes"
  // Add more as needed...
};

// Schema for documentation (optional, used for type generation)
export const schema = {
  // Define your data structure here
  todos: {
    fields: {
      title: { type: "string", required: true },
      completed: { type: "boolean", default: false },
      owner: { type: "string", required: true },
      dueDate: { type: "timestamp" },
    },
  },
};
```

**Important:** Always use `collections.todos` (not `"todos"`) when accessing Firestore. This ensures your data is namespaced to your app and won't conflict with other apps.

### Naming Conventions

Follow these Firebase/Firestore standards:

**Collection names:** `kebab-case`

- ✅ `todo-app_projects`, `todo-app_todo-items`, `news-base_articles`
- ❌ `todoApp_projects`, `todo_app_TodoItems`

**Field names:** `camelCase`

- ✅ `displayName`, `createdAt`, `memberIds`, `logoURL`
- ❌ `display_name`, `created_at`, `member_ids`, `logo_url`

**Why?** This matches Firebase conventions and keeps your data consistent with the framework's built-in collections (`apps`, `users`).

### Step 5: Create Your First Component

Create `apps/my-app-name/components/TodoList.jsx`:

**💡 Tip:** Check out similar components in `/apps/starter-app/components/` or other example apps to see working patterns!

```jsx
import React from "react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js"; // Import namespaced collections

export function TodoList() {
  const { user } = useAuth();
  const {
    data: todos,
    add,
    update,
  } = useCollection(collections.todos, {
    // Use namespaced collection
    where: [["owner", "==", user?.uid]],
  });

  const handleAddTodo = async () => {
    await add({ title: "New Todo", completed: false });
  };

  const toggleTodo = async (todo) => {
    await update(todo.id, { completed: !todo.completed });
  };

  return (
    <div>
      <button onClick={handleAddTodo}>Add Todo</button>
      {todos.map((todo) => (
        <div key={todo.id} onClick={() => toggleTodo(todo)}>
          <input type="checkbox" checked={todo.completed} />
          {todo.title}
        </div>
      ))}
    </div>
  );
}
```

### Step 6: Add to Main App

Edit `apps/my-app-name/app.jsx` to use your new component(s):

```javascript
import { TodoList } from "./components/TodoList.jsx";

// Replace AppsList with TodoList in the AppShell.Main
<AppShell.Main>
  <TodoList />
</AppShell.Main>;
```

### Step 7: Deploy Your Changes (Requires Firebase account from Step 3)

When ready to publish:

```bash
npm run app:commit my-app-name "Describe your changes"
```

**You'll be prompted for:** Email and password (the account you created in Step 3)

**What this does:** Uploads your `/apps/my-app-name/` code to Firestore, making it instantly live in production!

## Scenario B: Collaborating on Existing App

Joining a team to work on an existing app?

### Step 1: Checkout the App (Requires Firebase account)

```bash
npm run app:checkout news-base
```

**You'll be prompted for:** Email and password

**Requirements:**

- You need a Firebase account (create one at http://localhost:3000 if you don't have one)
- The app owner must add you as a collaborator

**What happens:**

- Downloads app code from Firestore to `/apps/news-base/` folder
- Creates a new directory for the app with all its files
- `APP_ID` is automatically set to `news-base`

### Step 2: Run App Locally and Make Changes

```bash
npm run dev                                     # Start dev server
# Visit http://localhost:3000?app=news-base    # Test your changes
```

### Step 3: Deploy to Production (Publish)

When you have properly tested all of your changes and they are working locally on `http://localhost:3000?app=news-base' then you might want to publish them so that anyone else in the world can see them.

```bash
npm run app:commit news-base "Added feature"   # Publish (requires auth)
# Visit https://apps.basebase.ai?app=news-base    # View your published app!
```

### Key Points

- **Authentication required:** Sign in with your account to checkout/commit
- **Permission-based:** Only owners and collaborators can access an app
- **Versioned:** Each commit creates a new version (like Git)
- **Instant deployment:** No build servers, your changes are live immediately

## Project Structure

```
bb-framework/
├── apps/                       # ✅ YOUR APP CODE (edit this)
│   ├── starter-app/           # Example: Simple notes board
│   │   ├── components/       # React components
│   │   ├── stores/          # UI state
│   │   ├── schema.js        # Data structure
│   │   └── app.jsx          # Entry point
│   ├── playground/           # Example: App marketplace
│   ├── basepedia/            # Example: Wiki
│   ├── crm/                  # Example: CRM
│   └── your-app/             # Your app goes here!
│       ├── components/
│       ├── schema.js
│       └── app.jsx
├── functions/                 # ✅ SERVER FUNCTIONS (optional)
│   ├── askLLM.js             # Example: Call OpenAI/Claude
│   ├── enrichData.js         # Example: AI data enrichment
│   ├── sendEmail.js          # Example: Send emails
│   └── README.md             # Function documentation
├── framework/                 # ❌ Framework code (DON'T edit)
│   ├── core/                 # Firebase init, module loading
│   ├── hooks/                # useCollection, useAuth, useFunction, etc.
│   └── components/           # AuthProvider, etc.
├── scripts/                  # ❌ Build/deploy scripts (DON'T edit)
├── config/                   # Firebase config (already configured)
└── package.json
```

**⚠️ CRITICAL: Only edit files in `/apps/{your-app-id}/` directory!**

Changes outside `/apps/{your-app-id}/`:

- Work locally but FAIL in production
- Are NOT included when you commit
- Could break the platform for others

**💡 Learn from Examples:** Browse `/apps/starter-app/`, `/apps/playground/`, and other sample apps to see working code patterns!

## Framework Hooks

### useCollection(collectionName, options)

Real-time collection with automatic CRUD:

```javascript
import { collections } from "../schema.js";

const { data, loading, error, add, update, remove } = useCollection(
  collections.todos,
  {
    where: [["owner", "==", user.uid]],
    orderBy: ["createdAt", "desc"],
    limit: 50,
  }
);

// Add document
await add({ title: "New Todo" });

// Update document
await update(docId, { completed: true });

// Delete document
await remove(docId);
```

**Note:** Always use `collections.todos` instead of hardcoded strings to ensure proper namespacing.

### useDocument(collectionName, documentId)

Real-time single document:

```javascript
const { data, loading, exists, update, remove } = useDocument("todos", todoId);

await update({ title: "Updated" });
```

### useAuth()

Authentication state:

```javascript
const { user, loading, authenticated } = useAuth();

// user.uid, user.email, user.displayName
```

### useFunction(functionName)

Call server-side functions with full Firebase Admin access:

```javascript
import { useFunction } from "../../../framework/hooks/useFunction.js";

const { call, loading, result, error } = useFunction("askLLM");

const handleClick = async () => {
  const response = await call({
    provider: "openai",
    model: "gpt-4",
    systemPrompt: "You are helpful",
    message: "What is React?",
  });

  console.log(response.response);
};
```

**Server functions can:**

- Access Firebase Admin SDK (full database access)
- Call external APIs (OpenAI, SendGrid, etc.)
- Process data securely server-side
- Use environment variables and secrets

**See `/functions` folder for examples:** `askLLM`, `enrichData`, `sendEmail`

### useAppMembership(appId)

Manages user access to your app:

```javascript
import { useAppMembership } from "../../../framework/hooks/useAppMembership.js";
import { APP_ID } from "../schema.js";

const {
  membership, // Full membership object
  loading, // Loading state
  hasAccess, // Boolean: can user access this app?
  isOwner, // Boolean: is user the app owner?
  isAdmin, // Boolean: is user owner or admin?
  tier, // Subscription tier: "free", "basic", "premium", etc.
  status, // Status: "active", "pending", "suspended", "cancelled"
} = useAppMembership(APP_ID);

// Auto-creates membership for first-time visitors (open apps)
// Updates lastVisitedAt on each session
// Returns membership info for paywalls and feature gating
```

**Access Control:**

- **Open apps** (default): Any authenticated user can access, membership auto-created
- **Invite-only apps**: Set `accessMode: "invite-only"` in app doc, require explicit membership
- **Paid apps**: Check `tier` in your components to gate premium features

### useStorage(appId)

Upload and manage files in Firebase Storage with automatic app namespacing:

```javascript
import { useStorage } from "../../../framework/hooks/useStorage.js";
import { APP_ID } from "../schema.js";

const { upload, deleteFile, getURL, uploading, progress } = useStorage(APP_ID);

// Upload a file
const handleUpload = async (file) => {
  const result = await upload(
    file,
    `attachments/${Date.now()}_${file.name}` // Path within your app's storage
  );

  console.log("Download URL:", result.url);
  console.log("Storage path:", result.path);
};

// Delete a file
await deleteFile("attachments/123_photo.jpg");

// Get download URL
const url = await getURL("attachments/123_photo.jpg");
```

**Built-in FileUploader Component:**

```javascript
import { FileUploader } from "../../../framework/components/FileUploader.jsx";

<FileUploader
  onUpload={handleUpload}
  uploading={uploading}
  progress={progress}
  maxSize={10 * 1024 * 1024} // 10MB
  accept="image/*" // Or "*" for all files
  multiple={false}
/>;
```

**Automatic Namespacing:**

- All files are stored under `apps/{appId}/{your-path}`
- No collisions between apps
- Uses same Firebase Auth credentials
- Supports progress tracking, file deletion, and listing

**Storage Schema Example:**

```javascript
// In your schema.js
{
  attachments: {
    type: "array",
    items: { type: "map" },
    default: []
  } // Store: [{url, name, path, size, uploadedAt}]
}
```

## Server Functions

Need to run code on the server? Use server functions for AI, emails, PDFs, and more!

### What are Server Functions?

Server functions run in a secure Node.js environment with:

- **Full Firebase Admin access** - Read/write any data
- **External APIs** - OpenAI, Anthropic, SendGrid, etc.
- **Environment variables** - API keys, secrets
- **npm packages** - All dependencies available

### Using Functions in Your App

```javascript
import { useFunction } from "../../../framework/hooks/useFunction.js";

function MyComponent() {
  const { call, loading, result, error } = useFunction("askLLM");

  const handleAskAI = async () => {
    const response = await call({
      provider: "openai",
      model: "gpt-4",
      systemPrompt: "You are a helpful assistant",
      message: "Explain React hooks",
    });

    alert(response.response);
  };

  return (
    <Button onClick={handleAskAI} loading={loading}>
      Ask AI
    </Button>
  );
}
```

### Available Example Functions

Check `/functions` folder for working examples:

**`askLLM`** - Call any LLM (OpenAI, Anthropic)

```javascript
await call({
  provider: "openai",
  model: "gpt-4",
  systemPrompt: "You are helpful",
  message: "What is React?",
});
```

**`enrichData`** - Enrich Firestore docs with AI

```javascript
await call({
  collection: "crm_leads",
  inputFields: ["name", "company", "notes"],
  outputFields: ["aiSummary", "aiScore"],
  systemPrompt: "Analyze and return JSON with aiSummary and aiScore (0-100)",
});
```

**`sendEmail`** - Send transactional emails

```javascript
await call({
  to: "user@example.com",
  subject: "Welcome!",
  template: "welcome",
  data: { userName: "John" },
});
```

### Creating Your Own Functions

1. Create `/functions/myFunction.js`
2. Follow the function template (see `/functions/README.md`)
3. Upload: `npm run function:commit myFunction --app=my-app`
4. Call from your app: `useFunction("myFunction")`

**See `/functions/README.md` and `/functions/example-usage.jsx` for complete examples!**

## Available Commands

**Development:**

- `npm run dev` - Start development server
  - Access apps via `http://localhost:3000?app={app-id}`
  - Switch apps by changing the `?app=` parameter

**App Management:**

- `npm run app:init <appId>` - Initialize a new app in `/apps/{appId}/` (local only, no auth required)
- `npm run app:checkout <appId>` - Download app code from Firestore to `/apps/{appId}/` (**requires Firebase auth**)
- `npm run app:commit <appId> "message"` - Upload `/apps/{appId}/` to Firestore (**requires Firebase auth**)

**Function Management:**

- `npm run function:list` - List all available server functions (**requires Firebase auth**)
- `npm run function:checkout <functionId>` - Download function code to `/functions/{functionId}.js` (**requires Firebase auth**)
- `npm run function:commit <functionId>` - Upload function to Firestore (**requires Firebase auth**)
  - Options: `--app=<appId>` for app-specific functions

**Utilities:**

- `npm run generate:rules [appId]` - Generate Firestore security rules from schema (defaults to starter-app)
- `npm run generate:types [appId]` - Generate TypeScript types from schema (defaults to starter-app)

**Note:** To create a Firebase account, run `npm run dev` and sign up at http://localhost:3000

**For AI Coding Assistants:** Commands requiring authentication (`app:commit`, `app:checkout`) need interactive terminal access for password prompts. If your AI assistant can't run these, copy the command and run it yourself in your terminal.

## Troubleshooting

**"Failed to load app"**

- Make sure you're signed in (check top-right corner for your email)
- If no apps shown, click "Add Sample App" to create one

**"Module not found" error in production**

If you get an error like "Module not found: some-package", it means you added a new npm package but it's not registered in the production loader:

1. The package must be in `dependencies` (not `devDependencies`) in `package.json`
2. **Contact platform admin** to register it in `framework/production-entry.js`
3. Wait for framework rebuild and Railway deployment

**Available packages:** `react`, `react-dom`, `firebase`, `@mantine/*`, `@tabler/icons-react`, `zustand`

**"Permission denied" when committing**

- You need to be the owner or a collaborator on the app
- Ask the app owner to add your user ID to the `collaborators` array

**"Cannot checkout app"**

- Make sure the app ID exists and you have access
- Sign in with the correct account

**Port already in use**

- Kill existing process: `lsof -ti:3000 | xargs kill`
- Or change port: edit `vite.config.js` server.port

## Learn More

- **Technical Details:** See `DEVELOPERS_GUIDE.md`
- **Firebase Docs:** https://firebase.google.com/docs
- **Mantine UI:** https://mantine.dev

## License

MIT - Use freely in personal and commercial projects.
