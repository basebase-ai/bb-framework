/**
 * ScenarioList - Display and manage conversation scenarios and their instances
 * 
 * Scenarios are reusable templates (can be shared publicly)
 * Instances are individual chat sessions (always private)
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
  Paper,
  SimpleGrid,
  CloseButton,
} from "@mantine/core";
import {
  IconMessageCircle,
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconEdit,
  IconSearch,
  IconWorld,
  IconUsers,
  IconCopy,
  IconPlayerPlay,
  IconHistory,
  IconArrowLeft,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";
import { collections, SUPPORTED_LANGUAGES } from "../../schema.js";
import { useUIStore } from "../../stores/uiStore.js";

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
 * Format relative time
 * @param {any} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(timestamp);
}

// Language options for select (with flags)
const languageOptions = Object.entries(SUPPORTED_LANGUAGES).map(([key, lang]) => ({
  value: key,
  label: `${lang.flag} ${lang.name}`,
}));

/**
 * @param {{ onOpenConversation: (conversationId: string) => void }} props
 */
export function ScenarioList({ onOpenConversation }) {
  const { user, loading: authLoading } = useAuth();
  const { call: callLLM } = useFunction("askLLM");
  const primaryLanguage = useUIStore((s) => s.primaryLanguage);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState(/** @type {any} */ (null));
  const [selectedScenario, setSelectedScenario] = useState(/** @type {any} */ (null));
  const [copying, setCopying] = useState(false);
  const [startConvoModalOpen, setStartConvoModalOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(primaryLanguage || "spanish");
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState(/** @type {string[]} */ ([]));
  const [isPublic, setIsPublic] = useState(false);

  // Query for user's scenarios
  const scenarioQueryOptions = useMemo(
    () => ({
      where: user?.uid ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );

  // Query for public scenarios
  const publicScenarioQueryOptions = useMemo(
    () => ({
      where: [["isPublic", "==", true]],
    }),
    []
  );

  // Query for user's conversation instances (for selected scenario)
  const instanceQueryOptions = useMemo(
    () => ({
      where: user?.uid && selectedScenario
        ? [["owner", "==", user.uid], ["scenarioId", "==", selectedScenario.id]]
        : [],
    }),
    [user?.uid, selectedScenario?.id]
  );

  const {
    data: userScenarios,
    loading: scenariosLoading,
    remove: removeScenario,
    update: updateScenario,
    add: addScenario,
  } = useCollection(collections.scenarios, scenarioQueryOptions);

  const { data: publicScenarios, loading: publicLoading } = useCollection(
    collections.scenarios,
    publicScenarioQueryOptions
  );

  const {
    data: instances,
    loading: instancesLoading,
    add: addInstance,
    remove: removeInstance,
  } = useCollection(collections.conversations, instanceQueryOptions);

  // Filter out user's own scenarios from public list
  const communityScenarios = useMemo(() => {
    if (!publicScenarios || !user?.uid) return publicScenarios || [];
    return publicScenarios.filter((s) => s.owner !== user.uid);
  }, [publicScenarios, user?.uid]);

  // Filter by search
  const filteredUserScenarios = useMemo(() => {
    if (!userScenarios) return [];
    if (!searchQuery.trim()) return userScenarios;
    const q = searchQuery.toLowerCase();
    return userScenarios.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [userScenarios, searchQuery]);

  const filteredCommunityScenarios = useMemo(() => {
    if (!communityScenarios) return [];
    if (!searchQuery.trim()) return communityScenarios;
    const q = searchQuery.toLowerCase();
    return communityScenarios.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [communityScenarios, searchQuery]);

  // Sort instances by last message (most recent first)
  const sortedInstances = useMemo(() => {
    if (!instances) return [];
    return [...instances].sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.lastMessageAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
  }, [instances]);

  /**
   * Reset form state
   */
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setQuestions([]);
    setIsPublic(false);
  };

  /**
   * Generate questions based on scenario title/description
   * @param {string} scenarioTitle
   * @param {string} scenarioDescription
   */
  const generateQuestions = async (scenarioTitle, scenarioDescription) => {
    setGeneratingQuestions(true);
    try {
      const prompt = `You are helping create a language learning conversation scenario titled "${scenarioTitle}".
${scenarioDescription ? `Description: ${scenarioDescription}` : ""}

Generate 5-7 questions (in English) that an AI conversation partner should try to get the learner to answer during this conversation. These questions should:
- Be natural for the scenario context
- Progress from simple to more complex
- Help the learner practice relevant vocabulary and grammar
- Cover different aspects of the topic

Return ONLY a JSON array of strings, like: ["Question 1?", "Question 2?", ...]
No other text or explanation.`;

      const result = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        message: prompt,
        temperature: 0.7,
      });

      if (result?.response) {
        try {
          // Parse the JSON array from the response
          const parsed = JSON.parse(result.response.trim());
          if (Array.isArray(parsed)) {
            setQuestions(parsed);
          }
        } catch {
          // Try to extract questions if not valid JSON
          const lines = result.response.split("\n").filter((l) => l.trim().endsWith("?"));
          if (lines.length > 0) {
            setQuestions(lines.map((l) => l.replace(/^[\d\.\-\*\s]+/, "").trim()));
          }
        }
      }
    } catch (err) {
      console.error("Failed to generate questions:", err);
    }
    setGeneratingQuestions(false);
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
   * @param {any} scenario
   */
  const openEditModal = (scenario) => {
    setEditingScenario(scenario);
    setTitle(scenario.title);
    setDescription(scenario.description || "");
    setQuestions(scenario.questions || []);
    setIsPublic(scenario.isPublic || false);
  };

  /**
   * Handle create scenario
   */
  const handleCreate = async () => {
    if (!user?.uid || !title.trim()) return;
    
    const scenarioData = {
      title: title.trim(),
      description: description.trim() || null,
      questions: questions.length > 0 ? questions : null,
      isPublic,
      owner: user.uid,
    };
    
    // addScenario returns the new document ID directly (not an object)
    const newScenarioId = await addScenario(scenarioData);
    
    setCreateModalOpen(false);
    resetForm();
    
    // Navigate to the new scenario's detail view
    if (newScenarioId) {
      setSelectedScenario({ ...scenarioData, id: newScenarioId });
    }
  };

  /**
   * Handle update scenario
   */
  const handleUpdate = async () => {
    if (!editingScenario) return;
    await updateScenario(editingScenario.id, {
      title: title.trim(),
      description: description.trim() || null,
      questions: questions.length > 0 ? questions : null,
      isPublic,
    });
    setEditingScenario(null);
    
    // Update selected scenario if it's the one being edited
    if (selectedScenario?.id === editingScenario.id) {
      setSelectedScenario({
        ...selectedScenario,
        title: title.trim(),
        description: description.trim() || null,
        questions: questions.length > 0 ? questions : null,
        isPublic,
      });
    }
  };

  /**
   * Handle delete scenario
   * @param {string} id
   * @param {string} scenarioTitle
   */
  const handleDeleteScenario = async (id, scenarioTitle) => {
    if (confirm(`Delete scenario "${scenarioTitle}"? All conversation instances will also be deleted.`)) {
      await removeScenario(id);
      if (selectedScenario?.id === id) {
        setSelectedScenario(null);
      }
    }
  };

  /**
   * Copy a public scenario to user's library
   * @param {any} scenario
   */
  const handleCopyScenario = async (scenario) => {
    if (!user?.uid) return;
    setCopying(true);
    try {
      const scenarioData = {
        title: scenario.title,
        description: scenario.description || null,
        questions: scenario.questions || null,
        systemPrompt: scenario.systemPrompt || null,
        isPublic: false,
        owner: user.uid,
      };
      // addScenario returns the new document ID directly (not an object)
      const newScenarioId = await addScenario(scenarioData);
      if (newScenarioId) {
        setSelectedScenario({ ...scenarioData, id: newScenarioId });
      }
    } catch (err) {
      console.error("Failed to copy scenario:", err);
    }
    setCopying(false);
  };

  /**
   * Open the start conversation modal
   */
  const openStartConvoModal = () => {
    setSelectedLanguage(primaryLanguage || "spanish"); // Use primary language as default
    setStartConvoModalOpen(true);
  };

  /**
   * Start a new conversation instance with selected language
   */
  const handleStartNewConversation = async () => {
    if (!user?.uid || !selectedScenario) return;
    
    // addInstance returns the new document ID directly (not an object)
    const newInstanceId = await addInstance({
      scenarioId: selectedScenario.id,
      language: selectedLanguage,
      owner: user.uid,
      messageCount: 0,
      lastMessageAt: null,
    });
    
    setStartConvoModalOpen(false);
    
    if (newInstanceId) {
      onOpenConversation(newInstanceId);
    }
  };

  /**
   * Delete a conversation instance
   * @param {string} instanceId
   */
  const handleDeleteInstance = async (instanceId) => {
    if (confirm("Delete this conversation? All messages will be lost.")) {
      await removeInstance(instanceId);
    }
  };

  // Loading state
  if (authLoading || (scenariosLoading && !userScenarios)) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  // If a scenario is selected, show its detail view with instances
  if (selectedScenario) {
    const isOwner = selectedScenario.owner === user?.uid;
    
    return (
      <Stack gap="md">
        {/* Back button and header */}
        <Group gap="md">
          <ActionIcon variant="subtle" onClick={() => setSelectedScenario(null)}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Box style={{ flex: 1 }}>
            <Group gap="sm">
              <Title order={3}>{selectedScenario.title}</Title>
              {selectedScenario.isPublic && (
                <Badge variant="light" color="cyan" size="sm" leftSection={<IconWorld size={12} />}>
                  Public
                </Badge>
              )}
            </Group>
            {selectedScenario.description && (
              <Text size="sm" c="dimmed" mt={4}>
                {selectedScenario.description}
              </Text>
            )}
          </Box>
          {isOwner && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEditModal(selectedScenario)}>
                  Edit Scenario
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => handleDeleteScenario(selectedScenario.id, selectedScenario.title)}
                >
                  Delete Scenario
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        {/* Start new conversation button */}
        <Button
          size="lg"
          leftSection={<IconPlus size={20} />}
          onClick={openStartConvoModal}
          variant="filled"
          color="pink"
          fullWidth
        >
          Start New Conversation
        </Button>
        
        {/* Language selection modal */}
        <Modal
          opened={startConvoModalOpen}
          onClose={() => setStartConvoModalOpen(false)}
          title="Choose Language"
          centered
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              What language do you want to practice in this conversation?
            </Text>
            <Select
              label="Language"
              data={languageOptions}
              value={selectedLanguage}
              onChange={(val) => val && setSelectedLanguage(val)}
              size="md"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setStartConvoModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartNewConversation}
                variant="filled"
                color="pink"
                leftSection={<IconPlayerPlay size={16} />}
              >
                Start
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Past conversations */}
        <Divider my="sm" label={<Group gap="xs"><IconHistory size={14} /> Past Conversations</Group>} labelPosition="left" />
        
        {instancesLoading ? (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        ) : sortedInstances.length === 0 ? (
          <Paper withBorder shadow="xs" p="lg" ta="center">
            <Text c="dimmed">No conversations yet. Start a new one above!</Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {sortedInstances.map((instance) => {
              const instanceLang = SUPPORTED_LANGUAGES[instance.language] || { name: instance.language };
              return (
              <Card
                key={instance.id}
                withBorder
                shadow="xs"
                padding="md"
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => onOpenConversation(instance.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--mantine-color-pink-7)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Group justify="space-between">
                  <Stack gap={4}>
                    <Group gap="sm">
                      <IconMessageCircle size={16} color="var(--mantine-color-pink-5)" />
                      <Text size="sm" fw={500}>
                        {instance.messageCount || 0} messages
                      </Text>
                      <Badge variant="light" color="pink" size="xs">
                        {instanceLang.name}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {instance.lastMessageAt
                        ? `Last active ${formatRelativeTime(instance.lastMessageAt)}`
                        : `Started ${formatDate(instance.createdAt)}`}
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      color="pink"
                      leftSection={<IconPlayerPlay size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenConversation(instance.id);
                      }}
                    >
                      Continue
                    </Button>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteInstance(instance.id);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
              );
            })}
          </Stack>
        )}

        {/* Edit Modal */}
        <ScenarioModal
          opened={!!editingScenario}
          onClose={() => setEditingScenario(null)}
          title="Edit Scenario"
          formTitle={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          questions={questions}
          setQuestions={setQuestions}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
          onSubmit={handleUpdate}
          submitLabel="Save Changes"
          onGenerateQuestions={() => generateQuestions(title, description)}
          generatingQuestions={generatingQuestions}
          isCreate={false}
        />
      </Stack>
    );
  }

  const hasUserScenarios = userScenarios && userScenarios.length > 0;
  const hasCommunityScenarios = communityScenarios && communityScenarios.length > 0;

  // Empty state
  if (!hasUserScenarios && !hasCommunityScenarios) {
    return (
      <>
        <Stack align="center" py="xl" gap="lg">
          <Box
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(233, 69, 96, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconMessageCircle size={60} stroke={1.2} color="var(--mantine-color-pink-5)" />
          </Box>
          <Stack align="center" gap="xs">
            <Title order={3} c="gray.3">
              No conversation scenarios yet
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              Create a scenario to practice chatting in a foreign language with AI assistance.
              Each scenario can have multiple conversation instances.
            </Text>
          </Stack>
          <Button
            size="lg"
            leftSection={<IconPlus size={20} />}
            onClick={openCreateModal}
            variant="filled"
            color="pink"
          >
            Create Your First Scenario
          </Button>
        </Stack>
        
        {/* Create Modal */}
        <ScenarioModal
          opened={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Scenario"
          formTitle={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          questions={questions}
          setQuestions={setQuestions}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
          onSubmit={handleCreate}
          submitLabel="Create Scenario"
          onGenerateQuestions={() => generateQuestions(title, description)}
          generatingQuestions={generatingQuestions}
          isCreate={true}
        />
      </>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search scenarios..."
          leftSection={<IconSearch size={16} />}
          rightSection={searchQuery && <CloseButton size="sm" onClick={() => setSearchQuery("")} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={openCreateModal}
          variant="light"
          color="pink"
        >
          New Scenario
        </Button>
      </Group>

      {/* User's Scenarios */}
      {hasUserScenarios && (
        <>
          <Title order={4} c="gray.4">
            Your Scenarios
          </Title>
          {filteredUserScenarios.length === 0 ? (
            <Text c="dimmed" size="sm">
              No scenarios match your search.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {filteredUserScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isOwner={true}
                  onSelect={() => setSelectedScenario(scenario)}
                  onEdit={() => openEditModal(scenario)}
                  onDelete={() => handleDeleteScenario(scenario.id, scenario.title)}
                />
              ))}
            </SimpleGrid>
          )}
        </>
      )}

      {/* Community Scenarios */}
      {hasCommunityScenarios && (
        <>
          <Divider my="md" />
          <Group gap="xs">
            <IconUsers size={20} color="var(--mantine-color-cyan-5)" />
            <Title order={4} c="gray.4">
              Community Scenarios
            </Title>
          </Group>
          <Text size="sm" c="dimmed" mb="sm">
            Scenarios shared by the community. Copy one to start practicing.
          </Text>
          {filteredCommunityScenarios.length === 0 ? (
            <Text c="dimmed" size="sm">
              No community scenarios match your search.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {filteredCommunityScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isOwner={false}
                  onCopy={() => handleCopyScenario(scenario)}
                  copying={copying}
                />
              ))}
            </SimpleGrid>
          )}
        </>
      )}

      {/* Create Modal */}
      <ScenarioModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Scenario"
        formTitle={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        questions={questions}
        setQuestions={setQuestions}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        onSubmit={handleCreate}
        submitLabel="Create Scenario"
        onGenerateQuestions={() => generateQuestions(title, description)}
        generatingQuestions={generatingQuestions}
        isCreate={true}
      />

      {/* Edit Modal */}
      <ScenarioModal
        opened={!!editingScenario}
        onClose={() => setEditingScenario(null)}
        title="Edit Scenario"
        formTitle={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        questions={questions}
        setQuestions={setQuestions}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        onGenerateQuestions={() => generateQuestions(title, description)}
        generatingQuestions={generatingQuestions}
        isCreate={false}
      />
    </Stack>
  );
}

/**
 * Scenario Card Component
 * @param {{ scenario: any, isOwner: boolean, onSelect?: () => void, onEdit?: () => void, onDelete?: () => void, onCopy?: () => void, copying?: boolean }} props
 */
function ScenarioCard({ scenario, isOwner, onSelect, onEdit, onDelete, onCopy, copying }) {
  return (
    <Card
      withBorder
      shadow="xs"
      padding="lg"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={isOwner ? onSelect : undefined}
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
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <IconMessageCircle
              size={20}
              color={isOwner ? "var(--mantine-color-pink-5)" : "var(--mantine-color-cyan-5)"}
            />
            <Text fw={600} truncate>
              {scenario.title}
            </Text>
          </Group>
          {scenario.isPublic && (
            <Badge variant="light" color="cyan" size="xs" leftSection={<IconWorld size={10} />}>
              Public
            </Badge>
          )}
        </Group>
        
        {scenario.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {scenario.description}
          </Text>
        )}

        <Group gap="xs" mt="xs">
          {isOwner ? (
            <>
              <Button
                size="xs"
                variant="light"
                color="pink"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.();
                }}
                style={{ flex: 1 }}
              >
                Open
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
              color="cyan"
              leftSection={<IconCopy size={14} />}
              onClick={(e) => { e.stopPropagation(); onCopy?.(); }}
              loading={copying}
              fullWidth
            >
              Copy to My Scenarios
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

/**
 * Scenario Modal Component
 * @param {{ opened: boolean, onClose: () => void, title: string, formTitle: string, setTitle: (v: string) => void, description: string, setDescription: (v: string) => void, questions: string[], setQuestions: (v: string[]) => void, isPublic: boolean, setIsPublic: (v: boolean) => void, onSubmit: () => void, submitLabel: string, onGenerateQuestions: () => void, generatingQuestions: boolean, isCreate: boolean }} props
 */
function ScenarioModal({
  opened,
  onClose,
  title,
  formTitle,
  setTitle,
  description,
  setDescription,
  questions,
  setQuestions,
  isPublic,
  setIsPublic,
  onSubmit,
  submitLabel,
  onGenerateQuestions,
  generatingQuestions,
  isCreate,
}) {
  const [newQuestion, setNewQuestion] = useState("");

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  const removeQuestion = (/** @type {number} */ index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (/** @type {number} */ index, /** @type {string} */ value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="lg">
      <Stack gap="md">
        <TextInput
          label="Scenario Title"
          placeholder="e.g., At a Restaurant, Shopping for Clothes"
          value={formTitle}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Description (Optional)"
          placeholder="Describe the situation or any specific context..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={2}
        />
        
        {/* Questions section */}
        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={500} size="sm">Conversation Questions</Text>
            <Button
              size="xs"
              variant="light"
              color="pink"
              leftSection={<IconSparkles size={14} />}
              onClick={onGenerateQuestions}
              loading={generatingQuestions}
              disabled={!formTitle.trim()}
            >
              {questions.length > 0 ? "Regenerate" : "Generate with AI"}
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mb="sm">
            The AI will try to get answers to these questions during the conversation, transitioning naturally between topics.
          </Text>
          
          {questions.length > 0 ? (
            <Stack gap="xs">
              {questions.map((q, i) => (
                <Group key={i} gap="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed" w={20}>{i + 1}.</Text>
                  <TextInput
                    value={q}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    size="xs"
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() => removeQuestion(i)}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Paper withBorder p="md" ta="center">
              <Text size="sm" c="dimmed">
                {isCreate 
                  ? "Enter a title and click 'Generate with AI' to create questions"
                  : "No questions yet. Add some or generate with AI."}
              </Text>
            </Paper>
          )}
          
          {/* Add new question manually */}
          <Group gap="xs" mt="sm">
            <TextInput
              placeholder="Add a question manually..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuestion()}
              size="xs"
              style={{ flex: 1 }}
            />
            <Button size="xs" variant="light" onClick={addQuestion} disabled={!newQuestion.trim()}>
              Add
            </Button>
          </Group>
        </Box>
        
        <Divider />
        
        <Text size="xs" c="dimmed">
          You'll choose the language when you start a conversation.
        </Text>
        <Switch
          label="Share this scenario publicly"
          description="Others can copy and use this scenario template"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.currentTarget.checked)}
          color="cyan"
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!formTitle.trim()}
            variant="filled"
            color="pink"
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

