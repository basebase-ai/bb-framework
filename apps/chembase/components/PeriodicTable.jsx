/**
 * PeriodicTable
 * Visual grid of elements with authentic periodic table layout
 */

import React from "react";
import { Paper, Box, UnstyledButton, Text, Group, Tooltip } from "@mantine/core";
import { elements } from "../data/elements.js";

/** @type {Record<number, {row: number, col: number}>} */
const ELEMENT_POSITIONS = {
  1:  { row: 1, col: 1 },   // H
  2:  { row: 1, col: 18 },  // He
  3:  { row: 2, col: 1 },   // Li
  4:  { row: 2, col: 2 },   // Be
  5:  { row: 2, col: 13 },  // B
  6:  { row: 2, col: 14 },  // C
  7:  { row: 2, col: 15 },  // N
  8:  { row: 2, col: 16 },  // O
  9:  { row: 2, col: 17 },  // F
  10: { row: 2, col: 18 },  // Ne
  11: { row: 3, col: 1 },   // Na
  12: { row: 3, col: 2 },   // Mg
  13: { row: 3, col: 13 },  // Al
  14: { row: 3, col: 14 },  // Si
  15: { row: 3, col: 15 },  // P
  16: { row: 3, col: 16 },  // S
  17: { row: 3, col: 17 },  // Cl
  18: { row: 3, col: 18 },  // Ar
  19: { row: 4, col: 1 },   // K
  20: { row: 4, col: 2 },   // Ca
  21: { row: 4, col: 3 },   // Sc
  22: { row: 4, col: 4 },   // Ti
  23: { row: 4, col: 5 },   // V
  24: { row: 4, col: 6 },   // Cr
  25: { row: 4, col: 7 },   // Mn
  26: { row: 4, col: 8 },   // Fe
  27: { row: 4, col: 9 },   // Co
  28: { row: 4, col: 10 },  // Ni
  29: { row: 4, col: 11 },  // Cu
  30: { row: 4, col: 12 },  // Zn
  31: { row: 4, col: 13 },  // Ga
  32: { row: 4, col: 14 },  // Ge
  33: { row: 4, col: 15 },  // As
  34: { row: 4, col: 16 },  // Se
  35: { row: 4, col: 17 },  // Br
  36: { row: 4, col: 18 },  // Kr
};

/** @type {Record<string, {bg: string, border: string, text: string}>} */
const TYPE_COLORS = {
  "Metal":     { bg: "#3b5bdb", border: "#5c7cfa", text: "#fff" },
  "Non-Metal": { bg: "#2f9e44", border: "#51cf66", text: "#fff" },
  "Metalloid": { bg: "#f08c00", border: "#fcc419", text: "#fff" },
  "Noble Gas": { bg: "#9c36b5", border: "#cc5de8", text: "#fff" },
};

/**
 * @param {{ onSelectElement: (num: string) => void }} props
 */
export function PeriodicTable({ onSelectElement }) {
  return (
    <Paper p="md" withBorder>
      <Text size="sm" c="dimmed" mb="md">Select an element to build it:</Text>
      
      {/* Legend */}
      <Group gap="md" mb="lg">
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <Group key={type} gap={6}>
            <Box 
              style={{ 
                width: 14, 
                height: 14, 
                borderRadius: 3,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`
              }} 
            />
            <Text size="xs" c="dimmed">{type}</Text>
          </Group>
        ))}
      </Group>

      {/* Periodic Table Grid */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(18, minmax(42px, 1fr))",
          gridTemplateRows: "repeat(4, auto)",
          gap: 4,
          overflowX: "auto",
        }}
      >
        {Object.entries(elements).map(([num, data]) => {
          const pos = ELEMENT_POSITIONS[Number(num)];
          if (!pos) return null;
          
          const colors = TYPE_COLORS[data.type] || TYPE_COLORS["Metal"];
          
          return (
            <Tooltip 
              key={num} 
              label={`${data.name} - ${data.type}`}
              position="top"
              withArrow
            >
              <UnstyledButton
                onClick={() => onSelectElement(num)}
                style={{
                  gridRow: pos.row,
                  gridColumn: pos.col,
                  border: `2px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: "6px 4px",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                  backgroundColor: colors.bg,
                  minWidth: 42,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.08)";
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.bg}88`;
                  e.currentTarget.style.zIndex = "10";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.zIndex = "1";
                }}
              >
                <Text size="10px" c={colors.text} opacity={0.8} fw={500}>
                  {num}
                </Text>
                <Text size="lg" fw={700} c={colors.text} lh={1.1}>
                  {data.symbol}
                </Text>
                <Text size="9px" c={colors.text} opacity={0.7} lineClamp={1}>
                  {data.mass.toFixed(1)}
                </Text>
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </Box>
    </Paper>
  );
}
