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
} from "@tabler/icons-react";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { SignOutButton } from "../../framework/components/AuthProvider.jsx";
import { showNotification } from "@mantine/notifications";

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

function AppCard({ app, onView, onEdit, onImprove, onRequest }) {
  const { user } = useAuth();
  const { profile: ownerProfile } = useUserProfile(app.owner);
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
        <Group position="apart" align="flex-start" noWrap>
          <Group spacing="sm" style={{ flex: 1, minWidth: 0 }}>
            <Avatar
              src={app.logo}
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
          {(ownerProfile?.displayName || "?").charAt(0).toUpperCase()}
        </Avatar>
        <Text size="xs" color="dimmed" style={{ flex: 1 }}>
          {ownerProfile?.displayName || "Loading..."}
        </Text>
      </Group>

      <Group spacing="xs" mt="md" grow>
        <Button
          variant="filled"
          color="violet"
          leftIcon={<IconEye size={16} />}
          onClick={() => onView(app)}
          size="sm"
        >
          View
        </Button>
        {isOwner ? (
          <Button
            variant="light"
            color="violet"
            leftIcon={<IconEdit size={16} />}
            onClick={() => onEdit(app)}
            size="sm"
          >
            Edit
          </Button>
        ) : canImprove ? (
          <Button
            variant="light"
            color="violet"
            leftIcon={<IconCode size={16} />}
            onClick={() => onImprove(app)}
            size="sm"
          >
            Improve
          </Button>
        ) : (
          <Button
            variant="light"
            color="violet"
            leftIcon={<IconUsers size={16} />}
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
            src={app.logo}
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

function EditAppModal({ app, opened, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: app?.name || "",
    description: app?.description || "",
    accessMode: app?.accessMode || "open",
    publicUse: app?.publicUse ?? true,
    publicEdit: app?.publicEdit ?? false,
    collaborators: app?.collaborators || [],
  });

  React.useEffect(() => {
    if (app) {
      setFormData({
        name: app.name || "",
        description: app.description || "",
        accessMode: app.accessMode || "open",
        publicUse: app.publicUse ?? true,
        publicEdit: app.publicEdit ?? false,
        collaborators: app.collaborators || [],
      });
    }
  }, [app]);

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
        <Textarea
          label="Collaborators (comma-separated UIDs)"
          placeholder="uid1, uid2, uid3"
          value={formData.collaborators.join(", ")}
          onChange={(e) => setFormData({ 
            ...formData, 
            collaborators: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
          })}
          minRows={2}
        />
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

function ProfileModal({ opened, onClose }) {
  const { user } = useAuth();
  const { profile, loading, update } = useUserProfile(user?.uid);
  
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with current profile data
  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhotoURL(profile.photoURL || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await update({
        displayName: displayName.trim() || user?.email?.split('@')[0] || 'User',
        photoURL: photoURL.trim() || null,
        bio: bio.trim() || null,
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current profile data
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhotoURL(profile.photoURL || "");
      setBio(profile.bio || "");
    }
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (loading && !profile) {
    return (
      <Modal opened={opened} onClose={onClose} title="Edit Profile" size="md">
        <Text c="dimmed">Loading...</Text>
      </Modal>
    );
  }

  return (
    <Modal 
      opened={opened} 
      onClose={handleCancel} 
      title="Edit Profile" 
      size="md"
      zIndex={10000}
    >
      <Stack gap="lg">
        {/* Avatar Preview */}
        <Group justify="center">
          <Avatar 
            src={photoURL || profile?.photoURL} 
            alt={displayName || profile?.displayName}
            size={100}
            radius="xl"
          />
        </Group>

        {/* Display Name */}
        <TextInput
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          leftSection={<IconUser size={16} />}
          required
        />

        {/* Photo URL */}
        <TextInput
          label="Photo URL"
          placeholder="https://example.com/photo.jpg"
          value={photoURL}
          onChange={(e) => setPhotoURL(e.target.value)}
          leftSection={<IconPhoto size={16} />}
          description="Enter a direct link to your profile picture"
        />

        {/* Bio */}
        <Textarea
          label="Bio"
          placeholder="Tell us about yourself..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          leftSection={<IconAlignLeft size={16} />}
          minRows={3}
          maxRows={6}
          description="Optional short bio or description"
        />

        {/* Email (read-only) */}
        <TextInput
          label="Email"
          value={user?.email || ""}
          disabled
          description="Email cannot be changed here"
        />

        {/* Success Message */}
        {success && (
          <Alert color="green" title="Success">
            Profile updated successfully!
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        <Divider />

        {/* Actions */}
        <Group justify="space-between">
          <SignOutButton variant="subtle" color="red" />
          <Group>
            <Button variant="default" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function AppPlayground() {
  console.log("🎮 AppPlayground component rendering...");
  
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  console.log("👤 User:", user?.email || "not loaded");
  
  const { data: allApps = [], loading, add: addItem, update: updateItem, error } = useCollection("apps");
  
  // Filter to only show apps with publicUse: true
  const apps = useMemo(() => {
    return allApps.filter(app => app.publicUse === true);
  }, [allApps]);
  
  console.log("📦 Apps:", apps?.length || 0, "loading:", loading, "error:", error);
  console.log("📦 First app data:", apps[0]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [improveModalOpened, setImproveModalOpened] = useState(false);
  const [requestModalOpened, setRequestModalOpened] = useState(false);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

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


  const handleUpdateApp = async (appId, data) => {
    try {
      await updateItem(appId, {
        ...data,
        updatedAt: new Date(),
      });
      
      setEditModalOpened(false);
      setSelectedApp(null);
      showNotification({
        title: "Success",
        message: "App updated successfully",
        color: "teal",
      });
    } catch (error) {
      showNotification({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  const handleViewApp = (app) => {
    window.open(`https://apps.basebase.ai/?app=${app.id}`, '_blank');
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
          <IconSparkles size={32} color="var(--mantine-color-violet-6)" />
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
        <Container size="xl" py="xl">
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
              leftIcon={<IconPlus size={20} />}
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
                  background: "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)",
                  border: "1px solid rgba(147, 51, 234, 0.2)",
                }}
              >
                <Group spacing="xs">
                  <IconRocket size={24} color="var(--mantine-color-violet-6)" />
                  <div>
                    <Text size="xl" weight={700}>
                      {apps.length}
                    </Text>
                    <Text size="xs" color="dimmed">
                      Total Apps
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
                  <IconCode size={24} color="var(--mantine-color-violet-6)" />
                  <div>
                    <Text size="xl" weight={700}>
                      {apps.filter((a) => a.owner === user?.uid).length}
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
                      {new Set(apps.map((a) => a.owner)).size}
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
                  {searchQuery ? "No apps found" : "No apps yet"}
                </Text>
                <Text size="sm" color="dimmed">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first app to get started"}
                </Text>
              </div>
              {!searchQuery && (
                <Button
                  variant="gradient"
                  gradient={{ from: "violet", to: "grape", deg: 135 }}
                  leftIcon={<IconPlus size={20} />}
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
                  onView={handleViewApp} 
                  onEdit={handleEditApp}
                  onImprove={handleImproveApp}
                  onRequest={handleRequestAccess}
                />
              </Grid.Col>
            ))}
          </Grid>
        )}
        </Container>
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

