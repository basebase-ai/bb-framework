/**
 * Real-time collection hook with optimistic updates
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

// Stable empty array to avoid re-renders
const EMPTY_ARRAY = [];

// Track which collections have already logged the client-side sort warning
// so we don't spam the console on every re-render.
/** @type {Set<string>} */
const _clientSortWarned = new Set();

/**
 * Check whether a query with the given where conditions and orderBy field
 * would require a Firestore composite index.
 *
 * Composite indexes are needed when the orderBy field is different from
 * every field used in the where conditions (e.g. where("owner") + orderBy("createdAt")).
 *
 * @param {Array<[string, string, unknown]>} whereConditions
 * @param {string | [string, string] | null} orderByField
 * @returns {boolean}
 */
function needsCompositeIndex(whereConditions, orderByField) {
  if (!orderByField || whereConditions.length === 0) return false;

  /** @type {string} */
  const orderField = Array.isArray(orderByField)
    ? orderByField[0]
    : orderByField;

  /** @type {string[]} */
  const whereFields = whereConditions.map(([field]) => field);

  // A composite index is required when any where field differs from the orderBy field
  return whereFields.some((f) => f !== orderField);
}

/**
 * Sort an array of documents by a field and optionally slice to a limit.
 * Handles Firestore Timestamps (via .toMillis()), numbers, strings, and nulls.
 *
 * @param {Array<Record<string, unknown>>} docs
 * @param {string | [string, string] | null} orderByField
 * @param {number | null} limitCount
 * @returns {Array<Record<string, unknown>>}
 */
function sortAndLimit(docs, orderByField, limitCount) {
  if (!orderByField && !limitCount) return docs;

  /** @type {Array<Record<string, unknown>>} */
  let result = docs;

  if (orderByField) {
    const [field, dir = "asc"] = Array.isArray(orderByField)
      ? orderByField
      : [orderByField, "asc"];

    result = [...docs].sort((a, b) => {
      // Normalise Firestore Timestamps to millis; fall back to raw value or 0
      const aRaw = a[field];
      const bRaw = b[field];
      const aVal = typeof aRaw?.toMillis === "function" ? aRaw.toMillis() : (aRaw ?? 0);
      const bVal = typeof bRaw?.toMillis === "function" ? bRaw.toMillis() : (bRaw ?? 0);

      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  return limitCount ? result.slice(0, limitCount) : result;
}

export function useCollection(collectionName, options = {}) {
  const {
    where: whereConditions = EMPTY_ARRAY,
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

  // Determine up-front whether this query would need a composite index.
  // If so we skip orderBy/limit on the Firestore query and handle them
  // client-side so the query never fails due to a missing index.
  /** @type {boolean} */
  const useClientSort = needsCompositeIndex(whereConditions, orderByField);

  // Build query
  const buildQuery = useCallback(() => {
    let q = collection(db, collectionName);

    // Apply where conditions
    whereConditions.forEach(([field, op, value]) => {
      // Replace auth.uid with actual user ID
      const actualValue = value === "auth.uid" ? user?.uid : value;
      q = query(q, where(field, op, actualValue));
    });

    // Apply ordering — skip if we detected a composite index requirement
    if (orderByField && !useClientSort) {
      const [field, direction = "asc"] = Array.isArray(orderByField)
        ? orderByField
        : [orderByField, "asc"];
      q = query(q, orderBy(field, direction));
    }

    // Apply limit — skip if sorting client-side (we need all docs first)
    if (limitCount && !useClientSort) {
      q = query(q, limit(limitCount));
    }

    // Log a one-time warning per collection so devs know what's happening
    if (useClientSort && !_clientSortWarned.has(collectionName)) {
      _clientSortWarned.add(collectionName);
      const orderField = Array.isArray(orderByField) ? orderByField[0] : orderByField;
      const whereFields = whereConditions.map(([f]) => f).join(", ");
      console.warn(
        `[useCollection] Sorting client-side for "${collectionName}" — ` +
        `query combines where(${whereFields}) + orderBy(${orderField}), ` +
        `which would need a Firestore composite index. ` +
        `App works fine; for large collections consider adding an index to your schema.`
      );
    }

    return q;
  }, [collectionName, whereConditions, orderByField, limitCount, user?.uid, useClientSort]);

  // Subscribe to collection
  useEffect(() => {
    if (!realtime) return;

    setLoading(true);
    const q = buildQuery();

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          _ref: doc.ref,
        }));

        // Client-side sort + limit when we skipped orderBy/limit on the query
        if (useClientSort) {
          docs = sortAndLimit(docs, orderByField, limitCount);
        }

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
  }, [buildQuery, realtime, useClientSort, orderByField, limitCount]);

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

