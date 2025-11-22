/**
 * useAppMembership Hook
 * 
 * Manages user membership in the current app:
 * - Auto-creates membership for first-time visitors (open apps)
 * - Updates lastVisitedAt on each session
 * - Returns membership info (role, tier, status)
 * - Blocks access for users without proper membership
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../core/firebase-init.js';
import { useAuth } from './useAuth.js';

export function useAppMembership(appId) {
  const { user, loading: authLoading } = useAuth();
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !appId) {
      setLoading(authLoading);
      return;
    }

    let unsubscribed = false;

    async function checkOrCreateMembership() {
      try {
        const membershipId = `${appId}_${user.uid}`;
        const membershipRef = doc(db, 'app-members', membershipId);
        
        // Get membership document
        const membershipSnap = await getDoc(membershipRef);
        
        if (membershipSnap.exists()) {
          const membershipData = membershipSnap.data();
          
          if (unsubscribed) return;
          
          // Update lastVisitedAt (fire and forget)
          updateDoc(membershipRef, {
            lastVisitedAt: serverTimestamp(),
          }).catch(err => console.warn('Failed to update lastVisitedAt:', err));
          
          // Check if membership is active
          const isActive = membershipData.status === 'active';
          setMembership(membershipData);
          setHasAccess(isActive);
          setLoading(false);
          
        } else {
          // No membership exists - check if app is open
          const appRef = doc(db, 'apps', appId);
          const appSnap = await getDoc(appRef);
          
          if (!appSnap.exists()) {
            throw new Error('App not found');
          }
          
          const appData = appSnap.data();
          const isOwner = appData.owner === user.uid;
          const isOpen = appData.accessMode === 'open';
          
          if (unsubscribed) return;
          
          if (isOwner || isOpen) {
            // Auto-create membership
            const newMembership = {
              appId,
              userId: user.uid,
              role: isOwner ? 'owner' : 'member',
              status: 'active',
              tier: 'free',
              joinedAt: serverTimestamp(),
              lastVisitedAt: serverTimestamp(),
            };
            
            await setDoc(membershipRef, newMembership);
            
            if (unsubscribed) return;
            
            setMembership(newMembership);
            setHasAccess(true);
            setLoading(false);
          } else {
            // App is invite-only or paid, user needs explicit access
            setMembership(null);
            setHasAccess(false);
            setLoading(false);
            setError(new Error('Access denied. This app requires an invitation or subscription.'));
          }
        }
      } catch (err) {
        if (unsubscribed) return;
        console.error('Error checking membership:', err);
        setError(err);
        setHasAccess(false);
        setLoading(false);
      }
    }

    checkOrCreateMembership();

    return () => {
      unsubscribed = true;
    };
  }, [user, appId, authLoading]);

  return {
    membership,
    loading,
    error,
    hasAccess,
    isOwner: membership?.role === 'owner',
    isAdmin: membership?.role === 'owner' || membership?.role === 'admin',
    tier: membership?.tier || 'free',
    status: membership?.status,
  };
}

