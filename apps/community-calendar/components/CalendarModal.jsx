import React, { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  NumberInput,
  Switch,
  Button,
  Stack,
  Group,
  Text,
  Divider,
} from "@mantine/core";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";
import { notifications } from "@mantine/notifications";

export function CalendarModal({ calendar, opened, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    timezone: "",
    cssSelector: "",
    attribute: "",
    wait: 0,
    timeout: 140000,
    scrapeInterval: 24,
    enabled: true,
    useProxy: false,
    stealthProxy: false,
    premiumProxy: false,
  });
  const [updating, setUpdating] = useState(false);

  const { update } = useCollection(collections.calendars);

  useEffect(() => {
    if (calendar) {
      setFormData({
        name: calendar.name || "",
        url: calendar.url || "",
        timezone: calendar.timezone || "",
        cssSelector: calendar.cssSelector || "",
        attribute: calendar.attribute || "",
        wait: calendar.wait || 0,
        timeout: calendar.timeout || 140000,
        scrapeInterval: calendar.scrapeInterval || 24,
        enabled: calendar.enabled ?? true,
        useProxy: calendar.useProxy ?? false,
        stealthProxy: calendar.stealthProxy ?? false,
        premiumProxy: calendar.premiumProxy ?? false,
      });
    }
  }, [calendar]);

  const handleSubmit = async () => {
    if (!calendar?.id) return;

    setUpdating(true);
    try {
      await update(calendar.id, formData);
      notifications.show({
        title: "Success",
        message: "Calendar updated successfully",
        color: "green",
      });
      onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!calendar) return null;

  const lastScrapedAt = calendar.scrapedAt?.toDate
    ? calendar.scrapedAt.toDate()
    : calendar.scrapedAt
    ? new Date(calendar.scrapedAt)
    : null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Calendar"
      size="lg"
    >
      <Stack gap="md">
        {/* Read-only info section */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Status Information
          </Text>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Last Scrape Status:</Text>
              <Text size="sm" fw={500}>
                {calendar.lastScrapeStatus || "N/A"}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Last Scraped:</Text>
              <Text size="sm" fw={500}>
                {lastScrapedAt ? lastScrapedAt.toLocaleString() : "Never"}
              </Text>
            </Group>
            {calendar.lastScrapeCount !== undefined && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Last Count:</Text>
                <Text size="sm" fw={500}>
                  {calendar.lastScrapeCount} ({calendar.lastScrapeNew || 0} new, {calendar.lastScrapeDuplicate || 0} duplicate)
                </Text>
              </Group>
            )}
            {calendar.lastError && (
              <div>
                <Text size="sm" c="dimmed">Last Error:</Text>
                <Text size="sm" c="red">
                  {calendar.lastError}
                </Text>
              </div>
            )}
          </Stack>
        </div>

        <Divider />

        {/* Editable fields */}
        <TextInput
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          required
        />

        <TextInput
          label="URL"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.currentTarget.value })}
          required
        />

        <TextInput
          label="Timezone"
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.currentTarget.value })}
          placeholder="America/Los_Angeles"
        />

        <TextInput
          label="CSS Selector"
          value={formData.cssSelector}
          onChange={(e) => setFormData({ ...formData, cssSelector: e.currentTarget.value })}
          placeholder=".post span.entry-title a"
        />

        <TextInput
          label="Attribute"
          value={formData.attribute}
          onChange={(e) => setFormData({ ...formData, attribute: e.currentTarget.value })}
          placeholder="href"
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
          <Button onClick={handleSubmit} loading={updating}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

