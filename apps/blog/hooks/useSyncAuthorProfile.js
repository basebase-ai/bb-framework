/**
 * Syncs user profile to public authors collection
 * Run this when user signs in to ensure their public profile is up to date
 */

import { useEffect } from "react";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { collections } from "../schema.js";

export function useSyncAuthorProfile() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);

  useEffect(() => {
    if (!user || !profile) return;

    // Sync to public authors collection
    const syncProfile = async () => {
      try {
        const authorDocRef = doc(db, collections.authorsPublic, user.uid);
        await setDoc(authorDocRef, {
          displayName: profile.displayName || profile.email || "Anonymous",
          photoURL: profile.photoURL || null,
          updatedAt: Timestamp.now(),
        });
        console.log("✅ Author profile synced to public collection");
      } catch (error) {
        console.error("Failed to sync author profile:", error);
      }
    };

    syncProfile();
  }, [user, profile]);
}
