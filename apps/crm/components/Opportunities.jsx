/**
 * Opportunities - Sales pipeline with drag-and-drop stages
 */

import React, { useState } from "react";
import {
  Stack,
  Group,
  Button,
  Title,
  Text,
  Paper,
  Badge,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  SimpleGrid,
  Card,
  ActionIcon,
  Menu,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconDots } from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

const STAGES = [
  { value: "prospecting", label: "Prospecting", color: "gray" },
  { value: "qualification", label: "Qualification", color: "blue" },
  { value: "proposal", label: "Proposal", color: "cyan" },
  { value: "negotiation", label: "Negotiation", color: "orange" },
  { value: "closed-won", label: "Closed Won", color: "teal" },
  { value: "closed-lost", label: "Closed Lost", color: "red" },
];

export function Opportunities() {
  const { user, loading: authLoading } = useAuth();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);

  // Query without orderBy to avoid needing composite index
  // We'll sort client-side instead
  const { data: opportunitiesRaw, loading, add, update, remove } = useCollection(
    collections.opportunities,
    {
      where: [["owner", "==", user?.uid || ""]],
      realtime: !!user?.uid,
    }
  );

  // Sort client-side by createdAt descending
  const opportunities = React.useMemo(() => {
    return [...(opportunitiesRaw || [])].sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime; // desc order (newest first)
    });
  }, [opportunitiesRaw]);

  const [formData, setFormData] = useState({
    name: "",
    stage: "prospecting",
    amount: 0,
    probability: 50,
    closeDate: null,
    notes: "",
  });

  const handleOpenModal = (opp = null) => {
    if (opp) {
      setEditingOpp(opp);
      setFormData({
        name: opp.name || "",
        stage: opp.stage || "prospecting",
        amount: opp.amount || 0,
        probability: opp.probability || 50,
        closeDate: opp.closeDate?.toDate ? opp.closeDate.toDate() : null,
        notes: opp.notes || "",
      });
    } else {
      setEditingOpp(null);
      setFormData({
        name: "",
        stage: "prospecting",
        amount: 0,
        probability: 50,
        closeDate: null,
        notes: "",
      });
    }
    setModalOpened(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.amount) {
      notifications.show({
        title: "Error",
        message: "Name and amount are required",
        color: "red",
      });
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        closeDate: formData.closeDate || null,
      };

      if (editingOpp) {
        await update(editingOpp.id, dataToSave);
        notifications.show({
          title: "Success",
          message: "Opportunity updated successfully",
          color: "green",
        });
      } else {
        await add({
          ...dataToSave,
          owner: user.uid,
        });
        notifications.show({
          title: "Success",
          message: "Opportunity created successfully",
          color: "green",
        });
      }
      setModalOpened(false);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  const handleDelete = async (oppId) => {
    if (confirm("Are you sure you want to delete this opportunity?")) {
      try {
        await remove(oppId);
        notifications.show({
          title: "Success",
          message: "Opportunity deleted successfully",
          color: "green",
        });
      } catch (error) {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      }
    }
  };

  const handleStageChange = async (opp, newStage) => {
    try {
      await update(opp.id, { stage: newStage });
      notifications.show({
        title: "Success",
        message: "Stage updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  if (authLoading || (loading && !user)) {
    return (
      <Paper p="xl" withBorder>
        <Text ta="center" c="dimmed">Loading opportunities...</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Opportunities</Title>
          <Text size="sm" c="dimmed">
            Sales pipeline overview
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Add Opportunity
        </Button>
      </Group>

      {/* Pipeline View */}
      {opportunities.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">
            No opportunities yet. Click 'Add Opportunity' to create one!
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing="md">
          {STAGES.map((stage) => {
            const stageOpps = opportunities.filter((opp) => opp.stage === stage.value);
            const stageValue = stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);

            return (
              <Paper key={stage.value} p="md" withBorder>
                <Stack gap="sm">
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Badge color={stage.color} variant="light">
                        {stage.label}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {stageOpps.length}
                      </Text>
                    </Group>
                    <Text size="sm" fw={500}>
                      ${stageValue.toLocaleString()}
                    </Text>
                  </div>

                  <Stack gap="xs">
                    {stageOpps.map((opp) => (
                      <Card key={opp.id} p="sm" withBorder shadow="sm">
                        <Stack gap="xs">
                          <Group justify="space-between" align="flex-start">
                            <Text size="sm" fw={500} style={{ flex: 1 }}>
                              {opp.name}
                            </Text>
                            <Menu position="bottom-end" withinPortal>
                              <Menu.Target>
                                <ActionIcon variant="subtle" size="sm">
                                  <IconDots size={14} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconEdit size={14} />}
                                  onClick={() => handleOpenModal(opp)}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Label>Move to Stage</Menu.Label>
                                {STAGES.filter(s => s.value !== opp.stage).map(s => (
                                  <Menu.Item
                                    key={s.value}
                                    onClick={() => handleStageChange(opp, s.value)}
                                  >
                                    {s.label}
                                  </Menu.Item>
                                ))}
                                <Menu.Divider />
                                <Menu.Item
                                  leftSection={<IconTrash size={14} />}
                                  color="red"
                                  onClick={() => handleDelete(opp.id)}
                                >
                                  Delete
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>

                          <Text size="xs" fw={700} c={stage.color}>
                            ${(opp.amount || 0).toLocaleString()}
                          </Text>

                          {opp.probability !== undefined && (
                            <Group gap={4}>
                              <Text size="xs" c="dimmed">
                                Probability:
                              </Text>
                              <Text size="xs" fw={500}>
                                {opp.probability}%
                              </Text>
                            </Group>
                          )}

                          {opp.closeDate && (
                            <Text size="xs" c="dimmed">
                              Close: {new Date(opp.closeDate.seconds * 1000).toLocaleDateString()}
                            </Text>
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingOpp ? "Edit Opportunity" : "Add New Opportunity"}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Opportunity Name"
            placeholder="Enterprise Deal - Acme Corp"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Group grow>
            <Select
              label="Stage"
              data={STAGES}
              value={formData.stage}
              onChange={(value) => setFormData({ ...formData, stage: value })}
            />
            <NumberInput
              label="Probability (%)"
              placeholder="50"
              min={0}
              max={100}
              value={formData.probability}
              onChange={(value) => setFormData({ ...formData, probability: value || 0 })}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Amount"
              placeholder="10000"
              prefix="$"
              required
              value={formData.amount}
              onChange={(value) => setFormData({ ...formData, amount: value || 0 })}
            />
            <DateInput
              label="Expected Close Date"
              placeholder="Pick date"
              value={formData.closeDate}
              onChange={(value) => setFormData({ ...formData, closeDate: value })}
            />
          </Group>

          <Textarea
            label="Notes"
            placeholder="Additional details..."
            minRows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingOpp ? "Update" : "Create"} Opportunity
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
