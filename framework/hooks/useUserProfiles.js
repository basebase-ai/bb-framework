/**
 * useUserProfiles Hook
 *
 * Real-time access to multiple user profiles from the global users collection.
 * Efficiently batches and caches user data.
 *
 * Usage:
 *   const { profiles, loading, error } = useUserProfiles([userId1, userId2, userId3]);
 *
 * Returns:
 *   - profiles: Map<userId, profile> where profile = { displayName, photoURL, bio, email, ... }
 *   - loading: boolean
 *   - error: Error | null
 */

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../core/firebase-init.js";

export function useUserProfiles(userIds = []) {
  const [profiles, setProfiles] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setProfiles(new Map());
      setLoading(false);
      return;
    }

    // Filter out null/undefined and ensure all IDs are strings
    // Handle case where items might be objects with an 'id' property
    const validUserIds = userIds
      .filter(Boolean)
      .map((id) => {
        if (typeof id === "string") return id;
        if (id && typeof id === "object" && "id" in id) return String(id.id);
        return null;
      })
      .filter((id) => id && typeof id === "string" && id.length > 0);

    if (validUserIds.length === 0) {
      setProfiles(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribers = [];
    const profilesMap = new Map();
    let loadedCount = 0;

    validUserIds.forEach((userId) => {
      const userRef = doc(db, "users", userId);

      const unsubscribe = onSnapshot(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            profilesMap.set(userId, { id: snapshot.id, ...snapshot.data() });
          } else {
            // User doesn't exist - set placeholder
            profilesMap.set(userId, {
              id: userId,
              displayName: "Unknown User",
              photoURL: null,
              email: null,
            });
          }

          loadedCount++;

          // Update state with new map
          setProfiles(new Map(profilesMap));

          // Mark as loaded once all profiles are fetched
          if (loadedCount >= validUserIds.length) {
            setLoading(false);
          }
        },
        (err) => {
          console.error(`Error fetching user profile for ${userId}:`, err);
          setError(err);

          // Set a placeholder even on error so the UI doesn't hang
          profilesMap.set(userId, {
            id: userId,
            displayName: "Unknown User",
            photoURL: null,
            email: null,
          });
          setProfiles(new Map(profilesMap));

          loadedCount++;
          if (loadedCount >= validUserIds.length) {
            setLoading(false);
          }
        }
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [JSON.stringify(userIds)]); // Stringify to handle array changes

  return {
    profiles,
    loading,
    error,
  };
}
