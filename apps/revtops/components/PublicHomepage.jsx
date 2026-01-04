/**
 * RevTops PublicHomepage
 * Theme: Indigo/Royal Blue
 */

import React, { useState } from "react";
import { Box, Text, Button, Group, Stack, Container, Burger, Drawer, SimpleGrid, ThemeIcon } from "@mantine/core";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import {
    SiSlack,
    SiSalesforce,
    SiHubspot,
} from "react-icons/si";

// Color palette - Indigo/Royal Blue theme
const COLORS = {
    indigo: "#4c6ef5",      // Primary
    indigoLight: "#edf2ff",
    indigoDark: "#364fc7",
    slate: "#416165",       // Dark Slate (Basebase brand continuity)
    slateLight: "#5a7a7e",
    slateDark: "#334d4e",
    teal: "#17bebb",        // Accent
    grey: "#e8eced",
    greyLight: "#f8f9fa",
    white: "#FFFFFF",
};

/** @type {{ icon: any; label: string }[]} */
const INTEGRATIONS = [
    { icon: SiHubspot, label: "HubSpot" },
    { icon: SiSalesforce, label: "Salesforce" },
    { icon: SiSlack, label: "Slack" },
];

/** @type {{ title: string; description: string; icon: any }[]} */
const FEATURES = [
    {
        title: "Unify Your GTM Stack",
        description: "Stop wrestling with disconnected tools. Bring Salesforce, HubSpot, and Outreach data into one unified operating system.",
        icon: IconCheck, // Replaced IconDatabase
    },
    {
        title: "High-Agency Workflows",
        description: "Empower your team to build their own solutions. Replace rigid processes with dynamic, high-velocity workflows that scale.",
        icon: IconCheck, // Replaced IconRocket
    },
    {
        title: "Align Teams Instantly",
        description: "Break down the wall between Sales, Marketing, and Success. One view of the customer, one shared mission.",
        icon: IconCheck, // Replaced IconUsers
    }
];

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
    const ctaText = isAuthenticated ? "Go to Console" : "Join the Elite";
    const navCtaText = isAuthenticated ? "Console" : "Get Started";

    /** @type {React.CSSProperties} */
    const navLinkStyle = { color: COLORS.slate, textDecoration: "none", cursor: "pointer", fontWeight: 500 };

    return (
        <Box
            style={{
                minHeight: "100vh",
                background: COLORS.white,
                fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
            }}
        >
            {/* Navigation */}
            <Box
                component="nav"
                style={{
                    position: "sticky",
                    top: 0,
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(20px)",
                    borderBottom: `1px solid ${COLORS.grey}`,
                    zIndex: 100,
                }}
            >
                <Container size="lg">
                    <Group justify="space-between" h={70}>
                        {/* Logo */}
                        <Group gap="xs" align="center">
                            {/* Placeholder Logo Icon */}
                            <Box
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 6,
                                    background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.indigoDark})`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontWeight: 800,
                                    fontSize: 18
                                }}
                            >
                                R
                            </Box>
                            <Text fw={800} size="xl" style={{ color: COLORS.slate, letterSpacing: "-0.03em" }}>
                                RevTops
                            </Text>
                        </Group>

                        {/* Desktop Nav Links */}
                        <Group gap="xl" visibleFrom="sm">
                            <Text size="sm" style={navLinkStyle} onClick={() => onNavigateToIntegrations?.()}>
                                Integrations
                            </Text>
                            <Text size="sm" style={navLinkStyle} onClick={() => onNavigateToPricing?.()}>
                                Pricing
                            </Text>
                            <Button
                                variant="filled"
                                size="sm"
                                onClick={onSignIn}
                                style={{ background: COLORS.indigo, border: "none" }}
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
                    <Text size="md" fw={500} style={navLinkStyle} onClick={() => { onNavigateToIntegrations?.(); setMobileMenuOpen(false); }}>
                        Integrations
                    </Text>
                    <Text size="md" fw={500} style={navLinkStyle} onClick={() => { onNavigateToPricing?.(); setMobileMenuOpen(false); }}>
                        Pricing
                    </Text>
                    <Button
                        variant="filled"
                        fullWidth
                        onClick={() => { onSignIn(); setMobileMenuOpen(false); }}
                        style={{ background: COLORS.indigo, border: "none", marginTop: 8 }}
                    >
                        {navCtaText}
                    </Button>
                </Stack>
            </Drawer>

            {/* Hero Section */}
            <Box
                py={120}
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${COLORS.indigoLight} 0%, ${COLORS.white} 70%)`,
                }}
            >
                <Container size="md">
                    <Stack align="center" gap="xl">
                        <Stack align="center" gap="md">
                            <Text
                                size="sm"
                                fw={700}
                                style={{
                                    color: COLORS.indigo,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.15em",
                                    background: "rgba(76, 110, 245, 0.1)",
                                    padding: "4px 12px",
                                    borderRadius: 100,
                                }}
                            >
                                The Operating System for Elite RevOps
                            </Text>
                            <Text
                                component="h1"
                                ta="center"
                                style={{
                                    fontSize: "clamp(48px, 6vw, 80px)",
                                    fontWeight: 800,
                                    color: COLORS.slate,
                                    lineHeight: 1.05,
                                    letterSpacing: "-0.04em",
                                    margin: 0,
                                }}
                            >
                                Drive Revenue with
                                <br />
                                <span style={{
                                    background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.teal})`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent"
                                }}>High Agency</span>
                            </Text>
                            <Text
                                ta="center"
                                size="xl"
                                style={{
                                    color: COLORS.slateLight,
                                    maxWidth: 600,
                                    lineHeight: 1.6,
                                    fontSize: "1.25rem",
                                }}
                            >
                                Empower your team to build, automate, and scale. Stop being a support ticket queue. Start being a strategic partner.
                            </Text>
                        </Stack>

                        <Group gap="md">
                            <Button
                                size="lg"
                                onClick={onSignIn}
                                rightSection={<IconArrowRight size={20} />}
                                style={{
                                    borderRadius: 8,
                                    padding: "0 32px",
                                    height: 56,
                                    background: COLORS.indigo,
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    boxShadow: "0 10px 20px rgba(76, 110, 245, 0.2)",
                                    transition: "transform 0.2s",
                                }}
                            >
                                {ctaText}
                            </Button>
                        </Group>
                    </Stack>
                </Container>
            </Box>

            {/* Features Grid */}
            <Box py={100} style={{ background: COLORS.white }}>
                <Container size="lg">
                    <Stack align="center" gap={60}>
                        <Text
                            component="h2"
                            ta="center"
                            style={{
                                fontSize: 40,
                                fontWeight: 700,
                                color: COLORS.slate,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Built for the <span style={{ color: COLORS.indigo }}>New Era of RevOps</span>
                        </Text>

                        <SimpleGrid cols={{ base: 1, md: 3 }} spacing={40}>
                            {FEATURES.map((feature, i) => (
                                <Stack
                                    key={i}
                                    gap="md"
                                    p="xl"
                                    style={{
                                        borderRadius: 24,
                                        background: COLORS.greyLight,
                                        border: `1px solid ${COLORS.grey}`,
                                    }}
                                >
                                    <ThemeIcon
                                        size={56}
                                        radius="md"
                                        variant="light"
                                        color="indigo"
                                        style={{ background: "white" }}
                                    >
                                        <feature.icon size={28} />
                                    </ThemeIcon>
                                    <Text fw={700} size="xl" style={{ color: COLORS.slate }}>{feature.title}</Text>
                                    <Text size="md" style={{ color: COLORS.slateLight, lineHeight: 1.6 }}>{feature.description}</Text>
                                </Stack>
                            ))}
                        </SimpleGrid>
                    </Stack>
                </Container>
            </Box>

            {/* Integrations Teaser */}
            <Box py={100} style={{ background: COLORS.slateDark }}>
                <Container size="lg">
                    <Group justify="space-between" align="center" wrap="wrap" gap={40}>
                        <Stack style={{ flex: 1, minWidth: 300 }} gap="lg">
                            <Text fw={700} style={{ color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                Integrations
                            </Text>
                            <Text fw={700} style={{ fontSize: 48, color: "white", lineHeight: 1.1 }}>
                                Connects with your<br />entire ecosystem.
                            </Text>
                            <Text size="lg" style={{ color: COLORS.grey, maxWidth: 480 }}>
                                From CRM to CSP, we handle the piping so you can focus on the strategy.
                                HubSpot, Salesforce, and 100+ others.
                            </Text>
                            <Button
                                variant="white"
                                color="dark"
                                size="lg"
                                style={{ width: "fit-content" }}
                                onClick={() => onNavigateToIntegrations?.()}
                            >
                                View all integrations
                            </Button>
                        </Stack>

                        <SimpleGrid cols={3} spacing="lg" style={{ flex: 1, minWidth: 300 }}>
                            {INTEGRATIONS.map((item, i) => (
                                <Stack
                                    key={i}
                                    align="center"
                                    justify="center"
                                    p="lg"
                                    gap="xs"
                                    style={{
                                        background: "rgba(255,255,255,0.05)",
                                        borderRadius: 16,
                                        border: "1px solid rgba(255,255,255,0.1)",
                                    }}
                                >
                                    <item.icon size={32} color="#fff" />
                                    <Text size="xs" style={{ color: "white", opacity: 0.8 }}>{item.label}</Text>
                                </Stack>
                            ))}
                        </SimpleGrid>
                    </Group>
                </Container>
            </Box>

            {/* Final CTA */}
            <Box py={120} style={{ background: COLORS.indigo, position: "relative", overflow: "hidden" }}>
                <Box
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "radial-gradient(circle at top right, rgba(255,255,255,0.1) 0%, transparent 60%)"
                    }}
                />
                <Container size="md" style={{ position: "relative", zIndex: 1 }}>
                    <Stack align="center" gap="xl">
                        <Text
                            component="h2"
                            ta="center"
                            style={{
                                fontSize: 48,
                                fontWeight: 800,
                                color: COLORS.white,
                                letterSpacing: "-0.03em",
                                margin: 0,
                            }}
                        >
                            Ready to scale?
                        </Text>
                        <Text ta="center" size="lg" style={{ color: "rgba(255,255,255,0.9)", maxWidth: 540 }}>
                            Join the new generation of revenue operators building the future.
                        </Text>
                        <Button
                            size="lg"
                            onClick={onSignIn}
                            style={{
                                borderRadius: 8,
                                padding: "0 40px",
                                height: 60,
                                background: COLORS.white,
                                color: COLORS.indigo,
                                fontWeight: 700,
                                fontSize: "1.1rem",
                                border: "none",
                            }}
                        >
                            {ctaText} <IconArrowRight size={20} style={{ marginLeft: 8 }} />
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Simplified Footer */}
            <Box py={60} style={{ background: COLORS.white }}>
                <Container size="lg">
                    <Group justify="space-between" align="center">
                        <Text fw={800} size="xl" style={{ color: COLORS.slate }}>RevTops</Text>
                        <Text size="sm" c="dimmed">© {new Date().getFullYear()} Basebase AI. All rights reserved.</Text>
                    </Group>
                </Container>
            </Box>
        </Box>
    );
}
