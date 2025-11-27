/**
 * Real-time document hook
 */

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, onSnapshot, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../core/firebase-init.js";
import { useAuth } from "./useAuth.js";

export function useDocument(collectionName, documentId, options = {}) {
  const { realtime = true } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exists, setExists] = useState(false);

  const { user } = useAuth();

  // Subscribe to document
  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, collectionName, documentId);

    if (realtime) {
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setData({ id: snapshot.id, ...snapshot.data() });
            setExists(true);
          } else {
            setData(null);
            setExists(false);
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Document subscription error:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      getDoc(docRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            setData({ id: snapshot.id, ...snapshot.data() });
            setExists(true);
          } else {
            setData(null);
            setExists(false);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Document fetch error:", err);
          setError(err);
          setLoading(false);
        });
    }
  }, [collectionName, documentId, realtime]);

  // Update document (requires document to exist)
  const update = useCallback(
    async (updates) => {
      if (!documentId) {
        throw new Error("Cannot update document without ID");
      }

      try {
        const updatesWithMeta = {
          ...updates,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
        };

        await updateDoc(doc(db, collectionName, documentId), updatesWithMeta);
      } catch (error) {
        console.error("Failed to update document:", error);
        throw error;
      }
    },
    [collectionName, documentId, user]
  );

  // Set document (creates or overwrites)
  const set = useCallback(
    async (data) => {
      if (!documentId) {
        throw new Error("Cannot set document without ID");
      }

      try {
        const dataWithMeta = {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
          owner: user?.uid || null,
        };

        await setDoc(doc(db, collectionName, documentId), dataWithMeta);
      } catch (error) {
        console.error("Failed to set document:", error);
        throw error;
      }
    },
    [collectionName, documentId, user]
  );

  // Delete document
  const remove = useCallback(async () => {
    if (!documentId) {
      throw new Error("Cannot delete document without ID");
    }

    try {
      await deleteDoc(doc(db, collectionName, documentId));
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw error;
    }
  }, [collectionName, documentId]);

  return {
    data,
    loading,
    error,
    exists,
    update,
    set,
    remove,
  };
}

