/**
 * WCAI Best Practices 2026 - Email Signup Landing Page
 *
 * Landing page for the DWC 33rd Annual Educational Conference.
 * Collects emails from attendees who want to receive the
 * "AI Best Practices for Workers' Compensation" document.
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  Container,
  Stack,
  Title,
  Text,
  TextInput,
  Textarea,
  Button,
  Checkbox,
  Paper,
  Divider,
  Anchor,
  Alert,
  Modal,
  Box,
  Group,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconMail,
  IconCheck,
  IconShieldCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";
import { collections } from "./schema.js";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// Drop ad tracking cookie inherited from parent domain
document.cookie = '_gcl_au=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.basebase.com';

function SignupForm() {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, collections.signups), {
        email: trimmed,
        notes: notes.trim() || null,
        optIn,
        source: "dwc-2026-la",
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Paper
        p="xl"
        radius="md"
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
        }}
      >
        <Stack align="center" gap="md">
          <IconCheck size={48} color="#16a34a" stroke={1.5} />
          <Title order={3} ta="center" c="dark">
            You're on the list.
          </Title>
          <Text ta="center" c="dimmed" size="sm" maw={360}>
            We'll send you the document once it's published. Nothing else
            {!optIn && " — no newsletters, no follow-ups"}.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <>
      <Paper p="md" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email address"
              placeholder="you@example.com"
              type="email"
              size="md"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              leftSection={<IconMail size={18} />}
              required
              autoFocus
              styles={{
                input: { fontSize: "16px" }, // prevents iOS zoom
              }}
            />

            <Stack gap="xs" mt="sm">
              <Textarea
                label={<>Notes <Text span size="xs" c="dimmed">(optional)</Text></>}
                placeholder="Questions, topics of interest, or how you'd like to contribute"
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                minRows={2}
                autosize
                size="md"
                styles={{
                  input: { fontSize: "16px" },
                }}
              />

              <Checkbox
                label="I'm open to occasional updates on AI in workers' compensation (optional)"
                checked={optIn}
                onChange={(e) => setOptIn(e.currentTarget.checked)}
                size="sm"
                styles={{ label: { color: "#6b7280" } }}
              />
            </Stack>

            {error && (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={16} />}
              >
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              size="md"
              fullWidth
              loading={submitting}
              leftSection={!submitting ? <IconMail size={16} /> : undefined}
            >
              Notify me when ready
            </Button>
          </Stack>
        </form>

        <Group justify="center" mt="md">
          <Text size="xs" c="dimmed">
            <IconShieldCheck
              size={14}
              style={{ verticalAlign: "middle", marginRight: 4 }}
            />
            Your email will only be used to deliver this document.{" "}
            <Anchor
              size="xs"
              onClick={() => setPrivacyOpen(true)}
              style={{ cursor: "pointer" }}
            >
              Privacy details
            </Anchor>
          </Text>
        </Group>
      </Paper>

      <Modal
        opened={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy Commitment"
        size="md"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            We collect your email address solely to send you the completed{" "}
            <em>Best Practices for Responsible AI in Workers' Compensation
            and Medicolegal Decision-Making</em> document.
          </Text>
          <Text size="sm" fw={600}>
            What we will do:
          </Text>
          <Text size="sm" component="ul" style={{ paddingLeft: 20, margin: 0 }}>
            <li>Send you the document once it is published.</li>
            <li>
              If you opted in, send occasional updates related to AI in
              workers' compensation. You can unsubscribe at any time.
            </li>
          </Text>
          <Text size="sm" fw={600}>
            What we will not do:
          </Text>
          <Text size="sm" component="ul" style={{ paddingLeft: 20, margin: 0 }}>
            <li>Sell, share, or trade your email address.</li>
            <li>Add you to any marketing list without your consent.</li>
            <li>Send unrelated communications.</li>
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            Questions? Contact{" "}
            <Anchor href="mailto:ben@basebase.com" size="sm">
              ben@basebase.com
            </Anchor>
          </Text>
          <Divider />
          <Text size="xs" c="dimmed">
            This site respects your privacy. It does not use cookies or
            other tracking technologies.
          </Text>
        </Stack>
      </Modal>
    </>
  );
}

function App() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <Box
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Container size="xs" py="xl" px="md" style={{ maxWidth: "100%", boxSizing: "border-box" }}>
          <Stack gap="lg">
            {/* Header */}
            <Stack gap={4} align="center">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" ls={1} ta="center">
                Workers' Compensation and Medicolegal AI Working Group
              </Text>
              <Title order={1} ta="center" c="dark" lh={1.3}
                style={{ fontSize: "clamp(1rem, 4vw, 1.5rem)", wordBreak: "break-word" }}>
                Best Practices for Responsible AI in Workers' Compensation and Medicolegal Decision-Making
              </Title>
            </Stack>

            {/* Description */}
            <Text ta="center" c="dimmed" size="sm">
              A practical guide being developed by practitioners, for
              practitioners. Leave your email and we'll send you the document
              when it's published Spring 2026.
            </Text>

            <Divider />

            {/* Signup Form */}
            <SignupForm />

            <Divider />

            {/* Attribution */}
            <Stack gap={6} align="center">
              <Text size="xs" c="dimmed" ta="center">
                Developed by the{" "}
                <Anchor
                  size="xs"
                  onClick={() => setAboutOpen(true)}
                  style={{ cursor: "pointer" }}
                >
                  WCM-AI Group
                </Anchor>
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                First offered at the California DWC Annual Conference, Los Angeles 2026
              </Text>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Modal
        opened={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="About the WCM-AI Group"
        size="md"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            The Workers' Compensation and Medicolegal AI Working Group is an
            all-volunteer body whose goal is to help establish practical,
            credible guidelines for the responsible use of AI in workers'
            compensation, with the ultimate goal of improving the system for
            all participants.
          </Text>
          <Divider />
          <Text size="sm" fw={600}>Members</Text>
          <Stack gap={4}>
            <Text size="sm">Christopher R. Brigham, MD</Text>
            <Text size="sm">Judge David Langham</Text>
            <Text size="sm">Mark Melhorn, MD</Text>
            <Text size="sm">Barry Gelinas, MD, DC</Text>
            <Text size="sm">Alex Almazan, Esq.</Text>
            <Text size="sm">Waqas Ahmad Buttar</Text>
            <Text size="sm">Robert Wilson</Text>
            <Text size="sm">Mark Pew</Text>
            <Text size="sm">Connor Atchison</Text>
            <Text size="sm">Ben Wen</Text>
          </Stack>
          <Divider />
          <Text size="xs" c="dimmed">
            AI was used to create this website.
          </Text>
        </Stack>
      </Modal>
    </MantineProvider>
  );
}

// Mount app
const container = document.getElementById("app");
let root = null;

function render() {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<App />);
}

render();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
