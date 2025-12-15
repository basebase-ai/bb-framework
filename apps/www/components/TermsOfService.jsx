/**
 * Terms of Service Page
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
export default function TermsOfService({ onBack }) {
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
              Terms of Service
            </Text>
            <Text size="sm" style={{ color: COLORS.slateLight }}>
              Last updated: December 15, 2024
            </Text>
          </Stack>

          <Stack gap="lg" style={{ color: COLORS.slate, lineHeight: 1.7 }}>
            <Section title="1. Acceptance of Terms">
              <Text>
                By accessing or using Basebase ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, you may not access or use the Service.
              </Text>
            </Section>

            <Section title="2. Description of Service">
              <Text>
                Basebase provides a platform for building and deploying business applications. The Service allows users 
                to create custom tools, integrate with third-party services, and share applications with team members.
              </Text>
            </Section>

            <Section title="3. User Responsibilities">
              <Text>You agree to:</Text>
              <ul style={{ margin: "8px 0", paddingLeft: 24 }}>
                <li>Provide accurate and complete information when creating an account</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not use the Service to harm, harass, or violate the rights of others</li>
              </ul>
            </Section>

            <Section title="4. Community Guidelines">
              <Text>
                Users must comply with our Community Guidelines, which prohibit:
              </Text>
              <ul style={{ margin: "8px 0", paddingLeft: 24 }}>
                <li>Creating or distributing malicious software or code</li>
                <li>Attempting to gain unauthorized access to systems or data</li>
                <li>Sharing illegal, harmful, or objectionable content</li>
                <li>Impersonating others or misrepresenting your identity</li>
                <li>Interfering with the operation of the Service</li>
                <li>Violating intellectual property rights</li>
                <li>Spam, phishing, or other deceptive practices</li>
              </ul>
              <Text>
                Violation of these guidelines may result in immediate termination of your account without notice or refund.
              </Text>
            </Section>

            <Section title="5. Intellectual Property">
              <Text>
                You retain ownership of any content you create using the Service. By using the Service, you grant 
                Basebase a limited license to host, store, and display your content solely for the purpose of 
                providing the Service to you.
              </Text>
            </Section>

            <Section title="6. Third-Party Integrations">
              <Text>
                The Service may integrate with third-party applications and services. Your use of such integrations 
                is subject to the terms and policies of those third parties. Basebase is not responsible for the 
                availability, accuracy, or practices of third-party services.
              </Text>
            </Section>

            <Section title="7. Limitation of Liability">
              <Text fw={600}>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
              </Text>
              <Text mt="sm">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </Text>
              <Text mt="sm">
                BASEBASE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE 
                DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE 
                LOSSES, RESULTING FROM:
              </Text>
              <ul style={{ margin: "8px 0", paddingLeft: 24 }}>
                <li>Your access to or use of (or inability to access or use) the Service</li>
                <li>Any conduct or content of any third party on the Service</li>
                <li>Any content obtained from the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
                <li>Data loss, system failures, or service interruptions</li>
                <li>Errors, bugs, or inaccuracies in the Service</li>
              </ul>
              <Text mt="sm">
                IN NO EVENT SHALL BASEBASE'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU PAID 
                TO BASEBASE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), 
                WHICHEVER IS GREATER.
              </Text>
            </Section>

            <Section title="8. Indemnification">
              <Text>
                You agree to indemnify, defend, and hold harmless Basebase, its officers, directors, employees, 
                and agents from any claims, damages, losses, liabilities, and expenses (including reasonable 
                attorneys' fees) arising out of or related to your use of the Service, your violation of these 
                Terms, or your violation of any rights of another.
              </Text>
            </Section>

            <Section title="9. Termination">
              <Text>
                We may terminate or suspend your access to the Service immediately, without prior notice or 
                liability, for any reason, including breach of these Terms. Upon termination, your right to 
                use the Service will immediately cease.
              </Text>
            </Section>

            <Section title="10. Changes to Terms">
              <Text>
                We reserve the right to modify these Terms at any time. We will notify users of material changes 
                by posting the updated Terms on the Service. Your continued use of the Service after such changes 
                constitutes acceptance of the new Terms.
              </Text>
            </Section>

            <Section title="11. Governing Law">
              <Text>
                These Terms shall be governed by and construed in accordance with the laws of the State of 
                Delaware, without regard to its conflict of law provisions.
              </Text>
            </Section>

            <Section title="12. Contact">
              <Text>
                If you have questions about these Terms, please contact us at{" "}
                <Anchor href="mailto:legal@basebase.com" style={{ color: COLORS.coral }}>
                  legal@basebase.com
                </Anchor>
              </Text>
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

