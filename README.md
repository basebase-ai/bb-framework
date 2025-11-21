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

```bash
git clone https://github.com/basebase-ai/bb-framework.git
cd bb-framework
npm install
```

### 2. Run the Starter App

```bash
npm run dev
```

Opens http://localhost:3000 with a sample app that provides user authentication (sign up and sign in) and showcases some of the components displaying live data from the database.

**What you'll see:**

- Sign up/sign in screen (use Google or email)
- A table displaying your apps from Firestore
- "Add Sample App" button to create your first app
- Real-time updates (open two tabs to see sync in action)

### 3. How It Works

The Basebase Framework has two layers:

**1. The Framework (don't touch)**

- Lives in `/framework` folder
- Provides Firebase authentication, database access, and real-time sync
- Includes React hooks like `useCollection`, `useAuth`, `useDocument`
- Handles all the infrastructure so you can focus on your app

**2. Your App (this is yours)**

- Lives in `/app` folder - **the files below this folder are the only ones you should modify!**
- Your React components, data schema, and business logic
- When developing locally: loaded from files in `/app`
- When published: loaded as data from Firestore on-the-fly
- **Note:** Firebase handles persistent data; use stores for temporary UI state (sidebar open/closed, etc.)

**The Magic:** When you run `npm run dev`, your app code loads from local files. When you deploy with `npm run app:commit`, your `/app` code is uploaded to Firestore. In production, the framework loads your app code dynamically from the database - enabling instant updates, version control, and A/B testing without redeploying servers.

**Important:** Only edit files in `/app`. Changes to `/framework` won't be included when you publish and will break in production.

## Scenario A: Creating Your Own App

### Step 1: Initialize Your App (Local only - no auth needed)

```bash
npm run app:init my-app-name
```

This sets `APP_ID` in `app/schema.js`. No Firebase account needed yet!

### Step 2: Start Development

```bash
npm run dev
```

Visit http://localhost:3000 to see your app running locally.

### Step 3: Create Firebase Account (Required before first commit)

When you're ready to save your work to the cloud:

1. At http://localhost:3000, click **"Sign up"** (Google or email/password)
2. Click **"Add Sample App"**
3. Enter: `my-app-name` (must match your app ID from Step 1)

**This creates:**

- Your Firebase user account
- An app document in Firestore (required for `npm run app:commit`)

### Step 4: Define Your Data Schema

Edit `app/schema.js` to add your app-specific collections:

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

### Step 5: Create Your Component

Create `app/components/TodoList.jsx`:

```jsx
import React from "react";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
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

Edit `app/app.jsx` to use your new component:

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
npm run app:commit "Describe your changes"
```

**You'll be prompted for:** Email and password (the account you created in Step 3)

**What this does:** Uploads your `/app` code to Firestore, making it instantly live in production!

## Scenario B: Collaborating on Existing App

Joining a team to work on an existing app?

### Step 1: Checkout the App (Requires Firebase account)

```bash
npm run app:checkout news-base latest
```

**You'll be prompted for:** Email and password

**Requirements:**

- You need a Firebase account (create one at http://localhost:3000 if you don't have one)
- The app owner must add you as a collaborator

**What happens:**

- Downloads app code from Firestore to `/app` folder
- Overwrites local files with the team's code
- `APP_ID` is automatically set to `news-base`

### Step 2: Develop and Deploy

```bash
npm run dev                                # Test your changes
npm run app:commit "Added new feature"     # Publish (requires auth)
```

### Key Points

- **Authentication required:** Sign in with your account to checkout/commit
- **Permission-based:** Only owners and collaborators can access an app
- **Versioned:** Each commit creates a new version (like Git)
- **Instant deployment:** No build servers, your changes are live immediately

## Project Structure

```
bb-framework/
├── app/                    # ✅ YOUR APP CODE (edit this)
│   ├── components/        # Your React components
│   ├── stores/           # UI state (theme, sidebar, tabs, etc.)
│   ├── schema.js         # Your data structure + security rules
│   └── app.jsx           # Your main entry point
│   └── README.md         # Important: read this!
├── framework/             # ❌ Framework code (DON'T edit)
│   ├── core/             # Firebase init, module loading
│   └── hooks/            # React hooks (useCollection, useAuth, etc.)
├── scripts/              # ❌ Build/deploy scripts (DON'T edit)
├── config/               # Firebase config (already configured)
└── package.json
```

**⚠️ CRITICAL: Only edit files in `/app` directory!**

Changes outside `/app`:

- Work locally but FAIL in production
- Are NOT included when you commit
- Could break the platform for others

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

## Available Commands

**Development:**

- `npm run dev` - Start development server (http://localhost:3000)

**App Management:**

- `npm run app:init <appId>` - Initialize a new app (local only, no auth required)
- `npm run app:checkout <appId> [version]` - Download app code from Firestore (**requires Firebase auth**)
- `npm run app:commit "message"` - Upload your changes to Firestore (**requires Firebase auth**)

**Utilities:**

- `npm run generate:rules` - Generate Firestore security rules from schema
- `npm run generate:types` - Generate TypeScript types from schema

**Note:** To create a Firebase account, run `npm run dev` and sign up at http://localhost:3000

**For AI Coding Assistants:** Commands requiring authentication (`app:commit`, `app:checkout`) need interactive terminal access for password prompts. If your AI assistant can't run these, copy the command and run it yourself in your terminal.

## Troubleshooting

**"Failed to load app"**

- Make sure you're signed in (check top-right corner for your email)
- If no apps shown, click "Add Sample App" to create one

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
