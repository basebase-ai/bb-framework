/**
 * Hook for calling server functions
 *
 * Server functions run in a secure Node.js environment with:
 * - Full Firebase Admin access
 * - Access to external APIs and npm packages
 * - Environment variables and secrets
 *
 * @param {string} functionName - Name of the function to call
 * @returns {Object} Function utilities
 *
 * @example
 * import { useFunction } from "../../../framework/hooks/useFunction.js";
 *
 * function MyComponent() {
 *   const { call, loading, result, error } = useFunction("askLLM");
 *
 *   const handleClick = async () => {
 *     const response = await call({
 *       provider: "openai",
 *       model: "gpt-4",
 *       systemPrompt: "You are helpful",
 *       message: "What is React?"
 *     });
 *
 *     console.log(response.response);
 *   };
 *
 *   return <Button onClick={handleClick} loading={loading}>Ask AI</Button>;
 * }
 */

import { useState, useCallback, useRef } from "react";
import { collection, addDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../core/firebase-init.js";
import { useAuth } from "./useAuth.js";

export function useFunction(functionName) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  /**
   * Call the server function
   * @param {Object} params - Function parameters
   * @param {Object} [options] - Call options
   * @param {string} [options.appId] - App ID for app-specific functions
   * @param {boolean} [options.waitForResult=true] - Wait for function to complete
   * @returns {Promise<Object>} Function result
   */
  const call = useCallback(
    async (params = {}, options = {}) => {
      if (!user) {
        const err = new Error("Must be authenticated to call functions");
        setError(err);
        throw err;
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        // Create task document in Firestore
        const task = {
          functionId: functionName, // Backend expects functionId, not functionName
          params,
          userId: user.uid,
          appId: options.appId || null,
          status: "pending",
          createdAt: new Date().toISOString(),
        };

        console.log(`📤 Calling function: ${functionName}`, params);

        // Add to tasks collection
        const taskRef = await addDoc(collection(db, "tasks"), task);

        console.log(`⏳ Task created: ${taskRef.id}`);

        // If not waiting for result, return immediately
        if (options.waitForResult === false) {
          setLoading(false);
          return {
            success: true,
            taskId: taskRef.id,
            message: "Task submitted successfully",
          };
        }

        // Subscribe to task updates
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
            }
            const err = new Error("Function call timed out after 60 seconds");
            setError(err);
            setLoading(false);
            reject(err);
          }, 60000); // 60 second timeout

          unsubscribeRef.current = onSnapshot(
            doc(db, "tasks", taskRef.id),
            (snapshot) => {
              const data = snapshot.data();

              if (!data) return;

              console.log(`📊 Task status: ${data.status}`, data);

              if (data.status === "completed") {
                clearTimeout(timeout);
                if (unsubscribeRef.current) {
                  unsubscribeRef.current();
                }

                console.log(
                  `✅ Function completed: ${functionName}`,
                  data.result
                );

                setResult(data.result);
                setLoading(false);
                resolve(data.result);
              } else if (data.status === "failed") {
                clearTimeout(timeout);
                if (unsubscribeRef.current) {
                  unsubscribeRef.current();
                }

                // Extract error message from various formats
                let errorMessage = "Function execution failed";
                if (typeof data.error === 'string') {
                  errorMessage = data.error;
                } else if (data.error?.message) {
                  errorMessage = data.error.message;
                } else if (data.error) {
                  errorMessage = JSON.stringify(data.error);
                }

                const err = new Error(errorMessage);
                console.error(`❌ Function failed: ${functionName}`, err);

                setError(err);
                setLoading(false);
                reject(err);
              }
            },
            (err) => {
              clearTimeout(timeout);
              console.error(`❌ Error watching task: ${functionName}`, err);

              setError(err);
              setLoading(false);
              reject(err);
            }
          );
        });
      } catch (err) {
        console.error(`❌ Error calling function: ${functionName}`, err);
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    [functionName, user]
  );

  // Cleanup subscription on unmount
  useCallback(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    call,
    loading,
    result,
    error,
  };
}
