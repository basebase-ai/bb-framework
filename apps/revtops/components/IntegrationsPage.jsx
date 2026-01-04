/**
 * Integrations Page for RevTops
 */

import React, { useState } from "react";
import {
  Box,
  Container,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  Paper,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import { IconArrowLeft, IconSearch, IconX } from "@tabler/icons-react";
import {
  SiSlack,
  SiAirtable,
  SiGooglesheets,
  SiNotion,
  SiStripe,
  SiSalesforce,
  SiHubspot,
  SiGooglecalendar,
  SiGmail,
  SiSupabase,
  SiGithub,
  SiLinkedin,
  SiIntercom,
  SiAsana,
  SiJira,
  // SiZendesk,
  // SiGong,
  // SiOutreach,
} from "react-icons/si";

const COLORS = {
  indigo: "#4c6ef5",
  indigoLight: "#edf2ff",
  slate: "#416165",
  slateLight: "#5a7a7e",
  white: "#FFFFFF",
  grey: "#e8eced",
};

/** @type {{ icon: any; label: string; category: string }[]} */
const INTEGRATIONS = [
  { icon: SiHubspot, label: "HubSpot", category: "CRM" },
  { icon: SiSalesforce, label: "Salesforce", category: "CRM" },
  //{ icon: SiGong, label: "Gong", category: "Intelligence" },
  //{ icon: SiOutreach, label: "Outreach", category: "Sales Engagement" },
  { icon: SiSlack, label: "Slack", category: "Communication" },
  { icon: SiAirtable, label: "Airtable", category: "Database" },
  { icon: SiGooglesheets, label: "Google Sheets", category: "Database" },
  { icon: SiNotion, label: "Notion", category: "Knowledge Base" },
  { icon: SiStripe, label: "Stripe", category: "Finance" },
  //{ icon: SiIntercom, label: "Intercom", category: "Support" },
  //{ icon: SiZendesk, label: "Zendesk", category: "Support" },
  { icon: SiGooglecalendar, label: "Calendar", category: "Productivity" },
  { icon: SiGmail, label: "Gmail", category: "Communication" },
  { icon: SiSupabase, label: "Supabase", category: "Dev Tools" },
  { icon: SiGithub, label: "GitHub", category: "Dev Tools" },
  { icon: SiAsana, label: "Asana", category: "Project Mgmt" },
  { icon: SiJira, label: "Jira", category: "Project Mgmt" },
  { icon: SiLinkedin, label: "LinkedIn", category: "Social" },
];

export default function IntegrationsPage({ onBack, onSignIn }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIntegrations = INTEGRATIONS.filter((i) =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: COLORS.white,
        fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <Box py="md" style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.grey}` }}>
        <Container size="lg">
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="dark"
              leftSection={<IconArrowLeft size={16} />}
              onClick={onBack}
            >
              Back
            </Button>
            <Text fw={700} style={{ color: COLORS.slate }}>
              RevTops
            </Text>
            <Button variant="filled" color="indigo" size="sm" onClick={onSignIn}>
              Get Started
            </Button>
          </Group>
        </Container>
      </Box>

      {/* Hero */}
      <Box py={64} style={{ background: COLORS.indigoLight }}>
        <Container size="lg">
          <Stack gap="sm">
            <Text
              component="h1"
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: COLORS.slate,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Integrations
            </Text>
            <Text size="lg" style={{ color: COLORS.slateLight, maxWidth: 760, lineHeight: 1.6 }}>
              Connect your entire revenue stack. Break down silos between Sales, Marketing, and Success.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Search */}
      <Box py="xl" style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.grey}` }}>
        <Container size="lg">
          <TextInput
            placeholder="Search integrations..."
            size="lg"
            leftSection={<IconSearch size={20} color={COLORS.slateLight} />}
            rightSection={
              searchQuery ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </Container>
      </Box>

      {/* List */}
      <Box py={64}>
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {filteredIntegrations.map((integration) => (
              <Paper
                key={integration.label}
                p="lg"
                withBorder
                style={{
                  borderColor: COLORS.grey,
                  borderRadius: 16,
                  transition: "all 0.2s ease",
                  cursor: "default",
                  "&:hover": {
                    borderColor: COLORS.indigo,
                  }
                }}
              >
                <Group align="center" gap="md">
                  <ThemeIcon
                    size={48}
                    radius="md"
                    variant="light"
                    color="indigo"
                    style={{ background: COLORS.indigoLight }}
                  >
                    <integration.icon size={28} color={COLORS.indigo} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={600} style={{ color: COLORS.slate }}>
                      {integration.label}
                    </Text>
                    <Text size="xs" style={{ color: COLORS.slateLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {integration.category}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>

          {filteredIntegrations.length === 0 && (
            <Text ta="center" size="lg" c="dimmed" mt="xl">
              No integrations found matching "{searchQuery}"
            </Text>
          )}
        </Container>
      </Box>
    </Box>
  );
}
