/**
 * TableCell - Renders different cell types based on field configuration
 */

import React from "react";
import { Badge, Progress, RingProgress, Text, Group, Code } from "@mantine/core";
import { FIELD_TYPES } from "../schema.js";

export function TableCell({ value, field }) {
  if (value === undefined || value === null) {
    return <Text size="sm" c="dimmed">—</Text>;
  }

  // Handle objects and arrays gracefully
  if (typeof value === 'object' && !Array.isArray(value) && field.fieldType !== FIELD_TYPES.MULTI_SELECT) {
    return (
      <Code size="xs" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
        {JSON.stringify(value)}
      </Code>
    );
  }

  switch (field.fieldType) {
    case FIELD_TYPES.TEXT:
      return (
        <Text size="sm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </Text>
      );

    case FIELD_TYPES.NUMBER:
      return (
        <Text size="sm" fw={500}>
          {typeof value === "number" 
            ? value.toFixed(field.decimals ?? 0)
            : value}
        </Text>
      );

    case FIELD_TYPES.BADGE:
    case FIELD_TYPES.SELECT:
      const option = field.options?.find((opt) => opt.value === value);
      return (
        <Badge
          color={option?.color || "gray"}
          variant="filled"
          size="md"
          style={{ 
            textTransform: "none",
            color: "white",
            fontWeight: 500,
            fontSize: "13px",
            padding: "6px 12px",
          }}
        >
          {option?.label || value}
        </Badge>
      );

    case FIELD_TYPES.MULTI_SELECT:
      const values = Array.isArray(value) ? value : [value];
      return (
        <Group gap="xs">
          {values.map((val, idx) => {
            const opt = field.options?.find((o) => o.value === val);
            return (
              <Badge
                key={idx}
                color={opt?.color || "gray"}
                variant="filled"
                size="md"
                style={{ 
                  textTransform: "none",
                  color: "white",
                  fontWeight: 500,
                  fontSize: "13px",
                  padding: "6px 12px",
                }}
              >
                {opt?.label || val}
              </Badge>
            );
          })}
        </Group>
      );

    case FIELD_TYPES.PROGRESS_BAR:
      const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
      const maxValue = field.max || 100;
      const percentage = (numValue / maxValue) * 100;
      const displayValue = numValue.toFixed(field.decimals ?? 0);

      return (
        <div style={{ width: "100%" }}>
          <Group gap="xs" wrap="nowrap">
            <Progress
              value={Math.min(percentage, 100)}
              size="sm"
              style={{ flex: 1, minWidth: 60 }}
              color={
                percentage >= 80 ? "green" :
                percentage >= 60 ? "teal" :
                percentage >= 40 ? "yellow" :
                percentage >= 20 ? "orange" : "red"
              }
            />
            <Text size="xs" fw={500} style={{ minWidth: 30 }}>
              {displayValue}
            </Text>
          </Group>
        </div>
      );

    case FIELD_TYPES.RING_CHART:
      const ringValue = typeof value === "number" ? value : parseFloat(value) || 0;
      const ringMax = field.max || 100;
      const ringPercentage = (ringValue / ringMax) * 100;

      return (
        <Group gap="xs" wrap="nowrap">
          <RingProgress
            size={40}
            thickness={4}
            sections={[
              {
                value: Math.min(ringPercentage, 100),
                color:
                  ringPercentage >= 80 ? "green" :
                  ringPercentage >= 60 ? "teal" :
                  ringPercentage >= 40 ? "yellow" :
                  ringPercentage >= 20 ? "orange" : "red",
              },
            ]}
          />
          <Text size="xs" fw={500}>
            {ringValue.toFixed(field.decimals ?? 0)}
            {field.max === 100 ? "%" : ""}
          </Text>
        </Group>
      );

    case FIELD_TYPES.DATE:
      const date = value instanceof Date ? value : new Date(value);
      return (
        <Text size="sm">
          {date.toLocaleDateString()}
        </Text>
      );

    default:
      return (
        <Text size="sm">
          {String(value)}
        </Text>
      );
  }
}

