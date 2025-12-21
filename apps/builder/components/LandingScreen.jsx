/**
 * LandingScreen - Initial screen for new users to start building
 */

import React, { useState } from "react";
import {
  Box,
  Stack,
  Title,
  Text,
  Textarea,
  Button,
  Group,
  Image,
} from "@mantine/core";
import { IconArrowRight, IconEdit, IconGitFork } from "@tabler/icons-react";
import {
  SiSlack,
  SiAirtable,
  SiGooglesheets,
  SiNotion,
  SiStripe,
  SiSalesforce,
  SiHubspot,
  SiGmail,
  SiLinear,
  SiGithub,
} from "react-icons/si";

// Basebase logo URL
const LOGO_URL =
  "https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914379318_basebase_orange_32.png?alt=media&token=d2f927fb-a1b4-43ec-a078-69bdc462974e";

// Integration logos to display
const INTEGRATIONS = [
  { icon: SiSalesforce, label: "Salesforce", color: "#00A1E0" },
  { icon: SiHubspot, label: "HubSpot", color: "#ff7a59" },
  { icon: SiSlack, label: "Slack", color: "#4A154B" },
  { icon: SiGooglesheets, label: "Sheets", color: "#34A853" },
  { icon: SiAirtable, label: "Airtable", color: "#18BFFF" },
  { icon: SiNotion, label: "Notion", color: "#000000" },
  { icon: SiStripe, label: "Stripe", color: "#635BFF" },
  { icon: SiGmail, label: "Gmail", color: "#EA4335" },
  { icon: SiLinear, label: "Linear", color: "#5E6AD2" },
  { icon: SiGithub, label: "GitHub", color: "#181717" },
];

/**
 * @param {{ onSubmit: (prompt: string) => void }} props
 */
export function LandingScreen({ onSubmit }) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setIsSubmitting(true);
    onSubmit(trimmedPrompt);
  };

  const handleKeyDown = (/** @type {React.KeyboardEvent} */ e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stack align="center" gap="xl" maw={700} w="100%" p="xl">
        {/* Logo */}
        <Group gap="sm" align="center">
          <Image src={LOGO_URL} alt="Basebase" w={40} h={40} />
          <Title order={1} c="dark" fw={600}>
            Basebase
          </Title>
        </Group>

        {/* Main prompt input */}
        <Box
          p="xl"
          w="100%"
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            border: "1px solid #e9ecef",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <Stack gap="md">
            <Title order={3} c="dark" ta="center">
              What do you want to build?
            </Title>

            <Textarea
              placeholder="Describe your app idea... (e.g., 'A customer success dashboard that pulls data from Salesforce and HubSpot, shows renewal dates, health scores, and lets reps log activities')"
              size="md"
              minRows={3}
              maxRows={6}
              autosize
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              styles={{
                input: {
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #dee2e6",
                  "&:focus": {
                    borderColor: "#228be6",
                  },
                },
              }}
            />

            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">
                Press ⌘+Enter to start building
              </Text>
              <Button
                size="sm"
                variant="filled"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!prompt.trim()}
                rightSection={<IconArrowRight size={16} />}
              >
                Build it
              </Button>
            </Group>
          </Stack>
        </Box>

        {/* Action buttons */}
        <Group gap="md">
          <Button
            variant="light"
            color="gray"
            size="md"
            leftSection={<IconEdit size={18} />}
            component="a"
            href="https://studio.basebase.com"
            target="_blank"
          >
            Edit existing...
          </Button>
          <Button
            variant="light"
            color="gray"
            size="md"
            leftSection={<IconGitFork size={18} />}
            component="a"
            href="https://studio.basebase.com"
            target="_blank"
          >
            Fork existing...
          </Button>
        </Group>

        {/* Features */}
        <Stack align="center" gap="md">
          <Group gap="lg" justify="center">
            <Text size="sm" c="dimmed">
              🔗 Connected to 100+ APIs
            </Text>
            <Text size="sm" c="dimmed">
              👁️ Live preview
            </Text>
            <Text size="sm" c="dimmed">
              🚀 Instant deploy
            </Text>
          </Group>

          {/* Integration logos */}
          <Group gap="md" justify="center" align="center" style={{ opacity: 0.6 }}>
            {INTEGRATIONS.map(({ icon: Icon, label, color }) => (
              <Box key={label} title={label} style={{ display: "flex", alignItems: "center" }}>
                <Icon size={20} color={color} />
              </Box>
            ))}
            <Text size="sm" c="dimmed" style={{ lineHeight: "20px" }}>
              etc.
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Box>
  );
}
