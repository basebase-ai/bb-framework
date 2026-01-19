/**
 * Integrations Page (public, vote-gated by auth)
 *
 * Data model (Firestore: integrations collection):
 * - name: string
 * - status: "completed" | "in_progress" | "planned" | "beta" | string
 * - scopes: string[] (what the integration can do, e.g. ["Read messages", "Send messages"])
 * - votes: string[] (array of user UIDs who upvoted)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  ActionIcon,
  Divider,
  Collapse,
  ThemeIcon,
  TextInput,
  Avatar,
  Menu,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconThumbUp, IconChevronDown, IconChevronUp, IconPlug, IconPlus, IconPencil, IconSearch, IconX, IconLogout, IconUser } from "@tabler/icons-react";
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
  SiGithub,
  SiLinkedin,
} from "react-icons/si";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useAppMembership } from "../../../framework/hooks/useAppMembership.js";
import { getCollection, APP_ID } from "../schema.js";
import { IntegrationModal } from "./IntegrationModal.jsx";

// Load Google Fonts (matching landing page)
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

const COLORS = {
  coral: "#ff715b",
  coralLight: "#fff0ed",
  slate: "#416165",
  slateLight: "#5a7a7e",
  slateDark: "#334d4e",
  teal: "#17bebb",
  grey: "#e8eced",
  greyLight: "#f4f6f6",
  white: "#FFFFFF",
  black: "#1a1a1a",
};

/** @type {React.CSSProperties} */
const navLinkStyle = { color: "#1a1a1a", textDecoration: "none", cursor: "pointer", fontWeight: 400 };

/** @type {Record<string, React.ComponentType<{ size?: number; color?: string }>>} */
const ICON_MAP = {
  SiGmail,
  SiHubspot,
  SiSlack,
  SiGooglesheets,
  SiAirtable,
  SiSupabase,
  SiSalesforce,
  SiGithub,
  SiNotion,
  SiGooglecalendar,
  SiStripe,
  SiLinkedin,
};

/** @typedef {"completed" | "in_progress" | "planned" | "beta"} IntegrationStatus */

/**
 * @typedef {Object} Integration
 * @property {string} id
 * @property {string} name
 * @property {IntegrationStatus | string} status
 * @property {string[]} scopes
 * @property {string[]} votes
 * @property {number} voteCount
 * @property {string} icon - Icon name from react-icons/si (e.g., "SiGmail")
 * @property {string} iconColor - Hex color for the icon
 */

/** @type {string} */
const PENDING_VOTE_STORAGE_KEY = "www.pendingIntegrationVote";

/**
 * @param {unknown} value
 * @returns {string}
 */
function toSafeString(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string");
}

/**
 * @param {any} raw
 * @returns {Integration}
 */
function normalizeIntegration(raw) {
  /** @type {string} */
  const id = toSafeString(raw?.id);
  const name = toSafeString(raw?.name) || id;
  const status = toSafeString(raw?.status) || "planned";
  const scopes = toStringArray(raw?.scopes);
  const votes = toStringArray(raw?.votes);
  const icon = toSafeString(raw?.icon);
  const iconColor = toSafeString(raw?.iconColor) || COLORS.slateLight;
  return { id, name, status, scopes, votes, voteCount: votes.length, icon, iconColor };
}

/**
 * @param {IntegrationStatus | string} status
 * @returns {{ label: string; color: string; variant?: "light" | "filled" }}
 */
function statusBadge(status) {
  const s = status.toLowerCase();
  if (s === "completed") return { label: "Completed", color: "teal", variant: "light" };
  if (s === "beta") return { label: "Beta", color: "cyan", variant: "light" };
  if (s === "in_progress" || s === "in progress") return { label: "In progress", color: "orange", variant: "light" };
  if (s === "planned") return { label: "Planned", color: "gray", variant: "light" };
  return { label: status, color: "gray", variant: "light" };
}

/**
 * @param {{
 *   onBack: () => void;
 *   onSignIn?: () => void;
 *   onNavigateToGallery?: () => void;
 *   onOpenProfile?: () => void;
 *   userPhotoURL?: string | null;
 *   userDisplayName?: string | null;
 * }} props
 */
export default function IntegrationsPage({
  onBack,
  onSignIn,
  onNavigateToGallery,
  onOpenProfile,
  userPhotoURL,
  userDisplayName,
}) {
  const { user, promptSignIn } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { isOwner, isAdmin } = useAppMembership(APP_ID);
  const { data: rawIntegrations = [], loading, error } = useCollection(getCollection("integrations_public"));
  const [submittingId, setSubmittingId] = useState(/** @type {string | null} */(null));
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */(null));

  // Modal state for admin edit/create
  const [modalOpened, setModalOpened] = useState(false);
  const [modalMode, setModalMode] = useState(/** @type {"create" | "edit"} */("create"));
  const [selectedIntegration, setSelectedIntegration] = useState(/** @type {Integration | null} */(null));

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Use provided onSignIn callback or fall back to framework's promptSignIn
  const handleSignIn = onSignIn || promptSignIn;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Get user info from props or profile
  const displayPhotoURL = userPhotoURL || profile?.photoURL;
  const displayName = userDisplayName || profile?.displayName || user?.email;

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

  /** Open modal to create a new integration */
  const handleCreate = useCallback(() => {
    setSelectedIntegration(null);
    setModalMode("create");
    setModalOpened(true);
  }, []);

  /** Open modal to edit an existing integration */
  const handleEdit = useCallback((/** @type {Integration} */ integ) => {
    setSelectedIntegration(integ);
    setModalMode("edit");
    setModalOpened(true);
  }, []);

  const integrations = useMemo(() => rawIntegrations.map(normalizeIntegration), [rawIntegrations]);

  const sortedIntegrations = useMemo(() => {
    return [...integrations].sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.name.localeCompare(b.name);
    });
  }, [integrations]);

  // Filter by search query
  const filteredIntegrations = useMemo(() => {
    if (!searchQuery.trim()) return sortedIntegrations;
    const query = searchQuery.toLowerCase().trim();
    return sortedIntegrations.filter((i) => i.name.toLowerCase().includes(query));
  }, [sortedIntegrations, searchQuery]);

  /** @type {(integrationId: string) => boolean} */
  const hasVoted = useCallback(
    (integrationId) => {
      if (!user?.uid) return false;
      const integ = integrations.find((i) => i.id === integrationId) || null;
      if (!integ) return false;
      return integ.votes.includes(user.uid);
    },
    [integrations, user?.uid]
  );

  const submitVote = useCallback(
    async (/** @type {string} */ integrationId) => {
      if (!user?.uid) {
        sessionStorage.setItem(PENDING_VOTE_STORAGE_KEY, integrationId);
        handleSignIn();
        return;
      }

      if (hasVoted(integrationId)) {
        showNotification({
          title: "Already voted",
          message: "You can only vote once per integration.",
          color: "gray",
        });
        return;
      }

      setSubmittingId(integrationId);
      try {
        await updateDoc(doc(db, getCollection("integrations_public"), integrationId), {
          votes: arrayUnion(user.uid),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
        showNotification({
          title: "Vote recorded",
          message: "Thanks — we’re tracking what you want most.",
          color: "teal",
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Could not record vote.";
        // If permission denied, prompt sign-in (user may not be verified)
        if (errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("unauthorized")) {
          sessionStorage.setItem(PENDING_VOTE_STORAGE_KEY, integrationId);
          showNotification({
            title: "Sign in required",
            message: "Please sign in to vote for integrations.",
            color: "orange",
          });
          handleSignIn();
        } else {
          showNotification({
            title: "Vote failed",
            message: errorMessage,
            color: "red",
          });
        }
      } finally {
        setSubmittingId(null);
      }
    },
    [hasVoted, handleSignIn, user?.uid]
  );

  // If the user clicked vote while signed out, apply it after sign-in.
  useEffect(() => {
    if (!user?.uid) return;
    const pending = sessionStorage.getItem(PENDING_VOTE_STORAGE_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_VOTE_STORAGE_KEY);
    // Fire and forget; UI will update via realtime subscription.
    submitVote(pending).catch(() => { });
  }, [submitVote, user?.uid]);

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: COLORS.white,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Navigation - matching landing page */}
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
            <Group
              gap={8}
              align="center"
              style={{ cursor: "pointer" }}
              onClick={onBack}
            >
              <BasebaseLogo size={28} />
              <Text fw={500} size="xl" style={{ color: COLORS.black, letterSpacing: "-0.02em" }}>
                Basebase
              </Text>
            </Group>

            {/* Desktop Nav Links */}
            <Group gap={32}>
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
              {user ? (
                <Menu position="bottom-end" withArrow>
                  <Menu.Target>
                    <Avatar
                      src={displayPhotoURL}
                      alt={displayName || "User"}
                      size="sm"
                      radius="xl"
                      color="orange"
                      style={{ cursor: "pointer" }}
                    >
                      {(displayName || "U").charAt(0).toUpperCase()}
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
                  onClick={handleSignIn}
                  style={{ color: COLORS.black }}
                >
                  Sign in
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero */}
      <Box py={80} style={{ background: COLORS.white }}>
        <Container size="xl">
          <Stack align="center" gap="md">
            <Text
              component="h1"
              ta="center"
              style={{
                fontSize: "clamp(38px, 6vw, 53px)",
                fontWeight: 700,
                color: COLORS.black,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                margin: 0,
                fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
              }}
            >
              Integrations
            </Text>
            <Text ta="center" size="lg" style={{ color: COLORS.slateLight, maxWidth: 560, lineHeight: 1.6 }}>
              Vote for the integrations you want most. You can browse without signing in — voting requires an account.
            </Text>
            <Button
              component="a"
              href="https://connections.basebase.com"
              target="_blank"
              size="lg"
              variant="filled"
              color="teal"
              mt="sm"
            >
              Connect Now
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Search */}
      <Box py="xl" style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.grey}` }}>
        <Container size="xl">
          <Group gap="md" align="flex-start">
            <TextInput
              placeholder="Search integrations..."
              size="lg"
              style={{ flex: 1 }}
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
              styles={{
                input: {
                  borderColor: COLORS.grey,
                  "&:focus": { borderColor: COLORS.teal },
                },
              }}
            />
            {(isOwner || isAdmin) && (
              <Button
                variant="light"
                color="teal"
                size="lg"
                leftSection={<IconPlus size={18} />}
                onClick={handleCreate}
              >
                Add
              </Button>
            )}
          </Group>
          {!loading && (
            <Text size="sm" mt="xs" style={{ color: COLORS.slateLight }}>
              {filteredIntegrations.length} integration{filteredIntegrations.length === 1 ? "" : "s"}
              {searchQuery && ` matching "${searchQuery}"`}
            </Text>
          )}
        </Container>
      </Box>

      {/* List */}
      <Box py={64}>
        <Container size="xl">
          <Stack gap="md">
            {error && (
              <Text c="red" size="sm">
                {error instanceof Error ? error.message : "Failed to load integrations."}
              </Text>
            )}

            {loading && (
              <Text size="sm" style={{ color: COLORS.slateLight }}>
                Loading…
              </Text>
            )}

            {!loading && filteredIntegrations.length === 0 && (
              <Text size="sm" style={{ color: COLORS.slateLight }}>
                {searchQuery ? `No integrations matching "${searchQuery}".` : "No integrations yet."}
              </Text>
            )}

            {!loading &&
              filteredIntegrations.map((integration) => {
                const voted = user?.uid ? integration.votes.includes(user.uid) : false;
                const badge = statusBadge(integration.status);
                const hasScopes = integration.scopes.length > 0;
                const isExpanded = expandedId === integration.id;
                // Look up icon component from map using icon name stored in DB
                const IconComponent = (integration.icon && ICON_MAP[integration.icon]) || IconPlug;

                return (
                  <Box
                    key={integration.id}
                    p="lg"
                    style={{
                      border: `1px solid ${COLORS.grey}`,
                      borderRadius: 16,
                      background: COLORS.white,
                    }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="md" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon
                          size={44}
                          radius="md"
                          variant="light"
                          color="gray"
                          style={{ flexShrink: 0 }}
                        >
                          <IconComponent size={24} color={integration.iconColor} />
                        </ThemeIcon>
                        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="sm" wrap="wrap">
                            <Text fw={600} style={{ color: COLORS.slate }}>
                              {integration.name}
                            </Text>
                            <Badge color={badge.color} variant={badge.variant || "light"}>
                              {badge.label}
                            </Badge>
                          </Group>
                          <Group gap="xs">
                            <Text size="sm" style={{ color: COLORS.slateLight }}>
                              {integration.voteCount} upvote{integration.voteCount === 1 ? "" : "s"}
                            </Text>
                            {hasScopes && (
                              <Text
                                size="sm"
                                style={{ color: COLORS.teal, cursor: "pointer" }}
                                onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                              >
                                • {integration.scopes.length} scope{integration.scopes.length === 1 ? "" : "s"}
                                {isExpanded ? <IconChevronUp size={14} style={{ verticalAlign: "middle", marginLeft: 2 }} /> : <IconChevronDown size={14} style={{ verticalAlign: "middle", marginLeft: 2 }} />}
                              </Text>
                            )}
                          </Group>
                        </Stack>
                      </Group>

                      <Group gap="xs" align="center">
                        {(isOwner || isAdmin) && (
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            radius="xl"
                            onClick={() => handleEdit(integration)}
                            aria-label="Edit"
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          variant={voted ? "filled" : "light"}
                          color={voted ? "orange" : "gray"}
                          size="lg"
                          radius="xl"
                          onClick={() => submitVote(integration.id)}
                          loading={submittingId === integration.id}
                          disabled={submittingId === integration.id}
                          aria-label={voted ? "Voted" : "Upvote"}
                          style={voted ? { backgroundColor: COLORS.coral } : undefined}
                        >
                          <IconThumbUp size={18} style={voted ? { color: COLORS.white } : undefined} />
                        </ActionIcon>
                        <Text size="sm" style={{ color: COLORS.slateLight, width: 44, textAlign: "right" }}>
                          {integration.voteCount}
                        </Text>
                      </Group>
                    </Group>

                    {hasScopes && (
                      <Collapse in={isExpanded}>
                        <Box mt="sm" pt="sm" style={{ borderTop: `1px solid ${COLORS.grey}` }}>
                          <Text size="xs" fw={500} mb="xs" style={{ color: COLORS.slateLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Available scopes
                          </Text>
                          <Group gap="xs" wrap="wrap">
                            {integration.scopes.map((scope, i) => (
                              <Badge key={i} variant="light" color="gray" size="sm">
                                {scope}
                              </Badge>
                            ))}
                          </Group>
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                );
              })}

            <Divider my="md" />
            <Text size="xs" style={{ color: COLORS.slateLight }}>
              Tip: you can only vote once per integration.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Admin Modal */}
      <IntegrationModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        integration={selectedIntegration}
        mode={modalMode}
      />
    </Box>
  );
}

