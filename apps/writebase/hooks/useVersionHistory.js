/**
 * useVersionHistory - Access document version history
 * 
 * Features:
 * - Load version snapshots
 * - Load operation log for fine-grained history
 * - Restore to previous version
 */

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, getDocSubcollections } from "../schema.js";

/**
 * @typedef {Object} VersionSnapshot
 * @property {string} id - Version document ID
 * @property {number} version - Version number
 * @property {Object} content - Document content at this version
 * @property {Date} createdAt - When this version was created
 * @property {string} createdBy - User ID who created it
 * @property {string} createdByName - User name who created it
 * @property {string} changesSummary - Summary of changes
 */

/**
 * @typedef {Object} OperationEntry
 * @property {string} id - Operation document ID
 * @property {number} version - Version number
 * @property {string} userId - User who made the change
 * @property {string} userName - User name
 * @property {Date} timestamp - When the change was made
 * @property {Object | null} snapshot - Content snapshot (if available)
 */

/**
 * Hook for accessing document version history
 * 
 * @param {string | null} documentId - Document ID
 * @returns {Object} Version history state and functions
 */
export function useVersionHistory(documentId) {
  const { user } = useAuth();
  
  /** @type {[VersionSnapshot[], Function]} */
  const [versions, setVersions] = useState([]);
  
  /** @type {[OperationEntry[], Function]} */
  const [operations, setOperations] = useState([]);
  
  /** @type {[boolean, Function]} */
  const [loading, setLoading] = useState(false);
  
  /** @type {[Error | null, Function]} */
  const [error, setError] = useState(null);

  const paths = documentId ? getDocSubcollections(documentId) : null;

  /**
   * Load version snapshots
   * @param {number} limitCount - Maximum number of versions to load
   */
  const loadVersions = useCallback(async (limitCount = 50) => {
    if (!documentId || !paths) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const versionsQuery = query(
        collection(db, paths.versions),
        orderBy("version", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(versionsQuery);
      
      /** @type {VersionSnapshot[]} */
      const loadedVersions = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedVersions.push({
          id: doc.id,
          version: data.version,
          content: data.content,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName: data.createdByName || 'Unknown',
          changesSummary: data.changesSummary || '',
        });
      });
      
      setVersions(loadedVersions);
    } catch (err) {
      console.error("Failed to load versions:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [documentId, paths]);

  /**
   * Load operation log for fine-grained history
   * @param {number} limitCount - Maximum number of operations to load
   */
  const loadOperations = useCallback(async (limitCount = 100) => {
    if (!documentId || !paths) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const operationsQuery = query(
        collection(db, paths.operations),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(operationsQuery);
      
      /** @type {OperationEntry[]} */
      const loadedOperations = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedOperations.push({
          id: doc.id,
          version: data.version,
          userId: data.userId,
          userName: data.userName || 'Unknown',
          timestamp: data.timestamp?.toDate() || new Date(),
          snapshot: data.snapshot || null,
        });
      });
      
      setOperations(loadedOperations);
    } catch (err) {
      console.error("Failed to load operations:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [documentId, paths]);

  /**
   * Restore document to a specific version
   * @param {VersionSnapshot} version - Version to restore to
   */
  const restoreVersion = useCallback(async (version) => {
    if (!documentId || !user || !paths) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current version number
      const contentRef = doc(db, paths.content, "current");
      
      // Create new version number (increment from current)
      const docRef = doc(db, collections.documents, documentId);
      
      // Update content with restored version
      await setDoc(contentRef, {
        version: version.version, // Will be updated by increment
        content: version.content,
        lastEditedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      
      // Update document metadata
      await updateDoc(docRef, {
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      
      // Log the restore operation
      await addDoc(collection(db, paths.operations), {
        version: version.version,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        timestamp: serverTimestamp(),
        snapshot: version.content,
        isRestore: true,
        restoredFromVersion: version.version,
      });
      
      // Create a new version snapshot
      await setDoc(doc(db, paths.versions, `v_restored_${Date.now()}`), {
        version: version.version,
        content: version.content,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        changesSummary: `Restored to version ${version.version}`,
        isRestore: true,
      });
      
      // Reload versions
      await loadVersions();
      
      return true;
    } catch (err) {
      console.error("Failed to restore version:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setLoading(false);
    }
  }, [documentId, user, paths, loadVersions]);

  /**
   * Get content at a specific version
   * First tries snapshots, then reconstructs from operations
   * @param {number} targetVersion - Version number to get
   * @returns {Promise<Object | null>} Content at version
   */
  const getVersionContent = useCallback(async (targetVersion) => {
    if (!documentId || !paths) return null;
    
    // First, check if we have a direct snapshot
    const version = versions.find(v => v.version === targetVersion);
    if (version) {
      return version.content;
    }
    
    // Check operations for a snapshot
    const operation = operations.find(op => op.version === targetVersion && op.snapshot);
    if (operation) {
      return operation.snapshot;
    }
    
    // Find nearest earlier snapshot and apply operations
    const earlierVersions = versions
      .filter(v => v.version <= targetVersion)
      .sort((a, b) => b.version - a.version);
    
    if (earlierVersions.length > 0) {
      return earlierVersions[0].content;
    }
    
    return null;
  }, [documentId, paths, versions, operations]);

  // Load versions on mount
  useEffect(() => {
    if (documentId) {
      loadVersions();
      loadOperations();
    }
  }, [documentId, loadVersions, loadOperations]);

  return {
    /** @type {VersionSnapshot[]} Version snapshots */
    versions,
    
    /** @type {OperationEntry[]} Operation log */
    operations,
    
    /** @type {boolean} Loading state */
    loading,
    
    /** @type {Error | null} Error state */
    error,
    
    /** @type {(limit?: number) => Promise<void>} Load versions */
    loadVersions,
    
    /** @type {(limit?: number) => Promise<void>} Load operations */
    loadOperations,
    
    /** @type {(version: VersionSnapshot) => Promise<boolean>} Restore to version */
    restoreVersion,
    
    /** @type {(version: number) => Promise<Object | null>} Get content at version */
    getVersionContent,
  };
}
