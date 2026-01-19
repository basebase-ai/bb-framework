/**
 * LandingScreen - Initial screen for new users to start building
 * This screen is shown without authentication - auth is handled by the editor
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Title,
  Text,
  Textarea,
  Button,
  Group,
  Container,
  Avatar,
  Menu,
} from "@mantine/core";
import { IconArrowRight, IconEdit, IconGitFork, IconLogout } from "@tabler/icons-react";
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
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../../framework/core/firebase-init.js";

// Load Google Fonts (matching www landing page)
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap";

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

/** @type {React.CSSProperties} */
const navLinkStyle = { color: "#1a1a1a", textDecoration: "none", cursor: "pointer", fontWeight: 400 };

/**
 * @param {{ onSubmit: (prompt: string) => void }} props
 */
export function LandingScreen({ onSubmit }) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(/** @type {import('firebase/auth').User | null} */(null));

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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setIsSubmitting(true);
    onSubmit(trimmedPrompt);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
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
        backgroundColor: "#FFFFFF",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Navigation - matching www landing page */}
      <Box
        component="nav"
        style={{
          position: "relative",
          background: "#FFFFFF",
          zIndex: 100,
        }}
      >
        <Container size="xl">
          <Group justify="space-between" h={72} px="md">
            {/* Logo */}
            <Group
              gap={8}
              align="center"
              style={{ cursor: "pointer" }}
              onClick={() => window.open("https://www.basebase.com", "_self")}
            >
              <BasebaseLogo size={28} />
              <Text fw={500} size="xl" style={{ color: "#1a1a1a", letterSpacing: "-0.02em" }}>
                Basebase
              </Text>
            </Group>

            {/* Desktop Nav Links */}
            <Group gap={32}>
              <Text
                size="sm"
                style={navLinkStyle}
                onClick={() => window.open("https://www.basebase.com/gallery", "_self")}
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
              {currentUser ? (
                <Menu position="bottom-end" withArrow>
                  <Menu.Target>
                    <Avatar
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || currentUser.email || "User"}
                      size="sm"
                      radius="xl"
                      color="orange"
                      style={{ cursor: "pointer" }}
                    >
                      {(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                    </Avatar>
                  </Menu.Target>
                  <Menu.Dropdown>
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
                  onClick={() => onSubmit("")}
                  style={{ color: "#1a1a1a" }}
                >
                  Sign in
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Main Content */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 72px)",
          backgroundColor: "#f8f9fa",
        }}
      >
        <Stack align="center" gap="xl" maw={700} w="100%" p="xl">
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
              href="https://www.basebase.com/gallery"
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
              href="https://www.basebase.com/gallery"
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
    </Box>
  );
}
