/**
 * Email List - Display important emails that need responses
 */

import React, { useState } from "react";
import {
  Stack,
  Paper,
  Title,
  Text,
  Badge,
  Group,
  ActionIcon,
  Loader,
  Button,
  Alert,
} from "@mantine/core";
import {
  IconMail,
  IconMailOpened,
  IconArchive,
  IconAlertCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useOAuth } from "../../../framework/hooks/useOAuth.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections } from "../schema.js";
import { EmailCard } from "./EmailCard.jsx";

export function EmailList() {
  const { user } = useAuth();
  const [selectedEmailId, setSelectedEmailId] = useState(null);

  // Check if Gmail is connected using centralized OAuth
  const { isConnected: isGmailConnected } = useOAuth("google");

  // Load user config for last check time
  const { data: configs } = useCollection(collections.userConfigs, {
    where: [["userId", "==", "auth.uid"]],
  });

  const userConfig = configs?.[0] || null;

  // Load emails that need responses
  const {
    data: emails,
    loading,
    update,
    refresh,
  } = useCollection(collections.emails, {
    where: [
      ["userId", "==", "auth.uid"],
    ],
  });

  // Manual check function
  const { call: checkEmails, loading: checking } = useFunction("checkEmails");

  const handleManualCheck = async () => {
    try {
      await checkEmails({ userId: user?.uid });
      notifications.show({
        title: "Checking emails...",
        message: "Analyzing your inbox for important messages",
        color: "blue",
      });
      refresh();
    } catch (error) {
      console.error("Error checking emails:", error);
      notifications.show({
        title: "Error",
        message: "Failed to check emails. Please try again.",
        color: "red",
      });
    }
  };

  const handleMarkAsRead = async (emailId) => {
    try {
      await update(emailId, { isRead: true });
    } catch (error) {
      console.error("Error marking email as read:", error);
    }
  };

  const handleArchive = async (emailId) => {
    try {
      await update(emailId, { isArchived: true });
      notifications.show({
        message: "Email archived",
        color: "gray",
      });
    } catch (error) {
      console.error("Error archiving email:", error);
      notifications.show({
        title: "Error",
        message: "Failed to archive email",
        color: "red",
      });
    }
  };

  if (!isGmailConnected) {
    return (
      <Stack align="center" p="xl">
        <Alert
          icon={<IconAlertCircle size={20} />}
          title="Gmail Not Connected"
          color="yellow"
          style={{ maxWidth: 500 }}
        >
          Please connect your Gmail account in the Settings tab to start using NoMail.
        </Alert>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Stack align="center" p="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading your important emails...</Text>
      </Stack>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <Stack align="center" p="xl" gap="lg">
        <IconMailOpened size={64} stroke={1} color="gray" />
        <div style={{ textAlign: "center" }}>
          <Title order={3}>Inbox Zero! 🎉</Title>
          <Text c="dimmed" mt="sm">
            You have no emails that need responses right now.
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            NoMail checks your inbox every hour automatically.
          </Text>
        </div>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleManualCheck}
          loading={checking}
          variant="light"
        >
          Check Now
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={3}>Important Emails</Title>
          <Text size="sm" c="dimmed">
            {emails.length} {emails.length === 1 ? "email" : "emails"} need your attention
          </Text>
        </div>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleManualCheck}
          loading={checking}
          variant="light"
          size="sm"
        >
          Check Now
        </Button>
      </Group>

      <Stack gap="sm">
        {emails.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            onMarkAsRead={handleMarkAsRead}
            onArchive={handleArchive}
            isExpanded={selectedEmailId === email.id}
            onToggleExpand={() =>
              setSelectedEmailId(selectedEmailId === email.id ? null : email.id)
            }
          />
        ))}
      </Stack>
    </Stack>
  );
}

