# Your App Code Goes Here

**⚠️ IMPORTANT: Only modify files in this `/app` directory!**

## What You Can Edit

✅ Everything in this folder:
- `components/` - Your React components
- `stores/` - Your Zustand stores  
- `hooks/` - Your custom hooks
- `utils/` - Your utility functions
- `schema.js` - Your data structure
- `app.jsx` - Your main entry point

## What You CANNOT Edit

❌ Do NOT modify anything outside this folder:
- `/framework` - Core framework code
- `/scripts` - Build scripts
- `/config` - Configuration files
- `package.json`, `vite.config.js`, etc.

## Why?

When you run `npm run app:commit`, **ONLY this `/app` folder** is uploaded to Firestore.

Any changes outside `/app`:
- Will work locally but FAIL in production
- Won't be included in the commit
- Could break other apps on the platform

## Development Workflow

1. Edit files in `/app` (this folder)
2. Test locally: `npm run dev`
3. Commit: `npm run app:commit <appId> "Your message"`
4. Your changes go live!

---

**Remember: If it's not in `/app`, don't touch it!** 🚫

