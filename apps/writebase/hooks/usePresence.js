/**
 * usePresence - Track and broadcast user presence in a document
 * 
 * Features:
 * - Real-time cursor/selection sync
 * - Typing indicators
 * - Automatic cleanup on disconnect
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { getDocSubcollections, getUserColor } from "../schema.js";

/** @typedef {{ anchor: number, head: number }} CursorPosition */
/** @typedef {{ from: number, to: number }} SelectionRange */

/**
 * @typedef {Object} PresenceUser
 * @property {string} odne - Presence document ID (user's UID)
 * @property {string} displayName - User's display name
 * @property {string | null} photoURL - User's photo URL
 * @property {string} color - User's assigned color
 * @property {CursorPosition | null} cursor - Cursor position
 * @property {SelectionRange | null} selection - Selection range
 * @property {boolean} isTyping - Whether user is typing
 * @property {Date} lastSeen - Last activity timestamp
 */

/** @type {number} Presence update interval in ms */
const PRESENCE_UPDATE_INTERVAL = 5000;

/** @type {number} Stale threshold - remove users not seen in this many ms */
const STALE_THRESHOLD = 30000;

/**
 * Hook for managing document presence (active users, cursors, selections)
 * 
 * @param {string | null} documentId - Document ID to track presence for
 * @returns {Object} Presence state and update functions
 */
export function usePresence(documentId) {
  const { user } = useAuth();
  
  /** @type {[PresenceUser[], Function]} */
  const [activeUsers, setActiveUsers] = useState([]);
  
  /** @type {React.MutableRefObject<CursorPosition | null>} */
  const lastCursorRef = useRef(null);
  
  /** @type {React.MutableRefObject<NodeJS.Timeout | null>} */
  const heartbeatRef = useRef(null);
  
  /** @type {React.MutableRefObject<NodeJS.Timeout | null>} */
  const typingTimeoutRef = useRef(null);

  // Get presence collection path
  const presencePath = documentId ? getDocSubcollections(documentId).presence : null;

  /**
   * Update own presence in Firestore
   */
  const updatePresence = useCallback(async (data) => {
    if (!documentId || !user || !presencePath) return;

    try {
      const presenceRef = doc(db, presencePath, user.uid);
      await setDoc(presenceRef, {
        odne: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || null,
        color: getUserColor(user.uid),
        lastSeen: serverTimestamp(),
        ...data,
      }, { merge: true });
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }, [documentId, user, presencePath]);

  /**
   * Update cursor position
   * @param {CursorPosition} cursor
   */
  const updateCursor = useCallback((cursor) => {
    lastCursorRef.current = cursor;
    updatePresence({ 
      cursor,
      selection: cursor.anchor !== cursor.head 
        ? { from: Math.min(cursor.anchor, cursor.head), to: Math.max(cursor.anchor, cursor.head) }
        : null,
    });
  }, [updatePresence]);

  /**
   * Set typing indicator (auto-clears after 2s)
   */
  const setTyping = useCallback((isTyping) => {
    updatePresence({ isTyping });
    
    // Clear typing after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        updatePresence({ isTyping: false });
      }, 2000);
    }
  }, [updatePresence]);

  /**
   * Remove own presence (on unmount/disconnect)
   */
  const removePresence = useCallback(async () => {
    if (!documentId || !user || !presencePath) return;

    try {
      const presenceRef = doc(db, presencePath, user.uid);
      await deleteDoc(presenceRef);
    } catch (error) {
      console.error("Failed to remove presence:", error);
    }
  }, [documentId, user, presencePath]);

  // Subscribe to presence updates
  useEffect(() => {
    if (!documentId || !presencePath) {
      setActiveUsers([]);
      return;
    }

    const presenceCollection = collection(db, presencePath);
    
    const unsubscribe = onSnapshot(presenceCollection, (snapshot) => {
      const now = Date.now();
      
      /** @type {PresenceUser[]} */
      const users = [];
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Convert Firestore timestamp to Date
        /** @type {Date} */
        let lastSeenDate;
        if (data.lastSeen instanceof Timestamp) {
          lastSeenDate = data.lastSeen.toDate();
        } else if (data.lastSeen?.seconds) {
          lastSeenDate = new Date(data.lastSeen.seconds * 1000);
        } else {
          lastSeenDate = new Date();
        }
        
        // Filter out stale users (haven't been seen in STALE_THRESHOLD ms)
        const timeSinceLastSeen = now - lastSeenDate.getTime();
        if (timeSinceLastSeen > STALE_THRESHOLD) {
          return;
        }
        
        users.push({
          odne: docSnapshot.id,
          displayName: data.displayName || 'Anonymous',
          photoURL: data.photoURL || null,
          color: data.color || getUserColor(docSnapshot.id),
          cursor: data.cursor || null,
          selection: data.selection || null,
          isTyping: data.isTyping || false,
          lastSeen: lastSeenDate,
        });
      });
      
      setActiveUsers(users);
    }, (error) => {
      console.error("Presence subscription error:", error);
    });

    return () => unsubscribe();
  }, [documentId, presencePath]);

  // Set up heartbeat to keep presence alive
  useEffect(() => {
    if (!documentId || !user) return;

    // Initial presence
    updatePresence({
      cursor: lastCursorRef.current,
      isTyping: false,
    });

    // Heartbeat every 5 seconds
    heartbeatRef.current = setInterval(() => {
      updatePresence({
        cursor: lastCursorRef.current,
      });
    }, PRESENCE_UPDATE_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      removePresence();
    };
  }, [documentId, user, updatePresence, removePresence]);

  // Filter out current user from active users list
  const otherUsers = activeUsers.filter(u => u.odne !== user?.uid);

  return {
    /** @type {PresenceUser[]} All active users including self */
    activeUsers,
    
    /** @type {PresenceUser[]} Other active users (excluding self) */
    otherUsers,
    
    /** @type {number} Count of other users */
    otherUsersCount: otherUsers.length,
    
    /** @type {(cursor: CursorPosition) => void} Update cursor position */
    updateCursor,
    
    /** @type {(isTyping: boolean) => void} Set typing indicator */
    setTyping,
    
    /** @type {() => Promise<void>} Remove own presence */
    removePresence,
  };
}
