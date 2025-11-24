import React, { useState } from "react";
import {
  Modal,
  TextInput,
  NumberInput,
  Switch,
  Button,
  Stack,
  Group,
} from "@mantine/core";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";
import { notifications } from "@mantine/notifications";

export function AddCalendarModal({ opened, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    timezone: "America/Los_Angeles",
    cssSelector: "",
    attribute: "href",
    wait: 0,
    timeout: 140000,
    scrapeInterval: 24,
    enabled: true,
    useProxy: true,
    stealthProxy: false,
    premiumProxy: false,
  });
  const [creating, setCreating] = useState(false);

  const { add } = useCollection(collections.calendars);

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Calendar name is required",
        color: "red",
      });
      return;
    }

    if (!formData.url.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Calendar URL is required",
        color: "red",
      });
      return;
    }

    if (!formData.cssSelector.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "CSS Selector is required",
        color: "red",
      });
      return;
    }

    setCreating(true);
    try {
      await add(formData);
      notifications.show({
        title: "Success",
        message: "Calendar created successfully",
        color: "green",
      });
      
      // Reset form and close modal
      setFormData({
        name: "",
        url: "",
        timezone: "America/Los_Angeles",
        cssSelector: "",
        attribute: "href",
        wait: 0,
        timeout: 140000,
        scrapeInterval: 24,
        enabled: true,
        useProxy: true,
        stealthProxy: false,
        premiumProxy: false,
      });
      onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add New Calendar"
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Calendar display name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          required
        />

        <TextInput
          label="URL"
          placeholder="https://example.com/events"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.currentTarget.value })}
          required
        />

        <TextInput
          label="CSS Selector"
          placeholder=".event-link a"
          value={formData.cssSelector}
          onChange={(e) => setFormData({ ...formData, cssSelector: e.currentTarget.value })}
          required
        />

        <TextInput
          label="Attribute"
          placeholder="href"
          value={formData.attribute}
          onChange={(e) => setFormData({ ...formData, attribute: e.currentTarget.value })}
        />

        <TextInput
          label="Timezone"
          placeholder="America/Los_Angeles"
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.currentTarget.value })}
        />

        <Group grow>
          <NumberInput
            label="Wait (ms)"
            value={formData.wait}
            onChange={(value) => setFormData({ ...formData, wait: value || 0 })}
            min={0}
          />

          <NumberInput
            label="Timeout (ms)"
            value={formData.timeout}
            onChange={(value) => setFormData({ ...formData, timeout: value || 140000 })}
            min={0}
          />

          <NumberInput
            label="Scrape Interval (hours)"
            value={formData.scrapeInterval}
            onChange={(value) => setFormData({ ...formData, scrapeInterval: value || 24 })}
            min={1}
          />
        </Group>

        <Stack gap="xs">
          <Switch
            label="Enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.currentTarget.checked })}
          />

          <Switch
            label="Use Proxy"
            checked={formData.useProxy}
            onChange={(e) => setFormData({ ...formData, useProxy: e.currentTarget.checked })}
          />

          <Switch
            label="Stealth Proxy"
            checked={formData.stealthProxy}
            onChange={(e) => setFormData({ ...formData, stealthProxy: e.currentTarget.checked })}
          />

          <Switch
            label="Premium Proxy"
            checked={formData.premiumProxy}
            onChange={(e) => setFormData({ ...formData, premiumProxy: e.currentTarget.checked })}
          />
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={creating}>
            Create Calendar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

