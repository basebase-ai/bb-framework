/**
 * DocumentList - Display list of user's documents and community readings
 */
import React, { useMemo, useState } from "react";
import {
  Stack,
  Card,
  Text,
  Group,
  Button,
  ActionIcon,
  Badge,
  Menu,
  Box,
  Title,
  Center,
  Loader,
  TextInput,
  Switch,
  Modal,
  Divider,
  CloseButton,
} from "@mantine/core";
import {
  IconBook,
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconLanguage,
  IconSearch,
  IconWorld,
  IconLock,
  IconEdit,
  IconUsers,
  IconCopy,
} from "@tabler/icons-react";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { collections, SUPPORTED_LANGUAGES } from "../../schema.js";

/**
 * Get language name from code
 * @param {string} code
 * @returns {string}
 */
function getLanguageName(code) {
  const entry = Object.entries(SUPPORTED_LANGUAGES).find(
    ([, lang]) => lang.code === code
  );
  return entry ? entry[1].name : code;
}

/**
 * Format date for display
 * @param {any} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * @param {{ onOpenDocument: (id: string) => void, onAddDocument: () => void }} props
 */
export function DocumentList({ onOpenDocument, onAddDocument }) {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState(/** @type {any} */ (null));
  const [editTitle, setEditTitle] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [copying, setCopying] = useState(false);

  // Query for user's documents
  const docQueryOptions = useMemo(
    () => ({
      where: user?.uid ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );

  // Query for public documents (from other users)
  const publicQueryOptions = useMemo(
    () => ({
      where: [["isPublic", "==", true]],
    }),
    []
  );

  const {
    data: userDocuments,
    loading,
    remove,
    update,
    add,
  } = useCollection(collections.documents, docQueryOptions);

  const { data: publicDocuments, loading: publicLoading } = useCollection(
    collections.documents,
    publicQueryOptions
  );

  // Filter out user's own documents from public list
  const communityDocuments = useMemo(() => {
    if (!publicDocuments || !user?.uid) return publicDocuments || [];
    return publicDocuments.filter((doc) => doc.owner !== user.uid);
  }, [publicDocuments, user?.uid]);

  // Filter documents by search query
  const filteredUserDocs = useMemo(() => {
    if (!userDocuments) return [];
    if (!searchQuery.trim()) return userDocuments;
    const q = searchQuery.toLowerCase();
    return userDocuments.filter(
      (doc) =>
        doc.title?.toLowerCase().includes(q) ||
        getLanguageName(doc.sourceLanguage).toLowerCase().includes(q)
    );
  }, [userDocuments, searchQuery]);

  const filteredCommunityDocs = useMemo(() => {
    if (!communityDocuments) return [];
    if (!searchQuery.trim()) return communityDocuments;
    const q = searchQuery.toLowerCase();
    return communityDocuments.filter(
      (doc) =>
        doc.title?.toLowerCase().includes(q) ||
        getLanguageName(doc.sourceLanguage).toLowerCase().includes(q)
    );
  }, [communityDocuments, searchQuery]);

  /**
   * Handle document deletion
   * @param {string} id
   * @param {string} title
   */
  const handleDelete = async (id, title) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      await remove(id);
    }
  };

  /**
   * Open edit modal
   * @param {any} doc
   */
  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditIsPublic(doc.isPublic || false);
  };

  /**
   * Save document edits
   */
  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    await update(editingDoc.id, {
      title: editTitle,
      isPublic: editIsPublic,
    });
    setEditingDoc(null);
  };

  /**
   * Copy a public document to user's library
   * @param {any} doc
   */
  const handleCopyToLibrary = async (doc) => {
    if (!user?.uid) return;
    setCopying(true);
    try {
      await add({
        title: doc.title,
        content: doc.content,
        sourceLanguage: doc.sourceLanguage,
        sourceType: doc.sourceType || "text",
        wordCount: doc.wordCount || 0,
        owner: user.uid,
        isPublic: false,
        lastReadPosition: 0,
        linkedDeckId: null,
      });
      // Could show a notification here
    } catch (err) {
      console.error("Failed to copy document:", err);
    }
    setCopying(false);
  };

  // Show loader only on initial auth/data load
  if (authLoading || (loading && !userDocuments)) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  const hasUserDocs = userDocuments && userDocuments.length > 0;
  const hasCommunityDocs = communityDocuments && communityDocuments.length > 0;

  // Empty state when no documents at all
  if (!hasUserDocs && !hasCommunityDocs) {
    return (
      <Stack align="center" py="xl" gap="lg">
        <Box
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(233, 69, 96, 0.2) 0%, rgba(233, 69, 96, 0.05) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconBook size={60} stroke={1.2} color="var(--mantine-color-pink-5)" />
        </Box>
        <Stack align="center" gap="xs">
          <Title order={3} c="gray.3">
            No documents yet
          </Title>
          <Text c="dimmed" ta="center" maw={400}>
            Import a text or PDF document in a foreign language to start reading and learning vocabulary.
          </Text>
        </Stack>
        <Button
          size="lg"
          leftSection={<IconPlus size={20} />}
          onClick={onAddDocument}
          variant="gradient"
          gradient={{ from: "#e94560", to: "#ff6b6b" }}
        >
          Import Your First Document
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {/* Header with search and add */}
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search documents..."
          leftSection={<IconSearch size={16} />}
          rightSection={searchQuery && <CloseButton size="sm" onClick={() => setSearchQuery("")} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={onAddDocument}
          variant="light"
          color="pink"
        >
          Import Document
        </Button>
      </Group>

      {/* User's Documents */}
      {hasUserDocs && (
        <>
          <Title order={4} c="gray.4">
            Your Documents
          </Title>
          {filteredUserDocs.length === 0 ? (
            <Text c="dimmed" size="sm">
              No documents match your search.
            </Text>
          ) : (
            filteredUserDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isOwner={true}
                onOpen={() => onOpenDocument(doc.id)}
                onEdit={() => openEditModal(doc)}
                onDelete={() => handleDelete(doc.id, doc.title)}
              />
            ))
          )}
        </>
      )}

      {/* Community Documents */}
      {hasCommunityDocs && (
        <>
          <Divider my="md" />
          <Group gap="xs">
            <IconUsers size={20} color="var(--mantine-color-cyan-5)" />
            <Title order={4} c="gray.4">
              Community Readings
            </Title>
          </Group>
          <Text size="sm" c="dimmed" mb="sm">
            Public readings shared by the community. Click to read, or copy to your library for personal progress tracking.
          </Text>
          {filteredCommunityDocs.length === 0 ? (
            <Text c="dimmed" size="sm">
              No community documents match your search.
            </Text>
          ) : (
            filteredCommunityDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isOwner={false}
                onOpen={() => onOpenDocument(doc.id)}
                onCopy={() => handleCopyToLibrary(doc)}
                copying={copying}
              />
            ))
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal
        opened={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        title="Edit Document"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <Switch
            label="Make this document public"
            description="Public documents can be read by anyone in the community"
            checked={editIsPublic}
            onChange={(e) => setEditIsPublic(e.currentTarget.checked)}
            color="cyan"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setEditingDoc(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editTitle.trim()}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/**
 * Document Card Component
 * @param {{
 *   doc: any,
 *   isOwner: boolean,
 *   onOpen: () => void,
 *   onEdit?: () => void,
 *   onDelete?: () => void,
 *   onCopy?: () => void,
 *   copying?: boolean
 * }} props
 */
function DocumentCard({ doc, isOwner, onOpen, onEdit, onDelete, onCopy, copying }) {
  return (
    <Card
      withBorder
      shadow="xs"
      padding="lg"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={onOpen}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isOwner
          ? "var(--mantine-color-pink-7)"
          : "var(--mantine-color-cyan-7)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" wrap="nowrap">
            <IconBook size={20} color={isOwner ? "var(--mantine-color-pink-5)" : "var(--mantine-color-cyan-5)"} />
            <Text fw={600} truncate>
              {doc.title}
            </Text>
            {doc.isPublic && (
              <Badge
                variant="light"
                color="cyan"
                size="xs"
                leftSection={<IconWorld size={10} />}
              >
                Public
              </Badge>
            )}
          </Group>
          <Group gap="sm">
            <Badge
              variant="light"
              color={isOwner ? "pink" : "cyan"}
              size="sm"
              leftSection={<IconLanguage size={12} />}
            >
              {getLanguageName(doc.sourceLanguage)}
            </Badge>
            <Text size="xs" c="dimmed">
              {doc.wordCount?.toLocaleString() || 0} words
            </Text>
            <Text size="xs" c="dimmed">
              Added {formatDate(doc.createdAt)}
            </Text>
          </Group>
        </Stack>

        <Group gap="xs">
          {!isOwner && onCopy && (
            <Button
              size="xs"
              variant="light"
              color="cyan"
              leftSection={<IconCopy size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              loading={copying}
            >
              Copy
            </Button>
          )}
          {isOwner && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                  }}
                >
                  Edit
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
    </Card>
  );
}
