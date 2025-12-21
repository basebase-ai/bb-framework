/**
 * One-time collection fetch (non-realtime)
 * App-level workaround for when useCollection's realtime mode causes issues
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";

export function useCollectionOnce(collectionName, options = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Handle null options (skip query)
    if (options === null) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        let q = collection(db, collectionName);

        // Apply where conditions
        if (options.where) {
          options.where.forEach(([field, op, value]) => {
            q = query(q, where(field, op, value));
          });
        }

        // Apply ordering
        if (options.orderBy) {
          const [field, direction = "asc"] = Array.isArray(options.orderBy)
            ? options.orderBy
            : [options.orderBy, "asc"];
          q = query(q, orderBy(field, direction));
        }

        // Apply limit
        if (options.limit) {
          q = query(q, limit(options.limit));
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          _ref: doc.ref,
        }));

        setData(docs);
        setError(null);
      } catch (err) {
        console.error("Collection fetch error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionName, JSON.stringify(options)]);

  return { data, loading, error };
}
