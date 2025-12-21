/**
 * Fetch author profile from public authors collection
 * Safe for anonymous users
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { collections } from "../schema.js";

export function usePublicAuthor(authorId) {
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorId) {
      setAuthor(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchAuthor = async () => {
      try {
        const authorDocRef = doc(db, collections.authorsPublic, authorId);
        const authorDoc = await getDoc(authorDocRef);

        if (authorDoc.exists()) {
          setAuthor(authorDoc.data());
          console.log("✅ Fetched author from public collection:", authorDoc.data());
        } else {
          // Fallback if author profile not synced yet
          console.warn("⚠️ Author profile not found in public collection, using fallback");
          setAuthor({ displayName: "Unknown Author" });
        }
      } catch (error) {
        console.error("❌ Failed to fetch author:", error);
        setAuthor({ displayName: "Unknown Author" });
      } finally {
        setLoading(false);
      }
    };

    fetchAuthor();
  }, [authorId]);

  return { author, loading };
}
