/**
 * ColumnConfig - Column configuration panel (like Notion)
 */

import React, { useState } from "react";
import {
  Paper,
  Stack,
  TextInput,
  Select,
  Switch,
  Button,
  Group,
  ActionIcon,
  Collapse,
  Text,
  NumberInput,
  Textarea,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconTrash,
  IconGripVertical,
} from "@tabler/icons-react";
import { FIELD_TYPES } from "../schema.js";

const FIELD_TYPE_OPTIONS = [
  { value: FIELD_TYPES.TEXT, label: "Text" },
  { value: FIELD_TYPES.NUMBER, label: "Number" },
  { value: FIELD_TYPES.SELECT, label: "Select (Badge)" },
  { value: FIELD_TYPES.MULTI_SELECT, label: "Multi-Select" },
  { value: FIELD_TYPES.BADGE, label: "Badge" },
  { value: FIELD_TYPES.PROGRESS_BAR, label: "Progress Bar" },
  { value: FIELD_TYPES.RING_CHART, label: "Ring Chart" },
  { value: FIELD_TYPES.DATE, label: "Date" },
];

const TABLER_ICONS = [
  "IconTable",
  "IconBuildingBank",
  "IconCurrencyDollar",
  "IconCheck",
  "IconBulb",
  "IconChartBar",
  "IconChartDonut",
  "IconWaveSine",
  "IconChartLine",
  "IconCalculator",
  "IconCalendar",
  "IconHash",
  "IconAbc",
  "IconPercentage",
];

export function ColumnConfig({ field, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editingOptions, setEditingOptions] = useState(false);

  const handleUpdate = (key, value) => {
    onUpdate({ [key]: value });
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" style={{ flex: 1 }}>
            <ActionIcon size="sm" variant="subtle" style={{ cursor: "grab" }}>
              <IconGripVertical size={14} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronRight size={14} />
              )}
            </ActionIcon>
            <Text size="sm" fw={500} style={{ flex: 1 }}>
              {field.label}
            </Text>
          </Group>
          <Group gap="xs">
            <Switch
              size="sm"
              checked={field.visible}
              onChange={(e) => handleUpdate("visible", e.currentTarget.checked)}
            />
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              onClick={onDelete}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Expanded Settings */}
        <Collapse in={expanded}>
          <Stack gap="sm" mt="xs">
            <TextInput
              label="Label"
              value={field.label}
              onChange={(e) => handleUpdate("label", e.currentTarget.value)}
              size="xs"
            />

            <TextInput
              label="Field Name (database key)"
              value={field.fieldName}
              onChange={(e) => handleUpdate("fieldName", e.currentTarget.value)}
              size="xs"
            />

            <Select
              label="Field Type"
              value={field.fieldType}
              onChange={(value) => handleUpdate("fieldType", value)}
              data={FIELD_TYPE_OPTIONS}
              size="xs"
            />

            <Select
              label="Icon"
              value={field.icon}
              onChange={(value) => handleUpdate("icon", value)}
              data={TABLER_ICONS.map((icon) => ({ value: icon, label: icon }))}
              size="xs"
              searchable
            />

            <TextInput
              label="Description (tooltip)"
              value={field.description || ""}
              onChange={(e) => handleUpdate("description", e.currentTarget.value)}
              size="xs"
            />

            <NumberInput
              label="Width (px)"
              value={field.width}
              onChange={(value) => handleUpdate("width", value)}
              size="xs"
              min={50}
              max={500}
            />

            <Group grow>
              <Switch
                label="Sortable"
                checked={field.sortable}
                onChange={(e) =>
                  handleUpdate("sortable", e.currentTarget.checked)
                }
                size="xs"
              />
              <Switch
                label="Filterable"
                checked={field.filterable}
                onChange={(e) =>
                  handleUpdate("filterable", e.currentTarget.checked)
                }
                size="xs"
              />
            </Group>

            {/* Type-specific settings */}
            {(field.fieldType === FIELD_TYPES.NUMBER ||
              field.fieldType === FIELD_TYPES.PROGRESS_BAR ||
              field.fieldType === FIELD_TYPES.RING_CHART) && (
              <NumberInput
                label="Decimal Places"
                value={field.decimals ?? 0}
                onChange={(value) => handleUpdate("decimals", value)}
                size="xs"
                min={0}
                max={4}
              />
            )}

            {(field.fieldType === FIELD_TYPES.PROGRESS_BAR ||
              field.fieldType === FIELD_TYPES.RING_CHART) && (
              <NumberInput
                label="Max Value"
                value={field.max ?? 100}
                onChange={(value) => handleUpdate("max", value)}
                size="xs"
                min={1}
              />
            )}

            {(field.fieldType === FIELD_TYPES.SELECT ||
              field.fieldType === FIELD_TYPES.MULTI_SELECT ||
              field.fieldType === FIELD_TYPES.BADGE) && (
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="xs" fw={500}>
                    Options
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => setEditingOptions(!editingOptions)}
                  >
                    {editingOptions ? "Done" : "Edit"}
                  </Button>
                </Group>
                {editingOptions && (
                  <Textarea
                    placeholder="JSON array: [{ value: 'Buy', label: 'Buy', color: 'green' }]"
                    value={JSON.stringify(field.options || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.currentTarget.value);
                        handleUpdate("options", parsed);
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    minRows={4}
                    size="xs"
                    styles={{ input: { fontFamily: "monospace", fontSize: "11px" } }}
                  />
                )}
              </div>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}

