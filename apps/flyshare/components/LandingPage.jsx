/**
 * Flyshare Landing Page - Uber-style design
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
  Badge,
  List,
  Image,
} from "@mantine/core";
import {
  IconPlane,
  IconUsers,
  IconMapPin,
  IconShieldCheck,
  IconClock,
  IconLeaf,
  IconPaw,
  IconStar,
  IconArrowRight,
} from "@tabler/icons-react";

/**
 * @typedef {Object} FeatureCardProps
 * @property {React.ReactNode} icon
 * @property {string} title
 * @property {string} description
 * @property {string} [color]
 */

/**
 * @param {FeatureCardProps} props
 */
function FeatureCard({ icon, title, description, color = "blue" }) {
  return (
    <Card
      shadow="md"
      padding="lg"
      radius="md"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <ThemeIcon size={50} radius="md" variant="light" color={color} mb="md">
        {icon}
      </ThemeIcon>
      <Text fw={600} size="lg" mb="xs" c="white">
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
        background: "linear-gradient(180deg, #0a0a0c 0%, #1a1b1e 50%, #0a0a0c 100%)",
      }}
    >
      {/* Hero Section */}
      <Box
        style={{
          background: "radial-gradient(ellipse at top, rgba(34, 197, 94, 0.12) 0%, transparent 60%)",
          paddingTop: 80,
          paddingBottom: 80,
        }}
      >
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" style={{ alignItems: "center" }}>
            <Stack gap="xl">
              <Badge size="lg" variant="light" color="green" radius="sm">
                Private Aviation Made Simple
              </Badge>
              <Title
                order={1}
                c="white"
                style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1.1 }}
              >
                Fly<span style={{ color: "#22c55e" }}>Share</span>
              </Title>
              <Text size="xl" c="gray.4" lh={1.6}>
                Share private flights across Ireland and Europe. 
                Book a seat on scheduled flights with experienced pilots 
                flying premium aircraft. Travel like a VIP for a fraction of the cost.
              </Text>

              <Group gap="md" mt="md">
                <Button
                  size="lg"
                  variant="filled"
                  color="green"
                  onClick={onSignIn}
                  rightSection={<IconArrowRight size={20} />}
                >
                  Find Flights
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  color="gray"
                  onClick={onSignIn}
                >
                  Sign In
                </Button>
              </Group>

              {/* Trust badges */}
              <Group gap="lg" mt="md">
                <Group gap="xs">
                  <IconShieldCheck size={18} color="#22c55e" />
                  <Text size="sm" c="dimmed">Verified Pilots</Text>
                </Group>
                <Group gap="xs">
                  <IconStar size={18} color="#22c55e" />
                  <Text size="sm" c="dimmed">4.9 Rating</Text>
                </Group>
                <Group gap="xs">
                  <IconPlane size={18} color="#22c55e" />
                  <Text size="sm" c="dimmed">1,000+ Flights</Text>
                </Group>
              </Group>
            </Stack>

            {/* Hero Image/Card */}
            <Card
              shadow="xl"
              padding={0}
              radius="lg"
              style={{
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                overflow: "hidden",
              }}
            >
              <Box
                style={{
                  background: "url('https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80') center/cover",
                  height: 250,
                }}
              />
              <Box p="xl">
                <Group justify="space-between" mb="xs">
                  <Text c="dimmed" size="sm">Next Available</Text>
                  <Badge color="green" variant="light">4 seats</Badge>
                </Group>
                <Group gap="xs" mb="md">
                  <Text fw={600} size="lg" c="white">Dublin</Text>
                  <IconArrowRight size={16} color="#666" />
                  <Text fw={600} size="lg" c="white">Kerry</Text>
                </Group>
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="sm" c="dimmed">Tomorrow, 10:00 AM</Text>
                    <Text size="sm" c="dimmed">Pilatus PC-12</Text>
                  </Stack>
                  <Stack gap={0} align="flex-end">
                    <Text size="xs" c="dimmed">from</Text>
                    <Text fw={700} size="xl" c="white">€250</Text>
                  </Stack>
                </Group>
              </Box>
            </Card>
          </SimpleGrid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box py={60}>
        <Container size="lg">
          <Title order={2} ta="center" c="white" mb="md">
            How It Works
          </Title>
          <Text ta="center" c="dimmed" mb="xl" maw={600} mx="auto">
            Book your seat in 3 simple steps
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            <Stack align="center" ta="center">
              <ThemeIcon size={70} radius="xl" variant="light" color="green">
                <IconMapPin size={32} />
              </ThemeIcon>
              <Text fw={600} size="lg" c="white">1. Choose Your Route</Text>
              <Text size="sm" c="dimmed">
                Search available flights between Irish and EU airports
              </Text>
            </Stack>
            <Stack align="center" ta="center">
              <ThemeIcon size={70} radius="xl" variant="light" color="green">
                <IconUsers size={32} />
              </ThemeIcon>
              <Text fw={600} size="lg" c="white">2. Pick Your Seats</Text>
              <Text size="sm" c="dimmed">
                Select how many seats you need and review flight details
              </Text>
            </Stack>
            <Stack align="center" ta="center">
              <ThemeIcon size={70} radius="xl" variant="light" color="green">
                <IconPlane size={32} />
              </ThemeIcon>
              <Text fw={600} size="lg" c="white">3. Fly in Style</Text>
              <Text size="sm" c="dimmed">
                Arrive at the private terminal and enjoy your flight
              </Text>
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box
        py={60}
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Container size="lg">
          <Title order={2} ta="center" c="white" mb="md">
            Why Choose FlyShare?
          </Title>
          <Text ta="center" c="dimmed" mb="xl" maw={600} mx="auto">
            Experience private aviation with shared convenience
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            <FeatureCard
              icon={<IconClock size={28} />}
              title="Save Time"
              description="Skip the queues at major airports. Walk in 15 minutes before departure from private terminals."
              color="green"
            />
            <FeatureCard
              icon={<IconShieldCheck size={28} />}
              title="Verified Pilots"
              description="All pilots are commercially licensed with thousands of flight hours and verified credentials."
              color="blue"
            />
            <FeatureCard
              icon={<IconPlane size={28} />}
              title="Premium Aircraft"
              description="Fly in modern, well-maintained turboprop and jet aircraft with comfortable cabins."
              color="violet"
            />
            <FeatureCard
              icon={<IconMapPin size={28} />}
              title="Regional Airports"
              description="Access smaller airports closer to your destination. Dublin to Kerry in 45 minutes, not 4 hours."
              color="orange"
            />
            <FeatureCard
              icon={<IconPaw size={28} />}
              title="Pet Friendly"
              description="Many of our flights welcome your furry companions. Filter for pet-friendly aircraft."
              color="pink"
            />
            <FeatureCard
              icon={<IconLeaf size={28} />}
              title="Carbon Offset"
              description="We automatically offset the carbon footprint of every flight you take."
              color="teal"
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* Popular Routes */}
      <Box py={60}>
        <Container size="lg">
          <Title order={2} ta="center" c="white" mb="md">
            Popular Routes
          </Title>
          <Text ta="center" c="dimmed" mb="xl" maw={600} mx="auto">
            Frequently flown routes across Ireland and Europe
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {[
              { from: "Dublin", to: "Kerry", time: "45 min", price: "€250" },
              { from: "Dublin", to: "Cork", time: "40 min", price: "€200" },
              { from: "Dublin", to: "Donegal", time: "50 min", price: "€280" },
              { from: "Cork", to: "Shannon", time: "35 min", price: "€180" },
            ].map((route, i) => (
              <Card
                key={i}
                padding="md"
                radius="md"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={onSignIn}
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={600} c="white">{route.from}</Text>
                  <IconArrowRight size={14} color="#666" />
                  <Text fw={600} c="white">{route.to}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">{route.time}</Text>
                  <Text fw={600} c="green">{route.price}</Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={80}>
        <Container size="sm">
          <Card
            shadow="xl"
            padding="xl"
            radius="lg"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              textAlign: "center",
            }}
          >
            <IconPlane size={48} color="white" style={{ marginBottom: 16 }} />
            <Title order={2} c="white" mb="md">
              Ready to fly?
            </Title>
            <Text size="lg" c="white" mb="xl" style={{ opacity: 0.9 }}>
              Join thousands of travelers enjoying private aviation at shared prices.
            </Text>
            <Button
              size="lg"
              variant="white"
              color="dark"
              onClick={onSignIn}
              rightSection={<IconArrowRight size={20} />}
            >
              Browse Available Flights
            </Button>
          </Card>
        </Container>
      </Box>

      {/* Footer */}
      <Box py="md" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <Container size="lg">
          <Text ta="center" size="sm" c="dimmed">
            © 2025 FlyShare. Private aviation made accessible.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage;

