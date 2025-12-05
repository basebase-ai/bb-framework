/**
 * CRM Landing Page - Shown to unauthenticated users
 */

import React from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  SimpleGrid,
  ThemeIcon,
  Box,
  List,
} from "@mantine/core";
import {
  IconUserPlus,
  IconUsers,
  IconTarget,
  IconChartBar,
  IconBriefcase,
  IconChecklist,
  IconRocket,
  IconShieldCheck,
  IconDeviceFloppy,
} from "@tabler/icons-react";

/**
 * @typedef {Object} FeatureCardProps
 * @property {React.ReactNode} icon
 * @property {string} title
 * @property {string} description
 */

/**
 * @param {FeatureCardProps} props
 */
function FeatureCard({ icon, title, description }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <ThemeIcon size={50} radius="md" variant="light" color="blue" mb="md">
        {icon}
      </ThemeIcon>
      <Text fw={600} size="lg" mb="xs">
        {title}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Card>
  );
}

/**
 * @param {{ onSignIn: () => void }} props
 */
export function LandingPage({ onSignIn }) {
  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      {/* Hero Section */}
      <Container size="lg" py={80}>
        <Stack align="center" gap="xl">
          <Title
            order={1}
            ta="center"
            c="white"
            style={{ fontSize: "3rem", fontWeight: 800 }}
          >
            Sales CRM
          </Title>
          <Text
            size="xl"
            ta="center"
            c="white"
            maw={600}
            style={{ opacity: 0.9 }}
          >
            Manage your leads, contacts, and deals in one powerful platform.
            Close more sales with less effort.
          </Text>
          <Group gap="md" mt="md">
            <Button
              size="lg"
              variant="white"
              color="dark"
              onClick={onSignIn}
              leftSection={<IconRocket size={20} />}
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              color="white"
              onClick={onSignIn}
            >
              Sign In
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* Features Section */}
      <Box bg="white" py={60}>
        <Container size="lg">
          <Title order={2} ta="center" mb="xl">
            Everything you need to grow your sales
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            <FeatureCard
              icon={<IconUserPlus size={28} />}
              title="Lead Management"
              description="Capture and qualify leads from multiple sources. Never lose a potential customer."
            />
            <FeatureCard
              icon={<IconUsers size={28} />}
              title="Contact Database"
              description="Keep all your contacts organized with detailed profiles and interaction history."
            />
            <FeatureCard
              icon={<IconBriefcase size={28} />}
              title="Account Management"
              description="Track company relationships and manage multiple contacts per organization."
            />
            <FeatureCard
              icon={<IconTarget size={28} />}
              title="Opportunity Tracking"
              description="Monitor your sales pipeline with deal stages, values, and close dates."
            />
            <FeatureCard
              icon={<IconChecklist size={28} />}
              title="Activity Management"
              description="Schedule calls, meetings, and tasks. Never miss a follow-up again."
            />
            <FeatureCard
              icon={<IconChartBar size={28} />}
              title="Sales Dashboard"
              description="Get real-time insights into your pipeline health and team performance."
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box bg="gray.0" py={60}>
        <Container size="md">
          <Title order={2} ta="center" mb="xl">
            Why choose Sales CRM?
          </Title>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Group align="flex-start" gap="md">
                <ThemeIcon size={40} radius="md" color="green">
                  <IconShieldCheck size={24} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="lg" mb="xs">
                    Team Collaboration
                  </Text>
                  <Text size="sm" c="dimmed">
                    Invite your team members and work together. Share contacts,
                    accounts, and opportunities seamlessly.
                  </Text>
                </div>
              </Group>
            </Card>
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Group align="flex-start" gap="md">
                <ThemeIcon size={40} radius="md" color="orange">
                  <IconDeviceFloppy size={24} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="lg" mb="xs">
                    Cloud-Based
                  </Text>
                  <Text size="sm" c="dimmed">
                    Access your CRM from anywhere. Your data is automatically
                    saved and synced in real-time.
                  </Text>
                </div>
              </Group>
            </Card>
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={60}>
        <Container size="sm">
          <Card
            shadow="xl"
            padding="xl"
            radius="lg"
            style={{
              background: "white",
              textAlign: "center",
            }}
          >
            <Title order={2} mb="md">
              Ready to boost your sales?
            </Title>
            <Text size="lg" c="dimmed" mb="xl">
              Start organizing your sales pipeline today. Free to use.
            </Text>
            <Button
              size="lg"
              onClick={onSignIn}
              leftSection={<IconRocket size={20} />}
            >
              Get Started Now
            </Button>
          </Card>
        </Container>
      </Box>

      {/* Footer */}
      <Box py="md" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <Container size="lg">
          <Text ta="center" size="sm" c="white" style={{ opacity: 0.7 }}>
            © 2025 Sales CRM. Built on Basebase.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage;
