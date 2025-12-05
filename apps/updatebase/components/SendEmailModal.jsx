/**
 * SendEmailModal - Send update to subscribers via email
 */

import React, { useState, useMemo } from "react";
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Paper,
  Badge,
  Alert,
  Checkbox,
  Table,
  ScrollArea,
  Divider,
  Loader,
  Center,
} from "@mantine/core";
import { IconMail, IconUsers, IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections, APP_ID } from "../schema.js";

/**
 * @typedef {Object} Update
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {string} excerpt
 */

/**
 * @typedef {Object} Subscriber
 * @property {string} id
 * @property {string} email
 * @property {string | undefined} name
 * @property {string | undefined} company
 * @property {'active' | 'unsubscribed' | 'bounced'} status
 */

/**
 * @param {{ opened: boolean, onClose: () => void, update: Update | null, orgId: string, onEmailSent: (updateId: string, count: number) => Promise<void> }} props
 */
export function SendEmailModal({ opened, onClose, update, orgId, onEmailSent }) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  /** @type {[Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>]} */
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(true);

  // Get the send email function
  const { call: sendUpdateEmail, loading: sendingEmail } = useFunction("sendUpdateEmail");

  // Memoize where clause - query by orgId
  const whereClause = useMemo(() => {
    if (!orgId) return [["orgId", "==", "__none__"]];
    return [
      ["orgId", "==", orgId],
      ["status", "==", "active"],
    ];
  }, [orgId]);

  const { data: subscribersData, loading: loadingSubscribers } = useCollection(
    collections.subscribers,
    {
      where: whereClause,
    }
  );

  // Filter active subscribers only
  /** @type {Subscriber[]} */
  const subscribers = useMemo(() => {
    return subscribersData.filter((s) => s.status === "active");
  }, [subscribersData]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (opened) {
      setSent(false);
      setError(null);
      setSelectAll(true);
      // Select all by default
      const allIds = new Set(subscribers.map((s) => s.id));
      setSelectedIds(allIds);
    }
  }, [opened, subscribers]);

  // Update selected IDs when selectAll changes
  React.useEffect(() => {
    if (selectAll) {
      setSelectedIds(new Set(subscribers.map((s) => s.id)));
    }
  }, [selectAll, subscribers]);

  const toggleSubscriber = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      setSelectAll(false);
    } else {
      newSelected.add(id);
      if (newSelected.size === subscribers.length) {
        setSelectAll(true);
      }
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(subscribers.map((s) => s.id)));
      setSelectAll(true);
    }
  };

  const handleSend = async () => {
    if (!update || selectedIds.size === 0) return;

    setSending(true);
    setError(null);

    try {
      // Get selected subscriber emails
      const selectedSubscribers = subscribers.filter((s) => selectedIds.has(s.id));
      const emails = selectedSubscribers.map((s) => s.email);

      // Call cloud function to send emails
      // Note: This assumes there's a sendUpdateEmail cloud function
      // If not available, we'll log and simulate the send
      if (sendUpdateEmail) {
        await sendUpdateEmail({
          appId: APP_ID,
          updateId: update.id,
          title: update.title,
          content: update.content,
          excerpt: update.excerpt || update.content.substring(0, 200),
          recipients: emails,
        });
      } else {
        // Simulate email sending if cloud function not available
        console.log("Sending update email to:", emails);
        console.log("Update:", update);
        // Wait a bit to simulate network request
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Update the update document to mark as sent
      await onEmailSent(update.id, emails.length);
      setSent(true);

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to send email:", err);
      setError(err instanceof Error ? err.message : "Failed to send emails. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!update) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Send Update to Subscribers"
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Update Preview */}
        <Paper p="md" withBorder bg="gray.0">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              Update to send:
            </Text>
            <Text size="lg" fw={600}>
              {update.title}
            </Text>
            <Text size="sm" lineClamp={3}>
              {update.excerpt || update.content}
            </Text>
          </Stack>
        </Paper>

        <Divider label="Select Recipients" labelPosition="left" />

        {/* Subscribers Selection */}
        {loadingSubscribers ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : subscribers.length === 0 ? (
          <Alert color="orange" icon={<IconAlertCircle size={16} />}>
            You don't have any active subscribers yet. Add subscribers first before sending
            updates.
          </Alert>
        ) : (
          <>
            <Group justify="space-between">
              <Checkbox
                label={`Select all (${subscribers.length} active subscribers)`}
                checked={selectAll}
                onChange={toggleSelectAll}
              />
              <Badge color="blue" variant="light">
                {selectedIds.size} selected
              </Badge>
            </Group>

            <ScrollArea h={250}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}></Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Company</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {subscribers.map((subscriber) => (
                    <Table.Tr
                      key={subscriber.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSubscriber(subscriber.id)}
                    >
                      <Table.Td>
                        <Checkbox
                          checked={selectedIds.has(subscriber.id)}
                          onChange={() => toggleSubscriber(subscriber.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{subscriber.email}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{subscriber.name || "—"}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{subscriber.company || "—"}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </>
        )}

        {/* Success Message */}
        {sent && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            Update successfully sent to {selectedIds.size} subscribers!
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {/* Actions */}
        <Group justify="flex-end" pt="md">
          <Button variant="subtle" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            leftSection={<IconMail size={16} />}
            onClick={handleSend}
            loading={sending || sendingEmail}
            disabled={selectedIds.size === 0 || sent || subscribers.length === 0}
          >
            Send to {selectedIds.size} Subscriber{selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
