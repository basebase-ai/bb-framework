/**
 * useDocumentSync - Real-time document content synchronization
 *
 * Features:
 * - Real-time content sync via Firestore
 * - Debounced saves to reduce write frequency
 * - Version tracking and operation logging
 * - Conflict detection (basic)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, getDocSubcollections } from "../schema.js";

/** @type {number} Debounce delay for saves in ms */
const SAVE_DEBOUNCE_MS = 500;

/** @type {number} Interval between version snapshots (in operations) */
const SNAPSHOT_INTERVAL = 20;

/**
 * @typedef {Object} DocumentContent
 * @property {string} id - Content document ID
 * @property {number} version - Current version number
 * @property {Object} content - TipTap/ProseMirror JSON content
 * @property {string | null} lastEditedBy - User who last edited
 * @property {Date | null} updatedAt - Last update timestamp
 */

/**
 * Hook for syncing document content in real-time
 *
 * @param {string | null} documentId - Document ID
 * @returns {Object} Document content state and update functions
 */
export function useDocumentSync(documentId) {
  const { user } = useAuth();

  /** @type {[DocumentContent | null, Function]} */
  const [content, setContent] = useState(null);

  /** @type {[boolean, Function]} */
  const [loading, setLoading] = useState(true);

  /** @type {[Error | null, Function]} */
  const [error, setError] = useState(null);

  /** @type {[boolean, Function]} */
  const [saving, setSaving] = useState(false);

  /** @type {[boolean, Function]} */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /** @type {React.MutableRefObject<number>} */
  const localVersionRef = useRef(0);

  /** @type {React.MutableRefObject<NodeJS.Timeout | null>} */
  const saveTimeoutRef = useRef(null);

  /** @type {React.MutableRefObject<Object | null>} */
  const pendingContentRef = useRef(null);

  /** @type {React.MutableRefObject<number>} */
  const operationCountRef = useRef(0);

  /** @type {React.MutableRefObject<boolean>} */
  const initializedRef = useRef(false);

  // Get collection paths (memoized to prevent effect re-runs)
  const paths = useMemo(
    () => (documentId ? getDocSubcollections(documentId) : null),
    [documentId]
  );

  /**
   * Save content to Firestore
   * @param {Object} newContent - TipTap/ProseMirror JSON content
   * @param {boolean} immediate - Skip debounce
   */
  const saveContent = useCallback(
    async (newContent, immediate = false) => {
      if (!documentId || !user || !paths) return;

      // Don't save until we've loaded initial content from Firestore
      if (!initializedRef.current) {
        return;
      }

      pendingContentRef.current = newContent;
      setHasUnsavedChanges(true);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const doSave = async () => {
        if (!pendingContentRef.current) return;

        const contentToSave = pendingContentRef.current;
        pendingContentRef.current = null;

        setSaving(true);

        try {
          const contentRef = doc(db, paths.content, "current");
          const newVersion = localVersionRef.current + 1;

          // Update content document
          await setDoc(contentRef, {
            version: newVersion,
            content: contentToSave,
            lastEditedBy: user.uid,
            updatedAt: serverTimestamp(),
          });

          // Update document metadata
          await updateDoc(doc(db, collections.documents, documentId), {
            currentVersion: newVersion,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            // Update word count
            wordCount: countWords(contentToSave),
            // Update excerpt
            excerpt: extractExcerpt(contentToSave),
          });

          // Log operation for history
          operationCountRef.current += 1;

          await addDoc(collection(db, paths.operations), {
            version: newVersion,
            userId: user.uid,
            userName:
              user.displayName || user.email?.split("@")[0] || "Anonymous",
            timestamp: serverTimestamp(),
            // Store snapshot periodically for efficient history viewing
            snapshot:
              operationCountRef.current % SNAPSHOT_INTERVAL === 0
                ? contentToSave
                : null,
          });

          // Create version snapshot periodically
          if (operationCountRef.current % SNAPSHOT_INTERVAL === 0) {
            await setDoc(doc(db, paths.versions, `v_${newVersion}`), {
              version: newVersion,
              content: contentToSave,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              createdByName:
                user.displayName || user.email?.split("@")[0] || "Anonymous",
            });
          }

          localVersionRef.current = newVersion;
          setHasUnsavedChanges(false);
        } catch (err) {
          console.error("Failed to save content:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          // Re-queue the content for retry
          pendingContentRef.current = contentToSave;
          setHasUnsavedChanges(true);
        } finally {
          setSaving(false);
        }
      };

      if (immediate) {
        await doSave();
      } else {
        saveTimeoutRef.current = setTimeout(doSave, SAVE_DEBOUNCE_MS);
      }
    },
    [documentId, user, paths]
  );

  /**
   * Force save any pending changes immediately
   */
  const flushChanges = useCallback(async () => {
    if (pendingContentRef.current) {
      await saveContent(pendingContentRef.current, true);
    }
  }, [saveContent]);

  /**
   * Initialize document with empty content if it doesn't exist
   * @returns {Promise<Object>} The initial content
   */
  const initializeDocument = useCallback(async () => {
    if (!documentId || !user || !paths) return null;

    const contentRef = doc(db, paths.content, "current");

    const initialContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    };

    await setDoc(contentRef, {
      version: 1,
      content: initialContent,
      lastEditedBy: user.uid,
      updatedAt: serverTimestamp(),
    });

    // Also create initial version snapshot
    await setDoc(doc(db, paths.versions, "v_1"), {
      version: 1,
      content: initialContent,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      createdByName:
        user.displayName || user.email?.split("@")[0] || "Anonymous",
      changesSummary: "Document created",
    });

    localVersionRef.current = 1;

    return initialContent;
  }, [documentId, user, paths]);

  // Subscribe to content updates
  useEffect(() => {
    if (!documentId || !paths) {
      setContent(null);
      setLoading(false);
      return;
    }

    // Reset initialized flag for new document
    initializedRef.current = false;
    localVersionRef.current = 0;

    setLoading(true);
    setError(null);

    const contentRef = doc(db, paths.content, "current");

    const unsubscribe = onSnapshot(
      contentRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          // Document content doesn't exist yet, initialize it
          const initialContent = await initializeDocument();
          if (initialContent) {
            // Mark as initialized so saves are now allowed
            initializedRef.current = true;
            // Set content immediately after initialization
            setContent({
              id: "current",
              version: 1,
              content: initialContent,
              lastEditedBy: user?.uid || null,
              updatedAt: new Date(),
              _isRemoteUpdate: false,
            });
          }
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        // Convert timestamp
        /** @type {Date | null} */
        let updatedAt = null;
        if (data.updatedAt instanceof Timestamp) {
          updatedAt = data.updatedAt.toDate();
        } else if (data.updatedAt?.seconds) {
          updatedAt = new Date(data.updatedAt.seconds * 1000);
        }

        // Skip if this is our own save echoing back (prevents unnecessary re-renders)
        const isOurOwnSave =
          data.lastEditedBy === user?.uid &&
          data.version === localVersionRef.current;

        if (initializedRef.current && isOurOwnSave) {
          return;
        }

        // Check if this is a remote update (not our own save)
        const isRemoteUpdate =
          data.lastEditedBy !== user?.uid &&
          data.version > localVersionRef.current;

        // Update local version tracker
        localVersionRef.current = data.version;

        // Mark as initialized so saves are now allowed
        initializedRef.current = true;

        setContent({
          id: snapshot.id,
          version: data.version,
          content: data.content,
          lastEditedBy: data.lastEditedBy,
          updatedAt,
          _isRemoteUpdate: isRemoteUpdate,
        });

        setLoading(false);
      },
      (err) => {
        console.error("Content subscription error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      // Flush any pending saves synchronously before unmounting
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Actually save pending content (fire-and-forget since we're unmounting)
      if (pendingContentRef.current && documentId && user && paths) {
        const contentRef = doc(db, paths.content, "current");
        setDoc(contentRef, {
          version: localVersionRef.current + 1,
          content: pendingContentRef.current,
          lastEditedBy: user.uid,
          updatedAt: serverTimestamp(),
        }).catch((err) => console.error("Failed to save on unmount:", err));

        // Also update main doc metadata
        updateDoc(doc(db, collections.documents, documentId), {
          currentVersion: localVersionRef.current + 1,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
          wordCount: countWords(pendingContentRef.current),
          excerpt: extractExcerpt(pendingContentRef.current),
        }).catch((err) =>
          console.error("Failed to update metadata on unmount:", err)
        );

        pendingContentRef.current = null;
      }
    };
    // Note: initializeDocument is stable via useCallback, but we intentionally
    // omit it to prevent re-subscribing when its dependencies change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, paths, user?.uid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    /** @type {DocumentContent | null} Current content */
    content,

    /** @type {boolean} Loading state */
    loading,

    /** @type {Error | null} Error state */
    error,

    /** @type {boolean} Currently saving */
    saving,

    /** @type {boolean} Has unsaved changes */
    hasUnsavedChanges,

    /** @type {(content: Object, immediate?: boolean) => Promise<void>} Save content */
    saveContent,

    /** @type {() => Promise<void>} Flush pending changes */
    flushChanges,
  };
}

/**
 * Count words in TipTap/ProseMirror JSON content
 * @param {Object} content
 * @returns {number}
 */
function countWords(content) {
  if (!content) return 0;

  let text = "";

  const extractText = (node) => {
    if (node.type === "text" && node.text) {
      text += node.text + " ";
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractText);
    }
  };

  extractText(content);

  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Extract excerpt from TipTap/ProseMirror JSON content
 * @param {Object} content
 * @param {number} maxLength
 * @returns {string}
 */
function extractExcerpt(content, maxLength = 200) {
  if (!content) return "";

  let text = "";

  const extractText = (node) => {
    if (text.length >= maxLength) return;

    if (node.type === "text" && node.text) {
      text += node.text;
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractText);
      // Add space between blocks
      if (node.type !== "text") {
        text += " ";
      }
    }
  };

  extractText(content);

  text = text.trim();
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + "...";
  }

  return text;
}
