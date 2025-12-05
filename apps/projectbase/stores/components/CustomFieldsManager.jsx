/**
 * CustomFieldsManager - Manage custom fields for a project
 */

import React, { useState } from "react";
import {
  Stack,
  Button,
  Group,
  Text,
  Paper,
  ActionIcon,
  TextInput,
  Select,
  Badge,
  Divider,
  Modal,
  ColorInput,
  Checkbox,
} from "@mantine/core";
import { IconPlus, IconTrash, IconEdit, IconGripVertical } from "@tabler/icons-react";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
];

function DropdownOptionEditor({ options, onChange }) {
  const [newOption, setNewOption] = useState({ value: "", label: "", color: "#228be6" });

  const handleAddOption = () => {
    if (!newOption.label.trim()) return;
    
    const optionValue = newOption.value.trim() || newOption.label.toLowerCase().replace(/\s+/g, "-");
    onChange([...options, { ...newOption, value: optionValue }]);
    setNewOption({ value: "", label: "", color: "#228be6" });
  };

  const handleRemoveOption = (index) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <Stack gap="sm">
      <Text size="sm" fw={500}>Dropdown Options</Text>
      
      {/* Existing options */}
      {options.map((option, index) => (
        <Paper key={index} p="xs" withBorder>
          <Group justify="space-between">
            <Group gap="xs">
              <Badge color={option.color}>{option.label}</Badge>
              <Text size="xs" c="dimmed">({option.value})</Text>
            </Group>
            <ActionIcon
              color="red"
              variant="subtle"
              size="sm"
              onClick={() => handleRemoveOption(index)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Paper>
      ))}

      {/* Add new option */}
      <Paper p="sm" withBorder style={{ backgroundColor: "#f8f9fa" }}>
        <Stack gap="xs">
          <TextInput
            placeholder="Option label"
            value={newOption.label}
            onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
            size="xs"
          />
          <Group gap="xs">
            <ColorInput
              placeholder="Color"
              value={newOption.color}
              onChange={(color) => setNewOption({ ...newOption, color })}
              size="xs"
              style={{ flex: 1 }}
            />
            <Button size="xs" onClick={handleAddOption} disabled={!newOption.label.trim()}>
              Add
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

function CustomFieldEditor({ field, onSave, onCancel }) {
  const [name, setName] = useState(field?.name || "");
  const [type, setType] = useState(field?.type || "text");
  const [options, setOptions] = useState(field?.options || []);
  const [showInTable, setShowInTable] = useState(field?.showInTable ?? true);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const fieldData = {
      id: field?.id || `field_${Date.now()}`,
      name: name.trim(),
      type,
      showInTable,
    };

    if (type === "dropdown") {
      fieldData.options = options;
    }

    onSave(fieldData);
  };

  return (
    <Modal
      opened={true}
      onClose={onCancel}
      title={field ? "Edit Custom Field" : "Add Custom Field"}
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Field Name"
          placeholder="e.g., Assignee, Due Date, Category"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Select
          label="Field Type"
          value={type}
          onChange={(value) => setType(value || "text")}
          data={FIELD_TYPES}
          required
        />

        <Checkbox
          label="Show as table column"
          description="If unchecked, this field will only appear in the task details panel"
          checked={showInTable}
          onChange={(e) => setShowInTable(e.currentTarget.checked)}
        />

        {type === "dropdown" && (
          <DropdownOptionEditor options={options} onChange={setOptions} />
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || (type === "dropdown" && options.length === 0)}>
            {field ? "Save Changes" : "Add Field"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function CustomFieldsManager({ customFields, onChange }) {
  const [editingField, setEditingField] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSaveField = (fieldData) => {
    if (editingField) {
      // Update existing field
      onChange(customFields.map((f) => (f.id === editingField.id ? fieldData : f)));
    } else {
      // Add new field
      onChange([...customFields, fieldData]);
    }
    setEditingField(null);
    setIsAdding(false);
  };

  const handleDeleteField = (fieldId) => {
    if (confirm("Are you sure you want to delete this custom field?")) {
      onChange(customFields.filter((f) => f.id !== fieldId));
    }
  };

  const getFieldTypeLabel = (type) => {
    return FIELD_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div>
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>
          Custom Fields
        </Text>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => setIsAdding(true)}
        >
          Add Field
        </Button>
      </Group>

      {customFields.length === 0 ? (
        <Paper p="md" withBorder style={{ backgroundColor: "#f8f9fa" }}>
          <Text size="sm" c="dimmed" ta="center">
            No custom fields yet. Add fields to customize your tasks.
          </Text>
        </Paper>
      ) : (
        <Stack gap="xs">
          {customFields.map((field) => (
            <Paper key={field.id} p="sm" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <IconGripVertical size={16} style={{ color: "#aaa" }} />
                  <div>
                    <Text size="sm" fw={500}>
                      {field.name}
                    </Text>
                    <Group gap="xs">
                      <Badge size="xs" variant="light">
                        {getFieldTypeLabel(field.type)}
                      </Badge>
                      {field.showInTable && (
                        <Badge size="xs" color="green" variant="dot">
                          Table
                        </Badge>
                      )}
                      {field.type === "dropdown" && (
                        <Text size="xs" c="dimmed">
                          ({field.options?.length || 0} options)
                        </Text>
                      )}
                    </Group>
                  </div>
                </Group>
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => setEditingField(field)}
                  >
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Field Editor Modal */}
      {(isAdding || editingField) && (
        <CustomFieldEditor
          field={editingField}
          onSave={handleSaveField}
          onCancel={() => {
            setIsAdding(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}

