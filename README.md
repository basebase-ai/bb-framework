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

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create a new project (or use existing)
3. Enable **Firestore Database** → "Start in test mode"
4. Enable **Authentication** → Email/Password provider

### 3. Configure Firebase

Get your Firebase config from Project Settings > Your Apps > Web app:

Create `.env` file in project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc

PORT=3000
NODE_ENV=development
```

### 4. Run the Sample App

```bash
npm run dev
```

Opens http://localhost:3000 with a sample app showing a list of apps from Firestore.

**What you'll see:**

- Authentication screen (sign up/sign in)
- A table displaying apps from Firestore
- "Add Sample App" button to create test data
- Real-time updates across browser tabs

### 5. Test Multi-User Sync

1. Open two browser windows to http://localhost:3000
2. Sign in with different accounts in each
3. Each user sees only their own apps
4. Add an app in one window → see it appear instantly

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

Edit `app/app.js` to use your new component:

```javascript
import { TodoList } from "./components/TodoList.jsx";

// Replace AppsList with TodoList in the AppShell.Main
<AppShell.Main>
  <TodoList />
</AppShell.Main>;
```

### 5. Test Locally

```bash
npm run dev
```

Changes hot-reload automatically. Data persists in Firestore.

## Publishing to Production

### 1. Set Up Firebase Admin (one-time)

Get service account credentials:

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file

Add to `.env`:

```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"..."}'
```

### 2. Initialize App in Firestore

```bash
npm run init
```

Creates the app document structure in Firestore.

### 3. Publish Your Code

```bash
npm run publish
```

This:

- Compiles your app code
- Uploads to Firestore as a versioned document
- Makes it available globally
- Enables hot-reload in production

### 4. Update Security Rules

In Firebase Console → Firestore → Rules, paste the generated rules:

```bash
npm run generate:rules
# Copy output to Firebase Console
```

## Project Structure

```
bb-framework/
├── app/                    # YOUR APP CODE
│   ├── components/        # React components
│   ├── stores/           # Zustand stores
│   ├── schema.js         # Data structure + security rules
│   └── app.js            # Main entry point
├── framework/             # Framework code (don't modify)
│   ├── core/             # Firebase init, module loading
│   └── hooks/            # React hooks (useCollection, useAuth, etc.)
├── scripts/              # Build/deploy scripts
├── .env                  # Your Firebase config
└── package.json
```

**Work in `app/` directory only** - the framework handles everything else.

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

## Multi-Tenant Security

**Q: Do I share my Firebase credentials with customers?**

**A: YES - client credentials are safe to share. Security comes from Authentication + Firestore Rules.**

- All customers use the **same Firebase API keys** (they're public by design)
- Each customer signs up and gets a unique `auth.uid`
- Firestore Rules enforce data isolation: users only see their own data
- Customer A cannot read/write Customer B's data (enforced server-side)

See `DEVELOPERS_GUIDE.md` for detailed security architecture.

## Available Commands

- `npm run dev` - Start development server
- `npm run init` - Initialize app in Firebase
- `npm run publish` - Deploy app to Firestore
- `npm run generate:rules` - Generate security rules from schema
- `npm run generate:types` - Generate TypeScript types from schema

## Troubleshooting

**"Failed to load app"**

- Check `.env` file has correct Firebase credentials
- Ensure Firestore is enabled in Firebase Console

**"Permission denied"**

- Make sure Firestore is in "test mode" for development
- Or deploy proper security rules with `npm run generate:rules`

**Port already in use**

- Change `PORT` in `.env` or kill process: `lsof -ti:3000 | xargs kill`

## Learn More

- **Technical Details:** See `DEVELOPERS_GUIDE.md`
- **Implementation Guide:** See `IMPLEMENTATION_GUIDE.md`
- **Firebase Docs:** https://firebase.google.com/docs
- **Mantine UI:** https://mantine.dev

## License

MIT - Use freely in personal and commercial projects.
