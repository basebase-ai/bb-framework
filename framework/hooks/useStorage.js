/**
 * Hook for Firebase Storage operations with automatic app namespacing
 * 
 * @example
 * import { useStorage } from "../../../framework/hooks/useStorage.js";
 * 
 * function MyComponent() {
 *   const { upload, uploading, progress } = useStorage("my-app");
 * 
 *   const handleUpload = async (file) => {
 *     const result = await upload(file, `attachments/${Date.now()}_${file.name}`);
 *     console.log("Uploaded:", result.url);
 *   };
 * 
 *   return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
 * }
 */

import { useState, useCallback } from "react";
import { uploadFile as uploadFileToStorage, deleteFile as deleteFileFromStorage, getFileURL, listFiles } from "../core/storage-init.js";

export function useStorage(appId) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  /**
   * Upload a file to storage
   * @param {File} file - File to upload
   * @param {string} path - Destination path (will be namespaced)
   * @param {Object} metadata - Optional file metadata
   * @returns {Promise<{url: string, path: string, fullPath: string}>}
   */
  const upload = useCallback(
    async (file, path, metadata = {}) => {
      if (!appId) {
        throw new Error("App ID is required for storage operations");
      }

      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const result = await uploadFileToStorage(appId, file, path, {
          onProgress: setProgress,
          metadata: {
            ...metadata,
            customMetadata: {
              appId,
              uploadedAt: new Date().toISOString(),
              ...metadata.customMetadata,
            },
          },
        });

        setUploading(false);
        setProgress(100);
        return result;
      } catch (err) {
        setUploading(false);
        setError(err);
        throw err;
      }
    },
    [appId]
  );

  /**
   * Delete a file from storage
   * @param {string} path - File path to delete
   * @returns {Promise<void>}
   */
  const deleteFile = useCallback(
    async (path) => {
      if (!appId) {
        throw new Error("App ID is required for storage operations");
      }

      try {
        await deleteFileFromStorage(appId, path);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [appId]
  );

  /**
   * Get download URL for a file
   * @param {string} path - File path
   * @returns {Promise<string>}
   */
  const getURL = useCallback(
    async (path) => {
      if (!appId) {
        throw new Error("App ID is required for storage operations");
      }

      try {
        return await getFileURL(appId, path);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [appId]
  );

  /**
   * List all files in a directory
   * @param {string} path - Directory path
   * @returns {Promise<Array>}
   */
  const listDir = useCallback(
    async (path) => {
      if (!appId) {
        throw new Error("App ID is required for storage operations");
      }

      try {
        return await listFiles(appId, path);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [appId]
  );

  return {
    upload,
    deleteFile,
    getURL,
    listDir,
    uploading,
    progress,
    error,
  };
}

