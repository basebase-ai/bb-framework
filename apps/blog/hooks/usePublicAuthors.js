/**
 * Fetch multiple author profiles from public authors collection
 * Safe for anonymous users
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { collections } from "../schema.js";

export function usePublicAuthors(authorIds) {
  const [authors, setAuthors] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorIds || authorIds.length === 0) {
      setAuthors(new Map());
      setLoading(false);
      return;
    }

    const fetchAuthors = async () => {
      try {
        const authorsMap = new Map();

        // Firestore 'in' queries are limited to 10 items, so batch if needed
        const batchSize = 10;
        for (let i = 0; i < authorIds.length; i += batchSize) {
          const batch = authorIds.slice(i, i + batchSize);

          const q = query(
            collection(db, collections.authorsPublic),
            where("__name__", "in", batch)
          );

          const snapshot = await getDocs(q);
          snapshot.forEach((doc) => {
            authorsMap.set(doc.id, doc.data());
          });
        }

        // Add fallback for missing authors
        authorIds.forEach((id) => {
          if (!authorsMap.has(id)) {
            authorsMap.set(id, { displayName: "Unknown Author" });
          }
        });

        setAuthors(authorsMap);
      } catch (error) {
        console.error("Failed to fetch authors:", error);
        // Fallback map with unknown authors
        const fallbackMap = new Map();
        authorIds.forEach((id) => {
          fallbackMap.set(id, { displayName: "Unknown Author" });
        });
        setAuthors(fallbackMap);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthors();
  }, [JSON.stringify(authorIds?.sort())]); // Sort to ensure stable dependency

  return { authors, loading };
}
