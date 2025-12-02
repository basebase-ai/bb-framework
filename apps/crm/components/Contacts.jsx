/**
 * Contacts - Contact management with CRUD operations
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
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Menu,
  Avatar,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconDots, IconPhone, IconMail } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} ContactsProps
 * @property {string | null} orgId - Organization ID to scope data
 */

/**
 * @param {ContactsProps} props
 */
export function Contacts({ orgId }) {
  const { user, loading: authLoading } = useAuth();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Query by organization ID
  const { data: contactsRaw, loading, add, update, remove } = useCollection(collections.contacts, {
    where: [["orgId", "==", orgId || ""]],
    realtime: !!orgId,
  });

  // Sort client-side by createdAt descending
  const contacts = React.useMemo(() => {
    return [...(contactsRaw || [])].sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime; // desc order (newest first)
    });
  }, [contactsRaw]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    title: "",
    notes: "",
  });

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        title: contact.title || "",
        notes: contact.notes || "",
      });
    } else {
      setEditingContact(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        mobile: "",
        title: "",
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
      if (editingContact) {
        await update(editingContact.id, formData);
        notifications.show({
          title: "Success",
          message: "Contact updated successfully",
          color: "green",
        });
      } else {
        await add({
          ...formData,
          orgId,
          owner: user.uid,
        });
        notifications.show({
          title: "Success",
          message: "Contact created successfully",
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

  const handleDelete = async (contactId) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        await remove(contactId);
        notifications.show({
          title: "Success",
          message: "Contact deleted successfully",
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

  if (authLoading || (loading && !user)) {
    return (
      <Paper p="xl" withBorder>
        <Text ta="center" c="dimmed">Loading contacts...</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Contacts</Title>
          <Text size="sm" c="dimmed">
            Manage your contact list
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Add Contact
        </Button>
      </Group>

      {/* Contacts Table */}
      {contacts.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">
            No contacts yet. Click 'Add Contact' to create one!
          </Text>
        </Paper>
      ) : (
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Mobile</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {contacts.map((contact) => (
                <Table.Tr key={contact.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar color="blue" radius="xl">
                        {contact.firstName?.[0]}{contact.lastName?.[0]}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={500}>
                          {contact.firstName} {contact.lastName}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{contact.title || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    {contact.email ? (
                      <Group gap={4}>
                        <IconMail size={14} />
                        <Text size="sm">{contact.email}</Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {contact.phone ? (
                      <Group gap={4}>
                        <IconPhone size={14} />
                        <Text size="sm">{contact.phone}</Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{contact.mobile || "-"}</Text>
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
                          onClick={() => handleOpenModal(contact)}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={16} />}
                          color="red"
                          onClick={() => handleDelete(contact.id)}
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
        title={editingContact ? "Edit Contact" : "Add New Contact"}
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

          <TextInput
            label="Title"
            placeholder="Sales Manager"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <TextInput
            label="Email"
            placeholder="john@example.com"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Group grow>
            <TextInput
              label="Phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextInput
              label="Mobile"
              placeholder="+1 (555) 111-1111"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
          </Group>

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
              {editingContact ? "Update" : "Create"} Contact
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
