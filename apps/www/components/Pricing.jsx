/**
 * Pricing Page
 */

import React, { useEffect } from "react";
import { Box, Container, Text, Stack, Group, Button, Anchor } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";

const COLORS = {
  coral: "#ff715b",
  coralLight: "#fff0ed",
  slate: "#416165",
  slateLight: "#5a7a7e",
  slateDark: "#334d4e",
  teal: "#17bebb",
  tealLight: "#e0f7f7",
  grey: "#e8eced",
  greyLight: "#f4f6f6",
  white: "#FFFFFF",
  offWhite: "#faf9f7",
};

/** @type {{ name: string; price: string; period: string; description: string; features: { text: string; included: boolean }[]; cta: string; popular?: boolean; }[]} */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for experimenting and building your first app",
    features: [
      { text: "1 data source connection", included: true },
      { text: "Unlimited apps", included: true },
      { text: "Basic views (table, list, grid)", included: true },
      { text: "Share with up to 3 users", included: true },
      { text: "Community support", included: true },
      { text: "LLM / AI features", included: false },
      { text: "Email / SMS notifications", included: false },
      { text: "Custom domains", included: false },
    ],
    cta: "Start free",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For individuals and small teams who need full power",
    popular: true,
    features: [
      { text: "5 data source connections", included: true },
      { text: "Unlimited apps", included: true },
      { text: "All views + custom layouts", included: true },
      { text: "Share with up to 10 users", included: true },
      { text: "Priority support", included: true },
      { text: "LLM / AI features included", included: true },
      { text: "Email notifications (500/mo)", included: true },
      { text: "Custom domains", included: false },
    ],
    cta: "Start 14-day trial",
  },
  {
    name: "Team",
    price: "$99",
    period: "/month",
    description: "For growing teams with advanced needs",
    features: [
      { text: "Unlimited data source connections", included: true },
      { text: "Unlimited apps", included: true },
      { text: "All views + custom layouts", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Dedicated support", included: true },
      { text: "LLM / AI features included", included: true },
      { text: "Email + SMS (5,000/mo)", included: true },
      { text: "Custom domains", included: true },
    ],
    cta: "Start 14-day trial",
  },
];

/** @type {{ category: string; free: string; pro: string; team: string }[]} */
const COMPARISON = [
  { category: "Data source connections", free: "1", pro: "5", team: "Unlimited" },
  { category: "Apps", free: "Unlimited", pro: "Unlimited", team: "Unlimited" },
  { category: "Team members", free: "3", pro: "10", team: "Unlimited" },
  { category: "LLM / AI features", free: "—", pro: "✓", team: "✓" },
  { category: "Email notifications", free: "—", pro: "500/mo", team: "5,000/mo" },
  { category: "SMS notifications", free: "—", pro: "—", team: "1,000/mo" },
  { category: "Custom domains", free: "—", pro: "—", team: "✓" },
  { category: "API access", free: "—", pro: "✓", team: "✓" },
  { category: "SSO / SAML", free: "—", pro: "—", team: "✓" },
  { category: "Support", free: "Community", pro: "Priority", team: "Dedicated" },
];

/** @type {{ question: string; answer: string }[]} */
const FAQS = [
  {
    question: "What counts as a data source connection?",
    answer: "A data source connection is any external service you connect to pull or push data—like Airtable, Google Sheets, Salesforce, or Slack. You can connect and disconnect sources anytime.",
  },
  {
    question: "What are LLM / AI features?",
    answer: "AI features let you use natural language to generate app components, analyze data, summarize content, and more. These features use OpenAI and other AI providers, which have usage costs we cover for Pro and Team plans.",
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer: "Absolutely! You can change your plan at any time. When upgrading, you'll be prorated for the remainder of your billing cycle. When downgrading, changes take effect at your next billing date.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! Pro and Team plans come with a 14-day free trial. No credit card required to start—we'll only ask for payment details at the end of your trial if you want to continue.",
  },
  {
    question: "What happens if I exceed my limits?",
    answer: "We'll notify you when you're approaching limits. If you exceed them, your apps will continue to work, but you won't be able to add new connections or send additional notifications until you upgrade or wait for your next billing cycle.",
  },
];

/**
 * @param {{ onBack: () => void; onSignIn?: () => void }} props
 */
export default function Pricing({ onBack, onSignIn }) {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /** @type {() => void} */
  const handleStartBuilding = () => {
    if (onSignIn) {
      onSignIn();
      return;
    }

    // Fallback for contexts where auth isn't wired (e.g. purely public render).
    // Navigate back home without a full reload.
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

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
        <Container size="lg">
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
              Simple, transparent{" "}
              <span style={{ color: COLORS.coral }}>pricing</span>
            </Text>
            <Text
              ta="center"
              size="xl"
              style={{ color: COLORS.slateLight, maxWidth: 600, lineHeight: 1.6 }}
            >
              Start free and upgrade when you need more power. No hidden fees,
              no surprises.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Pricing Cards */}
      <Box py={80}>
        <Container size="lg">
          <Group gap={24} justify="center" align="stretch" wrap="wrap">
            {PLANS.map((plan) => (
              <Box
                key={plan.name}
                p="xl"
                style={{
                  background: plan.popular ? COLORS.slate : COLORS.white,
                  borderRadius: 20,
                  width: 320,
                  border: plan.popular ? "none" : `2px solid ${COLORS.grey}`,
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {plan.popular && (
                  <Box
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: COLORS.coral,
                      color: COLORS.white,
                      padding: "4px 16px",
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Most Popular
                  </Box>
                )}
                <Stack gap="md" style={{ flex: 1 }}>
                  <Stack gap={4}>
                    <Text
                      fw={600}
                      size="lg"
                      style={{ color: plan.popular ? COLORS.white : COLORS.slate }}
                    >
                      {plan.name}
                    </Text>
                    <Group gap={4} align="baseline">
                      <Text
                        style={{
                          fontSize: 40,
                          fontWeight: 700,
                          color: plan.popular ? COLORS.white : COLORS.slate,
                          lineHeight: 1,
                        }}
                      >
                        {plan.price}
                      </Text>
                      <Text
                        size="sm"
                        style={{ color: plan.popular ? COLORS.grey : COLORS.slateLight }}
                      >
                        {plan.period}
                      </Text>
                    </Group>
                    <Text
                      size="sm"
                      style={{
                        color: plan.popular ? COLORS.grey : COLORS.slateLight,
                        lineHeight: 1.5,
                      }}
                    >
                      {plan.description}
                    </Text>
                  </Stack>

                  <Stack gap={8} style={{ flex: 1 }}>
                    {plan.features.map((feature, i) => (
                      <Group key={i} gap={8} wrap="nowrap">
                        {feature.included ? (
                          <IconCheck
                            size={16}
                            style={{ color: plan.popular ? COLORS.teal : COLORS.teal, flexShrink: 0 }}
                          />
                        ) : (
                          <IconX
                            size={16}
                            style={{ color: plan.popular ? COLORS.slateLight : COLORS.grey, flexShrink: 0 }}
                          />
                        )}
                        <Text
                          size="sm"
                          style={{
                            color: feature.included
                              ? plan.popular
                                ? COLORS.white
                                : COLORS.slate
                              : plan.popular
                                ? COLORS.slateLight
                                : COLORS.slateLight,
                          }}
                        >
                          {feature.text}
                        </Text>
                      </Group>
                    ))}
                  </Stack>

                  <Button
                    fullWidth
                    size="md"
                    onClick={handleStartBuilding}
                    style={{
                      background: plan.popular ? COLORS.coral : COLORS.white,
                      color: plan.popular ? COLORS.white : COLORS.coral,
                      border: plan.popular ? "none" : `2px solid ${COLORS.coral}`,
                      borderRadius: 100,
                      fontWeight: 600,
                      marginTop: 16,
                    }}
                  >
                    {plan.cta}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Group>
        </Container>
      </Box>

      {/* Comparison Table */}
      <Box py={80} style={{ background: COLORS.greyLight }}>
        <Container size="lg">
          <Stack gap={48}>
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
              Compare plans
            </Text>

            <Box
              style={{
                background: COLORS.white,
                borderRadius: 16,
                overflow: "hidden",
                border: `1px solid ${COLORS.grey}`,
              }}
            >
              {/* Header row */}
              <Group
                gap={0}
                style={{
                  background: COLORS.slate,
                  padding: "16px 24px",
                }}
              >
                <Text fw={600} style={{ color: COLORS.white, flex: 2 }}>
                  Feature
                </Text>
                <Text fw={600} ta="center" style={{ color: COLORS.white, flex: 1 }}>
                  Free
                </Text>
                <Text fw={600} ta="center" style={{ color: COLORS.white, flex: 1 }}>
                  Pro
                </Text>
                <Text fw={600} ta="center" style={{ color: COLORS.white, flex: 1 }}>
                  Team
                </Text>
              </Group>

              {/* Rows */}
              {COMPARISON.map((row, i) => (
                <Group
                  key={i}
                  gap={0}
                  style={{
                    padding: "16px 24px",
                    borderBottom: i < COMPARISON.length - 1 ? `1px solid ${COLORS.grey}` : "none",
                  }}
                >
                  <Text size="sm" style={{ color: COLORS.slate, flex: 2 }}>
                    {row.category}
                  </Text>
                  <Text size="sm" ta="center" style={{ color: COLORS.slateLight, flex: 1 }}>
                    {row.free}
                  </Text>
                  <Text size="sm" ta="center" style={{ color: COLORS.slateLight, flex: 1 }}>
                    {row.pro}
                  </Text>
                  <Text size="sm" ta="center" style={{ color: COLORS.slateLight, flex: 1 }}>
                    {row.team}
                  </Text>
                </Group>
              ))}
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* FAQs */}
      <Box py={80}>
        <Container size="md">
          <Stack gap={48}>
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
              Frequently asked questions
            </Text>

            <Stack gap={24}>
              {FAQS.map((faq, i) => (
                <Box
                  key={i}
                  p="lg"
                  style={{
                    background: COLORS.greyLight,
                    borderRadius: 12,
                  }}
                >
                  <Text fw={600} mb={8} style={{ color: COLORS.slate }}>
                    {faq.question}
                  </Text>
                  <Text size="sm" style={{ color: COLORS.slateLight, lineHeight: 1.7 }}>
                    {faq.answer}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={80} style={{ background: COLORS.coral }}>
        <Container size="md">
          <Stack align="center" gap="lg">
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
              Ready to get started?
            </Text>
            <Text ta="center" size="lg" style={{ color: COLORS.coralLight, maxWidth: 500 }}>
              Start building for free. No credit card required.
            </Text>
            <Button
              size="lg"
              onClick={handleStartBuilding}
              style={{
                background: COLORS.white,
                color: COLORS.coral,
                borderRadius: 100,
                padding: "14px 36px",
                height: "auto",
                fontWeight: 600,
                border: "none",
              }}
            >
              Browse Solution Gallery
            </Button>
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
