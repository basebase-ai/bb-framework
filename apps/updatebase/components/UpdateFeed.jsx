/**
 * UpdateFeed - Main microblog feed component for an organization
 */

import React, { useState, useMemo } from "react";
import {
  Stack,
  Group,
  Button,
  Text,
  SegmentedControl,
  Loader,
  Center,
  Paper,
  Alert,
} from "@mantine/core";
import { IconPlus, IconRefresh, IconInfoCircle } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections, APP_ID } from "../schema.js";
import { UpdateCard } from "./UpdateCard.jsx";
import { CreateUpdateModal } from "./CreateUpdateModal.jsx";
import { SendEmailModal } from "./SendEmailModal.jsx";

/**
 * @typedef {'all' | 'published' | 'drafts'} FilterType
 */

/**
 * @param {{ orgId: string }} props
 */
export function UpdateFeed({ orgId }) {
  const { user } = useAuth();
  const [createModalOpened, setCreateModalOpened] = useState(false);
  /** @type {[import('./UpdateCard.jsx').Update | null, React.Dispatch<React.SetStateAction<import('./UpdateCard.jsx').Update | null>>]} */
  const [editingUpdate, setEditingUpdate] = useState(null);
  /** @type {[import('./UpdateCard.jsx').Update | null, React.Dispatch<React.SetStateAction<import('./UpdateCard.jsx').Update | null>>]} */
  const [emailUpdate, setEmailUpdate] = useState(null);
  /** @type {[FilterType, React.Dispatch<React.SetStateAction<FilterType>>]} */
  const [filter, setFilter] = useState("all");

  // Memoize where clause - query by orgId
  const whereClause = useMemo(() => {
    if (!orgId) return [["orgId", "==", "__none__"]];
    return [["orgId", "==", orgId]];
  }, [orgId]);

  const {
    data: updatesData,
    loading,
    add: addUpdate,
    update: updateUpdate,
    remove: removeUpdate,
  } = useCollection(collections.updates, {
    where: whereClause,
  });

  // Sort and filter updates client-side
  /** @type {import('./UpdateCard.jsx').Update[]} */
  const updates = useMemo(() => {
    let filtered = [...updatesData];

    // Apply filter
    if (filter === "published") {
      filtered = filtered.filter((u) => u.visibility !== "draft");
    } else if (filter === "drafts") {
      filtered = filtered.filter((u) => u.visibility === "draft");
    }

    // Sort by createdAt desc (newest first)
    return filtered.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [updatesData, filter]);

  const handleCreateUpdate = async (data) => {
    if (!orgId || !user) return;
    await addUpdate({
      ...data,
      orgId,
      authorId: user.uid,
      commentCount: 0,
      viewCount: 0,
      emailSent: false,
      emailSentAt: null,
      emailRecipientCount: 0,
    });
  };

  const handleEditUpdate = async (data) => {
    if (!editingUpdate) return;
    await updateUpdate(editingUpdate.id, data);
    setEditingUpdate(null);
  };

  const handleDeleteUpdate = async (id) => {
    if (!confirm("Are you sure you want to delete this update?")) return;
    await removeUpdate(id);
  };

  const handleOpenEdit = (update) => {
    setEditingUpdate(update);
  };

  const handleOpenEmailModal = (update) => {
    setEmailUpdate(update);
  };

  const handleEmailSent = async (updateId, recipientCount) => {
    await updateUpdate(updateId, {
      emailSent: true,
      emailSentAt: new Date(),
      emailRecipientCount: recipientCount,
    });
    setEmailUpdate(null);
  };

  if (!orgId) {
    return (
      <Center py="xl">
        <Loader size="md" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Text size="xl" fw={600}>
          Your Updates
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpened(true)}>
          New Update
        </Button>
      </Group>

      {/* Filter */}
      <SegmentedControl
        value={filter}
        onChange={(val) => setFilter(val)}
        data={[
          { label: "All", value: "all" },
          { label: "Published", value: "published" },
          { label: "Drafts", value: "drafts" },
        ]}
      />

      {/* Updates List */}
      {loading ? (
        <Center py="xl">
          <Loader size="md" />
        </Center>
      ) : updates.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text size="lg" fw={500}>
              {filter === "drafts"
                ? "No drafts yet"
                : filter === "published"
                ? "No published updates yet"
                : "No updates yet"}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={400}>
              {filter === "drafts"
                ? "Start drafting an update to share later."
                : "Create your first update to share your startup's progress with stakeholders."}
            </Text>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpened(true)}>
              Create Update
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="md">
          {updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              isTeamMember={true}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteUpdate}
              onSendEmail={handleOpenEmailModal}
            />
          ))}
        </Stack>
      )}

      {/* Create/Edit Modal */}
      <CreateUpdateModal
        opened={createModalOpened || !!editingUpdate}
        onClose={() => {
          setCreateModalOpened(false);
          setEditingUpdate(null);
        }}
        onSave={editingUpdate ? handleEditUpdate : handleCreateUpdate}
        update={editingUpdate}
        orgId={orgId}
      />

      {/* Send Email Modal */}
      {emailUpdate && (
        <SendEmailModal
          opened={!!emailUpdate}
          onClose={() => setEmailUpdate(null)}
          update={emailUpdate}
          orgId={orgId}
          onEmailSent={handleEmailSent}
        />
      )}
    </Stack>
  );
}
