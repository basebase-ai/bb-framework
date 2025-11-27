/**
 * Settings Panel - Configure Gmail OAuth and phone number
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Stack,
  Paper,
  Title,
  Text,
  Button,
  TextInput,
  Switch,
  Alert,
  Group,
  Loader,
  Badge,
  Divider,
} from "@mantine/core";
import { IconBrandGmail, IconPhone, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useOAuth, OAuthScopes } from "../../../framework/hooks/useOAuth.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { collections } from "../schema.js";

export function SettingsPanel() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const configCreatedRef = useRef(false);

  // Use centralized OAuth hook
  const {
    isConnected: isGmailConnected,
    loading: oauthLoading,
    initiateOAuth,
    disconnect,
    tokens,
  } = useOAuth("google");

  // Use useDocument instead of useCollection since we know the doc ID (userId)
  const { data: userConfig, loading, set, update } = useDocument(
    collections.userConfigs,
    user?.uid
  );

  // Initialize form from existing config
  useEffect(() => {
    if (userConfig) {
      setPhoneNumber(userConfig.phoneNumber || "");
      setEnabled(userConfig.enabled !== false);
    }
  }, [userConfig]);

  const handleGmailOAuth = async () => {
    try {
      initiateOAuth({
        scopes: [
          OAuthScopes.google.gmail.readonly,
          OAuthScopes.google.gmail.modify,
        ],
        redirectUri: window.location.origin,
      });
    } catch (error) {
      console.error("OAuth initiation failed:", error);
      notifications.show({
        title: "Connection Failed",
        message: error.message || "Could not initiate Gmail connection",
        color: "red",
      });
    }
  };

  // Auto-create config when Gmail is connected
  useEffect(() => {
    if (isGmailConnected && user && !userConfig && !loading && !configCreatedRef.current) {
      // Gmail just connected but no config exists - create one
      configCreatedRef.current = true; // Mark as creating to prevent duplicates
      const createDefaultConfig = async () => {
        try {
          console.log("Creating default config for user", user.uid);
          await set({
            userId: user.uid,
            enabled: true,
            phoneNumber: "",
            lastCheckTime: new Date(0), // Start of epoch to check all messages
            checkIntervalMinutes: 60,
          });
          console.log("✅ Created default config for user");
        } catch (error) {
          console.error("❌ Failed to create default config:", error);
          configCreatedRef.current = false; // Reset on error so it can retry
        }
      };
      createDefaultConfig();
    }
  }, [isGmailConnected, user, userConfig, loading, set]);

  const handleDisconnectGmail = async () => {
    try {
      await disconnect();
      notifications.show({
        title: "Disconnected",
        message: "Gmail has been disconnected",
        color: "gray",
      });
    } catch (error) {
      console.error("Disconnect failed:", error);
      notifications.show({
        title: "Error",
        message: "Failed to disconnect Gmail",
        color: "red",
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const configData = {
        userId: user.uid,
        phoneNumber,
        enabled,
        checkIntervalMinutes: userConfig?.checkIntervalMinutes || 60,
        lastCheckTime: userConfig?.lastCheckTime || new Date(0),
      };

      // Always use set since userId is the doc ID
      await set(configData);

      notifications.show({
        title: "Settings Saved",
        message: "Your settings have been updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save settings. Please try again.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  // Don't show loading spinner - just render the UI
  // if (oauthLoading) {
  //   return (
  //     <Stack align="center" p="xl">
  //       <Loader size="lg" />
  //       <Text c="dimmed">Loading settings...</Text>
  //     </Stack>
  //   );
  // }

  return (
    <Stack gap="lg" style={{ maxWidth: 800 }}>
      <Paper shadow="sm" p="xl" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={4}>Gmail Connection</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Connect your Gmail account to monitor incoming messages
              </Text>
            </div>
            {isGmailConnected && (
              <Badge color="green" leftSection={<IconCheck size={12} />}>
                Connected
              </Badge>
            )}
          </Group>

          {!isGmailConnected && (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              You need to connect your Gmail account to use NoMail. Click the button below to
              authorize access to your emails.
            </Alert>
          )}

          <Group>
            <Button
              leftSection={<IconBrandGmail size={20} />}
              onClick={handleGmailOAuth}
              variant={isGmailConnected ? "light" : "filled"}
            >
              {isGmailConnected ? "Reconnect Gmail" : "Connect Gmail"}
            </Button>
            
            {isGmailConnected && (
              <Button
                variant="subtle"
                color="gray"
                onClick={handleDisconnectGmail}
              >
                Disconnect
              </Button>
            )}
          </Group>

          {isGmailConnected && tokens && (
            <Text size="sm" c="dimmed">
              Connected:{" "}
              {tokens.grantedAt
                ? new Date(tokens.grantedAt.toDate ? tokens.grantedAt.toDate() : tokens.grantedAt).toLocaleString()
                : "Recently"}
            </Text>
          )}
          
          {isGmailConnected && userConfig?.lastCheckTime && (
            <Text size="sm" c="dimmed">
              Last checked:{" "}
              {new Date(
                userConfig.lastCheckTime.toDate 
                  ? userConfig.lastCheckTime.toDate() 
                  : userConfig.lastCheckTime
              ).toLocaleString()}
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper shadow="sm" p="xl" withBorder>
        <Stack gap="md">
          <div>
            <Title order={4}>Phone Number</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Optional: Receive SMS notifications for important emails
            </Text>
          </div>

          <TextInput
            leftSection={<IconPhone size={16} />}
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </Stack>
      </Paper>

      <Paper shadow="sm" p="xl" withBorder>
        <Stack gap="md">
          <div>
            <Title order={4}>Monitoring</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Control whether NoMail actively monitors your inbox
            </Text>
          </div>

          <Switch
            label="Enable email monitoring"
            description="Check my inbox every hour for new important messages"
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />

          {isGmailConnected && (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              Monitoring runs automatically in the background. Important emails will be flagged
              by AI and shown in your inbox.
            </Alert>
          )}
        </Stack>
      </Paper>

      <Divider />

      <Group justify="flex-end">
        <Button onClick={handleSaveSettings} loading={saving} size="md">
          Save Settings
        </Button>
      </Group>
    </Stack>
  );
}

