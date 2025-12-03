import React, { useState, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  TextInput,
  Button,
  Grid,
  Card,
  Badge,
  Group,
  Stack,
  Avatar,
  Rating,
  ActionIcon,
  Tooltip,
  Box,
  Modal,
  Textarea,
  Select,
  MultiSelect,
  LoadingOverlay,
  rem,
  AppShell,
  Alert,
  Divider,
  Autocomplete,
} from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconEye,
  IconEdit,
  IconStar,
  IconSparkles,
  IconRocket,
  IconCode,
  IconUsers,
  IconUser,
  IconPhoto,
  IconAlignLeft,
  IconKey,
  IconTrash,
  IconEyeOff,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { useStorage } from "../../../framework/hooks/useStorage.js";
import { SignOutButton } from "../../../framework/components/AuthProvider.jsx";
import { showNotification } from "@mantine/notifications";
import { ProfileModal } from "./ProfileModal.jsx";
import { EditImage } from "../../../framework/components/EditImage.jsx";
import { APP_ID } from "../schema.js";

const CATEGORIES = [
  "Productivity",
  "Development",
  "Design",
  "Analytics",
  "Communication",
  "Education",
  "Entertainment",
  "Finance",
  "Health",
  "Utilities",
];

const DEMO_TAGS = [
  "React",
  "TypeScript",
  "Firebase",
  "AI/ML",
  "Real-time",
  "API",
  "Mobile",
  "Web",
  "Analytics",
  "Automation",
];

// Helper function to format relative time
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

function AppCard({ app, ownerProfile, onView, onEdit, onImprove, onRequest }) {
  const { user } = useAuth();
  const isOwner = user && app.owner === user.uid;
  const isCollaborator = user && app.collaborators && app.collaborators.includes(user.uid);
  const canImprove = app.publicEdit === true || isCollaborator;

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderColor: "rgba(147, 51, 234, 0.2)",
        transition: "all 0.3s ease",
      }}
      sx={(theme) => ({
        "&:hover": {
          borderColor: theme.colors.violet[6],
          transform: "translateY(-4px)",
          boxShadow: `0 8px 32px rgba(147, 51, 234, 0.2)`,
        },
      })}
    >
      <Card.Section
        withBorder
        inheritPadding
        py="sm"
        style={{
          background: "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)",
        }}
      >
        <Group position="apart" align="flex-start" wrap="nowrap">
          <Group spacing="sm" style={{ flex: 1, minWidth: 0 }}>
            <Avatar
              src={app.logoURL}
              alt={app.name}
              radius="md"
              size="lg"
              color="violet"
              variant="gradient"
              gradient={{ from: "violet", to: "grape", deg: 135 }}
              style={{ flexShrink: 0 }}
            >
              {app.name?.charAt(0)?.toUpperCase() || "A"}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text weight={600} size="lg" style={{ wordBreak: "break-word", lineHeight: 1.2 }}>
                {app.name || "Untitled App"}
              </Text>
              <Text size="xs" color="dimmed" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                by {ownerProfile?.displayName || "Unknown"}
              </Text>
            </div>
          </Group>
          {app.category && (
            <Badge color="violet" variant="light" size="sm" style={{ flexShrink: 0 }}>
              {app.category}
            </Badge>
          )}
        </Group>
      </Card.Section>

      <Stack spacing="xs" mt="md" style={{ flex: 1 }}>
        <Text size="sm" color="dimmed" lineClamp={3}>
          {app.description || "No description provided"}
        </Text>

        {app.tags && app.tags.length > 0 && (
          <Group spacing={4} mt="xs">
            {app.tags.slice(0, 3).map((tag, idx) => (
              <Badge
                key={idx}
                size="xs"
                variant="dot"
                color="violet"
                style={{ textTransform: "none" }}
              >
                {tag}
              </Badge>
            ))}
            {app.tags.length > 3 && (
              <Badge size="xs" variant="outline" color="gray">
                +{app.tags.length - 3}
              </Badge>
            )}
          </Group>
        )}

        {(app.rating || app.ratingCount) && (
          <Group spacing="xs" mt="auto" pt="md">
            <Rating value={app.rating || 0} fractions={2} readOnly size="sm" />
            <Text size="xs" color="dimmed">
              ({app.ratingCount || 0})
            </Text>
          </Group>
        )}
      </Stack>

      {/* Owner */}
      <Group spacing={6} mt="md" pt="sm" style={{ borderTop: "1px solid rgba(147, 51, 234, 0.1)" }}>
        <Avatar
          src={ownerProfile?.photoURL || null}
          alt={ownerProfile?.displayName || "Owner"}
          size="sm"
          radius="xl"
          color="violet"
        >
          {(ownerProfile?.displayName || "Unknown User").charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" color="dimmed">
            {ownerProfile?.displayName || "Unknown User"}
          </Text>
          {app.updatedAt && (
            <Text size="xs" color="dimmed" style={{ opacity: 0.7 }}>
              {formatRelativeTime(app.updatedAt)}
            </Text>
          )}
        </div>
      </Group>

      <Group spacing="xs" mt="md" grow>
        <Button
          variant="filled"
          color="violet"
          leftSection={<IconEye size={16} />}
          onClick={() => onView(app)}
          size="sm"
        >
          View
        </Button>
        {isOwner ? (
          <Button
            variant="light"
            color="violet"
            leftSection={<IconEdit size={16} />}
            onClick={() => onEdit(app)}
            size="sm"
          >
            Edit
          </Button>
        ) : canImprove ? (
          <Button
            variant="light"
            color="violet"
            leftSection={<IconCode size={16} />}
            onClick={() => onImprove(app)}
            size="sm"
          >
            Improve
          </Button>
        ) : (
          <Button
            variant="light"
            color="violet"
            leftSection={<IconUsers size={16} />}
            onClick={() => onRequest(app)}
            size="sm"
          >
            Request
          </Button>
        )}
      </Group>
    </Card>
  );
}

function CreateAppModal({ opened, onClose }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group spacing="xs">
          <IconRocket size={24} color="var(--mantine-color-violet-6)" />
          <Text weight={600} size="lg">
            Create Your Own App!
          </Text>
        </Group>
      }
      size="lg"
    >
      <Stack spacing="xl">
        <Stack spacing="md">
          <Text size="md" color="dimmed">
            Creating a Basebase app is straightforward with the right tools. Here's what you need:
          </Text>

          <Stack spacing="sm">
            <Group spacing="xs">
              <Text size="lg">🎨</Text>
              <Text size="sm" weight={500}>
                Install your favorite coding assistant (Cursor, Antigravity, Claude Code, etc.)
              </Text>
            </Group>
          </Stack>

          <Divider label="Then in the terminal, run the following commands" labelPosition="center" />

          <div>
            <Text size="sm" weight={600} mb="xs">1. Clone the repository</Text>
            <code style={{
              display: "block",
              padding: "12px",
              background: "rgba(147, 51, 234, 0.1)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--mantine-color-violet-6)",
            }}>
              git clone https://github.com/basebase-ai/bb-framework.git
            </code>
          </div>

          <div>
            <Text size="sm" weight={600} mb="xs">2. Install dependencies</Text>
            <code style={{
              display: "block",
              padding: "12px",
              background: "rgba(147, 51, 234, 0.1)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--mantine-color-violet-6)",
            }}>
              cd bb-framework && npm install
            </code>
          </div>

          <div>
            <Text size="sm" weight={600} mb="xs">3. Create your app</Text>
            <code style={{
              display: "block",
              padding: "12px",
              background: "rgba(147, 51, 234, 0.1)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--mantine-color-violet-6)",
            }}>
              npm run app:init
            </code>
          </div>
            
          <div>
            <Text size="sm" weight={600} mb="xs">4. Start Prompting!</Text>
            </div>
        </Stack>

        <Group position="right" mt="md">
          <Button
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
            onClick={onClose}
            size="md"
          >
            Got it, let's build!
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ViewAppModal({ app, opened, onClose }) {
  if (!app) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group spacing="sm">
          <Avatar
            src={app.logoURL}
            alt={app.name}
            radius="md"
            size="md"
            color="violet"
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
          >
            {app.name?.charAt(0)?.toUpperCase() || "A"}
          </Avatar>
          <div>
            <Text weight={600} size="lg">
              {app.name}
            </Text>
            <Text size="xs" color="dimmed">
              by {app.ownerName || "Unknown"}
            </Text>
          </div>
        </Group>
      }
      size="lg"
    >
      <Stack spacing="md">
        {app.category && (
          <Group>
            <Text size="sm" weight={500} color="dimmed">
              Category:
            </Text>
            <Badge color="violet" variant="light">
              {app.category}
            </Badge>
          </Group>
        )}

        <div>
          <Text size="sm" weight={500} mb="xs">
            Description
          </Text>
          <Text size="sm" color="dimmed">
            {app.description || "No description provided"}
          </Text>
        </div>

        {app.tags && app.tags.length > 0 && (
          <div>
            <Text size="sm" weight={500} mb="xs">
              Tags
            </Text>
            <Group spacing={6}>
              {app.tags.map((tag, idx) => (
                <Badge key={idx} size="sm" variant="dot" color="violet">
                  {tag}
                </Badge>
              ))}
            </Group>
          </div>
        )}

        {(app.rating || app.ratingCount) && (
          <div>
            <Text size="sm" weight={500} mb="xs">
              Rating
            </Text>
            <Group spacing="xs">
              <Rating value={app.rating || 0} fractions={2} readOnly />
              <Text size="sm" color="dimmed">
                ({app.ratingCount || 0} reviews)
              </Text>
            </Group>
          </div>
        )}

        <div>
          <Text size="sm" weight={500} mb="xs">
            Created
          </Text>
          <Text size="sm" color="dimmed">
            {app.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
          </Text>
        </div>
      </Stack>
    </Modal>
  );
}

function EditAppModal({ app, opened, onClose, onUpdate, onDelete }) {
  const { user } = useAuth();
  const { upload, uploading, progress } = useStorage(APP_ID);
  
  // Fetch all users for autocomplete (same pattern as todo-app)
  const { data: allUsers = [] } = useCollection("users");
  
  // Fetch app secrets (only owner can access)
  const { 
    data: secretsDoc, 
    loading: secretsLoading, 
    exists: secretsExist,
    set: setSecrets,
    update: updateSecrets,
  } = useDocument("app-secrets", app?.id);

  const [formData, setFormData] = useState({
    name: app?.name || "",
    description: app?.description || "",
    logoURL: app?.logoURL || "",
    accessMode: app?.accessMode || "open",
    publicUse: app?.publicUse ?? true,
    publicEdit: app?.publicEdit ?? false,
    collaborators: app?.collaborators || [],
  });

  // Local state for secrets management
  const [secrets, setLocalSecrets] = useState([]);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [secretsModified, setSecretsModified] = useState(false);
  const [savingSecrets, setSavingSecrets] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collaboratorSearch, setCollaboratorSearch] = useState("");

  const isOwner = user && app?.owner === user.uid;

  // Get profiles for current collaborators (for displaying with avatars)
  const { profiles: collaboratorProfiles } = useUserProfiles(formData.collaborators);

  // Build autocomplete data for user search (same pattern as todo-app ProjectSettings)
  const userAutocompleteData = useMemo(() => {
    if (!allUsers) return [];
    
    const excludeIds = new Set([app?.owner, ...(formData.collaborators || [])]);
    const seenEmails = new Set();
    
    return allUsers
      .filter((u) => !excludeIds.has(u.id))
      .filter((u) => {
        if (!u.email || seenEmails.has(u.email)) return false;
        seenEmails.add(u.email);
        return true;
      })
      .map((u) => ({
        value: u.email,
        label: u.displayName ? `${u.displayName} (${u.email})` : u.email,
        userId: u.id,
      }));
  }, [allUsers, app?.owner, formData.collaborators]);

  const handleAddCollaborator = (selectedValue) => {
    const selectedUser = userAutocompleteData.find(u => u.value === selectedValue);
    if (selectedUser && !formData.collaborators.includes(selectedUser.userId)) {
      const newCollaborators = [...formData.collaborators, selectedUser.userId];
      setFormData({
        ...formData,
        collaborators: newCollaborators,
      });
      // Auto-save collaborators silently (don't close modal)
      onUpdate(app.id, { collaborators: newCollaborators }, { silent: true });
    }
    // Clear on next tick to override Autocomplete's default behavior
    setTimeout(() => setCollaboratorSearch(""), 0);
  };

  const handleRemoveCollaborator = (userId) => {
    const newCollaborators = formData.collaborators.filter(id => id !== userId);
    setFormData({
      ...formData,
      collaborators: newCollaborators,
    });
    // Auto-save collaborators silently (don't close modal)
    onUpdate(app.id, { collaborators: newCollaborators }, { silent: true });
  };

  // Reset form state when app changes (modal opens with new app)
  React.useEffect(() => {
    if (app) {
      setFormData({
        name: app.name || "",
        description: app.description || "",
        logoURL: app.logoURL || "",
        accessMode: app.accessMode || "open",
        publicUse: app.publicUse ?? true,
        publicEdit: app.publicEdit ?? false,
        collaborators: app.collaborators || [],
      });
      // Reset other modal state
      setCollaboratorSearch("");
      setShowDeleteConfirm(false);
      setNewSecretKey("");
      setNewSecretValue("");
    }
  }, [app]);

  // Load secrets from document when it changes
  React.useEffect(() => {
    if (secretsDoc?.secrets) {
      const secretsArray = Object.entries(secretsDoc.secrets).map(
        ([key, value]) => ({ key, value })
      );
      setLocalSecrets(secretsArray);
      setSecretsModified(false);
    } else {
      setLocalSecrets([]);
      setSecretsModified(false);
    }
    setRevealedSecrets(new Set());
  }, [secretsDoc]);

  const handleLogoUpload = async (file) => {
    try {
      const path = `app-logos/${app.id}/${Date.now()}_${file.name}`;
      const result = await upload(file, path);
      setFormData({ ...formData, logoURL: result.url });
      onUpdate(app.id, { logoURL: result.url });
    } catch (err) {
      console.error('Error uploading logo:', err);
      showNotification({
        title: "Error",
        message: "Failed to upload logo. Please try again.",
        color: "red",
      });
    }
  };

  const handleLogoClear = async () => {
    setFormData({ ...formData, logoURL: "" });
    onUpdate(app.id, { logoURL: null });
  };

  const handleAddSecret = () => {
    const trimmedKey = newSecretKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const trimmedValue = newSecretValue.trim();
    
    if (!trimmedKey) {
      showNotification({
        title: "Error",
        message: "Secret key is required",
        color: "red",
      });
      return;
    }
    
    if (secrets.some(s => s.key === trimmedKey)) {
      showNotification({
        title: "Error",
        message: "A secret with this key already exists",
        color: "red",
      });
      return;
    }
    
    setLocalSecrets([...secrets, { key: trimmedKey, value: trimmedValue }]);
    setNewSecretKey("");
    setNewSecretValue("");
    setSecretsModified(true);
  };

  const handleRemoveSecret = (keyToRemove) => {
    setLocalSecrets(secrets.filter(s => s.key !== keyToRemove));
    setSecretsModified(true);
  };

  const handleSaveSecrets = async () => {
    setSavingSecrets(true);
    try {
      const secretsObject = {};
      for (const { key, value } of secrets) {
        secretsObject[key] = value;
      }
      
      if (secretsExist) {
        await updateSecrets({ secrets: secretsObject, appId: app.id });
      } else {
        await setSecrets({ secrets: secretsObject, appId: app.id });
      }
      
      setSecretsModified(false);
      showNotification({
        title: "Success",
        message: "Secrets saved successfully",
        color: "teal",
      });
    } catch (err) {
      console.error('Error saving secrets:', err);
      showNotification({
        title: "Error",
        message: "Failed to save secrets. Please try again.",
        color: "red",
      });
    } finally {
      setSavingSecrets(false);
    }
  };

  const toggleRevealSecret = (key) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showNotification({
        title: "Error",
        message: "App name is required",
        color: "red",
      });
      return;
    }
    onUpdate(app.id, formData);
  };

  if (!app) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group spacing="xs">
          <IconEdit size={24} color="var(--mantine-color-violet-6)" />
          <Text weight={600} size="lg">
            Edit App
          </Text>
        </Group>
      }
      size="lg"
    >
      <Stack spacing="md">
        {/* App Logo */}
        <EditImage
          value={formData.logoURL}
          onChange={handleLogoClear}
          onUpload={handleLogoUpload}
          uploading={uploading}
          progress={progress}
          size={80}
          maxSize={2 * 1024 * 1024}
        />

        <TextInput
          label="App Name"
          placeholder="My Awesome App"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Textarea
          label="Description"
          placeholder="Describe what your app does..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          minRows={3}
        />
        <Select
          label="Access Mode"
          placeholder="Select access mode"
          data={[
            { value: "open", label: "Open - Anyone can use" },
            { value: "invite-only", label: "Invite Only - Requires membership" },
          ]}
          value={formData.accessMode}
          onChange={(value) => setFormData({ ...formData, accessMode: value || "open" })}
        />
        <Group grow>
          <div>
            <Text size="sm" weight={500} mb={4}>Public Use</Text>
            <Button
              variant={formData.publicUse ? "filled" : "outline"}
              color={formData.publicUse ? "teal" : "gray"}
              onClick={() => setFormData({ ...formData, publicUse: !formData.publicUse })}
              fullWidth
              size="sm"
            >
              {formData.publicUse ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div>
            <Text size="sm" weight={500} mb={4}>Public Edit</Text>
            <Button
              variant={formData.publicEdit ? "filled" : "outline"}
              color={formData.publicEdit ? "teal" : "gray"}
              onClick={() => setFormData({ ...formData, publicEdit: !formData.publicEdit })}
              fullWidth
              size="sm"
            >
              {formData.publicEdit ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </Group>
        {/* Collaborators Section */}
        <div>
          <Text size="sm" weight={500} mb="xs">Collaborators</Text>
          
          {/* Current collaborators list */}
          {formData.collaborators.length > 0 && (
            <Stack spacing="xs" mb="sm">
              {formData.collaborators.map((userId) => {
                const profile = collaboratorProfiles.get(userId);
                return (
                  <Group key={userId} spacing="sm" style={{ 
                    padding: '6px 10px',
                    background: 'rgba(147, 51, 234, 0.05)',
                    borderRadius: '6px',
                  }}>
                    <Avatar
                      src={profile?.photoURL}
                      alt={profile?.displayName || userId}
                      size="sm"
                      radius="xl"
                      color="violet"
                    >
                      {(profile?.displayName || profile?.email || userId).charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" weight={500} truncate>
                        {profile?.displayName || profile?.email || userId}
                      </Text>
                      {profile?.email && profile?.displayName && (
                        <Text size="xs" color="dimmed" truncate>
                          {profile.email}
                        </Text>
                      )}
                    </div>
                    <ActionIcon 
                      size="sm" 
                      color="red" 
                      variant="subtle"
                      onClick={() => handleRemoveCollaborator(userId)}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                );
              })}
            </Stack>
          )}
          
          {/* Add collaborator autocomplete */}
          <Group spacing="xs" align="flex-end">
            <Autocomplete
              placeholder="Search by name or email..."
              value={collaboratorSearch}
              onChange={setCollaboratorSearch}
              onOptionSubmit={handleAddCollaborator}
              data={userAutocompleteData}
              limit={5}
              style={{ flex: 1 }}
              leftSection={<IconUserPlus size={16} />}
            />
          </Group>
          <Text size="xs" color="dimmed" mt={4}>
            Search for users to add as collaborators
          </Text>
        </div>

        {/* Secrets Management Section */}
        <Divider 
          label={
            <Group spacing="xs">
              <IconKey size={16} />
              <Text size="sm" weight={500}>App Secrets (Environment Variables)</Text>
            </Group>
          }
          labelPosition="left" 
        />
        
        <Stack spacing="xs">
          <Text size="xs" color="dimmed">
            Secrets are encrypted and only accessible by this app and its owner.
          </Text>
          
          {secretsLoading ? (
            <Text size="sm" color="dimmed">Loading secrets...</Text>
          ) : (
            <>
              {/* Existing secrets */}
              {secrets.length > 0 && (
                <Stack spacing="xs">
                  {secrets.map(({ key, value }) => (
                    <Group key={key} spacing="xs" align="center">
                      <TextInput
                        value={key}
                        readOnly
                        size="xs"
                        style={{ flex: 1, maxWidth: 180 }}
                        styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                      />
                      <TextInput
                        value={revealedSecrets.has(key) ? value : '•'.repeat(Math.min(value.length, 20))}
                        readOnly
                        size="xs"
                        style={{ flex: 2 }}
                        styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                        rightSection={
                          <ActionIcon 
                            size="xs" 
                            variant="subtle" 
                            onClick={() => toggleRevealSecret(key)}
                          >
                            {revealedSecrets.has(key) ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                          </ActionIcon>
                        }
                      />
                      <ActionIcon 
                        color="red" 
                        variant="subtle" 
                        size="sm"
                        onClick={() => handleRemoveSecret(key)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              )}
              
              {/* Add new secret */}
              <Group spacing="xs" align="flex-end">
                <TextInput
                  placeholder="SECRET_KEY"
                  value={newSecretKey}
                  onChange={(e) => setNewSecretKey(e.target.value.toUpperCase())}
                  size="xs"
                  style={{ flex: 1, maxWidth: 180 }}
                  styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                />
                <TextInput
                  placeholder="secret_value"
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                  size="xs"
                  style={{ flex: 2 }}
                  styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                />
                <ActionIcon 
                  color="violet" 
                  variant="filled" 
                  size="sm"
                  onClick={handleAddSecret}
                  disabled={!newSecretKey.trim()}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
              
              {/* Save secrets button */}
              {secretsModified && (
                <Button
                  variant="light"
                  color="violet"
                  size="xs"
                  leftSection={<IconKey size={14} />}
                  onClick={handleSaveSecrets}
                  loading={savingSecrets}
                >
                  Save Secrets
                </Button>
              )}
            </>
          )}
        </Stack>

        {/* Delete App Section (Owner Only) */}
        {isOwner && (
          <>
            <Divider mt="lg" />
            {!showDeleteConfirm ? (
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => setShowDeleteConfirm(true)}
                fullWidth
              >
                Delete App
              </Button>
            ) : (
              <Stack spacing="xs">
                <Alert color="red" variant="light">
                  <Text size="sm" weight={500}>
                    Are you sure you want to delete "{app.name}"?
                  </Text>
                  <Text size="xs" color="dimmed" mt={4}>
                    This action cannot be undone. All app data and secrets will be permanently deleted.
                  </Text>
                </Alert>
                <Group spacing="xs" grow>
                  <Button
                    variant="subtle"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="red"
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await onDelete(app.id);
                        onClose();
                      } catch (err) {
                        console.error('Error deleting app:', err);
                        showNotification({
                          title: "Error",
                          message: "Failed to delete app. Please try again.",
                          color: "red",
                        });
                      } finally {
                        setDeleting(false);
                        setShowDeleteConfirm(false);
                      }
                    }}
                    loading={deleting}
                  >
                    Yes, Delete App
                  </Button>
                </Group>
              </Stack>
            )}
          </>
        )}

        <Group position="right" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
            onClick={handleSubmit}
          >
            Update App
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ImproveAppModal({ app, opened, onClose }) {
  if (!app) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group spacing="xs">
          <IconCode size={24} color="var(--mantine-color-violet-6)" />
          <Text weight={600} size="lg">
            Improve {app.name}
          </Text>
        </Group>
      }
      size="lg"
    >
      <Stack spacing="md">
        <Text size="sm" color="dimmed">
          To improve this app, follow these steps to set up the development environment:
        </Text>

        <div>
          <Text size="sm" weight={600} mb="xs">1. Clone the repository</Text>
          <code style={{
            display: "block",
            padding: "12px",
            background: "rgba(147, 51, 234, 0.1)",
            borderRadius: "6px",
            fontSize: "13px",
            color: "var(--mantine-color-violet-6)",
          }}>
            git clone https://github.com/basebase-ai/bb-framework.git
          </code>
        </div>

        <div>
          <Text size="sm" weight={600} mb="xs">2. Install dependencies</Text>
          <code style={{
            display: "block",
            padding: "12px",
            background: "rgba(147, 51, 234, 0.1)",
            borderRadius: "6px",
            fontSize: "13px",
            color: "var(--mantine-color-violet-6)",
          }}>
            cd bb-framework && npm install
          </code>
        </div>

        <div>
          <Text size="sm" weight={600} mb="xs">3. Checkout the app</Text>
          <code style={{
            display: "block",
            padding: "12px",
            background: "rgba(147, 51, 234, 0.1)",
            borderRadius: "6px",
            fontSize: "13px",
            color: "var(--mantine-color-violet-6)",
          }}>
            npm run app:checkout {app.id}
          </code>
        </div>

        <div>
          <Text size="sm" weight={600} mb="xs">4. Start the development server</Text>
          <code style={{
            display: "block",
            padding: "12px",
            background: "rgba(147, 51, 234, 0.1)",
            borderRadius: "6px",
            fontSize: "13px",
            color: "var(--mantine-color-violet-6)",
          }}>
            npm run dev
          </code>
        </div>

        <Text size="sm" color="dimmed" mt="md">
          The app will be available at <strong>http://localhost:3000</strong>
        </Text>

        <Group position="right" mt="md">
          <Button
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
            onClick={onClose}
          >
            Got it!
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function RequestAccessModal({ app, opened, onClose }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      showNotification({
        title: "Error",
        message: "Please enter a message",
        color: "red",
      });
      return;
    }

    setSending(true);
    try {
      // TODO: Implement actual request sending (e.g., send notification to owner)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      showNotification({
        title: "Request Sent",
        message: "Your collaboration request has been sent to the app owner",
        color: "teal",
      });
      onClose();
      setMessage("");
    } catch (error) {
      showNotification({
        title: "Error",
        message: "Failed to send request",
        color: "red",
      });
    } finally {
      setSending(false);
    }
  };

  if (!app) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group spacing="xs">
          <IconUsers size={24} color="var(--mantine-color-violet-6)" />
          <Text weight={600} size="lg">
            Request Access to {app.name}
          </Text>
        </Group>
      }
      size="lg"
    >
      <Stack spacing="md">
        <Text size="sm" color="dimmed">
          Send a message to the app owner requesting to be added as a collaborator.
        </Text>

        <Textarea
          label="Your Message"
          placeholder="Hi, I'd like to contribute to this app because..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={4}
          required
        />

        <Text size="xs" color="dimmed">
          Your request will be sent to: {app.displayName || "the app owner"}
        </Text>

        <Group position="right" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
            onClick={handleSubmit}
            loading={sending}
          >
            Send Request
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ProfileModal is now imported from ./ProfileModal.jsx - see import at top of file

export default function AppPlayground() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  
  const { data: allApps = [], loading, add: addItem, update: updateItem, remove: removeItem, error } = useCollection("apps");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyApps, setShowMyApps] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [improveModalOpened, setImproveModalOpened] = useState(false);
  const [requestModalOpened, setRequestModalOpened] = useState(false);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // All apps where user is owner or collaborator (regardless of publicUse)
  const myApps = useMemo(() => {
    if (!user) return [];
    return allApps.filter(app => 
      app.owner === user.uid || 
      (app.collaborators && app.collaborators.includes(user.uid))
    );
  }, [allApps, user]);

  // Public apps (publicUse: true)
  const publicApps = useMemo(() => {
    return allApps.filter(app => app.publicUse === true);
  }, [allApps]);

  // Apps to display based on filter mode
  const apps = showMyApps ? myApps : publicApps;
  
  // Get all unique owner IDs and fetch their profiles
  const ownerIds = useMemo(() => {
    return [...new Set(apps.map(app => app.owner).filter(Boolean))];
  }, [apps]);
  
  const { profiles: ownerProfiles } = useUserProfiles(ownerIds);

  const filteredApps = useMemo(() => {
    if (!apps || !searchQuery.trim()) return apps || [];
    
    const query = searchQuery.toLowerCase();
    return apps.filter((app) => {
      return (
        app.name?.toLowerCase().includes(query) ||
        app.description?.toLowerCase().includes(query) ||
        app.category?.toLowerCase().includes(query) ||
        app.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [apps, searchQuery]);


  const handleUpdateApp = async (appId, data, options = {}) => {
    const { silent = false } = options;
    try {
      await updateItem(appId, {
        ...data,
        updatedAt: new Date(),
      });
      
      if (!silent) {
        setEditModalOpened(false);
        setSelectedApp(null);
        showNotification({
          title: "Success",
          message: "App updated successfully",
          color: "teal",
        });
      }
    } catch (error) {
      showNotification({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  const handleDeleteApp = async (appId) => {
    await removeItem(appId);
    setEditModalOpened(false);
    setSelectedApp(null);
    showNotification({
      title: "Success",
      message: "App deleted successfully",
      color: "teal",
    });
  };

  const handleViewApp = (app) => {
    window.open(`https://${app.id}.basebase.ai`, '_blank');
  };

  const handleEditApp = (app) => {
    setSelectedApp(app);
    setEditModalOpened(true);
  };

  const handleImproveApp = (app) => {
    setSelectedApp(app);
    setImproveModalOpened(true);
  };

  const handleRequestAccess = (app) => {
    setSelectedApp(app);
    setRequestModalOpened(true);
  };

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      style={{
        background: "linear-gradient(180deg, rgba(147, 51, 234, 0.05) 0%, rgba(0, 0, 0, 0) 50%)",
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Avatar
              src="/favicon.svg"
              alt="Basebase"
              size="md"
              radius="sm"
            />
          </Group>
          {user && (
            <Group 
              gap="xs"
              style={{ cursor: 'pointer' }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email}
                size="sm"
                radius="xl"
                color="violet"
              />
              <Text size="sm" c="dimmed">
                {profile?.displayName || user.email}
              </Text>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box
          maw={1200}
          mx="auto"
          w="100%"
          p={{ base: 0, sm: 'md' }}
          py={{ base: 0, sm: 'xl' }}
        >
          <LoadingOverlay visible={loading} />
        
        {/* Header */}
        <Stack spacing="xl" mb={rem(40)}>
          <Stack spacing="xs" align="center">
            <Title
              order={1}
              size={rem(48)}
              weight={800}
              style={{
                background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Basebase Playground
            </Title>
            <Text size="lg" color="dimmed" weight={500}>
              Discover and build amazing apps on the Basebase platform
            </Text>
          </Stack>

          {/* Search and Create */}
          <Group spacing="md">
            <TextInput
              placeholder="Search apps..."
              size="lg"
              icon={<IconSearch size={20} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
              styles={(theme) => ({
                input: {
                  borderColor: "rgba(147, 51, 234, 0.3)",
                  "&:focus": {
                    borderColor: theme.colors.violet[6],
                    boxShadow: `0 0 0 3px rgba(147, 51, 234, 0.1)`,
                  },
                },
              })}
            />
            <Button
              size="lg"
              variant="gradient"
              gradient={{ from: "violet", to: "grape", deg: 135 }}
              leftSection={<IconPlus size={20} />}
              onClick={() => setCreateModalOpened(true)}
              style={{ boxShadow: "0 8px 24px rgba(147, 51, 234, 0.3)" }}
            >
              Create App
            </Button>
          </Group>

          {/* Stats */}
          <Grid>
            <Grid.Col span={4}>
              <Card
                padding="md"
                radius="md"
                style={{
                  background: !showMyApps 
                    ? "linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(79, 70, 229, 0.15) 100%)"
                    : "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)",
                  border: !showMyApps 
                    ? "2px solid rgba(147, 51, 234, 0.5)"
                    : "1px solid rgba(147, 51, 234, 0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setShowMyApps(false)}
              >
                <Group spacing="xs">
                  <IconRocket size={24} color="var(--mantine-color-violet-6)" />
                  <div>
                    <Text size="xl" weight={700}>
                      {publicApps.length}
                    </Text>
                    <Text size="xs" color="dimmed">
                      Public Apps
                    </Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card
                padding="md"
                radius="md"
                style={{
                  background: showMyApps 
                    ? "linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(79, 70, 229, 0.15) 100%)"
                    : "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)",
                  border: showMyApps 
                    ? "2px solid rgba(147, 51, 234, 0.5)"
                    : "1px solid rgba(147, 51, 234, 0.2)",
                  cursor: user ? "pointer" : "default",
                  transition: "all 0.2s ease",
                }}
                onClick={() => user && setShowMyApps(true)}
              >
                <Group spacing="xs">
                  <IconCode size={24} color="var(--mantine-color-violet-6)" />
                  <div>
                    <Text size="xl" weight={700}>
                      {myApps.length}
                    </Text>
                    <Text size="xs" color="dimmed">
                      Your Apps
                    </Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card
                padding="md"
                radius="md"
                style={{
                  background: "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)",
                  border: "1px solid rgba(147, 51, 234, 0.2)",
                }}
              >
                <Group spacing="xs">
                  <IconUsers size={24} color="var(--mantine-color-violet-6)" />
                  <div>
                    <Text size="xl" weight={700}>
                      {new Set(publicApps.map((a) => a.owner)).size}
                    </Text>
                    <Text size="xs" color="dimmed">
                      Developers
                    </Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>

        {/* App Grid */}
        {filteredApps.length === 0 ? (
          <Card
            padding="xl"
            radius="md"
            style={{
              background: "linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%)",
              border: "1px solid rgba(147, 51, 234, 0.2)",
              textAlign: "center",
            }}
          >
            <Stack align="center" spacing="md">
              <IconRocket size={64} color="var(--mantine-color-violet-6)" opacity={0.5} />
              <div>
                <Text size="lg" weight={600} mb="xs">
                  {searchQuery 
                    ? "No apps found" 
                    : showMyApps 
                      ? "No apps yet" 
                      : "No public apps yet"}
                </Text>
                <Text size="sm" color="dimmed">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : showMyApps
                      ? "Create your first app to get started"
                      : "Be the first to publish a public app!"}
                </Text>
              </div>
              {!searchQuery && (
                <Button
                  variant="gradient"
                  gradient={{ from: "violet", to: "grape", deg: 135 }}
                  leftSection={<IconPlus size={20} />}
                  onClick={() => setCreateModalOpened(true)}
                  size="lg"
                  mt="md"
                >
                  Create App
                </Button>
              )}
            </Stack>
          </Card>
        ) : (
          <Grid gutter="lg">
            {filteredApps.map((app) => (
              <Grid.Col key={app.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                <AppCard 
                  app={app}
                  ownerProfile={ownerProfiles.get(app.owner)}
                  onView={handleViewApp} 
                  onEdit={handleEditApp}
                  onImprove={handleImproveApp}
                  onRequest={handleRequestAccess}
                />
              </Grid.Col>
            ))}
          </Grid>
        )}
        </Box>
      </AppShell.Main>

      {/* Modals */}
      <CreateAppModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
      />
      <ViewAppModal
        app={selectedApp}
        opened={viewModalOpened}
        onClose={() => {
          setViewModalOpened(false);
          setSelectedApp(null);
        }}
      />
      <EditAppModal
        app={selectedApp}
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedApp(null);
        }}
        onUpdate={handleUpdateApp}
        onDelete={handleDeleteApp}
      />
      <ImproveAppModal
        app={selectedApp}
        opened={improveModalOpened}
        onClose={() => {
          setImproveModalOpened(false);
          setSelectedApp(null);
        }}
      />
      <RequestAccessModal
        app={selectedApp}
        opened={requestModalOpened}
        onClose={() => {
          setRequestModalOpened(false);
          setSelectedApp(null);
        }}
      />
      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
    </AppShell>
  );
}

