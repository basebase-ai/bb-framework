/**
 * PublicHomepage - Marketing landing page
 * Vibrant coral/teal color palette
 */

import React, { useState } from "react";
import { Box, Text, Button, Group, Stack, Container, Burger, Drawer } from "@mantine/core";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";
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
  SiLinear,
  SiGithub,
  SiIntercom,
  SiAsana,
  SiJira,
} from "react-icons/si";

// Color palette
const COLORS = {
  coral: "#ff715b",       // Primary - Vibrant Coral
  coralLight: "#fff0ed",
  coralDark: "#e5654f",
  slate: "#416165",       // Dark Slate Grey
  slateLight: "#5a7a7e",
  slateDark: "#334d4e",
  teal: "#17bebb",        // Tropical Teal
  tealLight: "#45cfcc",
  tealDark: "#14aaa8",
  grey: "#e8eced",        // Light grey
  greyLight: "#f4f6f6",
  white: "#FFFFFF",
  offWhite: "#faf9f7",
};

/** @type {{ icon: React.ComponentType<{ size?: number }>; label: string }[]} */
const INTEGRATIONS = [
  { icon: SiSlack, label: "Slack" },
  { icon: SiAirtable, label: "Airtable" },
  { icon: SiGooglesheets, label: "Sheets" },
  { icon: SiNotion, label: "Notion" },
  { icon: SiStripe, label: "Stripe" },
  { icon: SiSalesforce, label: "Salesforce" },
  { icon: SiHubspot, label: "HubSpot" },
  { icon: SiGooglecalendar, label: "Calendar" },
  { icon: SiGmail, label: "Gmail" },
  { icon: SiSupabase, label: "Supabase" },
  { icon: SiLinear, label: "Linear" },
  { icon: SiGithub, label: "GitHub" },
  { icon: SiIntercom, label: "Intercom" },
  { icon: SiAsana, label: "Asana" },
  { icon: SiJira, label: "Jira" },
];

/** @type {{ title: string; description: string }[]} */
const FEATURES = [
  {
    title: "Connect your data",
    description: "Pull data from 100+ enterprise apps. Slack, Airtable, Google Sheets, Stripe, etc. No more copy-pasting between tools."
  },
  {
    title: "Build in minutes",
    description: "Create custom dashboards, workflows, and tools using AI. No coding required. Just describe what you need."
  },
  {
    title: "Share instantly",
    description: "Deploy and share with your team in one click. Real apps, not prototypes. Production-ready from day one."
  }
];

/** @type {{ title: string; description: string }[]} */
const PAIN_POINTS = [
  {
    title: "Your data is everywhere",
    description: "Salesforce, HubSpot, Sheets, Notion, Slack... Your data lives in dozens of apps that don't talk to each other."
  },
  {
    title: "Zapier isn't enough",
    description: "Moving data between apps is one thing. Building the custom workflows and views your team actually needs? That's another."
  },
  {
    title: "You can't wait for engineers",
    description: "You know exactly what you need, but engineering has other priorities. So you wait... and wrestle with spreadsheets."
  }
];

/**
 * @param {{
 *   onSignIn: () => void;
 *   isAuthenticated?: boolean;
 *   onNavigateToTerms?: () => void;
 *   onNavigateToPrivacy?: () => void;
 *   onNavigateToAbout?: () => void;
 *   onNavigateToPricing?: () => void;
 *   onNavigateToIntegrations?: () => void;
 * }} props
 */
export default function PublicHomepage({
  onSignIn,
  isAuthenticated = false,
  onNavigateToTerms,
  onNavigateToPrivacy,
  onNavigateToAbout,
  onNavigateToPricing,
  onNavigateToIntegrations,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ctaText = "Browse Apps";
  const navCtaText = "Get Started";

  /** @type {React.CSSProperties} */
  const navLinkStyle = { color: COLORS.slate, textDecoration: "none", cursor: "pointer" };

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: COLORS.white,
        fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      {/* Navigation */}
      <Box
        component="nav"
        style={{
          position: "sticky",
          top: 0,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${COLORS.grey}`,
          zIndex: 100,
        }}
      >
        <Container size="lg">
          <Group justify="space-between" h={64}>
            {/* Logo */}
            <Group gap="xs" align="center">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914399563_basebase_white_64.png?alt=media&token=b00983f8-b6b5-41f4-9c9a-83fd3f71f695"
                alt="Basebase"
                style={{ height: 32, width: 32 }}
              />
              <Text fw={700} size="lg" style={{ color: COLORS.slate, letterSpacing: "-0.02em" }}>
                Basebase
              </Text>
            </Group>

            {/* Desktop Nav Links */}
            <Group gap="xl" visibleFrom="sm">
              <Text
                size="sm"
                style={navLinkStyle}
                onClick={() => onNavigateToIntegrations?.()}
              >
                Integrations
              </Text>
              <Text
                size="sm"
                style={navLinkStyle}
                onClick={() => onNavigateToPricing?.()}
              >
                Pricing
              </Text>
              <Text
                component="a"
                href="https://docs.basebase.com"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                style={navLinkStyle}
              >
                Documentation
              </Text>
              <Button 
                variant="filled" 
                size="xs" 
                onClick={onSignIn}
                style={{ background: COLORS.coral, border: "none" }}
              >
                {navCtaText}
              </Button>
            </Group>

            {/* Mobile Burger */}
            <Burger
              opened={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((o) => !o)}
              hiddenFrom="sm"
              size="sm"
              color={COLORS.slate}
            />
          </Group>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        opened={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="right"
        size="xs"
        padding="lg"
        hiddenFrom="sm"
        zIndex={200}
      >
        <Stack gap="lg">
          <Text
            size="md"
            fw={500}
            style={navLinkStyle}
            onClick={() => {
              onNavigateToIntegrations?.();
              setMobileMenuOpen(false);
            }}
          >
            Integrations
          </Text>
          <Text
            size="md"
            fw={500}
            style={navLinkStyle}
            onClick={() => {
              onNavigateToPricing?.();
              setMobileMenuOpen(false);
            }}
          >
            Pricing
          </Text>
          <Text
            component="a"
            href="https://docs.basebase.com"
            target="_blank"
            rel="noopener noreferrer"
            size="md"
            fw={500}
            style={navLinkStyle}
          >
            Documentation
          </Text>
          <Button 
            variant="filled" 
            fullWidth
            onClick={() => {
              onSignIn();
              setMobileMenuOpen(false);
            }}
            style={{ background: COLORS.coral, border: "none", marginTop: 8 }}
          >
            {navCtaText}
          </Button>
        </Stack>
      </Drawer>

      {/* Hero Section */}
      <Box 
        py={120}
        style={{
          background: COLORS.white,
        }}
      >
        <Container size="md">
          <Stack align="center" gap="xl">
            <Stack align="center" gap="md">
              <Text
                size="xs"
                fw={600}
                style={{
                  color: COLORS.coral,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                Built for business operations
              </Text>
              <Text
                component="h1"
                ta="center"
                style={{
                  fontSize: "clamp(40px, 8vw, 72px)",
                  fontWeight: 700,
                  color: COLORS.slate,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  margin: 0,
                }}
              >
                Build business tools
                <br />
                <span style={{ color: COLORS.coral }}>in minutes, not months</span>
              </Text>
              <Text
                ta="center"
                size="xl"
                style={{
                  color: COLORS.slateLight,
                  maxWidth: 540,
                  lineHeight: 1.5,
                }}
              >
                Connect your data. Build custom apps in minutes. 
                Share instantly with your team. No engineers required.
              </Text>
            </Stack>

            <Group gap="md">
              <Button 
                size="lg" 
                onClick={onSignIn}
                style={{ 
                  borderRadius: 980,
                  padding: "14px 36px",
                  height: "auto",
                  background: COLORS.coral,
                  border: "none",
                  fontWeight: 600,
                }}
              >
                {ctaText}
              </Button>
            </Group>

            <Text size="xs" style={{ color: COLORS.slateLight }}>
              No credit card required · Free forever for individuals
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Social proof bar */}
      <Box py={40} style={{ background: COLORS.greyLight }}>
        <Container size="lg">
          <Text ta="center" size="sm" style={{ color: COLORS.slateLight }} mb="lg">
            Trusted by revenue ops, marketing ops, and business teams
          </Text>
          <Group justify="center" gap={48}>
            {["RevOps Teams", "MarTech Teams", "Finance Ops", "Customer Success", "Sales Ops"].map((team) => (
              <Text key={team} size="sm" fw={500} style={{ color: COLORS.slate }}>
                {team}
              </Text>
            ))}
          </Group>
        </Container>
      </Box>

      {/* Pain Points Section */}
      <Box py={100}>
        <Container size="lg">
          <Stack align="center" gap={60}>
            <Stack align="center" gap="sm">
              <Text
                component="h2"
                ta="center"
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Internal apps <span style={{ color: COLORS.coral }}>are hard</span>
              </Text>
              <Text ta="center" size="lg" style={{ color: COLORS.slateLight, maxWidth: 540 }}>
                We get it. Your data is scattered across dozens of apps, and building the tools you need feels impossible without an engineering team.
              </Text>
            </Stack>

            <Group gap={32} justify="center" wrap="wrap">
              {PAIN_POINTS.map((point, i) => (
                <Box
                  key={i}
                  p="xl"
                  style={{
                    background: COLORS.white,
                    borderRadius: 16,
                    width: 320,
                    border: `2px solid ${COLORS.grey}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <Text fw={600} size="lg" mb="sm" style={{ color: COLORS.slate }}>
                    {point.title}
                  </Text>
                  <Text size="sm" style={{ color: COLORS.slateLight, lineHeight: 1.6 }}>
                    {point.description}
                  </Text>
                </Box>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features" py={100} style={{ background: COLORS.slate }}>
        <Container size="lg">
          <Stack align="center" gap={60}>
            <Stack align="center" gap="sm">
              <Text
                component="h2"
                ta="center"
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: COLORS.white,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                How Basebase works
              </Text>
              <Text ta="center" size="lg" style={{ color: COLORS.grey, maxWidth: 500 }}>
                From idea to live app in minutes. Built by business people, for business people.
              </Text>
            </Stack>

            <Stack gap={24} w="100%">
              {FEATURES.map((feature, i) => (
                <Group
                  key={i}
                  gap={32}
                  align="flex-start"
                  p="xl"
                  style={{
                    background: COLORS.slateDark,
                    borderRadius: 20,
                    border: `1px solid ${COLORS.slateLight}`,
                  }}
                >
                  <Box
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: COLORS.coral,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Text fw={700} size="lg" style={{ color: COLORS.white }}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                  </Box>
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Text fw={600} size="xl" style={{ color: COLORS.white }}>
                      {feature.title}
                    </Text>
                    <Text size="md" style={{ color: COLORS.grey, lineHeight: 1.6 }}>
                      {feature.description}
                    </Text>
                  </Stack>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Why Business Teams Love It */}
      <Box py={100} style={{ background: COLORS.coralLight }}>
        <Container size="lg">
          <Stack align="center" gap={60}>
            <Stack align="center" gap="sm">
              <Text
                component="h2"
                ta="center"
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Built for business people
              </Text>
              <Text ta="center" size="lg" style={{ color: COLORS.slateLight, maxWidth: 540 }}>
                Stop waiting for IT. Stop fighting with spreadsheets. 
                Build exactly what you need, when you need it.
              </Text>
            </Stack>

            <Group gap={16} justify="center" wrap="wrap">
              {[
                "Real dynamic app workflows",
                "Instant team sharing",
                "100+ enterprise integrations",
                "No coding required",
                "Production-ready apps",
                "Revenue ops ready",
              ].map((benefit) => (
                <Group
                  key={benefit}
                  gap="xs"
                  px="lg"
                  py="sm"
                  style={{
                    background: COLORS.white,
                    borderRadius: 100,
                    border: `2px solid ${COLORS.coral}`,
                  }}
                >
                  <IconCheck size={16} style={{ color: COLORS.teal }} />
                  <Text size="sm" fw={500} style={{ color: COLORS.slate }}>
                    {benefit}
                  </Text>
                </Group>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Integrations Section */}
      <Box id="integrations" py={100} style={{ background: COLORS.greyLight, overflow: "hidden" }}>
        <Container size="lg">
          <Stack align="center" gap={48}>
            <Stack align="center" gap="sm">
              <Text
                component="h2"
                ta="center"
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Connect <span style={{ color: COLORS.teal }}>everything</span>
              </Text>
              <Text ta="center" size="lg" style={{ color: COLORS.slateLight, maxWidth: 500 }}>
                Pull data from 100+ enterprise apps. Break down silos. 
                Get the unified view you've always wanted.
              </Text>
              <Button
                variant="filled"
                size="md"
                mt="md"
                rightSection={<IconArrowRight size={18} />}
                onClick={() => onNavigateToIntegrations?.()}
                style={{ background: COLORS.teal, border: "none" }}
              >
                View all integrations
              </Button>
            </Stack>
          </Stack>
        </Container>

        {/* Scrolling integration icons */}
        <Box mt={48} style={{ position: "relative" }}>
          <Box
            style={{
              display: "flex",
              gap: 32,
              animation: "scroll 40s linear infinite",
            }}
          >
            {[...INTEGRATIONS, ...INTEGRATIONS].map((integration, i) => {
              const Icon = integration.icon;
              return (
                <Stack
                  key={i}
                  align="center"
                  gap={8}
                  style={{
                    flexShrink: 0,
                  }}
                >
                  <Icon size={24} color="#86868b" />
                  <Text size="xs" style={{ color: "#86868b" }}>
                    {integration.label}
                  </Text>
                </Stack>
              );
            })}
          </Box>
        </Box>

        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </Box>

      {/* Use Cases */}
      <Box py={100}>
        <Container size="lg">
          <Stack align="center" gap={60}>
            <Stack align="center" gap="sm">
              <Text
                component="h2"
                ta="center"
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Perfect for <span style={{ color: COLORS.coral }}>ops teams</span>
              </Text>
              <Text ta="center" size="lg" style={{ color: COLORS.slateLight, maxWidth: 500 }}>
                Revenue ops, marketing ops, and business teams use Basebase 
                to build the tools they need—fast.
              </Text>
            </Stack>

            <Group gap={24} justify="center" wrap="wrap">
              {[
                { title: "Custom CRM views", desc: "Pull Salesforce data into tailored dashboards" },
                { title: "Campaign trackers", desc: "Connect marketing tools for unified reporting" },
                { title: "Deal room tools", desc: "Build approval workflows for your sales team" },
                { title: "Customer health scores", desc: "Aggregate data from multiple sources" },
                { title: "Invoice automation", desc: "Connect Stripe, Sheets, and your CRM" },
                { title: "Team directories", desc: "Build internal tools for your org" },
              ].map((useCase, i) => (
                <Box
                  key={i}
                  p="lg"
                  style={{
                    width: 300,
                    background: COLORS.white,
                    borderRadius: 16,
                    border: `2px solid ${COLORS.grey}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <Text fw={600} mb={4} style={{ color: COLORS.slate }}>
                    {useCase.title}
                  </Text>
                  <Text size="sm" style={{ color: COLORS.slateLight }}>
                    {useCase.desc}
                  </Text>
                </Box>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box py={120} style={{ background: COLORS.coral }}>
        <Container size="md">
          <Stack align="center" gap="xl">
            <Text
              component="h2"
              ta="center"
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: COLORS.white,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Ready to build?
            </Text>
            <Text ta="center" size="lg" style={{ color: COLORS.coralLight, maxWidth: 480 }}>
              Stop waiting on IT. Start building the tools your business 
              actually needs—in minutes, not months.
            </Text>
            <Button
              size="lg"
              onClick={onSignIn}
              style={{
                borderRadius: 980,
                padding: "14px 36px",
                height: "auto",
                background: COLORS.white,
                color: COLORS.coral,
                fontWeight: 600,
                border: "none",
              }}
            >
              {ctaText} <IconArrowRight size={16} style={{ marginLeft: 8 }} />
            </Button>
            <Text size="xs" style={{ color: COLORS.coralLight }}>
              No credit card required · Free forever for individuals
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box py={48} style={{ background: COLORS.slate }}>
        <Container size="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <Text fw={700} style={{ color: COLORS.white }}>Basebase</Text>
              <Text size="xs" style={{ color: COLORS.grey, maxWidth: 280 }}>
                Build the tools your business needs. 
                No engineers required.
              </Text>
            </Stack>
            <Group gap={64} align="flex-start">
              <Stack gap="xs">
                <Text size="xs" fw={600} style={{ color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Product
                </Text>
                <Text
                  size="sm"
                  style={{ color: COLORS.white, cursor: "pointer" }}
                  onClick={() => {
                    if (onNavigateToIntegrations) onNavigateToIntegrations();
                  }}
                >
                  Integrations
                </Text>
                <Text
                  size="sm"
                  style={{ color: COLORS.white, cursor: "pointer" }}
                  onClick={() => {
                    if (onNavigateToPricing) onNavigateToPricing();
                  }}
                >
                  Pricing
                </Text>
                <Text
                  component="a"
                  href="https://docs.basebase.com"
                  size="sm"
                  style={{ color: COLORS.white, cursor: "pointer", textDecoration: "none" }}
                >
                  Documentation
                </Text>
              </Stack>
              <Stack gap="xs">
                <Text size="xs" fw={600} style={{ color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Company
                </Text>
                <Text
                  size="sm"
                  style={{ color: COLORS.white, cursor: "pointer" }}
                  onClick={() => {
                    if (onNavigateToAbout) onNavigateToAbout();
                  }}
                >
                  About
                </Text>
                <Text
                  component="a"
                  href="mailto:hello@basebase.com"
                  size="sm"
                  style={{ color: COLORS.white, cursor: "pointer", textDecoration: "none" }}
                >
                  Contact
                </Text>
              </Stack>
              <Stack gap="xs">
                <Text size="xs" fw={600} style={{ color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Legal
                </Text>
                <Text 
                  size="sm" 
                  style={{ color: COLORS.white, cursor: "pointer" }}
                  onClick={() => {
                    if (onNavigateToTerms) onNavigateToTerms();
                  }}
                >
                  Terms of Service
                </Text>
                <Text 
                  size="sm" 
                  style={{ color: COLORS.white, cursor: "pointer" }}
                  onClick={() => {
                    if (onNavigateToPrivacy) onNavigateToPrivacy();
                  }}
                >
                  Privacy Policy
                </Text>
              </Stack>
            </Group>
          </Group>
          <Text size="xs" ta="center" mt={48} style={{ color: COLORS.grey }}>
            � {new Date().getFullYear()} Basebase. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
