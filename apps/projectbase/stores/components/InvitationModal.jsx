/**
 * InvitationModal - Display invitation message with copy/share functionality
 */

import React, { useState } from "react";
import {
  Modal,
  Stack,
  Text,
  Button,
  Paper,
  Code,
  Group,
} from "@mantine/core";
import { IconCopy, IconShare, IconCheck } from "@tabler/icons-react";

export function InvitationModal({ opened, onClose, projectName, inviterName, inviteeEmail }) {
  const [copied, setCopied] = useState(false);

  const invitationUrl = window.location.origin;
  
  const invitationMessage = `Hi,

${inviterName} has invited you to collaborate on the project "${projectName}" in Projectbase.

To accept this invitation, please sign up at:
${invitationUrl}

Once you're signed in, you'll have access to the project!

Best regards,
Projectbase`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invitationMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      alert("Failed to copy to clipboard. Please copy manually.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invitation to join "${projectName}"`,
          text: invitationMessage,
          url: invitationUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  // Detect if mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Invite ${inviteeEmail} to ${projectName}`}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Copy the invitation message below and send it to {inviteeEmail}:
        </Text>

        <Paper p="md" withBorder style={{ backgroundColor: "#f8f9fa" }}>
          <Text size="sm" style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {invitationMessage}
          </Text>
        </Paper>

        <Group justify="space-between">
          {isMobile ? (
            <Button
              fullWidth
              leftSection={<IconShare size={16} />}
              onClick={handleShare}
            >
              Share Invitation
            </Button>
          ) : (
            <Button
              fullWidth
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              onClick={handleCopy}
              color={copied ? "green" : "blue"}
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          )}
        </Group>

        <Text size="xs" c="dimmed" ta="center">
          The invitee will need to sign up using the email <Code>{inviteeEmail}</Code> to access the project.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

