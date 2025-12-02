/**
 * Accounts - Company/organization management
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
import { IconPlus, IconEdit, IconTrash, IconDots, IconBuildingSkyscraper, IconWorld } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} AccountsProps
 * @property {string | null} orgId - Organization ID to scope data
 */

/**
 * @param {AccountsProps} props
 */
export function Accounts({ orgId }) {
  const { user, loading: authLoading } = useAuth();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Query by organization ID
  const { data: accountsRaw, loading, add, update, remove } = useCollection(collections.accounts, {
    where: [["orgId", "==", orgId || ""]],
    realtime: !!orgId,
  });

  // Sort client-side by createdAt descending
  const accounts = React.useMemo(() => {
    return [...(accountsRaw || [])].sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime; // desc order (newest first)
    });
  }, [accountsRaw]);

  const [formData, setFormData] = useState({
    name: "",
    website: "",
    industry: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    notes: "",
  });

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name || "",
        website: account.website || "",
        industry: account.industry || "",
        phone: account.phone || "",
        address: account.address || "",
        city: account.city || "",
        state: account.state || "",
        country: account.country || "",
        zipCode: account.zipCode || "",
        notes: account.notes || "",
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: "",
        website: "",
        industry: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        notes: "",
      });
    }
    setModalOpened(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      notifications.show({
        title: "Error",
        message: "Company name is required",
        color: "red",
      });
      return;
    }

    try {
      if (editingAccount) {
        await update(editingAccount.id, formData);
        notifications.show({
          title: "Success",
          message: "Account updated successfully",
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
          message: "Account created successfully",
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

  const handleDelete = async (accountId) => {
    if (confirm("Are you sure you want to delete this account?")) {
      try {
        await remove(accountId);
        notifications.show({
          title: "Success",
          message: "Account deleted successfully",
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
        <Text ta="center" c="dimmed">Loading accounts...</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Accounts</Title>
          <Text size="sm" c="dimmed">
            Manage company and organization records
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Add Account
        </Button>
      </Group>

      {/* Accounts Table */}
      {accounts.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">
            No accounts yet. Click 'Add Account' to create one!
          </Text>
        </Paper>
      ) : (
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Company</Table.Th>
                <Table.Th>Industry</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Website</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {accounts.map((account) => (
                <Table.Tr key={account.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar color="indigo" radius="sm">
                        <IconBuildingSkyscraper size={20} />
                      </Avatar>
                      <Text size="sm" fw={500}>
                        {account.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{account.industry || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {account.city && account.state
                        ? `${account.city}, ${account.state}`
                        : account.city || account.state || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{account.phone || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    {account.website ? (
                      <Group gap={4}>
                        <IconWorld size={14} />
                        <Text
                          size="sm"
                          component="a"
                          href={account.website.startsWith("http") ? account.website : `https://${account.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          c="blue"
                          style={{ textDecoration: "none" }}
                        >
                          {account.website}
                        </Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
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
                          onClick={() => handleOpenModal(account)}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={16} />}
                          color="red"
                          onClick={() => handleDelete(account.id)}
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
        title={editingAccount ? "Edit Account" : "Add New Account"}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Company Name"
            placeholder="Acme Corporation"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Group grow>
            <TextInput
              label="Industry"
              placeholder="Technology"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />
            <TextInput
              label="Website"
              placeholder="acme.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </Group>

          <TextInput
            label="Phone"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <TextInput
            label="Address"
            placeholder="123 Main Street"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Group grow>
            <TextInput
              label="City"
              placeholder="San Francisco"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <TextInput
              label="State"
              placeholder="CA"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Zip Code"
              placeholder="94102"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            />
            <TextInput
              label="Country"
              placeholder="USA"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
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
              {editingAccount ? "Update" : "Create"} Account
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
