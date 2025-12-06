/**
 * AtomBuilder
 * Interactive visualization for building atoms
 */

import React, { useState, useEffect } from "react";
import {
  Stack,
  Group,
  Button,
  Paper,
  Title,
  Text,
  ThemeIcon,
  Badge,
  Grid,
  Alert,
  Select,
} from "@mantine/core";
import { IconPlus, IconMinus, IconAtom, IconBulb, IconTarget } from "@tabler/icons-react";
import { elements, checkStability, getValenceElectrons } from "../data/elements.js";
import { Atom3D } from "./Atom3D.jsx";

export function AtomBuilder({ targetAtomicNumber, onSetTarget }) {
  const [protons, setProtons] = useState(1);
  const [neutrons, setNeutrons] = useState(0);
  const [electrons, setElectrons] = useState(1);
  const [hint, setHint] = useState("");

  // Derived stats
  const atomicNumber = protons;
  const massNumber = protons + neutrons;
  const charge = protons - electrons;
  const element = elements[atomicNumber] || { name: "Unknown", symbol: "?", mass: 0 };
  const stability = checkStability(protons, neutrons);
  const valence = getValenceElectrons(electrons);

  useEffect(() => {
    // Auto-build stable atom when target changes
    if (targetAtomicNumber) {
      const target = elements[targetAtomicNumber];
      if (target) {
        const p = parseInt(targetAtomicNumber);
        // Calculate stable neutrons based on atomic mass (rounded)
        const n = Math.round(target.mass) - p;
        // Neutral atom means electrons = protons
        const e = p;

        setProtons(p);
        setNeutrons(Math.max(0, n)); // Safety check
        setElectrons(e);
      }
    }
  }, [targetAtomicNumber]);

  useEffect(() => {
    generateHint();
  }, [protons, neutrons, electrons, targetAtomicNumber]);

  const generateHint = () => {
    if (targetAtomicNumber) {
      // Goal Mode Logic
      const targetElement = elements[targetAtomicNumber];
      const targetProtons = parseInt(targetAtomicNumber);
      
      // 1. Check Identity (Protons)
      if (protons !== targetProtons) {
        const diff = targetProtons - protons;
        setHint(`Target: ${targetElement.name}. You have ${protons} protons. ${diff > 0 ? `Add ${diff} protons.` : `Remove ${Math.abs(diff)} protons.`}`);
        return;
      }

      // 2. Check Charge (Electrons)
      // Target neutral atom
      if (electrons !== protons) {
        const diff = protons - electrons;
        setHint(`Good! You have ${targetElement.name}. Now make it neutral. You need ${diff > 0 ? `${diff} more electrons.` : `to remove ${Math.abs(diff)} electrons.`}`);
        return;
      }

      // 3. Check Stability (Neutrons)
      if (stability.includes("Unstable")) {
        setHint(`Almost there! You have neutral ${targetElement.name}, but the nucleus is unstable. Try adjusting neutrons.`);
        return;
      }

      // Success
      setHint(`Success! You've built a stable, neutral ${targetElement.name} atom!`);

    } else {
      // Free Build Logic
      if (charge > 0) {
        setHint(`The atom is positively charged (+${charge}). Electrons are negative (-). Add electrons to make it neutral.`);
      } else if (charge < 0) {
        setHint(`The atom is negatively charged (${charge}). It has too many electrons! Remove some to make it neutral.`);
      } else if (stability.includes("Unstable")) {
        setHint("The nucleus is unstable! Try adjusting the number of neutrons to glue the protons together.");
      } else {
        // Stable & Neutral - Talk about Bonding!
        if (atomicNumber === 2 || (valence === 8 && atomicNumber !== 2)) {
           setHint(`Perfect! ${element.name} is a Noble Gas with a full outer shell. It is very stable and doesn't want to bond.`);
        } else {
           const wants = valence < 4 ? `lose ${valence}` : `gain ${8 - valence}`;
           setHint(`You built ${element.name}! It has ${valence} valence electron${valence > 1 ? 's' : ''}. To have a full shell, it wants to ${wants} electron${(valence < 4 && valence === 1) || (valence > 4 && 8 - valence === 1) ? '' : 's'}. This makes it reactive!`);
        }
      }
    }
  };

  // Visualization Constants
  const CENTER_X = 150;
  const CENTER_Y = 150;

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}>
        {/* Visualization Canvas */}
        <Atom3D protons={protons} neutrons={neutrons} electrons={electrons} />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        {/* Controls & Stats */}
        <Stack gap="lg">
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Identity</Title>
              <Badge size="lg" color={element.symbol !== "?" ? "blue" : "gray"}>
                {atomicNumber}
              </Badge>
            </Group>
            
            <Stack align="center" gap="xs">
              <Title order={1} style={{ fontSize: "4rem" }}>{element.symbol}</Title>
              <Text size="xl" fw={500}>{element.name}</Text>
              <Text c="dimmed">Mass: {massNumber}</Text>
            </Stack>
          </Paper>

          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Build Goal</Text>
                {targetAtomicNumber && (
                  <Button variant="subtle" size="xs" color="gray" onClick={() => onSetTarget(null)}>
                    Clear Goal
                  </Button>
                )}
              </Group>
              
              <Select 
                placeholder="Free Build Mode"
                data={Object.entries(elements).map(([num, data]) => ({
                  value: num,
                  label: `${num}. ${data.name}`
                }))}
                value={targetAtomicNumber}
                onChange={onSetTarget}
                searchable
                clearable
                leftSection={<IconTarget size={16} />}
              />
            </Stack>
          </Paper>

          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={500}>Controls</Text>
              
              <Group justify="space-between">
                <Text size="sm">Protons (+)</Text>
                <Group gap="xs">
                  <Button size="xs" variant="light" color="red" onClick={() => setProtons(Math.max(1, protons - 1))}>
                    <IconMinus size={14} />
                  </Button>
                  <Text w={20} ta="center">{protons}</Text>
                  <Button size="xs" variant="light" color="red" onClick={() => setProtons(protons + 1)}>
                    <IconPlus size={14} />
                  </Button>
                </Group>
              </Group>

              <Group justify="space-between">
                <Text size="sm">Neutrons (0)</Text>
                <Group gap="xs">
                  <Button size="xs" variant="light" color="gray" onClick={() => setNeutrons(Math.max(0, neutrons - 1))}>
                    <IconMinus size={14} />
                  </Button>
                  <Text w={20} ta="center">{neutrons}</Text>
                  <Button size="xs" variant="light" color="gray" onClick={() => setNeutrons(neutrons + 1)}>
                    <IconPlus size={14} />
                  </Button>
                </Group>
              </Group>

              <Group justify="space-between">
                <Text size="sm">Electrons (-)</Text>
                <Group gap="xs">
                  <Button size="xs" variant="light" color="yellow" onClick={() => setElectrons(Math.max(0, electrons - 1))}>
                    <IconMinus size={14} />
                  </Button>
                  <Text w={20} ta="center">{electrons}</Text>
                  <Button size="xs" variant="light" color="yellow" onClick={() => setElectrons(electrons + 1)}>
                    <IconPlus size={14} />
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Paper>

          {/* Assistant / Guidance */}
          <Alert 
            variant="light" 
            color={stability === "Stable" && charge === 0 ? "green" : "blue"} 
            title={stability === "Stable" && charge === 0 ? "Great Job!" : "Hint"}
            icon={<IconBulb size={16} />}
          >
            {hint}
          </Alert>

          <Group grow>
            <Badge color={charge === 0 ? "green" : charge > 0 ? "red" : "blue"} variant="outline">
              Net Charge: {charge > 0 ? "+" : ""}{charge}
            </Badge>
            <Badge color={stability === "Stable" ? "green" : "orange"} variant="outline">
              {stability}
            </Badge>
            <Badge color="violet" variant="outline">
              Valence: {valence}
            </Badge>
          </Group>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

