import React, { useState, useMemo } from "react";
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Avatar,
  Badge,
  ScrollArea,
  Loader,
  Modal,
  Alert,
} from "@mantine/core";
import { IconHistory, IconArrowBackUp, IconAlertTriangle } from "@tabler/icons-react";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../framework/core/firebase-init.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../../framework/hooks/useUserProfiles.js";
import { showNotification } from "@mantine/notifications";
import { useEffect } from "react";

/**
 * @typedef {Object} VersionMetadata
 * @property {string} version
 * @property {unknown} publishedAt
 * @property {string} publishedBy
 * @property {string} [publishedByEmail]
 * @property {string} [message]
 * @property {number} [moduleCount]
 * @property {number} [totalSize]
 */

/**
 * @typedef {Object} Version
 * @property {string} id
 * @property {VersionMetadata} metadata
 */

/**
 * Format date to readable string
 * @param {unknown} timestamp
 */
function formatDate(timestamp) {
  if (!timestamp) return "Unknown";
  const date = typeof timestamp === 'object' && 'toDate' in timestamp 
    ? /** @type {{ toDate: () => Date }} */ (timestamp).toDate() 
    : new Date(/** @type {string | number | Date} */ (timestamp));
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time
 * @param {unknown} timestamp
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = typeof timestamp === 'object' && 'toDate' in timestamp 
    ? /** @type {{ toDate: () => Date }} */ (timestamp).toDate() 
    : new Date(/** @type {string | number | Date} */ (timestamp));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * @param {{ app: { id: string, currentVersion?: string, owner: string }, onUpdate: (appId: string, data: Record<string, unknown>) => Promise<void> }} props
 */
export default function VersionsTab({ app, onUpdate }) {
  const { user } = useAuth();
  const [versions, setVersions] = useState(/** @type {Version[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState(/** @type {Version | null} */ (null));
  const [reverting, setReverting] = useState(false);
  
  const isOwner = user && app?.owner === user.uid;
  
  // Fetch versions
  useEffect(() => {
    if (!app?.id) return;
    
    async function fetchVersions() {
      try {
        const versionsRef = collection(db, "apps", app.id, "versions");
        const snapshot = await getDocs(versionsRef);
        
        /** @type {Version[]} */
        const versionList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          versionList.push({
            id: doc.id,
            metadata: /** @type {VersionMetadata} */ (data.metadata || {}),
          });
        });
        
        // Sort by publishedAt descending
        versionList.sort((a, b) => {
          const aTime = a.metadata.publishedAt;
          const bTime = b.metadata.publishedAt;
          const aDate = aTime && typeof aTime === 'object' && 'toDate' in aTime 
            ? /** @type {{ toDate: () => Date }} */ (aTime).toDate() 
            : new Date(0);
          const bDate = bTime && typeof bTime === 'object' && 'toDate' in bTime 
            ? /** @type {{ toDate: () => Date }} */ (bTime).toDate() 
            : new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        
        setVersions(versionList);
      } catch (err) {
        console.error("Error fetching versions:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVersions();
  }, [app?.id]);
  
  // Get unique author IDs
  const authorIds = useMemo(() => {
    return [...new Set(versions.map(v => v.metadata.publishedBy).filter(Boolean))];
  }, [versions]);
  
  const { profiles: authorProfiles } = useUserProfiles(authorIds);
  
  const handleRevert = async () => {
    if (!revertTarget || !app?.id) return;
    
    setReverting(true);
    try {
      // Update the app's currentVersion to the target version
      const appRef = doc(db, "apps", app.id);
      await updateDoc(appRef, {
        currentVersion: revertTarget.id,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      });
      
      // Also call onUpdate to refresh the app data in parent
      await onUpdate(app.id, { currentVersion: revertTarget.id });
      
      showNotification({
        title: "Reverted",
        message: `App reverted to version ${revertTarget.id.slice(0, 8)}`,
        color: "teal",
      });
      
      setRevertTarget(null);
    } catch (err) {
      console.error("Error reverting:", err);
      showNotification({
        title: "Error",
        message: "Failed to revert version",
        color: "red",
      });
    } finally {
      setReverting(false);
    }
  };
  
  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="sm" />
      </Stack>
    );
  }
  
  if (versions.length === 0) {
    return (
      <Card withBorder>
        <Stack align="center" py="xl">
          <IconHistory size={32} opacity={0.3} />
          <Text size="sm" c="dimmed">No versions published yet</Text>
          <Text size="xs" c="dimmed">Use <code>npm run app:commit {app.id}</code> to publish</Text>
        </Stack>
      </Card>
    );
  }
  
  return (
    <>
      <ScrollArea h={600}>
        <Stack gap="sm">
          {versions.map((version, index) => {
            const isCurrent = version.id === app.currentVersion;
            const authorProfile = authorProfiles.get(version.metadata.publishedBy);
            const authorName = authorProfile?.displayName || version.metadata.publishedByEmail || "Unknown";
            
            return (
              <Card 
                key={version.id} 
                withBorder 
                p="md"
                style={{
                  borderColor: isCurrent ? 'var(--mantine-color-violet-5)' : undefined,
                  background: isCurrent ? 'rgba(147, 51, 234, 0.05)' : undefined,
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Group gap="md" align="flex-start">
                    <Avatar 
                      src={authorProfile?.photoURL} 
                      size="md" 
                      radius="xl" 
                      color="violet"
                    >
                      {authorName.charAt(0).toUpperCase()}
                    </Avatar>
                    
                    <Stack gap={4}>
                      <Group gap="xs">
                        <Text size="sm" fw={600} ff="monospace">
                          {version.id.slice(0, 8)}
                        </Text>
                        {isCurrent && (
                          <Badge color="violet" size="xs">Current</Badge>
                        )}
                      </Group>
                      
                      <Text size="sm">
                        {version.metadata.message || "No commit message"}
                      </Text>
                      
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">{authorName}</Text>
                        <Text size="xs" c="dimmed">•</Text>
                        <Text size="xs" c="dimmed" title={formatDate(version.metadata.publishedAt)}>
                          {formatRelativeTime(version.metadata.publishedAt)}
                        </Text>
                        {version.metadata.moduleCount && (
                          <>
                            <Text size="xs" c="dimmed">•</Text>
                            <Text size="xs" c="dimmed">
                              {version.metadata.moduleCount} files
                            </Text>
                          </>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                  
                  {isOwner && !isCurrent && (
                    <Button
                      variant="subtle"
                      color="orange"
                      size="xs"
                      leftSection={<IconArrowBackUp size={14} />}
                      onClick={() => setRevertTarget(version)}
                    >
                      Revert
                    </Button>
                  )}
                </Group>
              </Card>
            );
          })}
        </Stack>
      </ScrollArea>
      
      {/* Revert Confirmation Modal */}
      <Modal
        opened={!!revertTarget}
        onClose={() => setRevertTarget(null)}
        title="Revert to Previous Version"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">
              This will make version <strong>{revertTarget?.id.slice(0, 8)}</strong> the current 
              live version. Users will immediately see this older version of the app.
            </Text>
          </Alert>
          
          {revertTarget && (
            <Card withBorder p="sm">
              <Text size="sm" fw={500}>
                {revertTarget.metadata.message || "No commit message"}
              </Text>
              <Text size="xs" c="dimmed">
                Published {formatRelativeTime(revertTarget.metadata.publishedAt)}
              </Text>
            </Card>
          )}
          
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setRevertTarget(null)} disabled={reverting}>
              Cancel
            </Button>
            <Button color="orange" onClick={handleRevert} loading={reverting}>
              Revert to This Version
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
