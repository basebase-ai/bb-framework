/**
 * PublicHomepage - Marketing landing page
 * Clean, modern design with floating integration icons
 */

import React, { useState, useEffect } from "react";

// Load Google Fonts (Instrument Serif for headlines, Inter for body)
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap";
import { Box, Text, Button, Group, Stack, Container, Burger, Drawer, Avatar, Menu } from "@mantine/core";
import { IconArrowRight, IconCheck, IconLayoutGrid, IconLogout, IconUser } from "@tabler/icons-react";
import { signOut } from "firebase/auth";
import { auth } from "../../../framework/core/firebase-init.js";
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

// Color palette - Clean, modern
const COLORS = {
  yellow: "#F5B800",      // Primary - Golden yellow for CTA
  yellowLight: "#FFF8E1",
  blue: "#3B82F6",        // Accent blue for underline
  black: "#1a1a1a",       // Main text
  darkGray: "#374151",    // Secondary text
  gray: "#9CA3AF",        // Tertiary text
  lightGray: "#E5E7EB",   // Borders
  gridGray: "#F3F4F6",    // Grid background
  white: "#FFFFFF",
  // Keep legacy colors for sections below the fold
  coral: "#ff715b",
  coralLight: "#fff0ed",
  coralDark: "#e5654f",
  slate: "#416165",
  slateLight: "#5a7a7e",
  slateDark: "#334d4e",
  teal: "#17bebb",
  tealLight: "#45cfcc",
  tealDark: "#14aaa8",
  grey: "#e8eced",
  greyLight: "#f4f6f6",
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

/** @typedef {{ x: number; y: number; icon: React.ComponentType<{ size?: number; color?: string }>; label: string; color?: string }} FloatingIcon */

/** @type {FloatingIcon[]} */
const FLOATING_ICONS = [
  { x: 9, y: 20, icon: SiHubspot, label: "HubSpot", color: "#FF7A59" },
  { x: 9, y: 80, icon: SiSalesforce, label: "Salesforce", color: "#00A1E0" },
  { x: -2, y: 50, icon: SiSlack, label: "Slack", color: "#E01E5A" },
  { x: 91, y: 20, icon: SiGooglesheets, label: "Sheets", color: "#34A853" },
  { x: 91, y: 80, icon: SiAirtable, label: "Airtable", color: "#18BFFF" },
  { x: 102, y: 50, icon: SiNotion, label: "Notion", color: "#000000" },
];

/** Basebase Logo SVG Component */
function BasebaseLogo({ size = 28 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 45 56" width={size} height={size * (56 / 45)}>
      <path fill="#FF7300" d="M0 43.052C0 36.396 5.396 31 12.052 31c1.076 0 1.948.872 1.948 1.948V49a7 7 0 1 1-14 0v-5.948Z" />
      <path fill="#FFBE00" d="M32.5 31C39.404 31 45 36.596 45 43.5S39.404 56 32.5 56 20 50.404 20 43.5v-9.022A3.479 3.479 0 0 1 23.479 31H32.5Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#FBBC05" d="M32.5 0C39.404 0 45 5.596 45 12.5S39.404 25 32.5 25h-9.021A3.479 3.479 0 0 1 20 21.521V12.5C20 5.596 25.596 0 32.5 0Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#FF7300" d="M7 0a7 7 0 0 1 7 7v16.052A1.948 1.948 0 0 1 12.052 25C5.396 25 0 19.604 0 12.948V7a7 7 0 0 1 7-7Z" />
    </svg>
  );
}

/** Icon Circle Component for floating integration icons */
function IconCircle({ icon: Icon, color }) {
  return (
    <Box
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: COLORS.white,
        border: `1px solid ${COLORS.lightGray}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <Icon size={24} color={color} />
    </Box>
  );
}

/**
 * @param {{
 *   onSignIn: () => void;
 *   onCreateApp?: () => void;
 *   isAuthenticated?: boolean;
 *   userPhotoURL?: string | null;
 *   userDisplayName?: string | null;
 *   onNavigateToTerms?: () => void;
 *   onNavigateToPrivacy?: () => void;
 *   onNavigateToAbout?: () => void;
 *   onNavigateToPricing?: () => void;
 *   onNavigateToIntegrations?: () => void;
 *   onNavigateToGallery?: () => void;
 *   onOpenProfile?: () => void;
 * }} props
 */
export default function PublicHomepage({
  onSignIn,
  onCreateApp,
  isAuthenticated = false,
  userPhotoURL,
  userDisplayName,
  onNavigateToTerms,
  onNavigateToPrivacy,
  onNavigateToAbout,
  onNavigateToPricing,
  onNavigateToIntegrations,
  onNavigateToGallery,
  onOpenProfile,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openBuilder = () => {
    window.open("https://builder.basebase.com", "_blank");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Load Google Fonts on mount
  useEffect(() => {
    const existingLink = document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  /** @type {React.CSSProperties} */
  const navLinkStyle = { color: COLORS.black, textDecoration: "none", cursor: "pointer", fontWeight: 400 };

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: COLORS.white,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Navigation */}
      <Box
        component="nav"
        style={{
          position: "relative",
          background: COLORS.white,
          zIndex: 100,
        }}
      >
        <Container size="xl">
          <Group justify="space-between" h={72} px="md">
            {/* Logo */}
            <Group gap={8} align="center">
              <BasebaseLogo size={28} />
              <Text fw={500} size="xl" style={{ color: COLORS.black, letterSpacing: "-0.02em" }}>
                Basebase
              </Text>
            </Group>

            {/* Desktop Nav Links - Right aligned */}
            <Group gap={32} visibleFrom="sm">
              <Text
                size="sm"
                style={navLinkStyle}
                onClick={() => onNavigateToGallery?.()}
              >
                Solution Gallery
              </Text>
              <Text
                size="sm"
                style={navLinkStyle}
                onClick={() => window.open("https://connections.basebase.com", "_self")}
              >
                Integrations
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
              {isAuthenticated ? (
                <Menu position="bottom-end" withArrow>
                  <Menu.Target>
                    <Avatar
                      src={userPhotoURL}
                      alt={userDisplayName || "User"}
                      size="sm"
                      radius="xl"
                      color="orange"
                      style={{ cursor: "pointer" }}
                    >
                      {(userDisplayName || "U").charAt(0).toUpperCase()}
                    </Avatar>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconUser size={14} />}
                      onClick={() => onOpenProfile?.()}
                    >
                      Profile
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconLogout size={14} />}
                      color="red"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={onSignIn}
                  style={{ color: COLORS.black }}
                >
                  Sign in
                </Button>
              )}
            </Group>

            {/* Mobile Burger */}
            <Burger
              opened={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((o) => !o)}
              hiddenFrom="sm"
              size="sm"
              color={COLORS.black}
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
              onNavigateToGallery?.();
              setMobileMenuOpen(false);
            }}
          >
            Solution Gallery
          </Text>
          <Text
            size="md"
            fw={500}
            style={navLinkStyle}
            onClick={() => {
              window.open("https://connections.basebase.com", "_self");
              setMobileMenuOpen(false);
            }}
          >
            Integrations
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
          {isAuthenticated ? (
            <Stack gap="xs">
              <Group gap="xs">
                <Avatar
                  src={userPhotoURL}
                  alt={userDisplayName || "User"}
                  size="sm"
                  radius="xl"
                  color="orange"
                >
                  {(userDisplayName || "U").charAt(0).toUpperCase()}
                </Avatar>
                <Text size="sm" fw={500} style={{ color: COLORS.black }}>
                  {userDisplayName || "User"}
                </Text>
              </Group>
              <Button
                variant="subtle"
                color="gray"
                fullWidth
                leftSection={<IconUser size={16} />}
                onClick={() => {
                  onOpenProfile?.();
                  setMobileMenuOpen(false);
                }}
              >
                Profile
              </Button>
              <Button
                variant="subtle"
                color="red"
                fullWidth
                leftSection={<IconLogout size={16} />}
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
              >
                Sign out
              </Button>
            </Stack>
          ) : (
            <Button
              variant="filled"
              fullWidth
              onClick={() => {
                onSignIn();
                setMobileMenuOpen(false);
              }}
              style={{ background: COLORS.yellow, color: COLORS.black, border: "none", marginTop: 8 }}
            >
              Sign in
            </Button>
          )}
        </Stack>
      </Drawer>

      {/* Hero Section with Grid Background */}
      <Box
        style={{
          position: "relative",
          minHeight: "calc(100vh - 72px)",
          background: COLORS.white,
          overflow: "hidden",
        }}
      >
        {/* Grid Background - Skewed like original */}
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "200%",
            top: "-50%",
            transform: "skewY(12deg)",
            fill: "rgba(156, 163, 175, 0.3)",
            stroke: "rgba(156, 163, 175, 0.3)",
            pointerEvents: "none",
            mask: "radial-gradient(600px circle at center, white, transparent)",
            WebkitMask: "radial-gradient(600px circle at center, white, transparent)",
          }}
        >
          <defs>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse" x="-1" y="-1">
              <path d="M.5 40V.5H40" fill="none" strokeDasharray="0" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>

        {/* Floating Integration Icons with Curved Connection Lines - Desktop only */}
        <Box visibleFrom="md" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* SVG Connection Lines - Curved with animated gradients like original */}
          <svg
            fill="none"
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 896,
              height: 320,
              marginTop: 175,
              pointerEvents: "none",
            }}
            viewBox="0 0 896 320"
          >
            <defs>
              {/* Animated gradients for left-to-right flow */}
              <linearGradient id="grad-l1" gradientUnits="userSpaceOnUse" x1="80" y1="64" x2="208" y2="160">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="-0.5;1.5" dur="1.5s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="#8B5CF6" stopOpacity="1">
                  <animate attributeName="offset" values="-0.25;1.75" dur="1.5s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="0;2" dur="1.5s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="grad-l2" gradientUnits="userSpaceOnUse" x1="80" y1="256" x2="208" y2="160">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="-0.5;1.5" dur="1.75s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="#8B5CF6" stopOpacity="1">
                  <animate attributeName="offset" values="-0.25;1.75" dur="1.75s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="0;2" dur="1.75s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="grad-l3" gradientUnits="userSpaceOnUse" x1="0" y1="160" x2="208" y2="160">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="-0.5;1.5" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="#8B5CF6" stopOpacity="1">
                  <animate attributeName="offset" values="-0.25;1.75" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="0;2" dur="2s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              {/* Animated gradients for right-to-left flow */}
              <linearGradient id="grad-r1" gradientUnits="userSpaceOnUse" x1="816" y1="64" x2="688" y2="160">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="-0.5;1.5" dur="1.6s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="#8B5CF6" stopOpacity="1">
                  <animate attributeName="offset" values="-0.25;1.75" dur="1.6s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="0;2" dur="1.6s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="grad-r2" gradientUnits="userSpaceOnUse" x1="816" y1="256" x2="688" y2="160">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="-0.5;1.5" dur="1.85s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="#8B5CF6" stopOpacity="1">
                  <animate attributeName="offset" values="-0.25;1.75" dur="1.85s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="0;2" dur="1.85s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="grad-r3" gradientUnits="userSpaceOnUse" x1="896" y1="160" x2="688" y2="160">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="-0.5;1.5" dur="2.1s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="#8B5CF6" stopOpacity="1">
                  <animate attributeName="offset" values="-0.25;1.75" dur="2.1s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0">
                  <animate attributeName="offset" values="0;2" dur="2.1s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            {/* Left side curves - base gray lines */}
            <path d="M 80,64 Q 144,144 208,160" stroke="gray" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
            <path d="M 80,256 Q 144,176 208,160" stroke="gray" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
            <path d="M 0,160 Q 104,160 208,160" stroke="gray" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
            {/* Left side curves - animated gradient overlay */}
            <path d="M 80,64 Q 144,144 208,160" stroke="url(#grad-l1)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 80,256 Q 144,176 208,160" stroke="url(#grad-l2)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 0,160 Q 104,160 208,160" stroke="url(#grad-l3)" strokeWidth="2" strokeLinecap="round" />
            {/* Right side curves - base gray lines */}
            <path d="M 816,64 Q 752,144 688,160" stroke="gray" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
            <path d="M 816,256 Q 752,176 688,160" stroke="gray" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
            <path d="M 896,160 Q 792,160 688,160" stroke="gray" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
            {/* Right side curves - animated gradient overlay */}
            <path d="M 816,64 Q 752,144 688,160" stroke="url(#grad-r1)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 816,256 Q 752,176 688,160" stroke="url(#grad-r2)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 896,160 Q 792,160 688,160" stroke="url(#grad-r3)" strokeWidth="2" strokeLinecap="round" />
          </svg>

          {/* Floating Icons - positioned to match the SVG viewBox */}
          <Box
            style={{
              position: "absolute",
              top: 175,
              left: "50%",
              transform: "translateX(-50%)",
              width: 896,
              height: 320,
            }}
          >
            {/* Left column - HubSpot & Salesforce */}
            <Box style={{ position: "absolute", left: 80, top: 64, transform: "translate(-50%, -50%)" }}>
              <IconCircle icon={SiHubspot} color="#FF7A59" />
            </Box>
            <Box style={{ position: "absolute", left: 80, top: 256, transform: "translate(-50%, -50%)" }}>
              <IconCircle icon={SiSalesforce} color="#00A1E0" />
            </Box>
            {/* Far left - Slack */}
            <Box style={{ position: "absolute", left: 0, top: 160, transform: "translate(-50%, -50%)" }}>
              <IconCircle icon={SiSlack} color="#E01E5A" />
            </Box>
            {/* Right column - Sheets & Airtable */}
            <Box style={{ position: "absolute", left: 816, top: 64, transform: "translate(-50%, -50%)" }}>
              <IconCircle icon={SiGooglesheets} color="#34A853" />
            </Box>
            <Box style={{ position: "absolute", left: 816, top: 256, transform: "translate(-50%, -50%)" }}>
              <IconCircle icon={SiAirtable} color="#18BFFF" />
            </Box>
            {/* Far right - Notion */}
            <Box style={{ position: "absolute", left: 896, top: 160, transform: "translate(-50%, -50%)" }}>
              <IconCircle icon={SiNotion} color="#000000" />
            </Box>
          </Box>
        </Box>

        {/* Hero Content */}
        <Container size="md" style={{ position: "relative", zIndex: 10 }}>
          <Stack align="center" gap={32} py={100}>
            {/* Headline - Using Instrument Serif like original */}
            <Text
              component="h1"
              ta="center"
              style={{
                fontSize: "clamp(38px, 6vw, 67px)",
                fontWeight: 700,
                color: COLORS.black,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                margin: 0,
                fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
              }}
            >
              Revenue solutions in
              <br />
              <span
                style={{
                  fontStyle: "italic",
                  position: "relative",
                  display: "inline-block",
                  background: "transparent",
                }}
              >
                minutes,
                {/* Rough-notation style blue underline - hand-drawn look */}
                <svg
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: "100%",
                    height: 8,
                    overflow: "visible",
                    pointerEvents: "none",
                  }}
                  viewBox="0 0 200 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 5 C 30 3, 50 6, 100 4 S 150 5, 198 4"
                    fill="none"
                    stroke="#164CE3"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M198 5 C 160 6, 120 3, 80 5 S 40 4, 2 5"
                    fill="none"
                    stroke="#164CE3"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              {" "}not months.
            </Text>

            {/* Search Input with Create Button - clicking anywhere opens builder */}
            <Box
              onClick={openBuilder}
              style={{
                width: "100%",
                maxWidth: 480,
                marginTop: 24,
                cursor: "pointer",
              }}
            >
              <Group
                gap={0}
                style={{
                  background: COLORS.white,
                  borderRadius: 100,
                  border: `1px solid ${COLORS.lightGray}`,
                  padding: 6,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    paddingLeft: 20,
                    fontSize: 15,
                    color: COLORS.gray,
                  }}
                >
                  Let's cross something off your list...
                </Text>
                <Button
                  component="span"
                  rightSection={<IconArrowRight size={16} />}
                  style={{
                    background: COLORS.yellow,
                    color: COLORS.black,
                    border: "none",
                    borderRadius: 100,
                    padding: "10px 20px",
                    height: 42,
                    fontWeight: 500,
                    pointerEvents: "none",
                  }}
                >
                  Start
                </Button>
              </Group>
            </Box>

            {/* Or View Gallery */}
            <Group gap="md" align="center">
              <Text size="sm" style={{ color: COLORS.gray }}>or</Text>
              <Button
                variant="outline"
                onClick={onSignIn}
                rightSection={<IconLayoutGrid size={16} />}
                style={{
                  borderColor: COLORS.lightGray,
                  color: COLORS.black,
                  borderRadius: 100,
                  fontWeight: 500,
                  padding: "8px 16px",
                  height: 38,
                }}
              >
                View gallery
              </Button>
            </Group>
          </Stack>
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
                  fontSize: 53,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
                }}
              >
                RevOps workflows <span style={{ color: COLORS.coral }}>are hard</span>
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
                  fontSize: 53,
                  fontWeight: 700,
                  color: COLORS.white,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
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
                  fontSize: 53,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
                }}
              >
                Built for RevOps
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
                  fontSize: 53,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
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
                onClick={() => window.open("https://connections.basebase.com", "_self")}
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
                  fontSize: 53,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  margin: 0,
                  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
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
                fontSize: 58,
                fontWeight: 700,
                color: COLORS.white,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: 0,
                fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
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
              onClick={() => onCreateApp?.()}
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
              Create App <IconArrowRight size={16} style={{ marginLeft: 8 }} />
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
                  onClick={() => window.open("https://connections.basebase.com", "_self")}
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
