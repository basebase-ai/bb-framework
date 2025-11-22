/**
 * useUserProfile Hook
 * 
 * Real-time access to a single user's profile from the global users collection.
 * 
 * Usage:
 *   const { profile, loading, error, update } = useUserProfile(userId);
 * 
 * Returns:
 *   - profile: { displayName, photoURL, bio, email, role, createdAt, updatedAt }
 *   - loading: boolean
 *   - error: Error | null
 *   - update: (data) => Promise<void> - update own profile only
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../core/firebase-init.js';
import { useAuth } from './useAuth.js';

export function useUserProfile(userId) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const userRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile({ id: snapshot.id, ...snapshot.data() });
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user profile:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Update function - only works for current user's own profile
  const update = async (data) => {
    if (!userId || !currentUser || userId !== currentUser.uid) {
      throw new Error('Can only update your own profile');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    update,
  };
}

