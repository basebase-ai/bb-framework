/**
 * AppControls - Init, Checkout, and Commit buttons
 */

import React, { useState } from "react";
import {
  Group,
  Button,
  Modal,
  Stack,
  TextInput,
  Text,
  Select,
  Alert,
  Loader,
  Paper,
  Badge,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconDownload,
  IconUpload,
  IconAlertCircle,
} from "@tabler/icons-react";
import { doc, getDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useBuilderStore } from "../stores/builderStore.js";
import {
  getStarterAppTemplate,
  saveAppFiles,
  listApps as listLocalApps,
} from "../utils/fileSystem.js";
import { lintAllFiles } from "../utils/linter.js";
import { writeDraft } from "../utils/draftSync.js";
import { transform } from "sucrase";

export function AppControls() {
  const { user } = useAuth();
  const { currentAppId, files, setCurrentApp, clearCurrentApp, lintErrors } =
    useBuilderStore();

  // Modal states
  const [initModalOpen, setInitModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [commitModalOpen, setCommitModalOpen] = useState(false);

  // Form states
  const [newAppId, setNewAppId] = useState("");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [commitMessage, setCommitMessage] = useState("");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the where clauses to prevent re-renders
  const ownedAppsWhere = React.useMemo(
    () => (user ? [["owner", "==", user.uid]] : []),
    [user?.uid]
  );

  const collaboratorAppsWhere = React.useMemo(
    () => (user ? [["collaborators", "array-contains", user.uid]] : []),
    [user?.uid]
  );

  // Fetch apps where user is owner
  const { data: ownedApps, loading: ownedLoading } = useCollection("apps", {
    where: ownedAppsWhere,
  });

  // Fetch apps where user is collaborator
  const { data: collaboratorApps, loading: collaboratorLoading } = useCollection("apps", {
    where: collaboratorAppsWhere,
  });

  // Combine and dedupe apps
  const userApps = React.useMemo(() => {
    const appMap = new Map();
    for (const app of ownedApps || []) {
      appMap.set(app.id, app);
    }
    for (const app of collaboratorApps || []) {
      if (!appMap.has(app.id)) {
        appMap.set(app.id, app);
      }
    }
    return Array.from(appMap.values());
  }, [ownedApps, collaboratorApps]);

  const appsLoading = ownedLoading || collaboratorLoading;

  // Get list of local apps (memoized to avoid re-reading localStorage every render)
  const localApps = React.useMemo(() => listLocalApps(), [checkoutModalOpen]);

  // Validate app ID
  const validateAppId = (id) => {
    if (!id) return "App ID is required";
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      return "Use lowercase letters, numbers, and hyphens only";
    }
    if (id.length < 3 || id.length > 50) {
      return "Must be 3-50 characters";
    }
    return null;
  };

  // Init new app
  const handleInit = async () => {
    const validationError = validateAppId(newAppId);
    if (validationError) {
      notifications.show({
        title: "Invalid App ID",
        message: validationError,
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if app already exists in Firestore
      const appRef = doc(db, "apps", newAppId);
      const appSnap = await getDoc(appRef);

      if (appSnap.exists()) {
        const appData = appSnap.data();
        if (appData.owner !== user?.uid) {
          throw new Error("An app with this ID already exists");
        }
      }

      // Create starter template
      const template = getStarterAppTemplate(newAppId);

      // Save to localStorage
      saveAppFiles(newAppId, template);

      // Update store
      setCurrentApp(newAppId, template);

      // Run initial lint
      const errors = lintAllFiles(template);
      useBuilderStore.getState().setLintErrors(errors);

      // Write draft to Firestore for preview
      const draftResult = await writeDraft(newAppId, template, user.uid, user.email);
      if (!draftResult.success) {
        console.warn("Failed to write initial draft:", draftResult.error);
      }

      notifications.show({
        title: "App Created",
        message: `Created "${newAppId}" from starter template`,
        color: "green",
      });

      setInitModalOpen(false);
      setNewAppId("");
    } catch (error) {
      console.error("Init error:", error);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Checkout existing app
  const handleCheckout = async () => {
    if (!selectedAppId) {
      notifications.show({
        title: "Error",
        message: "Please select an app",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch app from Firestore
      const appRef = doc(db, "apps", selectedAppId);
      const appSnap = await getDoc(appRef);

      if (!appSnap.exists()) {
        throw new Error("App not found");
      }

      const appData = appSnap.data();
      const versionHash = appData.currentVersion;

      if (!versionHash) {
        throw new Error("App has no published version");
      }

      // Fetch version
      const versionRef = doc(db, "apps", selectedAppId, "versions", versionHash);
      const versionSnap = await getDoc(versionRef);

      if (!versionSnap.exists()) {
        throw new Error("Version not found");
      }

      const versionData = versionSnap.data();
      const sourceFiles = versionData.source || {};

      if (Object.keys(sourceFiles).length === 0) {
        throw new Error("No source files found in version");
      }

      // Save to localStorage
      saveAppFiles(selectedAppId, sourceFiles);

      // Update store
      setCurrentApp(selectedAppId, sourceFiles);

      // Run lint
      const errors = lintAllFiles(sourceFiles);
      useBuilderStore.getState().setLintErrors(errors);

      // Write draft to Firestore for preview
      const draftResult = await writeDraft(selectedAppId, sourceFiles, user.uid, user.email);
      if (!draftResult.success) {
        console.warn("Failed to write draft:", draftResult.error);
      }

      notifications.show({
        title: "Checkout Complete",
        message: `Checked out "${selectedAppId}" (version: ${versionHash.substring(0, 8)})`,
        color: "green",
      });

      setCheckoutModalOpen(false);
      setSelectedAppId("");
    } catch (error) {
      console.error("Checkout error:", error);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      const crypto = window.crypto || window.msCrypto;
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
          owner: user.uid,
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
          publishedBy: user.uid,
          publishedByEmail: user.email,
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
          updatedBy: user.uid,
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
        message: error.message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Build app options for checkout
  const appOptions = React.useMemo(() => {
    const options = [];

    // Add Firestore apps
    if (userApps && userApps.length > 0) {
      for (const app of userApps) {
        const label =
          app.name && app.name !== app.id
            ? `${app.name} (${app.id})`
            : app.id;
        options.push({
          value: app.id,
          label,
        });
      }
    }

    // Add local-only apps (not in Firestore)
    for (const id of localApps) {
      const existsInFirestore = userApps?.some((a) => a.id === id);
      if (!existsInFirestore) {
        options.push({
          value: id,
          label: `${id} (local only)`,
        });
      }
    }

    return options;
  }, [userApps, localApps]);

  const criticalErrors = lintErrors.filter((e) => e.severity === "error");

  return (
    <>
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => setInitModalOpen(true)}
        >
          Init App
        </Button>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconDownload size={14} />}
          onClick={() => setCheckoutModalOpen(true)}
        >
          Checkout
        </Button>
        <Button
          size="xs"
          variant="filled"
          leftSection={<IconUpload size={14} />}
          onClick={() => setCommitModalOpen(true)}
          disabled={!currentAppId || Object.keys(files).length === 0}
        >
          Commit
        </Button>
        {currentAppId && (
          <Badge variant="light" color="blue">
            {currentAppId}
          </Badge>
        )}
      </Group>

      {/* Init Modal */}
      <Modal
        opened={initModalOpen}
        onClose={() => setInitModalOpen(false)}
        title="Init New App"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Create a new app from the starter template. This will be saved to
            your local workspace.
          </Text>
          <TextInput
            label="App ID"
            placeholder="my-app"
            value={newAppId}
            onChange={(e) => setNewAppId(e.target.value.toLowerCase())}
            description="Lowercase letters, numbers, and hyphens only"
            error={newAppId && validateAppId(newAppId)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setInitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInit}
              loading={isLoading}
              disabled={!!validateAppId(newAppId)}
            >
              Create App
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        opened={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="Checkout App"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Load an existing app from Firestore into your local workspace.
          </Text>
          {appsLoading ? (
            <Loader size="sm" />
          ) : (
            <Select
              label="Select App"
              placeholder="Choose an app"
              data={appOptions}
              value={selectedAppId}
              onChange={setSelectedAppId}
              searchable
              nothingFoundMessage="No apps found"
            />
          )}
          {currentAppId && (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              This will replace your current workspace ({currentAppId})
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setCheckoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              loading={isLoading}
              disabled={!selectedAppId}
            >
              Checkout
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Commit Modal */}
      <Modal
        opened={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        title="Commit App"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Publish "{currentAppId}" to Firestore. This will make it accessible
            to users.
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
