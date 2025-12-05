/**
 * SubscribersManager - Manage email list of stakeholders and investors
 */

import React, { useState, useMemo } from "react";
import {
  Stack,
  Group,
  Button,
  Text,
  TextInput,
  Table,
  ActionIcon,
  Modal,
  Select,
  Textarea,
  Badge,
  Paper,
  Menu,
  Loader,
  Center,
  FileButton,
  Alert,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconDots,
  IconSearch,
  IconUpload,
  IconDownload,
  IconMail,
  IconUserPlus,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, SUBSCRIBER_STATUS_OPTIONS } from "../schema.js";

/**
 * @typedef {Object} Subscriber
 * @property {string} id
 * @property {string} owner
 * @property {string} email
 * @property {string | undefined} name
 * @property {string | undefined} company
 * @property {string | undefined} role
 * @property {string | undefined} notes
 * @property {'active' | 'unsubscribed' | 'bounced'} status
 * @property {Object | null} lastEmailedAt
 * @property {number} emailsSent
 */

/**
 * Add/Edit Subscriber Modal
 * @param {{ opened: boolean, onClose: () => void, onSave: (data: Partial<Subscriber>) => Promise<void>, subscriber: Subscriber | null }} props
 */
function SubscriberModal({ opened, onClose, onSave, subscriber }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (opened) {
      if (subscriber) {
        setEmail(subscriber.email || "");
        setName(subscriber.name || "");
        setCompany(subscriber.company || "");
        setRole(subscriber.role || "");
        setNotes(subscriber.notes || "");
        setStatus(subscriber.status || "active");
      } else {
        setEmail("");
        setName("");
        setCompany("");
        setRole("");
        setNotes("");
        setStatus("active");
      }
    }
  }, [opened, subscriber]);

  const handleSave = async () => {
    if (!email.trim()) {
      alert("Email is required.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        company: company.trim() || null,
        role: role.trim() || null,
        notes: notes.trim() || null,
        status,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save subscriber:", error);
      alert("Failed to save subscriber. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={subscriber ? "Edit Subscriber" : "Add Subscriber"}
      centered
    >
      <Stack gap="md">
        <TextInput
          label="Email"
          placeholder="investor@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <TextInput
          label="Name"
          placeholder="John Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextInput
          label="Company"
          placeholder="Venture Capital Inc."
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />

        <Select
          label="Role"
          placeholder="Select a role"
          data={[
            { value: "investor", label: "Investor" },
            { value: "advisor", label: "Advisor" },
            { value: "stakeholder", label: "Stakeholder" },
            { value: "partner", label: "Partner" },
            { value: "customer", label: "Customer" },
            { value: "other", label: "Other" },
          ]}
          value={role}
          onChange={(val) => setRole(val || "")}
          clearable
        />

        <Textarea
          label="Notes"
          placeholder="Any additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={2}
        />

        {subscriber && (
          <Select
            label="Status"
            data={SUBSCRIBER_STATUS_OPTIONS}
            value={status}
            onChange={(val) => setStatus(val || "active")}
          />
        )}

        <Group justify="flex-end" pt="md">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {subscriber ? "Save Changes" : "Add Subscriber"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * @param {{ orgId: string }} props
 */
export function SubscribersManager({ orgId }) {
  const { user } = useAuth();
  const [modalOpened, setModalOpened] = useState(false);
  /** @type {[Subscriber | null, React.Dispatch<React.SetStateAction<Subscriber | null>>]} */
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importing, setImporting] = useState(false);

  // Memoize where clause - query by orgId
  const whereClause = useMemo(() => {
    if (!orgId) return [["orgId", "==", "__none__"]];
    return [["orgId", "==", orgId]];
  }, [orgId]);

  const {
    data: subscribersData,
    loading,
    add: addSubscriber,
    update: updateSubscriber,
    remove: removeSubscriber,
  } = useCollection(collections.subscribers, {
    where: whereClause,
  });

  // Filter and sort subscribers
  /** @type {Subscriber[]} */
  const subscribers = useMemo(() => {
    let filtered = [...subscribersData];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.email?.toLowerCase().includes(query) ||
          s.name?.toLowerCase().includes(query) ||
          s.company?.toLowerCase().includes(query)
      );
    }

    // Sort by name/email
    return filtered.sort((a, b) => {
      const aName = a.name || a.email || "";
      const bName = b.name || b.email || "";
      return aName.localeCompare(bName);
    });
  }, [subscribersData, searchQuery]);

  const activeCount = subscribersData.filter((s) => s.status === "active").length;

  const handleAddSubscriber = async (data) => {
    if (!orgId) return;
    
    // Check for duplicate email
    const exists = subscribersData.some(
      (s) => s.email.toLowerCase() === data.email?.toLowerCase()
    );
    if (exists) {
      throw new Error("A subscriber with this email already exists.");
    }

    await addSubscriber({
      ...data,
      orgId,
      emailsSent: 0,
      lastEmailedAt: null,
      subscribedAt: new Date(),
      unsubscribedAt: null,
    });
  };

  const handleEditSubscriber = async (data) => {
    if (!editingSubscriber) return;
    await updateSubscriber(editingSubscriber.id, data);
    setEditingSubscriber(null);
  };

  const handleDeleteSubscriber = async (id) => {
    if (!confirm("Are you sure you want to remove this subscriber?")) return;
    await removeSubscriber(id);
  };

  const handleImportCSV = async (file) => {
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        alert("CSV file must have at least a header row and one data row.");
        return;
      }

      // Parse header
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const emailIndex = header.findIndex((h) => h === "email");
      const nameIndex = header.findIndex((h) => h === "name");
      const companyIndex = header.findIndex((h) => h === "company");
      const roleIndex = header.findIndex((h) => h === "role");

      if (emailIndex === -1) {
        alert("CSV must have an 'email' column.");
        return;
      }

      // Parse rows
      let imported = 0;
      let skipped = 0;
      const existingEmails = new Set(subscribersData.map((s) => s.email.toLowerCase()));

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const email = values[emailIndex]?.toLowerCase();

        if (!email || existingEmails.has(email)) {
          skipped++;
          continue;
        }

        await addSubscriber({
          orgId,
          email,
          name: nameIndex >= 0 ? values[nameIndex] || null : null,
          company: companyIndex >= 0 ? values[companyIndex] || null : null,
          role: roleIndex >= 0 ? values[roleIndex] || null : null,
          notes: null,
          status: "active",
          emailsSent: 0,
          lastEmailedAt: null,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        });

        existingEmails.add(email);
        imported++;
      }

      alert(`Imported ${imported} subscribers. Skipped ${skipped} duplicates or invalid entries.`);
    } catch (error) {
      console.error("Failed to import CSV:", error);
      alert("Failed to import CSV. Please check the file format.");
    } finally {
      setImporting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["email", "name", "company", "role", "status", "emails_sent"];
    const rows = subscribersData.map((s) => [
      s.email,
      s.name || "",
      s.company || "",
      s.role || "",
      s.status,
      s.emailsSent || 0,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "green";
      case "unsubscribed":
        return "gray";
      case "bounced":
        return "red";
      default:
        return "gray";
    }
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
        <div>
          <Text size="xl" fw={600}>
            Subscribers
          </Text>
          <Text size="sm" c="dimmed">
            {activeCount} active subscriber{activeCount !== 1 ? "s" : ""}
          </Text>
        </div>
        <Group gap="sm">
          <FileButton onChange={handleImportCSV} accept=".csv">
            {(props) => (
              <Button
                {...props}
                variant="outline"
                leftSection={<IconUpload size={16} />}
                loading={importing}
              >
                Import CSV
              </Button>
            )}
          </FileButton>
          <Button
            variant="outline"
            leftSection={<IconDownload size={16} />}
            onClick={handleExportCSV}
            disabled={subscribersData.length === 0}
          >
            Export
          </Button>
          <Button leftSection={<IconUserPlus size={16} />} onClick={() => setModalOpened(true)}>
            Add Subscriber
          </Button>
        </Group>
      </Group>

      {/* Search */}
      <TextInput
        placeholder="Search by email, name, or company..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Subscribers Table */}
      {loading ? (
        <Center py="xl">
          <Loader size="md" />
        </Center>
      ) : subscribers.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <IconMail size={48} color="#868e96" />
            <Text size="lg" fw={500}>
              {searchQuery ? "No matching subscribers" : "No subscribers yet"}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={400}>
              {searchQuery
                ? "Try a different search term."
                : "Add investors, advisors, and stakeholders to keep them updated on your progress."}
            </Text>
            {!searchQuery && (
              <Button leftSection={<IconUserPlus size={16} />} onClick={() => setModalOpened(true)}>
                Add Your First Subscriber
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Company</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Emails Sent</Table.Th>
                <Table.Th w={60}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {subscribers.map((subscriber) => (
                <Table.Tr key={subscriber.id}>
                  <Table.Td>
                    <Text size="sm">{subscriber.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{subscriber.name || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{subscriber.company || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" tt="capitalize">
                      {subscriber.role || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(subscriber.status)} size="sm" variant="light">
                      {subscriber.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{subscriber.emailsSent || 0}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={() => {
                            setEditingSubscriber(subscriber);
                            setModalOpened(true);
                          }}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => handleDeleteSubscriber(subscriber.id)}
                        >
                          Remove
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
      <SubscriberModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingSubscriber(null);
        }}
        onSave={editingSubscriber ? handleEditSubscriber : handleAddSubscriber}
        subscriber={editingSubscriber}
      />
    </Stack>
  );
}
