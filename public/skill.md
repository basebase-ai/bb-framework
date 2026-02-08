---
name: basebase
version: 0.1.0
description: Build and deploy real-time, multi-user web applications with Firebase. No backend needed.
homepage: https://basebase.com
repository: https://github.com/basebase-ai/bb-framework
metadata:
  category: "web-app-framework"
  api_base: "https://basebase.com"
  auth_method: "email_password"
  cli_prefix: "npm run"
---

# Basebase Framework - Agent Skill

Build and deploy real-time, multi-user web applications instantly. Basebase provides
Firebase auth, Firestore database, and real-time sync out of the box. You write React
components; the framework handles everything else.

**Apps are live at:** `https://<appId>.basebase.com`

## STOP: Before You Start

**You need a real email and password from your human.** Do NOT make up or guess an email
address. Basebase uses Firebase Auth which sends a verification email, so the email must
be a real address your human can access.

**Ask your human:**
> "I'd like to build a Basebase app for you. I need a real email address and a password
> to create your Basebase account. What email and password should I use?"

Once they give you credentials, proceed with the steps below.

## Quick Reference

| Action | Command |
|--------|---------|
| **Sign up** | `npm run signup -- --email=<email> --password=<pw> --json` |
| **Create app** | `npm run app:init -- <appId> --name="Name" --email=<email> --password=<pw> --json` |
| **Dev server** | `npm run dev` (visit `http://<appId>.localhost:3000`) |
| **Deploy** | `npm run app:commit -- <appId> "message" --email=<email> --password=<pw> --yes --json` |
| **Checkout** | `npm run app:checkout -- <appId> --email=<email> --password=<pw> --json` |
| **Deploy function** | `npm run function:commit -- <file.js> --email=<email> --password=<pw> --json` |
| **List functions** | `npm run function:list -- --email=<email> --password=<pw> --json` |

## Authentication

All CLI commands accept credentials via flags or environment variables.

**IMPORTANT: `npm run` and the `--` separator.**
Positional args (like app IDs and messages) work fine without any separator:
`npm run app:commit my-app "message"`. But `--flag=value` style arguments get consumed
by npm itself unless you add a `--` separator between the script name and the flags.
Environment variables avoid this problem entirely and are the recommended approach.

```bash
# RECOMMENDED: Environment variables (set once, works for all commands)
export BASEBASE_EMAIL=me@example.com
export BASEBASE_PASSWORD=mypass
npm run app:commit -- my-app "update" --yes --json

# Alternative: all via CLI flags (note the -- before any --flags)
npm run app:commit -- my-app "update" --email=me@example.com --password=mypass --yes --json

# No -- needed when there are no --flags (interactive mode)
npm run app:commit my-app "update"
```

### Global Flags (all commands)

| Flag | Env Var | Description |
|------|---------|-------------|
| `--email=<email>` | `BASEBASE_EMAIL` | Firebase email |
| `--password=<pw>` | `BASEBASE_PASSWORD` | Firebase password |
| `--json` | — | Output machine-readable JSON to stdout |
| `--yes` / `-y` | — | Auto-confirm all interactive prompts |

## Complete Workflow: Zero to Deployed App

### Step 1: Clone the framework

```bash
git clone https://github.com/basebase-ai/bb-framework.git
cd bb-framework
npm install
```

### Step 2: Create an account

**Ask your human for their email and password first!** Do not invent an email address.
The email must be real because Firebase sends a verification email to it.

```bash
# Use the REAL email and password your human gave you
npm run signup -- --email=HUMAN_EMAIL --password=HUMAN_PASSWORD --json
```

**JSON response:**
```json
{
  "success": true,
  "uid": "abc123",
  "email": "human@example.com",
  "displayName": "human",
  "emailVerified": false,
  "message": "Account created successfully. A verification email has been sent."
}
```

If the response says `"error": "email_already_in_use"`, that's fine — it means the
human already has an account. Just use their existing email and password for subsequent
commands.

**Note:** The account works for CLI operations immediately. A verification email is
sent but is not required for deploying via the CLI.

### Step 3: Set credentials (recommended)

Set these once so every subsequent command picks them up automatically:

```bash
export BASEBASE_EMAIL=<email your human gave you>
export BASEBASE_PASSWORD=<password your human gave you>
```

### Step 4: Create a new app

```bash
npm run app:init -- my-cool-app \
  --name="My Cool App" \
  --description="A real-time collaboration tool" \
  --json
```

**JSON response:**
```json
{
  "success": true,
  "appId": "my-cool-app",
  "name": "My Cool App",
  "description": "A real-time collaboration tool",
  "alreadyExisted": false,
  "owner": "abc123"
}
```

This creates:
```
apps/my-cool-app/
├── app.jsx          # Main entry point (required)
├── schema.js        # Data schema with APP_ID (required)
└── components/      # React components
    └── ProfileModal.jsx
```

### Step 5: Edit the app code

Edit files in `apps/my-cool-app/`. The minimum required files are:

- **`app.jsx`** — Main React component (entry point)
- **`schema.js`** — Defines `APP_ID` and data collections

You can add any number of additional `.jsx`, `.js`, `.css`, or `.json` files.

**Important rules:**
- Only edit files inside `apps/<appId>/` — never edit `framework/` or `scripts/`
- Import framework utilities with relative paths: `../../framework/hooks/useCollection.js`
- Look at existing apps in `apps/` for patterns to copy

### Step 6: Deploy

```bash
npm run app:commit -- my-cool-app "Initial version" --yes --json
```

**JSON response:**
```json
{
  "success": true,
  "appId": "my-cool-app",
  "version": "a1b2c3d4e5f6",
  "message": "Initial version",
  "moduleCount": 3,
  "totalSizeBytes": 4096
}
```

Your app is now live at `https://my-cool-app.basebase.com`

### Step 7: Update and redeploy

Make changes to files in `apps/my-cool-app/`, then:

```bash
npm run app:commit -- my-cool-app "Added new feature" --yes --json
```

## Checkout an Existing App

```bash
npm run app:checkout -- my-cool-app --json
```

**JSON response:**
```json
{
  "success": true,
  "appId": "my-cool-app",
  "version": "a1b2c3d4e5f6",
  "fileCount": 3,
  "files": ["app.jsx", "schema.js", "components/ProfileModal.jsx"]
}
```

## Cloud Functions

Deploy server-side functions that your app can call:

```bash
# Create a function file
cat > functions/myFunction.js << 'EOF'
/**
 * Describe what this function does
 * @param {string} query - The search query
 * @param {number} [limit] - Max results (optional)
 */
export default async function myFunction({ query, limit = 10 }) {
  // Your server-side logic here
  return { results: [] };
}
EOF

# Deploy it
npm run function:commit -- myFunction.js --app=my-cool-app --json
```

## App Architecture

### Technology Stack
- **Frontend:** React 18, Mantine UI, Zustand
- **Backend:** Firebase (Firestore + Auth)
- **Build:** Vite (dev) + Sucrase (prod)

### Key Framework Hooks

```jsx
import { useCollection } from '../../framework/hooks/useCollection.js';
import { useDocument } from '../../framework/hooks/useDocument.js';
import { useAuth } from '../../framework/hooks/useAuth.js';

// Real-time collection (auto-syncs with Firestore)
const { data, add, update, remove } = useCollection('todos', {
  where: [['owner', '==', userId]],
  orderBy: [['createdAt', 'desc']],
});

// Single document
const { data: profile, update: updateProfile } = useDocument('users', userId);

// Auth state
const { user, signOut } = useAuth();
```

### Schema Definition (schema.js)

```javascript
export const APP_ID = 'my-cool-app';

export const schema = {
  todos: {
    fields: {
      title: { type: 'string', required: true },
      done: { type: 'boolean', default: false },
      owner: { type: 'string', required: true },
      createdAt: { type: 'timestamp', auto: true },
    },
    rules: {
      read: 'auth != null && auth.uid == resource.data.owner',
      write: 'auth != null && auth.uid == resource.data.owner',
    },
  },
};
```

## Error Handling

When `--json` is used, errors return structured JSON:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable description"
}
```

Common error codes:
| Code | Meaning |
|------|---------|
| `auth_failed` | Wrong email or password |
| `email_already_in_use` | Account exists (use existing credentials) |
| `invalid_app_id` | App ID must be kebab-case, 3-50 chars |
| `app_not_found` | App doesn't exist (run `app:init` first) |
| `app_owned_by_other` | App ID is taken by another user |
| `access_denied` | Not the owner or collaborator |
| `conflict_cancelled` | Version conflict, commit aborted |
| `missing_app_id` | No app ID provided |
| `missing_function_id` | No function filename provided |

## Tips for AI Agents

1. **Ask your human for a real email and password** — never make up or guess credentials
2. **Set env vars first** (`BASEBASE_EMAIL`, `BASEBASE_PASSWORD`) so every command picks them up
3. **Always use `--` separator** after `npm run <script>` when passing `--flags` to scripts
4. **Always use `--json` flag** to get structured, parseable output
5. **Always use `--yes` flag** to skip interactive confirmations
6. **Check existing apps** in `apps/` for working patterns before writing new code
7. **Read `docs/DEVELOPERS_GUIDE.md`** for detailed framework API documentation
8. **Read `docs/FUNCTION_AUTHORING.md`** for cloud function patterns
9. **App ID rules:** lowercase, alphanumeric, hyphens only, 3-50 characters (e.g., `my-cool-app`)
10. **Never edit `framework/` or `scripts/`** — only `apps/<appId>/` and `functions/`
