/**
 * Real-time collection hook with optimistic updates
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../core/firebase-init.js";
import { useAuth } from "./useAuth.js";

export function useCollection(collectionName, options = {}) {
  const {
    where: whereConditions = [],
    orderBy: orderByField = null,
    limit: limitCount = null,
    realtime = true,
    optimistic = true,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track optimistic updates
  const optimisticUpdates = useRef(new Map());
  const [optimisticVersion, setOptimisticVersion] = useState(0);

  const { user } = useAuth();

  // Build query
  const buildQuery = useCallback(() => {
    let q = collection(db, collectionName);

    // Apply where conditions
    whereConditions.forEach(([field, op, value]) => {
      // Replace auth.uid with actual user ID
      const actualValue = value === "auth.uid" ? user?.uid : value;
      q = query(q, where(field, op, actualValue));
    });

    // Apply ordering
    if (orderByField) {
      const [field, direction = "asc"] = Array.isArray(orderByField)
        ? orderByField
        : [orderByField, "asc"];
      q = query(q, orderBy(field, direction));
    }

    // Apply limit
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    return q;
  }, [collectionName, whereConditions, orderByField, limitCount, user]);

  // Subscribe to collection
  useEffect(() => {
    if (!realtime) return;

    setLoading(true);
    const q = buildQuery();

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          _ref: doc.ref,
        }));

        setData(docs);
        setLoading(false);
        setError(null);

        // Clear optimistic updates that have been confirmed
        optimisticUpdates.current.clear();
        setOptimisticVersion((v) => v + 1);
      },
      (err) => {
        console.error("Collection subscription error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildQuery, realtime]);

  // Apply optimistic updates to data
  const dataWithOptimistic = useCallback(() => {
    if (!optimistic || optimisticUpdates.current.size === 0) {
      return data;
    }

    // Apply optimistic updates
    return data.map((item) => {
      const update = optimisticUpdates.current.get(item.id);
      return update ? { ...item, ...update } : item;
    });
  }, [data, optimistic, optimisticVersion]);

  // Add document
  const add = useCallback(
    async (docData, options = {}) => {
      const { optimistic: doOptimistic = optimistic } = options;

      try {
        // Add metadata
        const dataWithMeta = {
          ...docData,
          owner: user?.uid || null,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
        };

        if (doOptimistic) {
          const tempId = `temp_${Date.now()}`;
          const optimisticDoc = {
            id: tempId,
            ...dataWithMeta,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setData((prev) => [...prev, optimisticDoc]);

          // Store for rollback
          const rollback = () => {
            setData((prev) => prev.filter((item) => item.id !== tempId));
          };

          try {
            const docRef = await addDoc(
              collection(db, collectionName),
              dataWithMeta
            );

            // Update temp ID with real ID
            setData((prev) =>
              prev.map((item) =>
                item.id === tempId ? { ...item, id: docRef.id } : item
              )
            );

            return docRef.id;
          } catch (error) {
            rollback();
            throw error;
          }
        } else {
          const docRef = await addDoc(
            collection(db, collectionName),
            dataWithMeta
          );
          return docRef.id;
        }
      } catch (error) {
        console.error("Failed to add document:", error);
        throw error;
      }
    },
    [collectionName, user, optimistic]
  );

  // Update document
  const update = useCallback(
    async (docId, updates, options = {}) => {
      const { optimistic: doOptimistic = optimistic } = options;

      try {
        // Add metadata
        const updatesWithMeta = {
          ...updates,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
        };

        if (doOptimistic) {
          // Store optimistic update
          optimisticUpdates.current.set(docId, {
            ...updates,
            updatedAt: new Date(),
          });
          setOptimisticVersion((v) => v + 1);

          // Store rollback
          const rollback = () => {
            optimisticUpdates.current.delete(docId);
            setOptimisticVersion((v) => v + 1);
          };

          try {
            await updateDoc(doc(db, collectionName, docId), updatesWithMeta);
          } catch (error) {
            rollback();
            throw error;
          }
        } else {
          await updateDoc(doc(db, collectionName, docId), updatesWithMeta);
        }
      } catch (error) {
        console.error("Failed to update document:", error);
        throw error;
      }
    },
    [collectionName, user, optimistic]
  );

  // Delete document
  const remove = useCallback(
    async (docId, options = {}) => {
      const { optimistic: doOptimistic = optimistic } = options;

      try {
        if (doOptimistic) {
          // Optimistically remove from local state
          const originalData = data;
          setData((prev) => prev.filter((item) => item.id !== docId));

          // Store rollback
          const rollback = () => {
            setData(originalData);
          };

          try {
            await deleteDoc(doc(db, collectionName, docId));
          } catch (error) {
            rollback();
            throw error;
          }
        } else {
          await deleteDoc(doc(db, collectionName, docId));
        }
      } catch (error) {
        console.error("Failed to delete document:", error);
        throw error;
      }
    },
    [collectionName, data, optimistic]
  );

  // Batch operations
  const batchUpdate = useCallback(
    async (operations) => {
      const batch = writeBatch(db);

      operations.forEach(({ type, id, data }) => {
        const ref = doc(db, collectionName, id);

        switch (type) {
          case "update":
            batch.update(ref, {
              ...data,
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid || null,
            });
            break;
          case "delete":
            batch.delete(ref);
            break;
          default:
            throw new Error(`Unknown batch operation: ${type}`);
        }
      });

      await batch.commit();
    },
    [collectionName, user]
  );

  return {
    data: dataWithOptimistic(),
    loading,
    error,
    add,
    update,
    remove,
    batchUpdate,
    refresh: () => buildQuery(),
  };
}

