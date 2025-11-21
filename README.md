# Basebase Framework

> Build real, connected, multi-user applications from day one. No mock data. No disconnected components. Just real apps with real data.

## What Is This?

Basebase is a web application framework where every component is connected to Firebase from the start. When you build a component, it's already wired to real authentication, real data, and real-time synchronization. No "connect it later" phase.

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
git clone <your-repo-url> my-app
cd my-app
npm install
```

### 2. Run the Sample App

```bash
npm run dev
```

Opens http://localhost:3000 with a sample app.

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

## Creating Your Own App

### 1. Define Your Data Schema

Edit `app/schema.js` to define your collections:

```javascript
export const schema = {
  todos: {
    fields: {
      title: { type: "string", required: true },
      completed: { type: "boolean", default: false },
      owner: { type: "string", required: true }, // Firebase Auth UID
      dueDate: { type: "timestamp" },
    },
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },
};
```

### 2. Create Your Component

Create `app/components/TodoList.jsx`:

```jsx
import React from "react";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";

export function TodoList() {
  const { user } = useAuth();
  const {
    data: todos,
    add,
    update,
  } = useCollection("todos", {
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

### 3. Add to Main App

Edit `app/app.jsx` to use your new component:

```javascript
import { TodoList } from "./components/TodoList.jsx";

// Replace AppsList with TodoList in the AppShell.Main
<AppShell.Main>
  <TodoList />
</AppShell.Main>;
```

### 4. Test Locally

```bash
npm run dev
```

Changes hot-reload automatically. Data persists in Firestore.

## Collaborative Workflow

Basebase uses a Git-like workflow for app development:

### Create a New App

1. Sign in to the platform
2. Click "Add Sample App" to create your first app
3. Note the app ID (e.g., `my-todo-app`)

### Checkout Existing App

Friend invited you to work on an app? Checkout the code:

```bash
npm run app:checkout news-base latest
```

This downloads the app code from Firestore to your `/app` folder.

### Make Changes

Edit files in `/app`, test with `npm run dev`, iterate with your AI assistant.

### Commit Your Changes

```bash
npm run app:commit news-base "Added new feature"
```

This uploads your changes to Firestore. Your changes are now live!

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
const { data, loading, error, add, update, remove } = useCollection("todos", {
  where: [["owner", "==", user.uid]],
  orderBy: ["createdAt", "desc"],
  limit: 50,
});

// Add document
await add({ title: "New Todo" });

// Update document
await update(docId, { completed: true });

// Delete document
await remove(docId);
```

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

- `npm run app:checkout <appId> [version]` - Download app code from Firestore
- `npm run app:commit <appId> "message"` - Upload your changes to Firestore

**Utilities:**

- `npm run generate:rules` - Generate Firestore security rules from schema
- `npm run generate:types` - Generate TypeScript types from schema

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
