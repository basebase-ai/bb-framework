/**
 * About Us Page
 */

import React, { useEffect } from "react";
import { Box, Container, Text, Stack, Group, Button, Avatar, Anchor } from "@mantine/core";
import { IconArrowLeft, IconBrandLinkedin } from "@tabler/icons-react";

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
  offWhite: "#faf9f7",
};

/** @type {{ name: string; role: string; bio: string; linkedin: string; initials: string; photo: string }[]} */
const FOUNDERS = [
  {
    name: "Trond Grenager",
    role: "Co-founder & CEO",
    bio: "Teg is a product and enginering leader who was CEO of Uncommon (AI recruiting) and Joinable (a private social network), and was cofounder and CPO of Adap.tv, which was acquired by AOL in 2013 for $400M. Before Adap.tv, he studied AI and machine learning as a Ph.D. student at Stanford University. He lives in Marin County, California with his wife, three sons, and lots of pets.",
    linkedin: "https://www.linkedin.com/in/grenager/",
    initials: "TG",
    photo: "https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765929913099_grenager.jpeg?alt=media&token=5e70d583-0dac-46a9-b7db-5a9d280d303e",
  },
  {
    name: "Ben Wen",
    role: "Co-founder & CMO/CPO",
    bio: "Ben is a product and go-to-market leader who has built and scaled companies across cloud infrastructure, developer tools, and B2B SaaS. He served as CMO at ImpairMaster, HashiCorp, and Linqto, and led product marketing at Joyent. Earlier in his career he helped build MongoLab and led sales at IBM/DataPower. He lives in San Francisco with his wife, kids, and a lot of musical instruments.",
    linkedin: "https://www.linkedin.com/in/benzenwen/",
    initials: "BW",
    photo: "https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765929918448_benzenwen.jpeg?alt=media&token=2b401112-131b-4b1b-b387-64b0ab04351a",
  },
];

/** @type {{ title: string; description: string }[]} */
const VALUES = [
  {
    title: "Empower business teams",
    description: "Ops teams shouldn't have to wait for engineers. They understand their problems best and should be able to solve them.",
  },
  {
    title: "Ship fast, iterate faster",
    description: "Business needs change quickly. Your tools should keep up. We're building for speed—both in how you create and how you iterate.",
  },
  {
    title: "Connect everything",
    description: "Data silos are the enemy of productivity. We're obsessed with integrations because connected data means better decisions.",
  },
  {
    title: "Simple beats complex",
    description: "The best tools fade into the background. We focus on removing complexity so you can focus on what matters.",
  },
];

/**
 * @param {{ onBack: () => void }} props
 */
export default function AboutUs({ onBack }) {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        <Container size="md">
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="dark"
              leftSection={<IconArrowLeft size={16} />}
              onClick={onBack}
            >
              Back
            </Button>
            <Text fw={700} style={{ color: COLORS.slate }}>Basebase</Text>
            <Box style={{ width: 80 }} />
          </Group>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box py={80} style={{ background: COLORS.greyLight }}>
        <Container size="md">
          <Stack align="center" gap="lg">
            <Text
              component="h1"
              ta="center"
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: COLORS.slate,
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              We're building the future of{" "}
              <span style={{ color: COLORS.coral }}>business tools</span>
            </Text>
            <Text
              ta="center"
              size="xl"
              style={{ color: COLORS.slateLight, maxWidth: 600, lineHeight: 1.6 }}
            >
              Basebase was founded on a simple belief: business teams shouldn't need engineers
              to build the tools they need. We're here to change that.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Mission Section */}
      <Box py={80}>
        <Container size="md">
          <Stack gap="xl">
            <Stack gap="sm">
              <Text
                component="h2"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Our Mission
              </Text>
              <Text size="lg" style={{ color: COLORS.slateLight, lineHeight: 1.7, maxWidth: 700 }}>
                Every business team has ideas for tools that would make their work better.
                Custom dashboards. Automated workflows. Reports that actually show what matters.
                But building these tools means waiting for engineering—weeks, months, sometimes never.
              </Text>
              <Text size="lg" style={{ color: COLORS.slateLight, lineHeight: 1.7, maxWidth: 700 }}>
                We're changing that. Basebase lets anyone build production-ready business apps
                in minutes, not months. Connect your data sources, describe what you need, and
                ship. It's that simple.
              </Text>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Founders Section */}
      <Box py={80} style={{ background: COLORS.slate }}>
        <Container size="md">
          <Stack gap={48}>
            <Stack align="center" gap="sm">
              <Text
                component="h2"
                ta="center"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: COLORS.white,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Meet the Founders
              </Text>
              <Text ta="center" size="lg" style={{ color: COLORS.grey, maxWidth: 500 }}>
                Built by people who understand both the technology and the business pain.
              </Text>
            </Stack>

            <Group gap={32} justify="center" wrap="wrap">
              {FOUNDERS.map((founder) => (
                <Box
                  key={founder.name}
                  p="xl"
                  style={{
                    background: COLORS.slateDark,
                    borderRadius: 20,
                    width: 360,
                    border: `1px solid ${COLORS.slateLight}`,
                  }}
                >
                  <Stack gap="md">
                    <Group gap="md">
                      <Avatar
                        src={founder.photo}
                        size={80}
                        radius="xl"
                        style={{
                          background: COLORS.coral,
                          color: COLORS.white,
                          fontWeight: 600,
                          fontSize: 20,
                          border: `3px solid ${COLORS.teal}`,
                        }}
                      >
                        {founder.initials}
                      </Avatar>
                      <Stack gap={2}>
                        <Text fw={600} size="lg" style={{ color: COLORS.white }}>
                          {founder.name}
                        </Text>
                        <Text size="sm" style={{ color: COLORS.teal }}>
                          {founder.role}
                        </Text>
                      </Stack>
                    </Group>
                    <Text size="sm" style={{ color: COLORS.grey, lineHeight: 1.7 }}>
                      {founder.bio}
                    </Text>
                    <Anchor
                      href={founder.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: COLORS.teal, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <IconBrandLinkedin size={18} />
                      <Text size="sm">LinkedIn</Text>
                    </Anchor>
                  </Stack>
                </Box>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Values Section */}
      <Box py={80}>
        <Container size="md">
          <Stack gap={48}>
            <Stack align="center" gap="sm">
              <Text
                component="h2"
                ta="center"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: COLORS.slate,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                What We Believe
              </Text>
            </Stack>

            <Group gap={24} justify="center" wrap="wrap">
              {VALUES.map((value, i) => (
                <Box
                  key={i}
                  p="xl"
                  style={{
                    background: COLORS.white,
                    borderRadius: 16,
                    width: 320,
                    border: `2px solid ${COLORS.grey}`,
                  }}
                >
                  <Stack gap="sm">
                    <Text fw={600} size="lg" style={{ color: COLORS.slate }}>
                      {value.title}
                    </Text>
                    <Text size="sm" style={{ color: COLORS.slateLight, lineHeight: 1.6 }}>
                      {value.description}
                    </Text>
                  </Stack>
                </Box>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Contact CTA */}
      <Box py={80} style={{ background: COLORS.coralLight }}>
        <Container size="md">
          <Stack align="center" gap="lg">
            <Text
              component="h2"
              ta="center"
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.slate,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Let's build together
            </Text>
            <Text ta="center" size="lg" style={{ color: COLORS.slateLight, maxWidth: 500 }}>
              Have questions? Want to learn more? We'd love to hear from you.
            </Text>
            <Anchor
              href="mailto:hello@basebase.com"
              style={{
                background: COLORS.coral,
                color: COLORS.white,
                padding: "12px 32px",
                borderRadius: 100,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Get in touch
            </Anchor>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box py={32} style={{ background: COLORS.slate }}>
        <Container size="md">
          <Text ta="center" size="sm" style={{ color: COLORS.grey }}>
            © {new Date().getFullYear()} Basebase. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
