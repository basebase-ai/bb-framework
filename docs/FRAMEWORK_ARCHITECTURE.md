# Basebase Framework Architecture

**Internal Documentation for Framework Developers**

This document explains the technical architecture of the Basebase Framework for internal developers working on the framework itself. For customer-developer documentation, see `README.md` and `DEVELOPERS_GUIDE.md`.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Dual-Mode Architecture](#dual-mode-architecture)
3. [Code Storage & Transformation](#code-storage--transformation)
4. [Dynamic Module Loader](#dynamic-module-loader)
5. [Production Entry Point](#production-entry-point)
6. [Security Model](#security-model)
7. [Deployment Architecture](#deployment-architecture)
8. [Key Design Decisions](#key-design-decisions)

---

## High-Level Overview

The Basebase Framework is a **multi-tenant app deployment platform** that allows many independent developers to build and deploy React apps without managing their own infrastructure.

### Core Concept

**Single framework deployment serves unlimited customer apps dynamically:**

```
User visits: test-app.basebase.io
           ↓
Framework identifies: app-id = "test-app"
           ↓
Fetches code from: /apps/test-app/versions/{hash}
           ↓
Executes code dynamically in browser
           ↓
App renders
```

### Key Components

1. **Framework Core** (`/framework/*`) - Shared across all apps
2. **App Code** (`/app/*`) - Customer-specific, stored in Firestore
3. **Module Loader** - Virtual module system for dynamic execution
4. **CLI Tools** - `app:commit` and `app:checkout` for code management

---

## Dual-Mode Architecture

The framework operates in two distinct modes:

### Development Mode (Local Files)

**URL:** `http://localhost:3000/`

**Entry Point:** `/framework/main.js`

**Flow:**

```
index.html
  ↓
main.js (Vite dev server)
  ↓
Imports /app/app.jsx directly
  ↓
React app renders from local files
```

**Characteristics:**

- Uses Vite's dev server with HMR (Hot Module Replacement)
- Loads code from local `/app` folder
- Fast iteration (instant updates on file save)
- Full TypeScript/JSX support via Vite transforms
- Standard ES module imports work natively

**When to use:** Customer developers building their apps locally

---

### Production Mode (Firestore Dynamic Loading)

**URL:** `http://localhost:3000/test-production.html?app=test-app`

**Entry Point:** `/framework/production-entry.js`

**Flow:**

```
test-production.html
  ↓
production-entry.js
  ↓
url-parser.js extracts app-id from URL
  ↓
app-loader.js fetches from Firestore:
  - /apps/{app-id} (metadata + currentVersion)
  - /apps/{app-id}/versions/{hash} (compiled code)
  ↓
module-loader.js creates virtual module system
  ↓
Executes compiled code via eval()
  ↓
React app renders dynamically
```

**Characteristics:**

- No local `/app` files used
- Code fetched from Firestore (publicly readable)
- Module system emulated via `eval()` and CommonJS
- External dependencies (React, Mantine, Firebase) provided by framework
- Cached in localStorage for performance

**When to use:** Production deployment, testing production builds locally

---

## Code Storage & Transformation

### Firestore Data Model

```
/apps/{app-id}
  ├─ name: "Teg's App"
  ├─ owner: "uid-123"
  ├─ currentVersion: "a88317ff4d5e"  ← Points to latest version
  └─ /versions/{hash}
       ├─ source: {                  ← Original .jsx files
       │    "app.jsx": "import React...",
       │    "components/Button.jsx": "..."
       │  }
       ├─ compiled: {                ← Transformed .js files
       │    "app.js": "var React = require('react')...",
       │    "components/Button.js": "..."
       │  }
       └─ metadata: {
            version: "a88317ff4d5e",
            entry: "app.js",
            publishedAt: Timestamp,
            publishedBy: "uid-123",
            message: "Fixed bug"
          }
```

### Why Store Both Source + Compiled?

**Source (`.jsx`):**

- For `app:checkout` - developers get editable JSX files
- Human-readable, can debug in Firestore console
- Preserves original code structure

**Compiled (`.js`):**

- For production loading - ready to execute
- Pre-transformed = faster page loads (no runtime compilation)
- Transformation errors caught at commit time (not user-facing)

### Transformation Pipeline

**Location:** `scripts/app-commit.js`

**Process:**

```javascript
Original .jsx file
  ↓
1. Strip import.meta.hot (HMR code)
  ↓
2. Sucrase transform: JSX → JS (classic runtime)
  ↓
3. Convert ES modules → CommonJS (import → require)
  ↓
4. Remove any remaining import.meta references
  ↓
Compiled .js file (ready for eval)
```

**Key transformations:**

| Before (source)             | After (compiled)               |
| --------------------------- | ------------------------------ |
| `import React from 'react'` | `var React = require('react')` |
| `<Button />`                | `React.createElement(Button)`  |
| `import.meta.hot`           | _(removed)_                    |
| `export default App`        | `module.exports = App`         |

**Why CommonJS?**

- ES modules (`import/export`) require `<script type="module">`
- We execute code via `eval()` in function scope, not module scope
- CommonJS (`require/module.exports`) works in any function context

---

## Dynamic Module Loader

**Location:** `/framework/loader/module-loader.js`

### Virtual Module System

Since we execute code via `eval()`, we need to **emulate a module system** that would normally be provided by bundlers (Webpack, Vite) or Node.js.

### Module Registry

```javascript
{
  'app.js': {
    code: "var React = require('react'); ...",
    exports: {},      // Populated after execution
    loaded: false,    // Execution state
    loading: false,   // Circular dependency detection
    error: null
  },
  'components/Button.js': { ... }
}
```

### The `require()` Function

Our custom `require()` function handles:

**1. External dependencies** (React, Firebase, Mantine)

```javascript
require('react') → Returns actual React library (pre-imported by framework)
```

**2. Framework modules** (hooks, utilities)

```javascript
require('../../framework/hooks/useAuth.js')
  → Returns { useAuth } from framework
```

**3. App modules** (customer code)

```javascript
require('./components/Button.js')
  → Executes Button.js, returns its exports
```

**4. CSS imports** (skipped)

```javascript
require('@mantine/core/styles.css') → Returns {}
```

### Module Execution

**Wrapping:**

```javascript
// Original compiled code
var React = require('react');
module.exports = function App() { ... }

// Wrapped for execution
(function(module, exports, require) {
  var React = require('react');
  module.exports = function App() { ... }
  return module.exports;
})
```

**Execution:**

```javascript
const moduleFunction = eval(wrappedCode);
const result = moduleFunction(
  moduleContext, // { exports: {}, require: customRequire }
  moduleContext.exports,
  moduleContext.require
);
```

### Path Resolution

**Relative imports:**

```javascript
// From: app.js
require('./components/Button.jsx')
  ↓
Resolved to: components/Button.js  (note: .jsx → .js)
```

**Framework imports:**

```javascript
require('../../framework/hooks/useAuth.js')
  ↓
Lookup in frameworkExports['../../framework/hooks/useAuth.js']
```

### Circular Dependency Handling

```javascript
if (module.loading) {
  console.warn("Circular dependency detected");
  return module.exports; // Return partially-loaded module
}
```

---

## Production Entry Point

**Location:** `/framework/production-entry.js`

### Initialization Flow

```
1. Parse URL → Extract app-id
   ↓
2. Show loading screen
   ↓
3. Initialize Firebase (using public config)
   ↓
4. Create AppLoader instance
   ↓
5. Build frameworkExports map (React, Firebase, hooks)
   ↓
6. Fetch app from Firestore (metadata + compiled code)
   ↓
7. Create ModuleLoader with compiled code
   ↓
8. Restore DOM (#app container)
   ↓
9. Execute entry point (app.js)
   ↓
10. App renders itself via ReactDOM.createRoot()
```

### Framework Exports

All external dependencies must be pre-imported and provided to the module loader:

```javascript
const frameworkExports = {
  // External libraries
  react: React,
  "react-dom/client": ReactDOM,
  "@mantine/core": Mantine,
  "firebase/auth": FirebaseAuth,

  // Framework hooks (with path variants for different import depths)
  "../framework/hooks/useAuth.js": { useAuth },
  "../../framework/hooks/useAuth.js": { useAuth },

  // Framework core
  "../framework/core/firebase-init.js": { app, auth, db, authState },
};
```

**Why multiple path variants?**

- App code at different nesting levels imports with different relative paths
- `app.jsx` uses `../../framework/`
- `components/Button.jsx` uses `../../../framework/`
- We map common patterns to avoid complex path resolution

### URL Parsing Strategy

**Priority order:**

1. **Query param** (highest): `?app=test-app`

   - Best for testing/development
   - Explicit and unambiguous

2. **Subdomain**: `test-app.basebase.io`

   - Production standard
   - Professional, isolated URLs

3. **Path**: `basebase.io/test-app`

   - Alternative for simple hosting
   - Single domain, easier DNS

4. **LocalStorage fallback**: Development convenience

**Implementation:** `/framework/loader/url-parser.js`

---

## Security Model

### Multi-Tenancy

**Problem:** Thousands of customers share one Firebase project. How do we prevent Customer A from accessing Customer B's app?

**Solution:** Firestore Security Rules + Firebase Auth

### Firestore Rules

```javascript
// Apps collection - Publicly readable (code runs in browser anyway)
match /apps/{appId} {
  allow read: if true;
  allow create: if request.auth != null
                && request.resource.data.owner == request.auth.uid;
  allow update, delete: if request.auth != null
                        && request.auth.uid == resource.data.owner;
}

// Versions subcollection - Publicly readable
match /apps/{appId}/versions/{versionDoc} {
  allow read: if true;  // Production needs public read
  allow write: if request.auth != null
               && request.auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner;
}
```

### Why Public Read for Apps?

**The code runs in the browser anyway:**

- User can view source in DevTools
- JavaScript is inherently client-side
- No security through obscurity

**What stays protected:**

- User collections (posts, comments, etc.) - require auth
- Write access to apps - only owners
- Admin operations - Firebase Admin SDK

### Security Best Practices for Customer Developers

1. **Never store secrets in app code** (API keys, passwords)
2. **Use Firestore Rules** to protect user data
3. **Validate all inputs** on backend (Cloud Functions)
4. **Use Firebase Auth** for user management

---

## Deployment Architecture

### Current (Development Testing)

```
Developer Machine
  ↓
Vite Dev Server (localhost:3000)
  ├─ /                          → Loads local /app files
  └─ /test-production.html      → Loads from Firestore
```

### Production (Railway)

```
User Browser
  ↓
apps.basebase.com?app=teg-app
  ↓
Railway → Express Server
  ├─ Serves static files from /dist
  ├─ SPA fallback (index.html for all routes)
  └─ Health check: /__basebase/health
  ↓
index.html loads bundled framework.js
  ↓
production-entry.js extracts app-id from URL
  ↓
Fetches app code from Firestore
  ↓
Executes dynamically
```

### Build Process

**Build command:**

```bash
npm run build
```

**What it does:**

1. Runs Vite production build (`vite.config.production.js`)
2. Bundles framework + production-entry + all dependencies
3. Outputs to `/dist`:
   ```
   dist/
     ├─ index.html              # Production HTML
     ├─ assets/
     │   ├─ framework-[hash].js  # Bundled framework (minified)
     │   └─ [name]-[hash].css    # CSS assets
     └─ favicon.svg              # (if exists)
   ```

**What gets bundled:**

- Framework code (`/framework/*`)
- Production entry point (`production-entry.js`)
- All dependencies (React, Firebase, Mantine, hooks)
- Module loader system

**What does NOT get bundled:**

- `/app/*` folder (customer code lives in Firestore)
- `/scripts/*` (CLI tools, not needed in production)
- Dev dependencies

### Express Server (`server.js`)

**Purpose:** Serve static files and handle SPA routing

**Key features:**

1. **Static file serving:**

   - Serves `/dist` directory
   - Aggressive caching for hashed assets (1 year)
   - gzip compression

2. **SPA fallback:**

   - ALL routes → `index.html`
   - Enables customer apps to use path-based routing
   - e.g., `/profile`, `/dashboard/settings` work client-side

3. **Reserved admin namespace:**

   - `/__basebase/health` → Health check for Railway
   - `/__basebase/api/*` → Reserved for future admin APIs
   - Customer apps can use ANY other path

4. **Security headers:**
   - CSP with `unsafe-eval` (required for dynamic module loading)
   - X-Frame-Options, X-XSS-Protection, etc.

### Vite Production Config

**File:** `vite.config.production.js`

**Key settings:**

```javascript
{
  root: './',              // Build from root (where index.html is)
  build: {
    outDir: './dist',
    rollupOptions: {
      input: 'index.html', // Entry point
    },
    minify: 'esbuild',     // Fast minification
    target: 'es2020',      // Modern browsers only
  },
  optimizeDeps: {
    include: [              // Pre-bundle dependencies
      'react',
      'react-dom',
      'firebase/app',
      '@mantine/core',
      // ... all framework deps
    ],
  },
}
```

### Railway Configuration

**File:** `railway.json`

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Railway Settings (in Console):**

1. **Domain:** `apps.basebase.com`
2. **Environment Variables:** None required (Firebase config is in code)
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`
5. **Health Check:** `/__basebase/health`
6. **Auto-deploy:** Enabled from GitHub main branch

### URL Routing Strategies

**Current Implementation:** Query parameter

- URL: `apps.basebase.com?app=teg-app`
- Pro: Simple, works immediately
- Con: Less clean URLs

**Future Enhancement:** Subdomain routing

- URL: `teg-app.basebase.com`
- Requires: Wildcard DNS (`*.basebase.com → Railway`)
- Implementation: URL parser already supports this (checks subdomain first)

**Customer App Routing:**

- After app loads, customer controls ALL paths via React Router/etc.
- Framework reserves only `/__basebase/*` namespace
- Examples of customer paths: `/`, `/about`, `/profile`, `/posts/123`

### Deployment Workflow

**Step 1: Commit code to GitHub**

```bash
git add .
git commit -m "Update framework"
git push origin main
```

**Step 2: Railway auto-deploys**

- Detects push to main branch
- Runs build command: `npm install && npm run build`
- Creates `/dist` directory
- Starts server: `npm start` (runs `server.js`)
- Health check passes: `/__basebase/health` returns 200
- Routes traffic to new deployment

**Step 3: Verify deployment**

- Visit: `https://apps.basebase.com?app=teg-app`
- Check console: Should see app loading from Firestore
- Test: Sign in, navigate, etc.

### Deployment Checklist

**Before deploying:**

- [ ] Test locally: `npm run build && npm start`
- [ ] Visit `localhost:3000?app=teg-app` (production build)
- [ ] Verify app loads from Firestore (not local files)
- [ ] Check console for errors
- [ ] Test with multiple app-ids

**After deploying:**

- [ ] Health check: `https://apps.basebase.com/__basebase/health`
- [ ] Load test app: `https://apps.basebase.com?app=teg-app`
- [ ] Check Railway logs for errors
- [ ] Verify Firestore fetch (Network tab)
- [ ] Test authentication flow

### Monitoring

**Railway provides:**

- Deployment logs (build + runtime)
- Resource usage (CPU, memory, bandwidth)
- Health check status
- Request metrics

**Key metrics to watch:**

- Health check uptime (should be 100%)
- Average response time (should be < 500ms)
- Memory usage (Node.js apps can leak)
- 4xx/5xx errors

**Logging:**

```javascript
// server.js logs to stdout (visible in Railway)
console.log("Server started on port", PORT);
console.error("Error:", err);
```

### Troubleshooting Deployment

**Build fails:**

- Check Railway build logs
- Common: Missing dependency in `package.json`
- Fix: Add to `dependencies` (not `devDependencies`)

**Server won't start:**

- Check start command: `npm start`
- Verify `server.js` exists and is valid
- Check for port binding: `process.env.PORT`

**App loads but blank screen:**

- Check browser console for errors
- Common: Module not found (missing frameworkExport)
- Check Firestore: Is app code actually there?
- Check Network tab: Did Firestore fetch succeed?

**404 on all routes:**

- Check SPA fallback in `server.js`
- Should have: `app.get('*', (req, res) => { ... })`

**Health check failing:**

- Check: `/__basebase/health` endpoint exists
- Railway will not route traffic if health check fails

### Scaling Considerations

**Current setup (single instance):**

- Sufficient for MVP and moderate traffic
- Railway auto-scales resources (CPU/memory)

**Future (if needed):**

1. **Horizontal scaling:**

   - Railway supports multiple instances
   - Load balancer (included)
   - Stateless server (already is)

2. **CDN for static assets:**

   - Move `/dist/assets/*` to CDN (Cloudflare, etc.)
   - Faster global delivery
   - Reduce Railway bandwidth costs

3. **Edge deployment:**
   - Deploy framework to edge (Cloudflare Workers)
   - Firestore fetches from nearest region
   - Sub-100ms loads worldwide

### Cost Estimates

**Railway Pricing:**

- Free tier: $5/month credit
- Hobby: $5/month per service
- Pro: $20/month + usage

**Firestore Costs:**

- Storage: $0.18/GB/month (1000 apps @ 50KB = $9/year)
- Reads: $0.06 per 100K reads
- With caching: ~1 read per user per day
- 10K daily users = $18/year

**Total for small platform:**

- Railway: $5-20/month
- Firebase: $10-50/month
- **Total: $15-70/month** for thousands of apps

### Hosting Requirements

1. **Node.js hosting** with Express (Railway, Heroku, Render, etc.)
2. **HTTPS/SSL** - Required for Firebase Auth (Railway provides free)
3. **Custom domain** - Apps.basebase.com (configured in Railway)
4. **Environment:** Node.js 18+
5. **No database** - Firestore is the database

### Future: Subdomain Routing

**To enable `teg-app.basebase.com`:**

1. **DNS Configuration:**

   ```
   *.basebase.com  A/CNAME  → Railway app
   ```

2. **No code changes needed:**

   - URL parser already checks subdomain first
   - Server already has SPA fallback
   - Just update DNS and test

3. **Both styles work:**
   - `apps.basebase.com?app=teg-app` (current)
   - `teg-app.basebase.com` (future)
   - URL parser tries subdomain → query param → path

---

## Key Design Decisions

### 1. Why Store Compiled Code?

**Alternative:** Store source, transform at runtime in browser

**Decision:** Pre-compile during commit

**Reasons:**

- Faster page loads (no runtime compilation)
- Smaller production bundle (don't ship Sucrase)
- Transformation errors caught early (not user-facing)
- Better reliability

**Trade-off:** 2x storage (source + compiled)

- Cost: ~$0.001 per app version (negligible)
- Benefit: Much better UX

### 2. Why Use `eval()` for Module Execution?

**Alternative:** Dynamic `<script>` tags, Blob URLs, Web Workers

**Decision:** `eval()` with CommonJS wrapper

**Reasons:**

- Simple, well-understood pattern
- Synchronous execution (easier to debug)
- Full JavaScript feature support
- Can inject custom `require()` function

**Trade-off:** CSP (Content Security Policy) restrictions

- Solution: Allow `unsafe-eval` in CSP header (common for dynamic apps)

### 3. Why Sucrase Instead of Babel?

**Decision:** Sucrase for JSX transformation

**Reasons:**

- 20x faster than Babel
- Smaller (no plugin system overhead)
- Good enough for modern JS (doesn't need to target IE11)
- Simpler configuration

**Trade-off:** Less configurability

- We don't need advanced transforms (decorators, etc.)

### 4. Why CommonJS Instead of ES Modules?

**Decision:** Transform imports to CommonJS `require()`

**Reasons:**

- Works in `eval()` function scope
- Don't need `<script type="module">` per-module
- Easier circular dependency handling
- Simpler path resolution

**Trade-off:** Larger output size

- Minimal impact (~5-10% more bytes)
- Cached after first load

### 5. Why Firestore Instead of Object Storage (S3)?

**Decision:** Store code in Firestore documents

**Reasons:**

- Existing Firebase infrastructure
- Built-in access control (Security Rules)
- Real-time capabilities (future: live reloading)
- Free tier generous enough (1 GB storage)

**Trade-off:** 1MB per document limit

- Typical app: 50-200KB → Well within limit
- Apps > 1MB can split into chunks

---

## Performance Considerations

### Initial Load Time

**Typical flow:**

1. HTML load: ~50ms
2. Framework JS load: ~200ms (100-300KB gzipped)
3. Firestore fetch: ~300ms (50-200KB)
4. Module execution: ~100ms
5. React hydration: ~200ms

**Total:** ~850ms (cold start)

**With caching:**

- Framework: Cached by CDN/browser
- App code: Cached in localStorage
- Subsequent loads: ~300ms

### Optimization Strategies

**Implemented:**

- LocalStorage cache for app code
- Pre-compiled code (no runtime transformation)
- CSS loaded from CDN (Mantine)

**Future:**

- Service Worker for offline support
- HTTP/2 push for framework assets
- Code splitting (load routes on demand)
- Firestore regional replication

---

## Debugging

### Development Mode Debugging

**Chrome DevTools:**

- Sources tab shows original `.jsx` files
- Breakpoints work normally
- React DevTools available

### Production Mode Debugging

**Challenges:**

- Code executed via `eval()` (shows as "VM123" in DevTools)
- No source maps (yet)

**Tips:**

1. Check Console for module loader errors
2. Use `console.log()` in production-entry.js
3. Inspect `localStorage.__app_cache` for cached code
4. Network tab → Check Firestore fetch responses
5. Add debug logging in module-loader.js

**Common issues:**

- Module not found → Check frameworkExports mapping
- import.meta error → Code not properly stripped
- Blank screen → Check Console for React errors

---

## Future Enhancements

### Planned

1. **Source maps** for production debugging
2. **Build command** (`npm run build:framework`)
3. **Deployment scripts** (Vercel/Netlify)
4. **Custom domains** for customer apps
5. **Version rollback** UI
6. **Live preview** (real-time collaboration)

### Under Consideration

1. **TypeScript support** in customer apps
2. **Server-side rendering** (SSR) optional
3. **Edge Functions** for API routes
4. **File uploads** (images, assets)
5. **App analytics** built-in
6. **A/B testing** framework

---

## Contributing to the Framework

### File Organization

```
/framework/
  ├─ core/              # Firebase init, core utilities
  ├─ hooks/             # React hooks (useAuth, useCollection)
  ├─ loader/            # Module loader system
  │   ├─ url-parser.js     # Extract app-id from URL
  │   ├─ app-loader.js     # Fetch from Firestore
  │   └─ module-loader.js  # Virtual module system
  ├─ main.js           # Development entry point
  └─ production-entry.js  # Production entry point

/scripts/
  ├─ app-commit.js     # Upload code to Firestore
  └─ app-checkout.js   # Download code from Firestore

/app/                  # Customer app code (not in production bundle)
```

### Testing Changes

**Test both modes:**

1. **Development mode:**

   ```bash
   npm run dev
   # Visit http://localhost:3000/
   ```

2. **Production mode:**

   ```bash
   npm run dev
   # Visit http://localhost:3000/test-production.html?app=test-app
   ```

3. **Commit/checkout cycle:**
   ```bash
   npm run app:commit test-app "Testing changes"
   npm run app:checkout test-app
   ```

### Common Framework Tasks

**Add a new framework hook:**

1. Create `/framework/hooks/useNewHook.js`
2. Export from framework in `production-entry.js`
3. Add to frameworkExports map

**Add a new external library:**

1. `npm install library-name`
2. Import in `production-entry.js`
3. Add to frameworkExports map

**Update transformation:**

1. Modify `scripts/app-commit.js` → `transformCode()`
2. Re-commit test app
3. Verify in production mode

---

## Questions / Support

**Internal Slack:** #basebase-framework

**Key Contacts:**

- Framework Lead: [Your name]
- DevOps: [Team name]
- Security: [Team name]

**Resources:**

- Firebase Console: https://console.firebase.google.com/
- Firestore Rules Docs: https://firebase.google.com/docs/firestore/security/get-started
- Sucrase Docs: https://github.com/alangpierce/sucrase

---

_Last updated: 2025-11-21_
