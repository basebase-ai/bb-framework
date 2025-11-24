/**
 * Leads - Lead management with CRUD operations
 */

import React, { useState } from "react";
import {
  Stack,
  Group,
  Button,
  Title,
  Text,
  Paper,
  Table,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Menu,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconDots, IconPhone, IconMail } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "blue" },
  { value: "contacted", label: "Contacted", color: "cyan" },
  { value: "qualified", label: "Qualified", color: "green" },
  { value: "unqualified", label: "Unqualified", color: "gray" },
  { value: "converted", label: "Converted", color: "teal" },
];

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "cold-call", label: "Cold Call" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

export function Leads() {
  const { user, loading: authLoading } = useAuth();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Query without orderBy to avoid needing composite index
  // We'll sort client-side instead
  // Only query once user is loaded to prevent flickering
  const { data: leadsRaw, loading, add, update, remove } = useCollection(collections.leads, {
    where: [["owner", "==", user?.uid || ""]],
    realtime: !!user?.uid, // Only enable realtime once user is loaded
  });

  // Sort client-side by createdAt descending
  const leads = React.useMemo(() => {
    return [...(leadsRaw || [])].sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime; // desc order (newest first)
    });
  }, [leadsRaw]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    status: "new",
    source: "website",
    value: 0,
    notes: "",
  });

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        title: lead.title || "",
        status: lead.status || "new",
        source: lead.source || "website",
        value: lead.value || 0,
        notes: lead.notes || "",
      });
    } else {
      setEditingLead(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        title: "",
        status: "new",
        source: "website",
        value: 0,
        notes: "",
      });
    }
    setModalOpened(true);
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName) {
      notifications.show({
        title: "Error",
        message: "First name and last name are required",
        color: "red",
      });
      return;
    }

    try {
      if (editingLead) {
        await update(editingLead.id, formData);
        notifications.show({
          title: "Success",
          message: "Lead updated successfully",
          color: "green",
        });
      } else {
        await add({
          ...formData,
          owner: user.uid,
        });
        notifications.show({
          title: "Success",
          message: "Lead created successfully",
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

  const handleDelete = async (leadId) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      try {
        await remove(leadId);
        notifications.show({
          title: "Success",
          message: "Lead deleted successfully",
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

  const filteredLeads = filterStatus === "all"
    ? leads
    : leads.filter(lead => lead.status === filterStatus);

  const getStatusBadge = (status) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge color={statusConfig?.color || "gray"} variant="light">
        {statusConfig?.label || status}
      </Badge>
    );
  };

  // Show loading state only during initial auth or data loading
  if (authLoading || (loading && !user)) {
    return (
      <Paper p="xl" withBorder>
        <Text ta="center" c="dimmed">Loading leads...</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Leads</Title>
          <Text size="sm" c="dimmed">
            Manage your sales leads
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Add Lead
        </Button>
      </Group>

      {/* Filter by status */}
      <Group gap="xs">
        <Button
          variant={filterStatus === "all" ? "filled" : "light"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          All ({leads.length})
        </Button>
        {STATUS_OPTIONS.map(status => {
          const count = leads.filter(l => l.status === status.value).length;
          return (
            <Button
              key={status.value}
              variant={filterStatus === status.value ? "filled" : "light"}
              size="sm"
              color={status.color}
              onClick={() => setFilterStatus(status.value)}
            >
              {status.label} ({count})
            </Button>
          );
        })}
      </Group>

      {/* Leads Table */}
      {filteredLeads.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">
            {filterStatus === "all"
              ? "No leads yet. Click 'Add Lead' to create one!"
              : `No ${filterStatus} leads found.`}
          </Text>
        </Paper>
      ) : (
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Company</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Value</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredLeads.map((lead) => (
                <Table.Tr key={lead.id}>
                  <Table.Td>
                    <div>
                      <Text size="sm" fw={500}>
                        {lead.firstName} {lead.lastName}
                      </Text>
                      {lead.title && (
                        <Text size="xs" c="dimmed">
                          {lead.title}
                        </Text>
                      )}
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{lead.company || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      {lead.email && (
                        <Group gap={4}>
                          <IconMail size={14} />
                          <Text size="xs">{lead.email}</Text>
                        </Group>
                      )}
                      {lead.phone && (
                        <Group gap={4}>
                          <IconPhone size={14} />
                          <Text size="xs">{lead.phone}</Text>
                        </Group>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>{getStatusBadge(lead.status)}</Table.Td>
                  <Table.Td>
                    <Text size="sm" tt="capitalize">
                      {lead.source || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      ${(lead.value || 0).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={16} />}
                          onClick={() => handleOpenModal(lead)}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={16} />}
                          color="red"
                          onClick={() => handleDelete(lead.id)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingLead ? "Edit Lead" : "Add New Lead"}
        size="lg"
      >
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="John"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <TextInput
              label="Last Name"
              placeholder="Doe"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Email"
              placeholder="john@example.com"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextInput
              label="Phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Company"
              placeholder="Acme Corp"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
            <TextInput
              label="Title"
              placeholder="CEO"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </Group>

          <Group grow>
            <Select
              label="Status"
              data={STATUS_OPTIONS}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
            <Select
              label="Source"
              data={SOURCE_OPTIONS}
              value={formData.source}
              onChange={(value) => setFormData({ ...formData, source: value })}
            />
          </Group>

          <NumberInput
            label="Estimated Value"
            placeholder="10000"
            prefix="$"
            value={formData.value}
            onChange={(value) => setFormData({ ...formData, value: value || 0 })}
          />

          <Textarea
            label="Notes"
            placeholder="Additional information..."
            minRows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingLead ? "Update" : "Create"} Lead
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
