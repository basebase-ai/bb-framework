/**
 * Airtop Session & Profile Management
 *
 * Unified function for managing Airtop browser sessions and profiles.
 * Use the `action` parameter to specify the operation.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.action - Action to perform: "createSession" | "terminateSession" | "saveProfile" | "checkProfile" | "deleteProfile"
 * @param {string} [params.profileId] - Profile ID to load (for createSession with existing profile)
 * @param {string} [params.profileName] - Profile name (default: "linkedin")
 * @param {string} [params.url] - Initial URL for createSession (default: LinkedIn login)
 * @param {number} [params.timeoutMinutes] - Session timeout in minutes (default: 10)
 * @param {string} [params.sessionId] - Session ID (for terminateSession/saveProfile)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Action-specific result
 */
module.exports = async function (params, context) {
  const { action } = params;

  if (!action) {
    throw new Error("action is required");
  }

  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const apiKey = await context.getSecret("AIRTOP_API_KEY");
  if (!apiKey) {
    throw new Error("AIRTOP_API_KEY not configured");
  }

  const baseUrl = "https://api.airtop.ai/api/v1";
  const db = context.firestore();
  const userSecretsRef = db.collection("user-secrets").doc(userId);

  switch (action) {
    // =========================================================================
    // CREATE SESSION - Create browser session and return live view URL
    // =========================================================================
    case "createSession": {
      const {
        profileId = null,
        url = "https://www.linkedin.com/login",
        timeoutMinutes = 10,
      } = params;

      context.log("Creating Airtop session", { userId, profileId, url });

      // Track sessionId for cleanup on failure
      /** @type {string | null} */
      let createdSessionId = null;

      try {
        // =====================================================================
        // CHECK FOR EXISTING SESSION FIRST
        // =====================================================================
        const userSecretsDoc = await userSecretsRef.get();
        const existingSession = userSecretsDoc.exists
          ? userSecretsDoc.data()?.services?.airtop?.session
          : null;

        if (existingSession) {
          const { sessionId: existingSessionId, windowId: existingWindowId } =
            existingSession;

          if (existingSessionId) {
            context.log("Found existing session, checking if still active", {
              sessionId: existingSessionId,
            });

            try {
              // Check if the session is still running on Airtop
              const statusResponse = await context.http.get(
                `${baseUrl}/sessions/${existingSessionId}`,
                {
                  headers: { Authorization: `Bearer ${apiKey}` },
                  timeout: 10000,
                }
              );

              const status = statusResponse.data?.data?.status;
              context.log("Existing session status", {
                sessionId: existingSessionId,
                status,
              });

              if (status === "active" || status === "running") {
                // Session is still alive! Get the live view URL
                if (existingWindowId) {
                  const windowInfoResponse = await context.http.get(
                    `${baseUrl}/sessions/${existingSessionId}/windows/${existingWindowId}`,
                    {
                      headers: { Authorization: `Bearer ${apiKey}` },
                      timeout: 10000,
                    }
                  );

                  const liveViewUrl =
                    windowInfoResponse.data?.data?.liveViewUrl;

                  context.log("Reconnecting to existing session", {
                    sessionId: existingSessionId,
                    windowId: existingWindowId,
                    hasLiveViewUrl: !!liveViewUrl,
                  });

                  return {
                    success: true,
                    sessionId: existingSessionId,
                    windowId: existingWindowId,
                    liveViewUrl: liveViewUrl || null,
                    expiresAt: existingSession.expiresAt,
                    reconnected: true,
                  };
                }
              }
            } catch (checkError) {
              // Session doesn't exist on Airtop anymore, clean up Firestore
              context.log(
                "Existing session no longer valid, will create new one",
                {
                  error: checkError.message,
                }
              );
              await userSecretsRef.set(
                { services: { airtop: { session: null } } },
                { merge: true }
              );
            }
          }
        }

        // =====================================================================
        // CREATE NEW SESSION
        // =====================================================================
        /** @type {{timeoutMinutes: number, persistProfile?: boolean, baseProfileId?: string}} */
        const sessionConfig = {
          timeoutMinutes,
        };

        if (profileId) {
          sessionConfig.baseProfileId = profileId;
          sessionConfig.persistProfile = true;
        }

        const sessionResponse = await context.http.post(
          `${baseUrl}/sessions`,
          {
            configuration: sessionConfig,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 60000,
          }
        );

        const sessionId = sessionResponse.data?.data?.id;
        if (!sessionId) {
          throw new Error("Failed to create session - no session ID returned");
        }

        // Track for cleanup on failure
        createdSessionId = sessionId;

        context.log("Session created, waiting for ready state", { sessionId });

        // Poll for session to be ready (status = "active")
        const maxWaitMs = 60000; // 60 seconds max
        const pollIntervalMs = 2000; // Check every 2 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
          const statusResponse = await context.http.get(
            `${baseUrl}/sessions/${sessionId}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
              timeout: 10000,
            }
          );

          const status = statusResponse.data?.data?.status;
          context.log("Session status check", { sessionId, status });

          if (status === "active" || status === "running") {
            context.log("Session is ready", { sessionId, status });
            break;
          }

          if (status === "ended" || status === "error" || status === "failed") {
            throw new Error(`Session failed with status: ${status}`);
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        // Check one more time if we timed out
        const finalStatusResponse = await context.http.get(
          `${baseUrl}/sessions/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 10000,
          }
        );

        const finalStatus = finalStatusResponse.data?.data?.status;
        if (finalStatus !== "active" && finalStatus !== "running") {
          throw new Error(
            `Session failed to become ready within timeout (status: ${finalStatus})`
          );
        }

        context.log("Session ready, creating window", { sessionId });

        const windowResponse = await context.http.post(
          `${baseUrl}/sessions/${sessionId}/windows`,
          {
            url,
            waitUntil: "load",
            screenResolution: "1280x800",
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 60000,
          }
        );

        const windowId = windowResponse.data?.data?.windowId;

        if (!windowId) {
          throw new Error("Failed to create window - no window ID returned");
        }

        context.log("Window created", { sessionId, windowId });

        // Get window info to retrieve the liveViewUrl
        const windowInfoResponse = await context.http.get(
          `${baseUrl}/sessions/${sessionId}/windows/${windowId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 30000,
          }
        );

        const liveViewUrl = windowInfoResponse.data?.data?.liveViewUrl;

        context.log("Got window info with live view", {
          sessionId,
          windowId,
          hasLiveViewUrl: !!liveViewUrl,
        });

        await userSecretsRef.set(
          {
            services: {
              airtop: {
                session: {
                  sessionId,
                  windowId,
                  createdAt: new Date().toISOString(),
                  expiresAt: new Date(
                    Date.now() + timeoutMinutes * 60 * 1000
                  ).toISOString(),
                  profileId: profileId || null,
                },
              },
            },
          },
          { merge: true }
        );

        return {
          success: true,
          sessionId,
          windowId,
          liveViewUrl: liveViewUrl || null,
          expiresAt: new Date(
            Date.now() + timeoutMinutes * 60 * 1000
          ).toISOString(),
        };
      } catch (error) {
        context.error("Failed to create Airtop session:", error);

        // CLEANUP: Terminate the session if one was created
        if (createdSessionId) {
          context.log("Cleaning up session after failure", {
            sessionId: createdSessionId,
          });
          try {
            await context.http.delete(
              `${baseUrl}/sessions/${createdSessionId}`,
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
                timeout: 10000,
              }
            );
            context.log("Session cleaned up successfully", {
              sessionId: createdSessionId,
            });
          } catch (cleanupError) {
            context.log("Warning: Failed to cleanup session", {
              sessionId: createdSessionId,
              error: cleanupError.message,
            });
          }
        }

        if (error.response?.status === 401) {
          throw new Error("Airtop authentication failed. Check API key.");
        } else if (error.response?.status === 429) {
          throw new Error("Rate limited by Airtop. Please try again later.");
        }

        throw new Error(
          error.response?.data?.message ||
            error.message ||
            "Failed to create Airtop session"
        );
      }
    }

    // =========================================================================
    // TERMINATE SESSION - End an active session
    // =========================================================================
    case "terminateSession": {
      const { sessionId: providedSessionId } = params;

      let sessionId = providedSessionId;

      if (!sessionId) {
        const userSecretsDoc = await userSecretsRef.get();
        sessionId = userSecretsDoc.exists
          ? userSecretsDoc.data()?.services?.airtop?.session?.sessionId
          : null;
      }

      if (!sessionId) {
        context.log("No active session to terminate", { userId });
        return {
          success: true,
          terminated: false,
          message: "No active session found",
        };
      }

      context.log("Terminating Airtop session", { userId, sessionId });

      try {
        await context.http.delete(`${baseUrl}/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10000,
        });

        context.log("Session terminated successfully", { sessionId });
      } catch (error) {
        if (error.response?.status !== 404) {
          context.log("Warning: Could not terminate session", {
            error: error.message,
          });
        }
      }

      await userSecretsRef.set(
        { services: { airtop: { session: null } } },
        { merge: true }
      );

      return {
        success: true,
        terminated: true,
        sessionId,
      };
    }

    // =========================================================================
    // SAVE PROFILE - Save current session as reusable profile
    // =========================================================================
    case "saveProfile": {
      const { sessionId: providedSessionId, profileName = "linkedin" } = params;

      let sessionId = providedSessionId;

      if (!sessionId) {
        const userSecretsDoc = await userSecretsRef.get();
        sessionId = userSecretsDoc.exists
          ? userSecretsDoc.data()?.services?.airtop?.session?.sessionId
          : null;
      }

      if (!sessionId) {
        throw new Error(
          "No active session found. Please start a session first."
        );
      }

      // Create a unique profile name for this user
      const userProfileName = `${userId}_${profileName}`;

      context.log("Saving Airtop profile", {
        userId,
        sessionId,
        userProfileName,
      });

      try {
        // Step 1: Mark the session to save profile on termination
        await context.http.put(
          `${baseUrl}/sessions/${sessionId}/save-profile-on-termination/${userProfileName}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        context.log("Profile marked for save on termination", {
          userProfileName,
        });

        // Step 2: Terminate the session (this triggers the profile save)
        await context.http.delete(`${baseUrl}/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000,
        });

        context.log("Session terminated, profile saved", {
          sessionId,
          userProfileName,
        });

        // Step 3: Store the profile reference in user-secrets
        await userSecretsRef.set(
          {
            services: {
              airtop: {
                profiles: {
                  [profileName]: {
                    profileId: userProfileName,
                    createdAt: new Date().toISOString(),
                    lastUsed: new Date().toISOString(),
                  },
                },
                session: null, // Clear active session
              },
            },
          },
          { merge: true }
        );

        context.log("Profile reference saved to user-secrets", {
          userId,
          profileId: userProfileName,
        });

        return {
          success: true,
          profileId: userProfileName,
          profileName,
          message:
            "Profile saved successfully. You can now use LinkedIn features.",
        };
      } catch (error) {
        context.error("Failed to save Airtop profile:", error);

        if (error.response?.status === 404) {
          throw new Error(
            "Session not found or expired. Please start a new session."
          );
        }

        throw new Error(
          error.response?.data?.message ||
            error.message ||
            "Failed to save Airtop profile"
        );
      }
    }

    // =========================================================================
    // CHECK PROFILE - Check if user has a saved profile
    // =========================================================================
    case "checkProfile": {
      const { profileName = "linkedin" } = params;

      context.log("Checking Airtop profile", { userId, profileName });

      try {
        const userSecretsDoc = await userSecretsRef.get();
        const airtopData = userSecretsDoc.exists
          ? userSecretsDoc.data()?.services?.airtop
          : null;

        if (!airtopData?.profiles) {
          context.log("No profiles found for user", { userId });
          return {
            success: true,
            hasProfile: false,
            profile: null,
          };
        }

        const profile = airtopData.profiles?.[profileName];

        if (!profile) {
          context.log("Profile not found", { userId, profileName });
          return {
            success: true,
            hasProfile: false,
            profile: null,
          };
        }

        context.log("Profile found", {
          userId,
          profileName,
          profileId: profile.profileId,
        });

        return {
          success: true,
          hasProfile: true,
          profile: {
            profileId: profile.profileId,
            profileName,
            createdAt: profile.createdAt,
            lastUsed: profile.lastUsed,
          },
        };
      } catch (error) {
        context.error("Failed to check Airtop profile:", error);
        throw new Error(error.message || "Failed to check Airtop profile");
      }
    }

    // =========================================================================
    // DELETE PROFILE - Remove saved profile (disconnect)
    // =========================================================================
    case "deleteProfile": {
      const { profileName = "linkedin" } = params;

      context.log("Deleting Airtop profile", { userId, profileName });

      try {
        const userSecretsDoc = await userSecretsRef.get();
        const airtopData = userSecretsDoc.exists
          ? userSecretsDoc.data()?.services?.airtop
          : null;

        if (!airtopData?.profiles) {
          context.log("No profiles found for user", { userId });
          return {
            success: true,
            deleted: false,
            message: "No profile found to delete",
          };
        }

        const profile = airtopData.profiles?.[profileName];

        if (!profile) {
          context.log("Profile not found", { userId, profileName });
          return {
            success: true,
            deleted: false,
            message: "Profile not found",
          };
        }

        const profileId = profile.profileId;

        // Delete from Airtop using profileNames query param
        try {
          await context.http.delete(`${baseUrl}/profiles`, {
            params: {
              profileNames: profileId,
            },
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 10000,
          });
          context.log("Profile deleted from Airtop", { profileId });
        } catch (airtopError) {
          if (airtopError.response?.status !== 404) {
            context.log("Warning: Could not delete profile from Airtop", {
              error: airtopError.message,
            });
          }
        }

        // Remove from user-secrets
        const FieldValue = require("firebase-admin").firestore.FieldValue;
        await userSecretsRef.update({
          [`services.airtop.profiles.${profileName}`]: FieldValue.delete(),
        });

        context.log("Profile reference deleted from user-secrets", {
          userId,
          profileName,
        });

        return {
          success: true,
          deleted: true,
          profileId,
          profileName,
        };
      } catch (error) {
        context.error("Failed to delete Airtop profile:", error);

        throw new Error(
          error.response?.data?.message ||
            error.message ||
            "Failed to delete Airtop profile"
        );
      }
    }

    default:
      throw new Error(
        `Unknown action: ${action}. Valid actions: createSession, terminateSession, saveProfile, checkProfile, deleteProfile`
      );
  }
};
