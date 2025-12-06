/**
 * BondingLab
 * Experiment with chemical bonds
 */

import React, { useState } from "react";
import {
  Stack,
  Group,
  Button,
  Paper,
  Title,
  Text,
  Select,
  Grid,
  Alert,
  ThemeIcon,
} from "@mantine/core";
import { IconFlask, IconPlus, IconArrowRight } from "@tabler/icons-react";
import { elements, getValenceElectrons } from "../data/elements.js";

export function BondingLab() {
  const [elementA, setElementA] = useState(null);
  const [elementB, setElementB] = useState(null);

  // Helper to get element data safely
  const getEl = (id) => elements[id];

  const analyzeBond = () => {
    if (!elementA || !elementB) return null;

    const a = getEl(elementA);
    const b = getEl(elementB);
    const valA = getValenceElectrons(parseInt(elementA));
    const valB = getValenceElectrons(parseInt(elementB));

    // 1. Noble Gas Check
    if (a.type === "Noble Gas" || b.type === "Noble Gas") {
      return {
        type: "No Reaction",
        desc: "Noble gases are already stable and don't want to bond.",
        color: "gray"
      };
    }

    // 2. Ionic (Metal + Non-Metal)
    if ((a.type === "Metal" && b.type === "Non-Metal") || (a.type === "Non-Metal" && b.type === "Metal")) {
      const metal = a.type === "Metal" ? a : b;
      const nonMetal = a.type === "Non-Metal" ? a : b;
      return {
        type: "Ionic Bond",
        desc: `${metal.name} (Metal) transfers electrons to ${nonMetal.name} (Non-Metal). They stick together because of opposite charges!`,
        color: "orange"
      };
    }

    // 3. Covalent (Non-Metal + Non-Metal)
    if (a.type === "Non-Metal" && b.type === "Non-Metal") {
      return {
        type: "Covalent Bond",
        desc: `${a.name} and ${b.name} are both Non-Metals. They share electrons to fill their outer shells.`,
        color: "green"
      };
    }

    // 4. Metallic (Metal + Metal)
    if (a.type === "Metal" && b.type === "Metal") {
      return {
        type: "Metallic Bond",
        desc: "Two metals form a metallic bond (or alloy). Electrons flow freely between them like a sea.",
        color: "blue"
      };
    }

    // 5. Metalloid Case (Simplified)
    if (a.type === "Metalloid" || b.type === "Metalloid") {
      return {
        type: "Complex Bond",
        desc: "Metalloids can act like metals or non-metals depending on the situation.",
        color: "violet"
      };
    }

    return { type: "Unknown", desc: "Bond type unclear.", color: "gray" };
  };

  const result = analyzeBond();

  const AtomVisual = ({ id }) => {
    if (!id) return <div style={{ width: 100, height: 100, border: "2px dashed #333", borderRadius: "50%" }} />;
    
    const el = getEl(id);
    const valence = getValenceElectrons(parseInt(id));
    
    return (
      <div style={{ 
        position: "relative", width: 120, height: 120, 
        backgroundColor: "#1a1b1e", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {/* Nucleus */}
        <div style={{ 
          position: "absolute", zIndex: 2,
          width: 40, height: 40, borderRadius: "50%", backgroundColor: "#ddd", color: "#000",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold"
        }}>
          {el.symbol}
        </div>
        {/* Valence Shell */}
        <div style={{ 
          position: "absolute", top: 10, left: 10, width: 100, height: 100, 
          borderRadius: "50%", border: "1px dashed #4dabf7" 
        }}>
          {Array.from({ length: valence }).map((_, i) => {
            const angle = (i * (360 / valence)) * (Math.PI / 180);
            const x = 50 + 50 * Math.cos(angle);
            const y = 50 + 50 * Math.sin(angle);
            return (
              <div key={i} style={{
                position: "absolute", left: x - 4, top: y - 4,
                width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ffd43b",
                boxShadow: "0 0 5px #ffd43b"
              }} />
            );
          })}
        </div>
        <Text size="xs" c="dimmed" style={{ position: "absolute", bottom: -25 }}>{el.type}</Text>
      </div>
    );
  };

  const options = Object.entries(elements).map(([num, data]) => ({
    value: num,
    label: `${num}. ${data.name} (${data.type})`
  }));

  return (
    <Stack gap="xl">
      <Group grow align="flex-start">
        <Paper p="md" withBorder>
          <Stack align="center">
            <Select 
              label="Atom A" 
              placeholder="Select element" 
              data={options} 
              value={elementA} 
              onChange={setElementA} 
              searchable
            />
            <AtomVisual id={elementA} />
          </Stack>
        </Paper>

        <div style={{ alignSelf: "center", textAlign: "center" }}>
          <IconPlus />
        </div>

        <Paper p="md" withBorder>
          <Stack align="center">
            <Select 
              label="Atom B" 
              placeholder="Select element" 
              data={options} 
              value={elementB} 
              onChange={setElementB} 
              searchable
            />
            <AtomVisual id={elementB} />
          </Stack>
        </Paper>
      </Group>

      {result && (
        <Paper p="xl" withBorder radius="md" style={{ borderColor: result.color }}>
          <Group>
            <ThemeIcon size="xl" radius="xl" color={result.color}>
              <IconFlask />
            </ThemeIcon>
            <div>
              <Title order={3}>{result.type}</Title>
              <Text>{result.desc}</Text>
            </div>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}

