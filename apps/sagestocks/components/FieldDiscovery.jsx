/**
 * FieldDiscovery - Auto-discover fields from data and add them to page config
 */

import React, { useState, useMemo } from "react";
import {
  Button,
  Stack,
  Text,
  Group,
  Checkbox,
  ScrollArea,
  Paper,
  Badge,
} from "@mantine/core";
import { IconWand, IconEye, IconEyeOff } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { generateFieldsFromData } from "../utils/nestedData.js";

export function FieldDiscovery({ records, currentFields, onAddFields }) {
  const [selectedFields, setSelectedFields] = useState(new Set());

  // Discover all possible fields from the data
  const discoveredFields = useMemo(() => {
    if (!records || records.length === 0) return [];

    // Use the first record as a sample
    const sampleRecord = records[0];
    const allFields = generateFieldsFromData(sampleRecord);

    // Filter out fields that already exist
    const existingFieldNames = new Set(
      currentFields.map((f) => f.fieldName)
    );

    return allFields.filter(
      (field) => !existingFieldNames.has(field.fieldName)
    );
  }, [records, currentFields]);

  const handleToggleField = (fieldName) => {
    setSelectedFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName);
      } else {
        newSet.add(fieldName);
      }
      return newSet;
    });
  };

  const handleAddSelected = async () => {
    if (selectedFields.size === 0) {
      notifications.show({
        title: "No fields selected",
        message: "Please select at least one field to add",
        color: "orange",
      });
      return;
    }

    const fieldsToAdd = discoveredFields.filter((f) =>
      selectedFields.has(f.fieldName)
    );

    try {
      await onAddFields(fieldsToAdd);
      setSelectedFields(new Set());
      
      notifications.show({
        title: "Success",
        message: `Added ${fieldsToAdd.length} ${fieldsToAdd.length === 1 ? 'field' : 'fields'}`,
        color: "green",
      });
    } catch (error) {
      console.error("Error adding fields:", error);
      notifications.show({
        title: "Error",
        message: "Failed to add fields",
        color: "red",
      });
    }
  };

  if (discoveredFields.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" c="dimmed">
          No new fields discovered. All fields from your data are already configured.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Group gap="xs">
            <IconWand size={20} />
            <Text fw={600}>Discover Fields</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Found {discoveredFields.length} new{" "}
            {discoveredFields.length === 1 ? "field" : "fields"} in your data
          </Text>
        </div>
        <Button
          size="sm"
          onClick={handleAddSelected}
          disabled={selectedFields.size === 0}
        >
          Add Selected ({selectedFields.size})
        </Button>
      </Group>

      <ScrollArea h={300}>
        <Stack gap="xs">
          {discoveredFields.map((field) => (
            <Paper
              key={field.fieldName}
              p="sm"
              withBorder
              style={{
                cursor: "pointer",
                backgroundColor: selectedFields.has(field.fieldName)
                  ? "var(--mantine-color-blue-light)"
                  : undefined,
              }}
              onClick={() => handleToggleField(field.fieldName)}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                  <Checkbox
                    checked={selectedFields.has(field.fieldName)}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {field.label}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {field.fieldName}
                    </Text>
                  </div>
                </Group>
                <Badge size="sm" variant="light">
                  {field.fieldType}
                </Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

