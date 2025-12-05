/**
 * DocumentsList - View and manage documents
 * Shows owned documents and documents shared with the user
 */

import React, { useState, useMemo } from "react";
import {
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  Button,
  Card,
  Badge,
  Menu,
  ActionIcon,
  Tabs,
  SimpleGrid,
  Loader,
  Paper,
  ThemeIcon,
  Tooltip,
  Center,
} from "@mantine/core";
import {
  IconPlus,
  IconSearch,
  IconFile,
  IconFileText,
  IconDotsVertical,
  IconTrash,
  IconShare,
  IconClock,
  IconUser,
  IconUsers,
  IconFileOff,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date | null} date
 * @returns {string}
 */
function formatRelativeTime(date) {
  if (!date) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Document card component
 */
function DocumentCard({ doc, isOwner, onOpen, onDelete, onShare }) {
  const updatedAt = doc.updatedAt?.toDate
    ? doc.updatedAt.toDate()
    : doc.updatedAt?.seconds
    ? new Date(doc.updatedAt.seconds * 1000)
    : null;

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onOpen}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <ThemeIcon variant="light" size="lg" color="blue">
            <IconFileText size={20} />
          </ThemeIcon>
          <div>
            <Text fw={500} lineClamp={1}>
              {doc.title || "Untitled Document"}
            </Text>
            <Text size="xs" c="dimmed">
              {doc.wordCount || 0} words
            </Text>
          </div>
        </Group>

        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={(e) => e.stopPropagation()}
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
            <Menu.Item leftSection={<IconShare size={14} />} onClick={onShare}>
              Share
            </Menu.Item>
            {isOwner && (
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={onDelete}
              >
                Delete
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {doc.excerpt && (
        <Text size="sm" c="dimmed" lineClamp={2} mb="sm">
          {doc.excerpt}
        </Text>
      )}

      <Group justify="space-between" mt="md">
        <Group gap="xs">
          <IconClock size={14} color="gray" />
          <Text size="xs" c="dimmed">
            {formatRelativeTime(updatedAt)}
          </Text>
        </Group>

        {!isOwner && (
          <Badge size="sm" variant="light" color="gray">
            Shared
          </Badge>
        )}

        {doc.sharedWith?.length > 0 && isOwner && (
          <Tooltip label={`Shared with ${doc.sharedWith.length} people`}>
            <Badge size="sm" variant="light" leftSection={<IconUsers size={12} />}>
              {doc.sharedWith.length}
            </Badge>
          </Tooltip>
        )}
      </Group>
    </Card>
  );
}

/**
 * Empty state component
 */
function EmptyState({ onCreateNew, filterMode }) {
  return (
    <Center h={400}>
      <Stack align="center" gap="md">
        <ThemeIcon size={80} radius="xl" variant="light" color="gray">
          <IconFileOff size={40} />
        </ThemeIcon>
        <Text size="lg" c="dimmed">
          {filterMode === "all"
            ? "No documents yet"
            : filterMode === "owned"
            ? "You haven't created any documents"
            : "No documents shared with you"}
        </Text>
        {filterMode !== "shared" && (
          <Button leftSection={<IconPlus size={16} />} onClick={onCreateNew}>
            Create Document
          </Button>
        )}
      </Stack>
    </Center>
  );
}

/**
 * DocumentsList component
 */
export function DocumentsList() {
  const { user } = useAuth();
  const openDocument = useAppStore((state) => state.openDocument);

  /** @type {[string, Function]} */
  const [searchQuery, setSearchQuery] = useState("");

  /** @type {[string, Function]} */
  const [activeTab, setActiveTab] = useState("all");

  // Fetch ALL documents - security rules + client-side filtering handle access
  const {
    data: documents,
    loading,
    add: addDocument,
    remove: removeDocument,
  } = useCollection(collections.documents);

  // Filter documents based on user's relationship and filter mode
  const { filteredDocs, counts } = useMemo(() => {
    if (!documents || !user || !Array.isArray(documents)) {
      return { filteredDocs: [], counts: { all: 0, owned: 0, shared: 0 } };
    }

    const userUid = user.uid;
    const userEmail = user.email?.toLowerCase() || "";

    // First, filter to only docs the user has access to
    const accessibleDocs = documents.filter((doc) => {
      const isOwner = doc.owner === userUid;
      const isSharedWith =
        doc.sharedWith?.includes(userUid) ||
        doc.sharedWith?.some((s) => s?.toLowerCase?.() === userEmail);
      return isOwner || isSharedWith;
    });

    // Count by type
    let ownedCount = 0;
    let sharedCount = 0;

    accessibleDocs.forEach((doc) => {
      if (doc.owner === userUid) {
        ownedCount++;
      } else {
        sharedCount++;
      }
    });

    const countsResult = {
      all: accessibleDocs.length,
      owned: ownedCount,
      shared: sharedCount,
    };

    // Apply tab filter
    let filtered = accessibleDocs.map((doc) => ({
      ...doc,
      _isOwner: doc.owner === userUid,
    }));

    if (activeTab === "owned") {
      filtered = filtered.filter((d) => d._isOwner);
    } else if (activeTab === "shared") {
      filtered = filtered.filter((d) => !d._isOwner);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          (d.title || "").toLowerCase().includes(query) ||
          (d.excerpt || "").toLowerCase().includes(query)
      );
    }

    // Sort by updatedAt
    filtered.sort((a, b) => {
      const aTime = a.updatedAt?.seconds || 0;
      const bTime = b.updatedAt?.seconds || 0;
      return bTime - aTime;
    });

    return { filteredDocs: filtered, counts: countsResult };
  }, [documents, user, activeTab, searchQuery]);

  /**
   * Create a new document
   */
  const handleCreateDocument = async () => {
    if (!user) return;

    try {
      const docId = await addDocument({
        title: "Untitled Document",
        owner: user.uid,
        sharedWith: [],
        permissions: {},
        currentVersion: 1,
        excerpt: "",
        wordCount: 0,
      });

      // Open the new document
      openDocument(docId);
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  /**
   * Delete a document
   */
  const handleDeleteDocument = async (docId) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await removeDocument(docId);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  /**
   * Open share modal for a document
   */
  const handleShareDocument = (docId) => {
    openDocument(docId);
    setTimeout(() => {
      useAppStore.getState().toggleSharePanel();
    }, 100);
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Documents</Title>
          <Text c="dimmed" size="sm">
            Create, edit, and share documents in real-time
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreateDocument}>
          New Document
        </Button>
      </Group>

      {/* Search */}
      <TextInput
        placeholder="Search documents..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconFile size={14} />}>
            All ({counts.all})
          </Tabs.Tab>
          <Tabs.Tab value="owned" leftSection={<IconUser size={14} />}>
            My Documents ({counts.owned})
          </Tabs.Tab>
          <Tabs.Tab value="shared" leftSection={<IconUsers size={14} />}>
            Shared with me ({counts.shared})
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <EmptyState onCreateNew={handleCreateDocument} filterMode={activeTab} />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isOwner={doc._isOwner}
              onOpen={() => openDocument(doc.id)}
              onDelete={() => handleDeleteDocument(doc.id)}
              onShare={() => handleShareDocument(doc.id)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
