/**
 * IntegrationModal - Create/Edit integration with voter details
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  TextInput,
  Select,
  Button,
  Stack,
  Group,
  Text,
  Avatar,
  Divider,
  TagsInput,
  ScrollArea,
  Loader,
  Badge,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { doc, setDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { getCollection } from "../schema.js";

const COLLECTION_NAME = getCollection("integrations_public");

/** @type {{ value: string; label: string }[]} */
const STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "beta", label: "Beta" },
  { value: "in_progress", label: "In Progress" },
  { value: "planned", label: "Planned" },
];

/** @type {{ value: string; label: string }[]} */
const ICON_OPTIONS = [
  { value: "SiGmail", label: "Gmail" },
  { value: "SiHubspot", label: "HubSpot" },
  { value: "SiSlack", label: "Slack" },
  { value: "SiGooglesheets", label: "Google Sheets" },
  { value: "SiAirtable", label: "Airtable" },
  { value: "SiSupabase", label: "Supabase" },
  { value: "SiSalesforce", label: "Salesforce" },
  { value: "SiGithub", label: "GitHub" },
  { value: "SiNotion", label: "Notion" },
  { value: "SiGooglecalendar", label: "Google Calendar" },
  { value: "SiStripe", label: "Stripe" },
  { value: "SiLinkedin", label: "LinkedIn" },
  { value: "SiDropbox", label: "Dropbox" },
  { value: "SiTrello", label: "Trello" },
  { value: "SiZoom", label: "Zoom" },
  { value: "SiMicrosoftoutlook", label: "Outlook" },
  { value: "SiMicrosoftteams", label: "Teams" },
  { value: "SiAsana", label: "Asana" },
  { value: "SiJira", label: "Jira" },
  { value: "SiIntercom", label: "Intercom" },
  { value: "SiZendesk", label: "Zendesk" },
  { value: "SiShopify", label: "Shopify" },
  { value: "SiTwilio", label: "Twilio" },
  { value: "SiMailchimp", label: "Mailchimp" },
];

/**
 * @typedef {Object} Integration
 * @property {string} id
 * @property {string} name
 * @property {string} status
 * @property {string[]} scopes
 * @property {string[]} votes
 * @property {string} icon
 * @property {string} iconColor
 */

/**
 * @param {{
 *   opened: boolean;
 *   onClose: () => void;
 *   integration: Integration | null;
 *   mode: "create" | "edit";
 * }} props
 */
export function IntegrationModal({ opened, onClose, integration, mode }) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [status, setStatus] = useState("planned");
  const [scopes, setScopes] = useState(/** @type {string[]} */ ([]));
  const [icon, setIcon] = useState("");
  const [iconColor, setIconColor] = useState("#666666");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch voter profiles when editing
  const voterIds = useMemo(() => integration?.votes || [], [integration?.votes]);
  const { profiles: voterProfiles, loading: profilesLoading } = useUserProfiles(voterIds);

  // Populate form when editing
  useEffect(() => {
    if (opened && integration && mode === "edit") {
      setName(integration.name || "");
      setId(integration.id || "");
      setStatus(integration.status || "planned");
      setScopes(integration.scopes || []);
      setIcon(integration.icon || "");
      setIconColor(integration.iconColor || "#666666");
    } else if (opened && mode === "create") {
      setName("");
      setId("");
      setStatus("planned");
      setScopes([]);
      setIcon("");
      setIconColor("#666666");
    }
  }, [opened, integration, mode]);

  // Auto-generate ID from name
  const generateId = (/** @type {string} */ text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .trim();
  };

  const handleNameChange = (/** @type {string} */ value) => {
    setName(value);
    // Only auto-update ID if creating and not manually edited
    if (mode === "create" && (!id || id === generateId(name))) {
      setId(generateId(value));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showNotification({ title: "Error", message: "Name is required", color: "red" });
      return;
    }
    if (!id.trim()) {
      showNotification({ title: "Error", message: "ID is required", color: "red" });
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, COLLECTION_NAME, id.trim());
      
      if (mode === "create") {
        await setDoc(ref, {
          name: name.trim(),
          status,
          scopes,
          icon,
          iconColor,
          votes: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showNotification({ title: "Success", message: "Integration created", color: "green" });
      } else {
        await updateDoc(ref, {
          name: name.trim(),
          status,
          scopes,
          icon,
          iconColor,
          updatedAt: serverTimestamp(),
        });
        showNotification({ title: "Success", message: "Integration updated", color: "green" });
      }
      onClose();
    } catch (error) {
      console.error("Error saving integration:", error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to save",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!integration?.id) return;
    
    if (!confirm(`Delete "${integration.name}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, integration.id));
      showNotification({ title: "Deleted", message: "Integration removed", color: "orange" });
      onClose();
    } catch (error) {
      console.error("Error deleting integration:", error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to delete",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!saving && !deleting) {
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={mode === "create" ? "Add Integration" : `Edit: ${integration?.name || ""}`}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="e.g., Google Sheets"
          value={name}
          onChange={(e) => handleNameChange(e.currentTarget.value)}
          required
        />

        <TextInput
          label="ID"
          description="Unique identifier (lowercase, no spaces)"
          placeholder="e.g., sheets"
          value={id}
          onChange={(e) => setId(e.currentTarget.value)}
          disabled={mode === "edit"}
          required
        />

        <Select
          label="Status"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(val) => setStatus(val || "planned")}
        />

        <Group grow>
          <Select
            label="Icon"
            data={ICON_OPTIONS}
            value={icon}
            onChange={(val) => setIcon(val || "")}
            placeholder="Select icon..."
            searchable
            clearable
          />
          <TextInput
            label="Icon Color"
            placeholder="#ff0000"
            value={iconColor}
            onChange={(e) => setIconColor(e.currentTarget.value)}
          />
        </Group>

        <TagsInput
          label="Scopes"
          description="Press Enter to add each scope"
          placeholder="e.g., Read emails"
          value={scopes}
          onChange={setScopes}
        />

        {/* Voter section (only in edit mode) */}
        {mode === "edit" && voterIds.length > 0 && (
          <>
            <Divider my="sm" />
            <Text fw={500} size="sm">
              Voters ({voterIds.length})
            </Text>
            <ScrollArea h={200} offsetScrollbars>
              <Stack gap="xs">
                {profilesLoading ? (
                  <Group justify="center" py="md">
                    <Loader size="sm" />
                  </Group>
                ) : (
                  voterIds.map((uid) => {
                    const profile = voterProfiles.get(uid);
                    return (
                      <Group key={uid} gap="sm" p="xs" style={{ background: "#f8f9fa", borderRadius: 8 }}>
                        <Avatar
                          src={profile?.photoURL}
                          size="sm"
                          radius="xl"
                        >
                          {(profile?.displayName || "?")[0]?.toUpperCase()}
                        </Avatar>
                        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate>
                            {profile?.displayName || "Unknown"}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {profile?.email || uid}
                          </Text>
                        </Stack>
                        {profile?.role && (
                          <Badge size="xs" variant="light">
                            {profile.role}
                          </Badge>
                        )}
                      </Group>
                    );
                  })
                )}
              </Stack>
            </ScrollArea>
          </>
        )}

        <Group justify="space-between" mt="md">
          {mode === "edit" ? (
            <Button
              color="red"
              variant="subtle"
              onClick={handleDelete}
              loading={deleting}
              disabled={saving}
            >
              Delete
            </Button>
          ) : (
            <div />
          )}
          <Group>
            <Button variant="default" onClick={handleClose} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={deleting}>
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
