/**
 * AppControls - Commit button for publishing apps
 */

import React, { useState } from "react";
import {
  Group,
  Button,
  Modal,
  Stack,
  TextInput,
  Text,
  Alert,
  Paper,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUpload, IconAlertCircle } from "@tabler/icons-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useBuilderStore } from "../stores/builderStore.js";
import { transform } from "sucrase";

export function AppControls() {
  const { user } = useAuth();
  const { currentAppId, files, lintErrors } = useBuilderStore();

  // Modal states
  const [commitModalOpen, setCommitModalOpen] = useState(false);

  // Form states
  const [commitMessage, setCommitMessage] = useState("");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  // Commit app to Firestore
  const handleCommit = async () => {
    if (!currentAppId || Object.keys(files).length === 0) {
      notifications.show({
        title: "Error",
        message: "No app to commit",
        color: "red",
      });
      return;
    }

    // Check for lint errors
    const criticalErrors = lintErrors.filter((e) => e.severity === "error");
    if (criticalErrors.length > 0) {
      notifications.show({
        title: "Cannot Commit",
        message: `Fix ${criticalErrors.length} syntax error(s) before committing`,
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Transform files for production
      /** @type {Record<string, string>} */
      const compiled = {};
      for (const [fileName, content] of Object.entries(files)) {
        const jsFileName = fileName.replace(/\.jsx$/, ".js");

        if (/\.(jsx?|tsx?)$/.test(fileName)) {
          try {
            // Remove hot reload code
            let cleanedCode = content.replace(
              /if\s*\(\s*import\.meta\.hot\s*\)\s*\{[\s\S]*?\n\}/g,
              ""
            );

            // Normalize framework imports
            cleanedCode = cleanedCode.replace(
              /from\s+["'](\.\.\/)+(framework\/[^"']+)\.jsx["']/g,
              'from "$2.js"'
            );
            cleanedCode = cleanedCode.replace(
              /from\s+["'](\.\.\/)+(framework\/[^"']+)\.js["']/g,
              'from "$2.js"'
            );

            const result = transform(cleanedCode, {
              transforms: ["jsx", "typescript", "imports"],
              jsxRuntime: "classic",
              production: true,
            });

            compiled[jsFileName] = result.code;
          } catch (err) {
            throw new Error(`Transform failed for ${fileName}: ${err.message}`);
          }
        } else {
          compiled[jsFileName] = content;
        }
      }

      // Generate version hash
      const crypto = window.crypto;
      const encoder = new TextEncoder();
      const sortedEntries = Object.entries(files).sort(([a], [b]) =>
        a.localeCompare(b)
      );
      const hashInput = sortedEntries
        .map(([path, code]) => path + code)
        .join("");
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(hashInput)
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const versionHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 12);

      // Check if app exists, create if not
      const appRef = doc(db, "apps", currentAppId);
      const appSnap = await getDoc(appRef);

      if (!appSnap.exists()) {
        // Create app document
        await setDoc(appRef, {
          name: currentAppId,
          description: `${currentAppId} - built with Builder`,
          owner: user?.uid,
          accessMode: "open",
          currentVersion: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Save version
      const versionRef = doc(db, "apps", currentAppId, "versions", versionHash);
      await setDoc(versionRef, {
        source: files,
        compiled,
        metadata: {
          version: versionHash,
          entry: "app.js",
          sourceEntry: "app.jsx",
          publishedAt: serverTimestamp(),
          publishedBy: user?.uid,
          publishedByEmail: user?.email,
          message: commitMessage || "Updated via Builder",
          moduleCount: Object.keys(files).length,
          totalSize: Object.values(files).reduce((sum, f) => sum + f.length, 0),
        },
      });

      // Update current version
      await setDoc(
        appRef,
        {
          currentVersion: versionHash,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid,
        },
        { merge: true }
      );

      notifications.show({
        title: "Commit Successful",
        message: `Published "${currentAppId}" (version: ${versionHash})`,
        color: "green",
      });

      setCommitModalOpen(false);
      setCommitMessage("");
    } catch (error) {
      console.error("Commit error:", error);
      notifications.show({
        title: "Commit Failed",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const criticalErrors = lintErrors.filter((e) => e.severity === "error");

  return (
    <>
      <Group gap="xs">
        <Button
          size="xs"
          variant="filled"
          leftSection={<IconUpload size={14} />}
          onClick={() => setCommitModalOpen(true)}
          disabled={!currentAppId || Object.keys(files).length === 0}
        >
          Commit
        </Button>
      </Group>

      {/* Commit Modal */}
      <Modal
        opened={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        title="Commit App"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Publish "{currentAppId}" to Firestore. This will make it accessible
            at{" "}
            <Text component="span" fw={500}>
              {currentAppId}.basebase.dev
            </Text>
          </Text>

          {criticalErrors.length > 0 && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              Cannot commit: {criticalErrors.length} syntax error(s) must be
              fixed first.
            </Alert>
          )}

          <TextInput
            label="Commit Message"
            placeholder="Describe your changes..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />

          <Paper p="sm" bg="gray.0" radius="sm">
            <Text size="xs" fw={500} mb="xs">
              Files to commit:
            </Text>
            <Text size="xs" c="dimmed">
              {Object.keys(files).join(", ")}
            </Text>
          </Paper>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setCommitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommit}
              loading={isLoading}
              disabled={criticalErrors.length > 0}
              color="green"
            >
              Commit & Publish
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
