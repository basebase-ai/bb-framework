/**
 * Firebase Storage initialization and utilities
 * Provides namespaced storage operations for apps
 */

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { app } from "./firebase-init.js";

// Initialize Firebase Storage
export const storage = getStorage(app);

/**
 * Get a namespaced storage reference for an app
 * All files are stored under: apps/{appId}/{path}
 * 
 * @param {string} appId - App identifier
 * @param {string} path - File path within the app's storage
 * @returns {StorageReference}
 */
export function getAppStorageRef(appId, path) {
  if (!appId) {
    throw new Error("App ID is required for storage operations");
  }
  
  // Ensure path doesn't start with slash
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  // Namespace under apps/{appId}/
  const namespacedPath = `apps/${appId}/${cleanPath}`;
  
  return ref(storage, namespacedPath);
}

/**
 * Upload a file to app-namespaced storage
 * 
 * @param {string} appId - App identifier
 * @param {File} file - File to upload
 * @param {string} path - Destination path (will be namespaced automatically)
 * @param {Object} options - Upload options
 * @param {Function} options.onProgress - Progress callback (percent)
 * @param {Object} options.metadata - File metadata
 * @returns {Promise<{url: string, path: string, fullPath: string}>}
 */
export async function uploadFile(appId, file, path, options = {}) {
  const { onProgress, metadata } = options;
  
  if (!file) {
    throw new Error("File is required for upload");
  }
  
  const storageRef = getAppStorageRef(appId, path);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  
  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Progress tracking
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Error handling
        reject(error);
      },
      async () => {
        // Upload complete - get download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: path,
            fullPath: uploadTask.snapshot.ref.fullPath,
            metadata: uploadTask.snapshot.metadata,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete a file from app-namespaced storage
 * 
 * @param {string} appId - App identifier
 * @param {string} path - File path to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(appId, path) {
  const storageRef = getAppStorageRef(appId, path);
  await deleteObject(storageRef);
}

/**
 * Get download URL for a file
 * 
 * @param {string} appId - App identifier
 * @param {string} path - File path
 * @returns {Promise<string>}
 */
export async function getFileURL(appId, path) {
  const storageRef = getAppStorageRef(appId, path);
  return await getDownloadURL(storageRef);
}

/**
 * List all files in a directory
 * 
 * @param {string} appId - App identifier
 * @param {string} path - Directory path
 * @returns {Promise<Array<{name: string, fullPath: string, url: string}>>}
 */
export async function listFiles(appId, path) {
  const storageRef = getAppStorageRef(appId, path);
  const result = await listAll(storageRef);
  
  // Get download URLs for all files
  const files = await Promise.all(
    result.items.map(async (item) => {
      const url = await getDownloadURL(item);
      return {
        name: item.name,
        fullPath: item.fullPath,
        url,
      };
    })
  );
  
  return files;
}

