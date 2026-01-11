/**
 * DocumentList - Display list of user's imported documents
 */
import React, { useMemo } from "react";
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
} from "@mantine/core";
import {
  IconBook,
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconLanguage,
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

  // Memoize query options to prevent infinite re-renders
  const docQueryOptions = useMemo(
    () => ({
      where: user?.uid ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );

  const {
    data: documents,
    loading,
    remove,
  } = useCollection(collections.documents, docQueryOptions);

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

  // Show loader only on initial auth/data load
  if (authLoading || (loading && !documents)) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!documents || documents.length === 0) {
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
      <Group justify="space-between" mb="md">
        <Title order={3}>Your Documents</Title>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={onAddDocument}
          variant="light"
          color="pink"
        >
          Import Document
        </Button>
      </Group>

      {documents.map((doc) => (
        <Card
          key={doc.id}
          withBorder
          padding="lg"
          style={{
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderColor: "var(--mantine-color-dark-4)",
          }}
          onClick={() => onOpenDocument(doc.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--mantine-color-pink-7)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--mantine-color-dark-4)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
              <Group gap="sm" wrap="nowrap">
                <IconBook size={20} color="var(--mantine-color-pink-5)" />
                <Text fw={600} truncate>
                  {doc.title}
                </Text>
              </Group>
              <Group gap="sm">
                <Badge
                  variant="light"
                  color="pink"
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
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id, doc.title);
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}


