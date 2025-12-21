# Blog App - Work Session Notes

## 🚨 QUICK START AFTER REBOOT

1. `npm run dev`
2. Posts should appear automatically - the main issues have been fixed!
3. Debug panel available by clicking "Debug" button in header

---

## Current Status (2025-12-21) ✅ FIXED!

### What Was Fixed
**Root Cause:** The `useCollection` hook didn't support `realtime: false` mode. When you set `realtime: false` to avoid the "INTERNAL ASSERTION FAILED" error, the hook would exit early and never fetch any data.

**Solution:** Updated `/framework/hooks/useCollection.js` to support both modes:
- `realtime: true` → Uses `onSnapshot` for real-time subscriptions
- `realtime: false` → Uses `getDocs` for one-time fetch

**Files Modified:**
1. `framework/hooks/useCollection.js` - Added getDocs support for non-realtime queries
2. `apps/blog/components/DebugPanel.jsx` - Created interactive Firestore query debugger
3. `apps/blog/app.jsx` - Added Debug button to header for troubleshooting
4. `apps/blog/schema.js` - Added missing index: `["authorId", "updatedAt"]`

### Blog Now Works Correctly
- ✅ Posts display when logged in
- ✅ Draft posts visible to authors
- ✅ Published posts visible to everyone
- ✅ All 4 posts showing up correctly
- ✅ Proper sorting by updatedAt (descending)
- ✅ No more "INTERNAL ASSERTION FAILED" errors
- ✅ Interactive debug panel for testing queries

---

## Previous Status (2025-12-20)

### What We Know Before Reboot
- Two posts exist in Firebase Console under `blog_posts` collection
- One post created before `_public` collection was implemented
- One post created after `_public` was supposedly implemented
- When logged in, NO posts are showing in the UI
- No ASSERTION FAILED errors are appearing in console anymore
- But posts still aren't visible

### Active Issues - NOT FULLY RESOLVED ⚠️

1. **Firestore "INTERNAL ASSERTION FAILED" Error** - PARTIALLY FIXED
   - Added `realtime: false` to all useCollection calls in PostList.jsx and PostView.jsx
   - This stopped the error messages from appearing
   - BUT: Posts still aren't showing up when logged in
   - Possible causes:
     - Firestore index might be missing for the query
     - Query might be silently failing without errors
     - Auth state might not be properly set when query runs
     - Security rules might be blocking the query

2. **Posts Not Visible When Logged In** - BLOCKING ISSUE ❌
   - User has two posts in `blog_posts` collection (verified in Firebase Console)
   - Neither post appears when logged in to the blog
   - Expected: Should see own posts from `blog_posts` collection
   - Location of dual-query code: apps/blog/components/PostList.jsx lines 41-92
   - Need to debug:
     - Check browser console for errors
     - Check if query is executing (add console.logs)
     - **LIKELY CAUSE**: Missing composite Firestore index for `authorId + updatedAt`
     - Verify Firestore security rules allow read (defined in schema.js)
     - Check if `authorId` field in posts matches logged-in user's UID
     - Verify `useCollection` hook is working with conditional queries (passing `null` when not logged in)

3. **Timestamp Issue in PostEditor** - FIXED ✅
   - Changed from `new Date()` to `Timestamp.now()` (imported from firebase/firestore)
   - Now properly includes `createdAt` and `updatedAt` when syncing to public collection
   - Location: apps/blog/components/PostEditor.jsx lines 23, 144-177
   - NOTE: Can't test this until posts are visible

## What You Need to Do After Restart

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Debug Why Posts Aren't Showing Up

**First, check browser console when logged in:**
- Open Chrome DevTools (F12)
- Go to Console tab
- Look for:
  - Any Firestore errors
  - Index creation URLs (these would show if composite index is missing)
  - Any red error messages

**Expected Firestore Index Error:**
You will likely need to create a composite index for:
```
Collection: blog_posts
Query: where authorId == [your-uid] AND orderBy updatedAt DESC
```

**If you see an index error:**
- Firestore will provide a clickable URL in the error message
- Click it to auto-create the index (takes 1-2 minutes to build)
- OR manually create in Firebase Console > Firestore > Indexes:
  - Collection ID: `blog_posts`
  - Fields indexed:
    1. `authorId` (Ascending)
    2. `updatedAt` (Descending)
  - Query scope: Collection

**Check what the queries are returning:**
Add these temporary console.logs to apps/blog/components/PostList.jsx around line 92:
```javascript
console.log('User:', user?.uid);
console.log('My posts:', myPosts);
console.log('Published posts:', publishedPosts);
console.log('All posts combined:', allPosts);
```

### 3. Once Posts Are Visible - Sync to Public Collection
After debugging and getting posts to show:
1. Edit each of your two existing posts
2. Click "Publish" or "Update Post"
3. This will sync them to `blog_posts_public` with proper Timestamps

## Current Architecture

### Collections
- `blog_posts` - Private collection (only authors see their own posts)
  - Contains drafts AND published posts
  - Security: read/write only by author

- `blog_posts_public` - Public collection (everyone can read)
  - Contains ONLY published posts
  - Synced automatically when you click "Publish" in editor
  - Security: read by anyone, write only by author

### Key Files Modified Today
1. `apps/blog/components/PostList.jsx` - Dual query system, realtime: false
2. `apps/blog/components/PostEditor.jsx` - Timestamp fixes, proper sync logic
3. `apps/blog/components/PostView.jsx` - Added realtime: false
4. `apps/blog/schema.js` - Dual-collection schema (done earlier)

## Known Issues / TODOs

- [ ] Real-time updates disabled (posts don't auto-refresh when others publish)
- [ ] Could add manual refresh button if needed
- [ ] Consider asking Teg about auth state + watch stream issues
- [ ] Future: Add "My Drafts" filter/view for better draft management

## Debugging Checklist After Restart

- [ ] Dev server starts successfully
- [ ] Can view blog anonymously (should show empty state or any posts in `blog_posts_public`)
- [ ] Can log in without ASSERTION FAILED errors showing up
- [ ] Check console for Firestore index error - if yes, create the index
- [ ] Add console.logs to see what data queries are returning
- [ ] Verify posts exist in Firebase Console under `blog_posts` collection
- [ ] Verify the `authorId` field matches your user UID
- [ ] **MAIN GOAL:** Figure out why posts aren't appearing when logged in
- [ ] Once visible: edit and republish to sync to `blog_posts_public`
- [ ] Test anonymous viewing after republishing

## Questions for Teg (Future)

1. Is there a known issue with watch streams during auth state changes?
2. Best practice for queries that should work both authenticated and anonymous?
3. Any plans to document the `_public` collection convention?
