# Basebase Framework - Developer's Guide

Technical reference for building with Basebase.

## Architecture Overview

### Core Concept: Always Connected

Traditional development: Build UI → Add backend → Connect data → Add auth → Add real-time

Basebase: All of the above is built-in from line one.

### Technology Stack

- **Frontend:** React 18, Mantine UI, Zustand
- **Backend:** Firebase (Firestore + Auth)
- **Build:** Vite (dev) + Sucrase (prod)
- **State:** Firestore for shared state, Zustand for local UI state

### File Structure

```
app/
├── schema.js           # Single source of truth for data structure
├── app.js             # Main entry point
├── components/        # React components (always connected)
├── stores/           # Zustand stores (local UI state only)
└── hooks/            # Custom hooks (optional)

framework/
├── core/
│   └── firebase-init.js    # Firebase initialization
├── hooks/
│   ├── useAuth.js          # Authentication state
│   ├── useCollection.js    # Real-time collections
│   └── useDocument.js      # Real-time documents
└── components/
    └── AuthProvider.jsx    # Auth UI wrapper
```

## Data Schema Definition

### Basic Schema

`app/schema.js` is the single source of truth:

```javascript
export const schema = {
  projects: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      owner: { type: "string", required: true }, // Auth UID
      status: { 
        type: "enum", 
        values: ["draft", "active", "archived"],
        default: "draft" 
      },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    
    // Database indexes
    indexes: [
      ["owner", "createdAt"],
      ["status", "updatedAt"]
    ],
    
    // Security rules
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },
};
```

### Field Types

```javascript
fields: {
  // Primitives
  name: { type: "string", required: true },
  age: { type: "number" },
  active: { type: "boolean", default: false },
  
  // Dates
  createdAt: { type: "timestamp", auto: true },
  
  // References (store as UID string)
  owner: { type: "string", required: true },
  assignee: { type: "reference", collection: "users" }, // Documentation only
  
  // Collections
  tags: { type: "array", items: { type: "string" } },
  collaborators: { type: "array", items: { type: "string" } }, // UIDs
  
  // Enums
  status: { 
    type: "enum", 
    values: ["pending", "active", "completed"],
    default: "pending"
  },
  
  // Objects
  metadata: { type: "map" },
}
```

### Security Rules

Rules use simplified syntax that gets converted to Firestore rules:

```javascript
rules: {
  // Simple auth check
  read: "auth != null",
  
  // Owner-only access
  read: "auth != null && auth.uid == resource.data.owner",
  
  // Collaborator access
  read: "auth != null && (auth.uid == resource.data.owner || auth.uid in resource.data.get('collaborators', []))",
  
  // Create rules (use request.resource.data)
  create: "auth != null && request.resource.data.owner == auth.uid",
  
  // Never allow
  delete: "false",
}
```

Generate Firestore rules:
```bash
npm run generate:rules  # Creates firestore.rules
```

## Framework Hooks

### useCollection

Real-time collection with optimistic updates:

```javascript
import { useCollection } from "../framework/hooks/useCollection.js";
import { useAuth } from "../framework/hooks/useAuth.js";

function MyComponent() {
  const { user } = useAuth();
  
  const { 
    data,           // Array of documents
    loading,        // Boolean
    error,          // Error object or null
    add,            // Function: (data) => Promise<docId>
    update,         // Function: (id, updates) => Promise<void>
    remove,         // Function: (id) => Promise<void>
    batchUpdate,    // Function: (operations[]) => Promise<void>
  } = useCollection("projects", {
    where: [["owner", "==", user?.uid]],
    orderBy: ["createdAt", "desc"],
    limit: 50,
    realtime: true,      // Enable real-time updates
    optimistic: true,    // Enable optimistic UI
  });
  
  // Add document
  const handleAdd = async () => {
    const id = await add({
      name: "New Project",
      description: "A new project"
    });
    console.log("Created:", id);
  };
  
  // Update document
  const handleUpdate = async (projectId) => {
    await update(projectId, {
      status: "active"
    });
  };
  
  // Delete document
  const handleDelete = async (projectId) => {
    await remove(projectId);
  };
  
  // Batch operations
  const handleBatch = async () => {
    await batchUpdate([
      { type: "update", id: "doc1", data: { status: "completed" } },
      { type: "update", id: "doc2", data: { status: "completed" } },
      { type: "delete", id: "doc3" },
    ]);
  };
}
```

**Auto-added fields:**
- `owner` - Current user's UID (from `user.uid`)
- `createdBy` - User who created the document
- `createdAt` - Server timestamp
- `updatedBy` - User who last updated
- `updatedAt` - Server timestamp

### useDocument

Real-time single document:

```javascript
const { 
  data,        // Document object or null
  loading,     // Boolean
  error,       // Error object or null
  exists,      // Boolean - document exists
  update,      // Function: (updates) => Promise<void>
  remove,      // Function: () => Promise<void>
} = useDocument("projects", projectId, {
  realtime: true  // Enable real-time updates
});

if (!exists) return <div>Not found</div>;

return (
  <div>
    <h1>{data.name}</h1>
    <button onClick={() => update({ status: "completed" })}>
      Complete
    </button>
  </div>
);
```

### useAuth

Authentication state:

```javascript
const { 
  user,           // User object or null
  loading,        // Boolean
  authenticated   // Boolean
} = useAuth();

if (loading) return <div>Loading...</div>;
if (!authenticated) return <div>Please sign in</div>;

return <div>Hello {user.email}</div>;
```

**User object:**
```javascript
user.uid            // Unique user ID (use for owner fields)
user.email          // Email address
user.displayName    // Display name (may be null)
user.photoURL       // Photo URL (may be null)
```

## Multi-Tenant Security Architecture

### The Question

> "We're building for thousands of customer-developers. Do we share Firebase credentials or use OAuth?"

### The Answer: Shared Credentials + Auth + Rules

**YES, share client-side Firebase credentials with all customers.** This is safe because:

#### 1. Client Credentials Are Public

The `VITE_FIREBASE_*` values in `.env` are **API keys, not secrets:**
- Designed to be embedded in public web/mobile apps
- Don't grant any permissions by themselves
- All security is server-side via Firebase Auth + Firestore Rules

**Every customer uses THE SAME Firebase project:**
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
```

#### 2. Security Through Authentication

Each customer:
1. Signs up (email/password, Google, etc.)
2. Gets unique `auth.uid` (e.g., `abc123`)
3. All requests include their auth token

#### 3. Security Through Firestore Rules

Firestore enforces rules **server-side** (cannot be bypassed):

```javascript
// Example: Users can only read/write their own apps
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /apps/{doc} {
      // User can only read if they own it
      allow read: if request.auth.uid == resource.data.owner;
      
      // User can only write if they own it
      allow update: if request.auth.uid == resource.data.owner;
      
      // When creating, user becomes owner
      allow create: if request.auth.uid == request.resource.data.owner;
      
      // Only owner can delete
      allow delete: if request.auth.uid == resource.data.owner;
    }
  }
}
```

#### 4. How Data Isolation Works

**Customer A (uid: abc123):**
- Creates app → `owner: "abc123"`
- Queries: `where owner == "abc123"` → sees only their apps
- Cannot read apps where `owner != "abc123"` (blocked by rules)

**Customer B (uid: xyz789):**
- Creates app → `owner: "xyz789"`
- Queries: `where owner == "xyz789"` → sees only their apps
- Cannot read Customer A's apps (blocked by rules)

#### 5. What Customers CANNOT Do

Even with your Firebase credentials, customers cannot:
- ❌ Read other users' data (blocked by Firestore rules)
- ❌ Modify other users' data (blocked by Firestore rules)
- ❌ Delete other users' data (blocked by Firestore rules)
- ❌ Access Firebase Admin features (requires service account)
- ❌ Bypass authentication (enforced by Firebase)

#### 6. Credentials You NEVER Share

**Service Account (Admin credentials):**
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```
- Full access to entire Firebase project
- Bypasses all security rules
- Used only by YOUR backend scripts (`npm run init`, `npm run publish`)
- **NEVER expose to customers or client code**

### Deployment Patterns

#### Pattern 1: Platform-as-a-Service (Recommended)

```
Your Infrastructure:
├── Domain: app.basebase.com
├── Framework code (includes Firebase credentials)
├── Customer sign-up/sign-in
└── Customer builds apps through your UI

Customer sees:
└── Just your web interface (no code, no credentials)
```

**Benefits:**
- Simplest for customers (just sign up)
- You control security and updates
- Credentials never exposed

#### Pattern 2: Self-Hosted

```
Each Customer:
├── Creates own Firebase project
├── Uses own credentials
├── Runs own instance
└── Complete isolation
```

**Benefits:**
- Complete data ownership
- No shared infrastructure

### Testing Multi-Tenancy

1. Enable Firebase Auth (Email/Password)
2. Deploy security rules: `npm run generate:rules`
3. Create two test accounts
4. Verify:
   - User A sees only their apps
   - User A cannot access User B's apps
   - Real-time updates work within same user

## Optimistic UI Updates

All hooks support optimistic updates by default:

```javascript
const { data, update } = useCollection("todos", { optimistic: true });

// UI updates IMMEDIATELY, then syncs with server
await update(todoId, { completed: true });

// If server rejects, automatically rolls back
```

**How it works:**
1. Update applied to local state immediately
2. Request sent to Firestore
3. On success: local state replaced with server state
4. On error: local state rolled back, error thrown

**Disable for specific operation:**
```javascript
await update(todoId, { completed: true }, { optimistic: false });
```

## State Management

### When to Use Firestore (useCollection/useDocument)

Use for:
- ✅ Persistent data (todos, projects, users)
- ✅ Data shared across users/devices
- ✅ Data that needs real-time sync
- ✅ Data that needs to survive page refresh

### When to Use Zustand (local stores)

Use for:
- ✅ UI state (sidebar open/closed, selected tab)
- ✅ Transient state (form inputs before submit)
- ✅ Local-only state (theme preference)
- ✅ State that doesn't need persistence

Example Zustand store:
```javascript
// app/stores/uiStore.js
import { create } from "zustand";

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeTab: "dashboard",
  
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
```

## Authentication Patterns

### Require Auth for Entire App

Wrap your app in `AuthProvider`:

```javascript
// app/app.js
import { AuthProvider } from "./components/AuthProvider.jsx";

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

### Optional Auth

Check auth state manually:

```javascript
const { user, authenticated } = useAuth();

if (!authenticated) {
  return <LoginPrompt />;
}

return <YourApp user={user} />;
```

### Sign Out

```javascript
import { SignOutButton } from "./components/AuthProvider.jsx";

<SignOutButton />
```

Or manually:
```javascript
import { signOut } from "firebase/auth";
import { auth } from "../framework/core/firebase-init.js";

await signOut(auth);
```

## Query Patterns

### Filter by Current User

```javascript
const { user } = useAuth();
const { data } = useCollection("projects", {
  where: [["owner", "==", user?.uid]]
});
```

### Multiple Conditions

```javascript
const { data } = useCollection("projects", {
  where: [
    ["owner", "==", user?.uid],
    ["status", "==", "active"]
  ]
});
```

### Ordering and Limits

```javascript
const { data } = useCollection("projects", {
  orderBy: ["createdAt", "desc"],
  limit: 20
});
```

### Array Contains

```javascript
// Find projects where user is a collaborator
const { data } = useCollection("projects", {
  where: [["collaborators", "array-contains", user?.uid]]
});
```

**Note:** Some query combinations require composite indexes in Firestore. Firebase will show you the index creation link in console if needed.

## Publishing & Deployment

### Development Workflow

```bash
npm run dev  # Vite dev server with hot reload
```

Code is served locally from `app/` directory.

### Production Publishing

```bash
npm run publish  # Requires FIREBASE_SERVICE_ACCOUNT in .env
```

This:
1. Transforms JSX/TypeScript to JavaScript
2. Minifies code
3. Creates version hash
4. Uploads to Firestore `apps/{appId}/versions/{versionHash}`
5. Updates `apps/{appId}/currentVersion`

### Version Management

Each publish creates a new version (hash of code):
```
apps/
└── my-app/
    ├── currentVersion: "abc123def456"
    └── versions/
        ├── abc123def456/  # Latest
        │   ├── modules/
        │   └── metadata/
        └── previous-hash/  # Previous versions preserved
```

### Rollback

To rollback, update `currentVersion` in Firestore to previous hash.

## Performance Considerations

### Firestore Limits

**Free Plan (Spark):**
- 50K reads/day
- 20K writes/day
- 1GB storage

**Paid Plan (Blaze):**
- $0.06 per 100K reads
- $0.18 per 100K writes
- $0.18/GB storage

### Optimization Tips

1. **Use indexes** - Define in schema for common queries
2. **Implement pagination** - Use `limit` + cursor-based pagination
3. **Enable offline persistence** - Already enabled in framework
4. **Cache static data** - Store in localStorage when appropriate
5. **Batch operations** - Use `batchUpdate` for multiple changes

### Offline Support

Firestore offline persistence is enabled by default. The app works offline and syncs when back online.

## Troubleshooting

### "Permission Denied" Errors

1. Check Firestore rules are deployed
2. Verify user is authenticated
3. Check query filters match security rules
4. Ensure document `owner` field matches `user.uid`

### "Index Required" Errors

Firebase will provide a link to create the index. Click it, wait 1-2 minutes for index to build.

### Real-Time Updates Not Working

1. Check `realtime: true` in hook options
2. Verify Firestore connection (check network tab)
3. Check for JavaScript errors in console

### Auth Not Persisting

Firebase Auth persists by default. Check:
1. Cookies/localStorage not blocked
2. No errors in console
3. Auth state listener is set up (framework does this)

## Best Practices

### Security

- ✅ Always query with user-specific filters: `where: [["owner", "==", user.uid]]`
- ✅ Never trust client-side validation - always use Firestore rules
- ✅ Use `auth.uid` for owner fields, not user-provided data
- ✅ Test rules with Firebase emulator

### Performance

- ✅ Use pagination for large lists
- ✅ Enable indexes for common queries
- ✅ Avoid nested subcollections (use references instead)
- ✅ Batch operations when possible

### Code Organization

- ✅ Keep all data structure in `schema.js`
- ✅ One collection per file for complex schemas
- ✅ Reusable components in `app/components/`
- ✅ UI-only state in Zustand stores
- ✅ Persistent/shared state in Firestore

## Advanced Topics

### Custom Hooks

Build your own hooks on top of framework hooks:

```javascript
// app/hooks/useProjects.js
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";

export function useProjects() {
  const { user } = useAuth();
  
  return useCollection("projects", {
    where: [["owner", "==", user?.uid]],
    orderBy: ["createdAt", "desc"],
  });
}
```

### Subcollections

Define in schema:
```javascript
projects: {
  fields: { /* ... */ },
  subcollections: {
    tasks: {
      fields: {
        title: { type: "string", required: true },
        completed: { type: "boolean", default: false },
      },
      rules: { /* inherit from parent */ }
    }
  }
}
```

Access with path:
```javascript
const { data } = useCollection(`projects/${projectId}/tasks`);
```

### Cloud Functions Integration

For server-side operations (emails, payments, external APIs):

1. Create task in `queue` collection
2. Cloud Function picks up task
3. Function processes and writes result
4. App receives via real-time listener

```javascript
// Client creates task
await add({ 
  function: "sendEmail",
  payload: { to: "user@example.com", subject: "Hello" }
}, { collection: "queue" });

// Cloud Function processes (separate codebase)
// Client listens for result
const { data: task } = useDocument("queue", taskId);
if (task?.status === "completed") {
  console.log("Email sent!", task.result);
}
```

## Support

- **Implementation Details:** See `IMPLEMENTATION_GUIDE.md`
- **Firebase Documentation:** https://firebase.google.com/docs
- **Firestore Rules:** https://firebase.google.com/docs/firestore/security/get-started
- **React Hooks:** https://react.dev/reference/react

