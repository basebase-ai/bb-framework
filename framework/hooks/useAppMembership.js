/**
 * useAppMembership Hook
 *
 * Manages user membership in the current app:
 * - Auto-creates membership for first-time visitors (open apps)
 * - Updates lastVisitedAt on each session
 * - Returns membership info (role, tier, status)
 * - Blocks access for users without proper membership
 */

import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../core/firebase-init.js";
import { useAuth } from "./useAuth.js";

export function useAppMembership(appId) {
  const { user, loading: authLoading } = useAuth();
  const [membership, setMembership] = useState(
    /** @type {Record<string, unknown> | null} */ (null)
  );
  const [error, setError] = useState(/** @type {Error | null} */ (null));
  const [hasAccess, setHasAccess] = useState(false);
  const [lastVisitUpdated, setLastVisitUpdated] = useState(false);

  // Track which appId we've completed checking - this prevents flash of error on sign-in
  const [checkedAppId, setCheckedAppId] = useState(
    /** @type {string | null} */ (null)
  );

  useEffect(() => {
    if (authLoading || !user || !appId) {
      return;
    }

    let unsubscribed = false;

    async function checkOrCreateMembership() {
      try {
        const membershipId = `${appId}_${user.uid}`;
        const membershipRef = doc(db, "app-members", membershipId);

        // Get membership document
        const membershipSnap = await getDoc(membershipRef);

        if (membershipSnap.exists()) {
          const membershipData = membershipSnap.data();

          if (unsubscribed) return;

          // Update lastVisitedAt only once per session (fire and forget)
          if (!lastVisitUpdated) {
            setLastVisitUpdated(true);
            updateDoc(membershipRef, {
              lastVisitedAt: serverTimestamp(),
            }).catch((err) =>
              console.warn("Failed to update lastVisitedAt:", err)
            );
          }

          // Check if membership is active
          const isActive = membershipData.status === "active";
          setMembership(membershipData);
          setHasAccess(isActive);
          setError(null);
          setCheckedAppId(appId);
        } else {
          // No membership exists - check if app is open
          const appRef = doc(db, "apps", appId);
          const appSnap = await getDoc(appRef);

          if (!appSnap.exists()) {
            throw new Error("App not found");
          }

          const appData = appSnap.data();
          const isOwner = appData.owner === user.uid;
          const isOpen = appData.accessMode === "open";

          if (unsubscribed) return;

          if (isOwner || isOpen) {
            // Auto-create membership
            const newMembership = {
              appId,
              userId: user.uid,
              role: isOwner ? "owner" : "member",
              status: "active",
              tier: "free",
              joinedAt: serverTimestamp(),
              lastVisitedAt: serverTimestamp(),
            };

            await setDoc(membershipRef, newMembership);

            if (unsubscribed) return;

            setMembership(newMembership);
            setHasAccess(true);
            setError(null);
            setCheckedAppId(appId);
          } else {
            // App is invite-only or paid, user needs explicit access
            setMembership(null);
            setHasAccess(false);
            setError(
              new Error(
                "Access denied. This app requires an invitation or subscription."
              )
            );
            setCheckedAppId(appId);
          }
        }
      } catch (err) {
        if (unsubscribed) return;
        console.error("Error checking membership:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setHasAccess(false);
        setCheckedAppId(appId);
      }
    }

    checkOrCreateMembership();

    return () => {
      unsubscribed = true;
    };
  }, [user?.uid, appId, authLoading]);

  // Derive loading state: we're loading if we haven't completed checking the current appId
  const loading = authLoading || (!!appId && checkedAppId !== appId);

  return {
    membership,
    loading,
    error,
    hasAccess,
    isOwner: membership?.role === "owner",
    isAdmin: membership?.role === "owner" || membership?.role === "admin",
    tier: /** @type {string} */ (membership?.tier) || "free",
    status: /** @type {string | undefined} */ (membership?.status),
  };
}
