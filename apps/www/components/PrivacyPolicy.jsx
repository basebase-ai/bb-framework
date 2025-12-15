/**
 * Privacy Policy Page
 */

import React, { useEffect } from "react";
import { Box, Container, Text, Stack, Anchor, Button, Group } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

const COLORS = {
  coral: "#ff715b",
  slate: "#416165",
  slateLight: "#5a7a7e",
  grey: "#e8eced",
  white: "#FFFFFF",
  offWhite: "#faf9f7",
};

/**
 * @param {{ onBack: () => void }} props
 */
export default function PrivacyPolicy({ onBack }) {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: COLORS.offWhite,
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

      {/* Content */}
      <Container size="md" py={60}>
        <Stack gap="xl">
          <Stack gap="xs">
            <Text
              component="h1"
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.slate,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Privacy Policy
            </Text>
            <Text size="sm" style={{ color: COLORS.slateLight }}>
              Last updated: December 15, 2024
            </Text>
          </Stack>

          <Stack gap="lg" style={{ color: COLORS.slate, lineHeight: 1.7 }}>
            <Section title="1. Introduction">
              <Text>
                Basebase ("we," "our," or "us") respects your privacy and is committed to protecting your 
                personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard 
                your information when you use our service.
              </Text>
            </Section>

            <Section title="2. Information We Collect">
              <Text fw={600}>Account Information</Text>
              <Text>
                When you create an account, we collect your name, email address, and authentication 
                credentials (or information from third-party sign-in providers like Google).
              </Text>
              
              <Text fw={600} mt="md">Usage Data</Text>
              <Text>
                We automatically collect information about how you interact with our Service, including:
              </Text>
              <ul style={{ margin: "8px 0", paddingLeft: 24 }}>
                <li>Device information (browser type, operating system)</li>
                <li>IP address and approximate location</li>
                <li>Pages visited and features used</li>
                <li>Time and date of visits</li>
                <li>Referring URLs</li>
              </ul>

              <Text fw={600} mt="md">User Content</Text>
              <Text>
                We store the applications, data, and content you create using our Service.
              </Text>

              <Text fw={600} mt="md">Third-Party Integration Data</Text>
              <Text>
                When you connect third-party services (e.g., Slack, Google Sheets), we may receive 
                data from those services as authorized by you.
              </Text>
            </Section>

            <Section title="3. How We Use Your Information">
              <Text>We use your information to:</Text>
              <ul style={{ margin: "8px 0", paddingLeft: 24 }}>
                <li>Provide, maintain, and improve our Service</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
                <li>Personalize and improve your experience</li>
              </ul>
            </Section>

            <Section title="4. Information Sharing">
              <Text>We may share your information with:</Text>
              
              <Text fw={600} mt="md">Service Providers</Text>
              <Text>
                Third-party vendors who perform services on our behalf (hosting, analytics, customer support).
              </Text>

              <Text fw={600} mt="md">Third-Party Integrations</Text>
              <Text>
                Services you choose to connect to your Basebase account, as authorized by you.
              </Text>

              <Text fw={600} mt="md">Legal Requirements</Text>
              <Text>
                When required by law, legal process, or to protect our rights, privacy, safety, or property.
              </Text>

              <Text fw={600} mt="md">Business Transfers</Text>
              <Text>
                In connection with a merger, acquisition, or sale of assets, your information may be transferred.
              </Text>

              <Text mt="md">
                We do not sell your personal information to third parties.
              </Text>
            </Section>

            <Section title="5. Data Security">
              <Text>
                We implement appropriate technical and organizational measures to protect your personal data 
                against unauthorized access, alteration, disclosure, or destruction. However, no method of 
                transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </Text>
            </Section>

            <Section title="6. Data Retention">
              <Text>
                We retain your personal data for as long as your account is active or as needed to provide 
                you services. We may retain certain information as required by law or for legitimate business 
                purposes, such as resolving disputes and enforcing our agreements.
              </Text>
            </Section>

            <Section title="7. Your Rights">
              <Text>Depending on your location, you may have the right to:</Text>
              <ul style={{ margin: "8px 0", paddingLeft: 24 }}>
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict certain processing</li>
                <li>Data portability (receive your data in a structured format)</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <Text>
                To exercise these rights, please contact us at{" "}
                <Anchor href="mailto:privacy@basebase.com" style={{ color: COLORS.coral }}>
                  privacy@basebase.com
                </Anchor>
              </Text>
            </Section>

            <Section title="8. Cookies and Tracking">
              <Text>
                We use cookies and similar technologies to collect usage data and improve your experience. 
                You can control cookies through your browser settings, but disabling them may affect 
                functionality.
              </Text>
            </Section>

            <Section title="9. Children's Privacy">
              <Text>
                Our Service is not intended for children under 13 years of age. We do not knowingly collect 
                personal information from children under 13. If you believe we have collected such information, 
                please contact us immediately.
              </Text>
            </Section>

            <Section title="10. International Transfers">
              <Text>
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your data in accordance with 
                this Privacy Policy.
              </Text>
            </Section>

            <Section title="11. Changes to This Policy">
              <Text>
                We may update this Privacy Policy from time to time. We will notify you of material changes 
                by posting the new policy on this page and updating the "Last updated" date.
              </Text>
            </Section>

            <Section title="12. Contact Us">
              <Text>
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
              </Text>
              <Stack gap={4} mt="sm">
                <Text>
                  Email:{" "}
                  <Anchor href="mailto:privacy@basebase.com" style={{ color: COLORS.coral }}>
                    privacy@basebase.com
                  </Anchor>
                </Text>
              </Stack>
            </Section>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

/**
 * @param {{ title: string; children: React.ReactNode }} props
 */
function Section({ title, children }) {
  return (
    <Stack gap="sm">
      <Text fw={600} size="lg" style={{ color: "#1D1D1F" }}>
        {title}
      </Text>
      {children}
    </Stack>
  );
}

