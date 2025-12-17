/**
 * InviteSignerModal - Invite users to sign a document
 */

import React, { useState } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  Paper,
  Alert,
  Badge,
  ActionIcon,
  Avatar,
  ThemeIcon,
  Code,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconMail,
  IconUserPlus,
  IconX,
  IconCheck,
  IconClock,
  IconCopy,
  IconShare,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} InviteSignerModalProps
 * @property {boolean} opened
 * @property {Function} onClose
 * @property {Object} document
 */

/**
 * @param {InviteSignerModalProps} props
 */
export function InviteSignerModal({ opened, onClose, document: doc }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { update: updateDocument } = useCollection(collections.documents);

  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showInviteMessage, setShowInviteMessage] = useState(false);
  const [lastInvitedEmail, setLastInvitedEmail] = useState("");
  const [copied, setCopied] = useState(false);

  // Validate email
  const isValidEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  // Check if email is already added
  const isAlreadyInvited = (emailStr) => {
    return doc?.signers?.some(
      (s) => s.email?.toLowerCase() === emailStr.toLowerCase()
    );
  };

  // Handle add signer
  const handleAddSigner = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Please enter an email address");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (isAlreadyInvited(trimmedEmail)) {
      setError("This email has already been invited");
      return;
    }

    if (trimmedEmail === user?.email?.toLowerCase()) {
      setError("You cannot invite yourself to sign");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Add new signer to document
      const newSigner = {
        email: trimmedEmail,
        status: "pending",
        invitedAt: new Date().toISOString(),
        invitedBy: user.uid,
      };

      const updatedSigners = [...(doc.signers || []), newSigner];

      await updateDocument(doc.id, {
        signers: updatedSigners,
        status: doc.status === "draft" ? "pending" : doc.status,
      });

      setLastInvitedEmail(trimmedEmail);
      setShowInviteMessage(true);
      setEmail("");

      notifications.show({
        title: "Signer Added",
        message: `${trimmedEmail} has been invited to sign`,
        color: "green",
      });
    } catch (err) {
      console.error("Error adding signer:", err);
      setError(err.message || "Failed to add signer");
    } finally {
      setSaving(false);
    }
  };

  // Handle remove signer
  const handleRemoveSigner = async (signerEmail) => {
    try {
      const updatedSigners = doc.signers.filter(
        (s) => s.email?.toLowerCase() !== signerEmail.toLowerCase()
      );

      await updateDocument(doc.id, {
        signers: updatedSigners,
        status: updatedSigners.length === 0 ? "draft" : doc.status,
      });

      notifications.show({
        title: "Signer Removed",
        message: `${signerEmail} has been removed`,
        color: "blue",
      });
    } catch (err) {
      console.error("Error removing signer:", err);
      notifications.show({
        title: "Error",
        message: "Failed to remove signer",
        color: "red",
      });
    }
  };

  // Generate invitation message
  const invitationUrl = window.location.href;
  const invitationMessage = `Hi,

${profile?.displayName || user?.email} has invited you to sign the document "${doc?.title || doc?.name}" in SignBase.

To sign this document, please visit:
${invitationUrl}

Sign in with your email (${lastInvitedEmail}) to view and sign the document.

Best regards,
SignBase`;

  // Handle copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invitationMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sign "${doc?.title || doc?.name}"`,
          text: invitationMessage,
          url: invitationUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      handleCopy();
    }
  };

  // Handle close
  const handleClose = () => {
    setEmail("");
    setError(null);
    setShowInviteMessage(false);
    onClose();
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Invite Signers"
      size="lg"
    >
      <Stack gap="md">
        {/* Current Signers */}
        {doc?.signers && doc.signers.length > 0 && (
          <Paper p="md" withBorder>
            <Text fw={500} mb="sm">
              Current Signers
            </Text>
            <Stack gap="xs">
              {doc.signers.map((signer, index) => (
                <Group key={index} justify="space-between">
                  <Group gap="sm">
                    <Avatar size="sm" radius="xl">
                      {signer.email?.[0]?.toUpperCase()}
                    </Avatar>
                    <Text size="sm">{signer.email}</Text>
                  </Group>
                  <Group gap="xs">
                    {signer.status === "signed" ? (
                      <Badge
                        color="green"
                        leftSection={<IconCheck size={10} />}
                      >
                        Signed
                      </Badge>
                    ) : (
                      <>
                        <Badge
                          color="orange"
                          leftSection={<IconClock size={10} />}
                        >
                          Pending
                        </Badge>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="sm"
                          onClick={() => handleRemoveSigner(signer.email)}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </>
                    )}
                  </Group>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Add New Signer */}
        <Stack gap="sm">
          <Text fw={500}>Add New Signer</Text>
          <Group align="flex-end">
            <TextInput
              placeholder="email@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSigner();
                }
              }}
              leftSection={<IconMail size={16} />}
              style={{ flex: 1 }}
              disabled={saving}
              error={error}
            />
            <Button
              onClick={handleAddSigner}
              loading={saving}
              leftSection={<IconUserPlus size={16} />}
            >
              Add
            </Button>
          </Group>
        </Stack>

        {/* Invitation Message */}
        {showInviteMessage && (
          <Paper p="md" withBorder bg="blue.0">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={500} size="sm">
                  Send invitation to {lastInvitedEmail}
                </Text>
                <ActionIcon
                  variant="subtle"
                  onClick={() => setShowInviteMessage(false)}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>

              <Paper
                p="sm"
                withBorder
                style={{ backgroundColor: "#fff", maxHeight: 200, overflow: "auto" }}
              >
                <Text
                  size="xs"
                  style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                >
                  {invitationMessage}
                </Text>
              </Paper>

              <Group>
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
                    leftSection={
                      copied ? <IconCheck size={16} /> : <IconCopy size={16} />
                    }
                    onClick={handleCopy}
                    color={copied ? "green" : "blue"}
                  >
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </Button>
                )}
              </Group>

              <Text size="xs" c="dimmed" ta="center">
                The invitee must sign in with <Code>{lastInvitedEmail}</Code> to
                access this document.
              </Text>
            </Stack>
          </Paper>
        )}

        {/* Help Text */}
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          Invited signers will need to sign in with their email address to view
          and sign this document. They will be able to see the document and add
          their signature.
        </Alert>

        {/* Close Button */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

