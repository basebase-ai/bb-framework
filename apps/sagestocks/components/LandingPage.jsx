/**
 * SageStocks Landing Page - Shown to unauthenticated users
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
} from "@mantine/core";
import {
  IconChartLine,
  IconBrain,
  IconTarget,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconWallet,
  IconShieldCheck,
  IconReportAnalytics,
  IconRocket,
  IconChartBar,
  IconNews,
  IconBuildingBank,
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
        background: "linear-gradient(180deg, #0f0f12 0%, #1a1b1e 50%, #0f0f12 100%)",
      }}
    >
      {/* Hero Section */}
      <Box
        style={{
          background: "radial-gradient(ellipse at top, rgba(34, 139, 230, 0.15) 0%, transparent 60%)",
          paddingTop: 80,
          paddingBottom: 80,
        }}
      >
        <Container size="lg">
          <Stack align="center" gap="xl">
            <Badge size="lg" variant="light" color="blue" radius="sm">
              AI-Powered Stock Analysis
            </Badge>
            <Title
              order={1}
              ta="center"
              c="white"
              style={{ fontSize: "3.5rem", fontWeight: 800 }}
            >
              Sage<span style={{ color: "#228be6" }}>Stocks</span>
            </Title>
            <Text
              size="xl"
              ta="center"
              c="gray.4"
              maw={650}
              lh={1.6}
            >
              Make smarter investment decisions with sophisticated AI analysis.
              Get clear Buy, Hold, or Sell recommendations backed by deep
              research and real-time data.
            </Text>
            
            {/* Recommendation Preview */}
            <Group gap="md" mt="md">
              <Badge
                size="xl"
                color="green"
                variant="filled"
                leftSection={<IconTrendingUp size={16} />}
              >
                BUY
              </Badge>
              <Badge
                size="xl"
                color="yellow"
                variant="filled"
                leftSection={<IconMinus size={16} />}
              >
                HOLD
              </Badge>
              <Badge
                size="xl"
                color="red"
                variant="filled"
                leftSection={<IconTrendingDown size={16} />}
              >
                SELL
              </Badge>
            </Group>

            <Group gap="md" mt="xl">
              <Button
                size="lg"
                variant="filled"
                color="blue"
                onClick={onSignIn}
                leftSection={<IconRocket size={20} />}
              >
                Start Analyzing Free
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
          </Stack>
        </Container>
      </Box>

      {/* Analysis Factors Section */}
      <Box py={60}>
        <Container size="lg">
          <Title order={2} ta="center" c="white" mb="md">
            Deep Analysis, Clear Recommendations
          </Title>
          <Text ta="center" c="dimmed" mb="xl" maw={600} mx="auto">
            Our AI analyzes multiple factors to give you actionable insights
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            <FeatureCard
              icon={<IconReportAnalytics size={28} />}
              title="Fundamental Analysis"
              description="P/E ratios, revenue growth, profit margins, debt levels, and cash flow analysis for comprehensive valuation."
              color="blue"
            />
            <FeatureCard
              icon={<IconChartLine size={28} />}
              title="Technical Indicators"
              description="Moving averages, RSI, MACD, support/resistance levels, and trend analysis for timing decisions."
              color="violet"
            />
            <FeatureCard
              icon={<IconNews size={28} />}
              title="News & Sentiment"
              description="Real-time news analysis, social sentiment tracking, and market mood indicators."
              color="orange"
            />
            <FeatureCard
              icon={<IconBuildingBank size={28} />}
              title="Institutional Activity"
              description="Track insider trades, institutional holdings, and smart money movements."
              color="teal"
            />
            <FeatureCard
              icon={<IconTarget size={28} />}
              title="Price Targets"
              description="AI-generated price targets with confidence levels based on multiple valuation models."
              color="pink"
            />
            <FeatureCard
              icon={<IconBrain size={28} />}
              title="AI Synthesis"
              description="All factors combined into a clear Buy, Hold, or Sell recommendation with detailed reasoning."
              color="cyan"
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* Portfolio Section */}
      <Box
        py={60}
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" style={{ alignItems: "center" }}>
            <div>
              <Badge color="green" variant="light" mb="md">
                Portfolio Tracking
              </Badge>
              <Title order={2} c="white" mb="md">
                Track Your Investments
              </Title>
              <Text c="dimmed" mb="xl" lh={1.7}>
                Monitor your portfolio's performance in real-time. See your
                total value, gains/losses, and get recommendations for your
                existing holdings.
              </Text>
              <List
                spacing="sm"
                icon={
                  <ThemeIcon size={24} radius="xl" color="green">
                    <IconShieldCheck size={14} />
                  </ThemeIcon>
                }
              >
                <List.Item>
                  <Text c="gray.3">Real-time portfolio valuation</Text>
                </List.Item>
                <List.Item>
                  <Text c="gray.3">Performance tracking with charts</Text>
                </List.Item>
                <List.Item>
                  <Text c="gray.3">Alerts for your watched stocks</Text>
                </List.Item>
                <List.Item>
                  <Text c="gray.3">Analysis for stocks you own</Text>
                </List.Item>
              </List>
            </div>
            <Card
              shadow="xl"
              padding="xl"
              radius="lg"
              style={{
                background: "linear-gradient(135deg, rgba(34, 139, 230, 0.1) 0%, rgba(34, 139, 230, 0.05) 100%)",
                border: "1px solid rgba(34, 139, 230, 0.2)",
              }}
            >
              <Group justify="space-between" mb="md">
                <Text c="dimmed" size="sm">Portfolio Value</Text>
                <IconWallet size={20} color="#228be6" />
              </Group>
              <Title order={2} c="white" mb="xs">$124,532.80</Title>
              <Group gap="xs">
                <IconTrendingUp size={16} color="#40c057" />
                <Text c="green" fw={500}>+$8,234.50 (7.08%)</Text>
              </Group>
              <Box mt="xl" pt="md" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <Group justify="space-between" mb="xs">
                  <Text c="gray.5" size="sm">AAPL</Text>
                  <Badge color="green" variant="light" size="sm">BUY</Badge>
                </Group>
                <Group justify="space-between" mb="xs">
                  <Text c="gray.5" size="sm">GOOGL</Text>
                  <Badge color="yellow" variant="light" size="sm">HOLD</Badge>
                </Group>
                <Group justify="space-between">
                  <Text c="gray.5" size="sm">TSLA</Text>
                  <Badge color="red" variant="light" size="sm">SELL</Badge>
                </Group>
              </Box>
            </Card>
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
              background: "linear-gradient(135deg, #228be6 0%, #1971c2 100%)",
              textAlign: "center",
            }}
          >
            <IconChartBar size={48} color="white" style={{ marginBottom: 16 }} />
            <Title order={2} c="white" mb="md">
              Ready to invest smarter?
            </Title>
            <Text size="lg" c="white" mb="xl" style={{ opacity: 0.9 }}>
              Join thousands of investors using AI-powered analysis to make
              better decisions.
            </Text>
            <Button
              size="lg"
              variant="white"
              color="dark"
              onClick={onSignIn}
              leftSection={<IconRocket size={20} />}
            >
              Get Started Free
            </Button>
          </Card>
        </Container>
      </Box>

      {/* Footer */}
      <Box py="md" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <Container size="lg">
          <Text ta="center" size="sm" c="dimmed">
            © 2025 SageStocks. Built on Basebase. Not financial advice.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage;
