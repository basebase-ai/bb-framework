# Apps Directory

This directory contains multiple example apps built with the Basebase Framework.

## Available Apps

### starter-app
A simple sticky notes board demonstrating basic CRUD operations and real-time updates.
- Access: `http://localhost:3000?app=starter-app`
- Features: Create, edit, delete notes with drag-and-drop

### playground
An app marketplace/browser showing all available Basebase apps.
- Access: `http://localhost:3000?app=playground`
- Features: Browse apps, search, view app details, request access

### basepedia
A wiki-style app with pages and rich content (if you create it).
- Access: `http://localhost:3000?app=basepedia`

## Development Workflow

### Running an App Locally
```bash
# Start dev server and access any app via URL param
npm run dev

# Then open: http://localhost:3000?app=<app-id>
```

### Creating a New App
```bash
# 1. Initialize a new app in Firestore
npm run app:init my-new-app

# 2. This will prompt for your Firebase credentials
# 3. Your app will be created at /apps/my-new-app/
```

### Checking Out an Existing App
```bash
# Download app code from Firestore to /apps/<app-id>/
npm run app:checkout <app-id>
```

### Committing Changes
```bash
# Upload your local changes to Firestore
npm run app:commit <app-id>
```

## Directory Structure

Each app has its own isolated directory:

```
apps/
├── starter-app/
│   ├── app.jsx           # Main app entry point
│   ├── schema.js         # Data schema and collections
│   ├── components/       # React components
│   └── stores/           # Zustand stores (optional)
├── playground/
│   ├── app.jsx
│   ├── schema.js
│   └── components/
└── your-app/
    ├── app.jsx
    ├── schema.js
    └── components/
```

## Important Notes

- Each app is completely isolated
- Apps share the same framework but have separate code
- In production, apps are loaded dynamically from Firestore
- In development, apps are loaded from their respective directories
- The `?app=` URL parameter determines which app to load

