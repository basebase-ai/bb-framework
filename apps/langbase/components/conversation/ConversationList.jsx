/**
 * ConversationList - Display and manage conversation practice scenarios
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
  Textarea,
  Select,
  Switch,
  Modal,
  Divider,
} from "@mantine/core";
import {
  IconMessageCircle,
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconEdit,
  IconSearch,
  IconWorld,
  IconLanguage,
  IconUsers,
  IconCopy,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { collections, SUPPORTED_LANGUAGES } from "../../schema.js";

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

// Language options for select
const languageOptions = Object.entries(SUPPORTED_LANGUAGES).map(([key, lang]) => ({
  value: key,
  label: lang.name,
}));

/**
 * @param {{ onOpenConversation: (id: string) => void }} props
 */
export function ConversationList({ onOpenConversation }) {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingConvo, setEditingConvo] = useState(/** @type {any} */ (null));
  const [copying, setCopying] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("norwegian");
  const [isPublic, setIsPublic] = useState(false);

  // Query for user's conversations
  const queryOptions = useMemo(
    () => ({
      where: user?.uid ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );

  // Query for public conversations
  const publicQueryOptions = useMemo(
    () => ({
      where: [["isPublic", "==", true]],
    }),
    []
  );

  const {
    data: userConversations,
    loading,
    remove,
    update,
    add,
  } = useCollection(collections.conversations, queryOptions);

  const { data: publicConversations, loading: publicLoading } = useCollection(
    collections.conversations,
    publicQueryOptions
  );

  // Filter out user's own conversations from public list
  const communityConversations = useMemo(() => {
    if (!publicConversations || !user?.uid) return publicConversations || [];
    return publicConversations.filter((c) => c.owner !== user.uid);
  }, [publicConversations, user?.uid]);

  // Filter by search
  const filteredUserConvos = useMemo(() => {
    if (!userConversations) return [];
    if (!searchQuery.trim()) return userConversations;
    const q = searchQuery.toLowerCase();
    return userConversations.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        SUPPORTED_LANGUAGES[c.language]?.name.toLowerCase().includes(q)
    );
  }, [userConversations, searchQuery]);

  const filteredCommunityConvos = useMemo(() => {
    if (!communityConversations) return [];
    if (!searchQuery.trim()) return communityConversations;
    const q = searchQuery.toLowerCase();
    return communityConversations.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        SUPPORTED_LANGUAGES[c.language]?.name.toLowerCase().includes(q)
    );
  }, [communityConversations, searchQuery]);

  /**
   * Reset form state
   */
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLanguage("norwegian");
    setIsPublic(false);
  };

  /**
   * Open create modal
   */
  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  /**
   * Open edit modal
   * @param {any} convo
   */
  const openEditModal = (convo) => {
    setEditingConvo(convo);
    setTitle(convo.title);
    setDescription(convo.description || "");
    setLanguage(convo.language);
    setIsPublic(convo.isPublic || false);
  };

  /**
   * Handle create conversation
   */
  const handleCreate = async () => {
    if (!user?.uid || !title.trim()) return;
    
    const newConvo = await add({
      title: title.trim(),
      description: description.trim() || null,
      language,
      isPublic,
      owner: user.uid,
      messageCount: 0,
      lastMessageAt: null,
    });
    
    setCreateModalOpen(false);
    resetForm();
    
    // Optionally navigate to the new conversation
    if (newConvo?.id) {
      onOpenConversation(newConvo.id);
    }
  };

  /**
   * Handle update conversation
   */
  const handleUpdate = async () => {
    if (!editingConvo) return;
    await update(editingConvo.id, {
      title: title.trim(),
      description: description.trim() || null,
      language,
      isPublic,
    });
    setEditingConvo(null);
  };

  /**
   * Handle delete conversation
   * @param {string} id
   * @param {string} title
   */
  const handleDelete = async (id, title) => {
    if (confirm(`Delete "${title}"? All messages will be lost.`)) {
      await remove(id);
    }
  };

  /**
   * Copy a public conversation to user's library
   * @param {any} convo
   */
  const handleCopy = async (convo) => {
    if (!user?.uid) return;
    setCopying(true);
    try {
      const newConvo = await add({
        title: convo.title,
        description: convo.description || null,
        language: convo.language,
        isPublic: false,
        owner: user.uid,
        messageCount: 0,
        lastMessageAt: null,
      });
      if (newConvo?.id) {
        onOpenConversation(newConvo.id);
      }
    } catch (err) {
      console.error("Failed to copy conversation:", err);
    }
    setCopying(false);
  };

  // Loading state
  if (authLoading || (loading && !userConversations)) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  const hasUserConvos = userConversations && userConversations.length > 0;
  const hasCommunityConvos = communityConversations && communityConversations.length > 0;

  // Empty state
  if (!hasUserConvos && !hasCommunityConvos) {
    return (
      <>
        <Stack align="center" py="xl" gap="lg">
          <Box
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconMessageCircle size={60} stroke={1.2} color="var(--mantine-color-indigo-5)" />
          </Box>
          <Stack align="center" gap="xs">
            <Title order={3} c="gray.3">
              No conversations yet
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              Create a conversation scenario to practice chatting in a foreign language with AI assistance.
            </Text>
          </Stack>
          <Button
            size="lg"
            leftSection={<IconPlus size={20} />}
            onClick={openCreateModal}
            variant="gradient"
            gradient={{ from: "indigo", to: "violet" }}
          >
            Create Your First Conversation
          </Button>
        </Stack>
        
        {/* Create Modal */}
        <ConversationModal
          opened={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Conversation"
          formTitle={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          language={language}
          setLanguage={setLanguage}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
          onSubmit={handleCreate}
          submitLabel="Create & Start Chatting"
        />
      </>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search conversations..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={openCreateModal}
          variant="light"
          color="indigo"
        >
          New Conversation
        </Button>
      </Group>

      {/* User's Conversations */}
      {hasUserConvos && (
        <>
          <Title order={4} c="gray.4">
            Your Conversations
          </Title>
          {filteredUserConvos.length === 0 ? (
            <Text c="dimmed" size="sm">
              No conversations match your search.
            </Text>
          ) : (
            filteredUserConvos.map((convo) => (
              <ConversationCard
                key={convo.id}
                convo={convo}
                isOwner={true}
                onOpen={() => onOpenConversation(convo.id)}
                onEdit={() => openEditModal(convo)}
                onDelete={() => handleDelete(convo.id, convo.title)}
              />
            ))
          )}
        </>
      )}

      {/* Community Conversations */}
      {hasCommunityConvos && (
        <>
          <Divider my="md" />
          <Group gap="xs">
            <IconUsers size={20} color="var(--mantine-color-violet-5)" />
            <Title order={4} c="gray.4">
              Community Scenarios
            </Title>
          </Group>
          <Text size="sm" c="dimmed" mb="sm">
            Practice scenarios shared by the community. Copy one to start your own conversation.
          </Text>
          {filteredCommunityConvos.length === 0 ? (
            <Text c="dimmed" size="sm">
              No community conversations match your search.
            </Text>
          ) : (
            filteredCommunityConvos.map((convo) => (
              <ConversationCard
                key={convo.id}
                convo={convo}
                isOwner={false}
                onOpen={() => onOpenConversation(convo.id)}
                onCopy={() => handleCopy(convo)}
                copying={copying}
              />
            ))
          )}
        </>
      )}

      {/* Create Modal */}
      <ConversationModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Conversation"
        formTitle={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        language={language}
        setLanguage={setLanguage}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        onSubmit={handleCreate}
        submitLabel="Create & Start Chatting"
      />

      {/* Edit Modal */}
      <ConversationModal
        opened={!!editingConvo}
        onClose={() => setEditingConvo(null)}
        title="Edit Conversation"
        formTitle={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        language={language}
        setLanguage={setLanguage}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />
    </Stack>
  );
}

/**
 * Conversation Card Component
 */
function ConversationCard({ convo, isOwner, onOpen, onEdit, onDelete, onCopy, copying }) {
  const langInfo = SUPPORTED_LANGUAGES[convo.language] || { name: convo.language };

  return (
    <Card
      withBorder
      padding="lg"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        borderColor: "var(--mantine-color-dark-4)",
      }}
      onClick={onOpen}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isOwner
          ? "var(--mantine-color-indigo-7)"
          : "var(--mantine-color-violet-7)";
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
            <IconMessageCircle
              size={20}
              color={isOwner ? "var(--mantine-color-indigo-5)" : "var(--mantine-color-violet-5)"}
            />
            <Text fw={600} truncate>
              {convo.title}
            </Text>
            {convo.isPublic && (
              <Badge variant="light" color="violet" size="xs" leftSection={<IconWorld size={10} />}>
                Public
              </Badge>
            )}
          </Group>
          {convo.description && (
            <Text size="sm" c="dimmed" lineClamp={1}>
              {convo.description}
            </Text>
          )}
          <Group gap="sm">
            <Badge
              variant="light"
              color={isOwner ? "indigo" : "violet"}
              size="sm"
              leftSection={<IconLanguage size={12} />}
            >
              {langInfo.name}
            </Badge>
            <Text size="xs" c="dimmed">
              {convo.messageCount || 0} messages
            </Text>
            {convo.lastMessageAt && (
              <Text size="xs" c="dimmed">
                Last: {formatDate(convo.lastMessageAt)}
              </Text>
            )}
          </Group>
        </Stack>

        <Group gap="xs">
          {isOwner ? (
            <>
              <Button
                size="xs"
                variant="light"
                color="indigo"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
              >
                Continue
              </Button>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconEdit size={16} />} onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                    Edit
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </>
          ) : (
            <Button
              size="xs"
              variant="light"
              color="violet"
              leftSection={<IconCopy size={14} />}
              onClick={(e) => { e.stopPropagation(); onCopy?.(); }}
              loading={copying}
            >
              Copy & Start
            </Button>
          )}
        </Group>
      </Group>
    </Card>
  );
}

/**
 * Conversation Modal Component
 */
function ConversationModal({
  opened,
  onClose,
  title,
  formTitle,
  setTitle,
  description,
  setDescription,
  language,
  setLanguage,
  isPublic,
  setIsPublic,
  onSubmit,
  submitLabel,
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="md">
      <Stack gap="md">
        <TextInput
          label="Scenario Title"
          placeholder="e.g., Purchasing Clothing, Ordering at a Restaurant"
          value={formTitle}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Description (Optional)"
          placeholder="Describe the situation or any specific context you want to practice..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={2}
        />
        <Select
          label="Language"
          description="The language you want to practice"
          data={languageOptions}
          value={language}
          onChange={(val) => val && setLanguage(val)}
          required
        />
        <Switch
          label="Make this scenario public"
          description="Others can copy and use this scenario"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.currentTarget.checked)}
          color="violet"
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!formTitle.trim()}
            variant="gradient"
            gradient={{ from: "indigo", to: "violet" }}
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

