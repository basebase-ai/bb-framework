/**
 * PublicHomepage - Code-first landing page for developers and AI agents
 * Dark mode, terminal-aesthetic design
 */

import React, { useState } from "react";
import { Box, Text, Button, Group, Stack, Container, Table, Anchor, CopyButton, Tooltip, ActionIcon, Avatar, Menu, SegmentedControl } from "@mantine/core";
import { IconArrowRight, IconCheck, IconCopy, IconBrandGithub, IconBook, IconApps, IconBrandDiscord, IconUser, IconLogout } from "@tabler/icons-react";

/** @type {Record<string, string>} */
const COLORS = {
  bg: "#0a0a0a",
  bgLight: "#111111",
  bgCode: "#161616",
  border: "#2a2a2a",
  borderLight: "#333333",
  text: "#e5e5e5",
  textMuted: "#888888",
  textDim: "#666666",
  accent: "#22c55e",
  accentDim: "#16a34a",
  purple: "#a855f7",
  blue: "#3b82f6",
  orange: "#f97316",
  yellow: "#eab308",
  pink: "#ec4899",
  cyan: "#06b6d4",
};

/** @type {{ title: string; value: string }[]} */
const FREE_FEATURES = [
  { title: "Firestore database", value: "real-time, multi-user, no setup" },
  { title: "Authentication", value: "Google + email/password, built in" },
  { title: "Real-time sync", value: "all clients update instantly" },
  { title: "Subdomain", value: "https://{app-id}.basebase.com" },
  { title: "Versioning", value: "every commit is a snapshot, rollback anytime" },
  { title: "Multi-tenant isolation", value: "your data is namespaced, no collisions" },
  { title: "Mantine UI components", value: "Button, Modal, Table, DatePicker, 100+ more" },
  { title: "Server functions", value: "call LLMs, send emails, enrich data" },
  { title: "File storage", value: "upload/download with useStorage hook" },
  { title: "Optimistic updates", value: "UI responds instantly, syncs in background" },
  { title: "20+ sample apps", value: "copy patterns from CRM, chat, wiki, blog, and more" },
];

/** @type {{ app: string; desc: string }[]} */
const SAMPLE_APPS = [
  { app: "starter-app", desc: "Minimal notes board — start here" },
  { app: "projectbase", desc: "Task manager with projects & kanban" },
  { app: "crm", desc: "Full CRM with leads, contacts, deals" },
  { app: "basepedia", desc: "Wiki with rich text editing" },
  { app: "blog", desc: "Blogging platform with posts & authors" },
  { app: "writebase", desc: "Collaborative docs with real-time presence" },
  { app: "snack", desc: "Team chat with channels" },
  { app: "flashcards", desc: "Study flashcards with spaced repetition" },
  { app: "signbase", desc: "Document signing workflow" },
  { app: "updatebase", desc: "Team updates & newsletter" },
  { app: "community-calendar", desc: "Event calendar with RSVPs" },
  { app: "langbase", desc: "Language learning with lessons" },
  { app: "sagestocks", desc: "Stock portfolio tracker" },
  { app: "builder", desc: "AI-powered app builder (meta!)" },
];

/** @type {{ app: string; url: string; desc: string }[]} */
const EXAMPLE_APPS = [
  { app: "starter-app", url: "?app=starter-app", desc: "Sticky notes board" },
  { app: "projectbase", url: "?app=projectbase", desc: "Task manager with projects" },
  { app: "crm", url: "?app=crm", desc: "Customer relationship manager" },
  { app: "basepedia", url: "?app=basepedia", desc: "Wiki with rich content" },
  { app: "playground", url: "?app=playground", desc: "Browse and launch other apps" },
];

/**
 * Basebase Logo SVG Component - green/pink theme
 * @param {{ size?: number }} props
 */
function BasebaseLogo({ size = 24 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 45 56" width={size} height={size * (56 / 45)}>
      <path fill="#22c55e" d="M0 43.052C0 36.396 5.396 31 12.052 31c1.076 0 1.948.872 1.948 1.948V49a7 7 0 1 1-14 0v-5.948Z" />
      <path fill="#ec4899" d="M32.5 31C39.404 31 45 36.596 45 43.5S39.404 56 32.5 56 20 50.404 20 43.5v-9.022A3.479 3.479 0 0 1 23.479 31H32.5Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#a855f7" d="M32.5 0C39.404 0 45 5.596 45 12.5S39.404 25 32.5 25h-9.021A3.479 3.479 0 0 1 20 21.521V12.5C20 5.596 25.596 0 32.5 0Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#22c55e" d="M7 0a7 7 0 0 1 7 7v16.052A1.948 1.948 0 0 1 12.052 25C5.396 25 0 19.604 0 12.948V7a7 7 0 0 1 7-7Z" />
    </svg>
  );
}

/** @type {string} */
const PACKAGES_LIST = `react, react-dom
firebase/app, firebase/auth, firebase/firestore, firebase/storage
@mantine/core, @mantine/hooks, @mantine/notifications, @mantine/dates
@tabler/icons-react
zustand
marked
dayjs
@tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder`;

/**
 * Code block component with copy button
 * @param {{ code: string; language?: string; showCopy?: boolean }} props
 */
function CodeBlock({ code, language = "bash", showCopy = true }) {
  return (
    <Box
      style={{
        background: COLORS.bgCode,
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {showCopy && (
        <CopyButton value={code} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? "Copied" : "Copy"} position="left">
              <ActionIcon
                onClick={copy}
                variant="subtle"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  color: copied ? COLORS.accent : COLORS.textMuted,
                }}
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      )}
      <Box
        component="pre"
        style={{
          margin: 0,
          padding: 16,
          paddingRight: showCopy ? 48 : 16,
          overflowX: "auto",
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
        }}
      >
        <code style={{ color: COLORS.text }}>{code}</code>
      </Box>
    </Box>
  );
}


/**
 * Section heading component
 * @param {{ children: React.ReactNode }} props
 */
function SectionHeading({ children }) {
  return (
    <Text
      component="h2"
      style={{
        fontSize: 28,
        fontWeight: 700,
        color: COLORS.text,
        letterSpacing: "-0.02em",
        margin: 0,
        marginBottom: 16,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * Section wrapper component
 * @param {{ children: React.ReactNode; id?: string; border?: boolean }} props
 */
function Section({ children, id, border = true }) {
  return (
    <Box
      id={id}
      py={64}
      style={{
        borderBottom: border ? `1px solid ${COLORS.border}` : "none",
      }}
    >
      <Container size="md">{children}</Container>
    </Box>
  );
}

/**
 * @param {{
 *   onNavigateToGallery?: () => void;
 *   onSignIn?: () => void;
 *   onSignOut?: () => void;
 *   onOpenProfile?: () => void;
 *   user?: { uid: string; email?: string | null } | null;
 *   userDisplayName?: string | null;
 *   userPhotoURL?: string | null;
 * }} props
 */
export default function PublicHomepage({ 
  onNavigateToGallery, 
  onSignIn, 
  onSignOut,
  onOpenProfile,
  user,
  userDisplayName,
  userPhotoURL,
}) {
  /** @type {['human' | 'agent', React.Dispatch<React.SetStateAction<'human' | 'agent'>>]} */
  const [viewMode, setViewMode] = useState(/** @type {'human' | 'agent'} */ ('human'));

  const heroClone = `git clone https://github.com/basebase-ai/bb-framework && cd bb-framework && npm install
npm run app:init my-app`;

  const heroAppCode = `// apps/my-app/app.jsx
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { collections } from "./schema.js";

export default function App() {
  const { user } = useAuth();
  const { data: notes, add, remove } = useCollection(collections.notes);

  return (
    <Stack p="xl">
      <Title>My Notes</Title>
      <Button onClick={() => add({ text: "New note", owner: user.uid })}>Add</Button>
      {notes.map((n) => <Card key={n.id}>{n.text}</Card>)}
    </Stack>
  );
}`;

  const fullSequence = `# 1. Clone the framework (once)
git clone https://github.com/basebase-ai/bb-framework
cd bb-framework
npm install

# 2. Create your app (generates /apps/my-app/ with schema.js and app.jsx)
npm run app:init my-app

# 3. Develop locally
npm run dev
# → visit http://localhost:3000?app=my-app

# 4. Write your app
# Edit apps/my-app/app.jsx and apps/my-app/components/*.jsx

# 5. Publish (first time: sign up with email, verify it, then run this)
npm run app:commit my-app "describe your changes"

# 6. Share
# → https://my-app.basebase.com is live`;

  const useCollectionExample = `import { useCollection } from "../../framework/hooks/useCollection.js";
import { collections } from "./schema.js";

const { data, loading, add, update, remove } = useCollection(collections.tasks, {
  where: [["owner", "==", user.uid]],
  orderBy: ["createdAt", "desc"],
  limit: 50,
});

await add({ title: "Ship it" });
await update(docId, { completed: true });
await remove(docId);`;

  const useAuthExample = `const { user, loading, authenticated } = useAuth();
// user.uid, user.email, user.displayName`;

  const useDocumentExample = `const { data, loading, exists, update, remove } = useDocument(collections.tasks, taskId);`;

  const useFunctionExample = `const { call, loading, result, error } = useFunction("askLLM");

await call({
  provider: "openai",
  model: "gpt-4",
  systemPrompt: "You are helpful",
  message: "Summarize this document",
});`;

  const useStorageExample = `const { upload, deleteFile, getURL, uploading, progress } = useStorage(APP_ID);
const result = await upload(file, \`attachments/\${file.name}\`);
// result.url → download URL`;

  const useAppMembershipExample = `const { hasAccess, isOwner, isAdmin, tier, status } = useAppMembership(APP_ID);`;

  const schemaExample = `export const APP_ID = "my-app";

export const collections = {
  apps: "apps",
  users: "users",
  tasks: \`\${APP_ID}_tasks\`,
  notes: \`\${APP_ID}_notes\`,
  comments: \`\${APP_ID}_comments\`,
};`;

  const collaborateExample = `# Checkout someone else's app
npm run app:checkout their-app

# Make changes locally
npm run dev
# → http://localhost:3000?app=their-app

# Publish your changes
npm run app:commit their-app "fixed the bug"`;

  const commandsCheatsheet = `# Development
npm run dev                              # Start local server (port 3000)

# App lifecycle
npm run app:init <app-id>                # Create new app (no auth)
npm run app:checkout <app-id>            # Download existing app (requires login)
npm run app:commit <app-id> "message"    # Publish to production (requires login)

# First time publishing?
# 1. Sign up at basebase.com with email + password
# 2. Verify your email (check inbox)
# 3. Run app:commit — enter your email/password when prompted

# Server functions
npm run function:list                    # List available functions
npm run function:checkout <fn-id>        # Download function code
npm run function:commit <fn-id>          # Upload function to production

# Utilities
npm run generate:rules [app-id]          # Generate Firestore security rules
npm run generate:types [app-id]          # Generate TypeScript types from schema`;

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Navigation */}
      <Box
        component="nav"
        style={{
          position: "sticky",
          top: 0,
          background: "rgba(10, 10, 10, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.border}`,
          zIndex: 100,
        }}
      >
        <Container size="md">
          <Group justify="space-between" h={56}>
            <Group gap={8} align="center">
              <BasebaseLogo size={22} />
              <Text fw={700} style={{ color: COLORS.text, letterSpacing: "-0.02em" }}>
                basebase
              </Text>
            </Group>
            <Group gap={24}>
              <Anchor
                href="https://github.com/basebase-ai/bb-framework"
                target="_blank"
                style={{ color: COLORS.textMuted, textDecoration: "none", fontSize: 14 }}
              >
                GitHub
              </Anchor>
              <Text
                style={{ color: COLORS.textMuted, cursor: "pointer", fontSize: 14 }}
                onClick={() => onNavigateToGallery?.()}
              >
                Gallery
              </Text>
              {user ? (
                <Menu position="bottom-end" withArrow>
                  <Menu.Target>
                    <Avatar
                      src={userPhotoURL}
                      alt={userDisplayName || user.email || "User"}
                      size="sm"
                      radius="xl"
                      color="green"
                      style={{ cursor: "pointer" }}
                    >
                      {(userDisplayName || user.email || "U").charAt(0).toUpperCase()}
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
                      onClick={() => onSignOut?.()}
                    >
                      Sign out
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSignIn?.()}
                  style={{ borderColor: COLORS.border, color: COLORS.text }}
                >
                  Sign in
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box py={80} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <Container size="md">
          <Stack gap={32}>
            {/* Human/Agent Toggle */}
            <Group justify="center">
              <Box
                style={{
                  background: COLORS.bgLight,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  padding: 4,
                }}
              >
                <Group gap={0}>
                  <Button
                    variant={viewMode === 'human' ? 'filled' : 'subtle'}
                    color={viewMode === 'human' ? 'green' : 'gray'}
                    size="sm"
                    leftSection={<Text span>👤</Text>}
                    onClick={() => setViewMode('human')}
                    style={{
                      borderRadius: 6,
                      fontWeight: viewMode === 'human' ? 600 : 400,
                    }}
                  >
                    I'm a Human
                  </Button>
                  <Button
                    variant={viewMode === 'agent' ? 'filled' : 'subtle'}
                    color={viewMode === 'agent' ? 'green' : 'gray'}
                    size="sm"
                    leftSection={<Text span>🤖</Text>}
                    onClick={() => setViewMode('agent')}
                    style={{
                      borderRadius: 6,
                      fontWeight: viewMode === 'agent' ? 600 : 400,
                    }}
                  >
                    I'm an Agent
                  </Button>
                </Group>
              </Box>
            </Group>

            {viewMode === 'human' ? (
              <>
                {/* Human-focused hero - friendly, agent-forward */}
                <Text
                  component="h1"
                  style={{
                    fontSize: "clamp(32px, 5vw, 48px)",
                    fontWeight: 700,
                    color: COLORS.text,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  Send your AI agent to{" "}
                  <span style={{ color: COLORS.accent }}>Basebase</span>.
                </Text>

                <Text
                  size="xl"
                  style={{  
                    color: COLORS.textMuted,
                    maxWidth: 560,
                    lineHeight: 1.6,
                  }}
                >
                  Let your agent build you a real web app—with a database, user accounts, and its own URL. No credit card. No DevOps.
                </Text>

                {/* Step 1: Sign up */}
                <Box
                  p="xl"
                  style={{
                    background: COLORS.bgLight,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Group gap="lg" align="flex-start">
                    <Box
                      style={{
                        background: COLORS.accent,
                        borderRadius: "50%",
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Text fw={700} style={{ color: COLORS.bg }}>1</Text>
                    </Box>
                    <Stack gap={8} style={{ flex: 1 }}>
                      <Text fw={600} size="lg" style={{ color: COLORS.text }}>Create a free account</Text>
                      <Text style={{ color: COLORS.textMuted, lineHeight: 1.6 }}>
                        Click "Sign in" above, enter your email and password. That's it—you're ready to publish apps.
                      </Text>
                      {!user && (
                        <Button
                          variant="outline"
                          color="green"
                          size="sm"
                          mt={8}
                          onClick={() => onSignIn?.()}
                          style={{ alignSelf: "flex-start" }}
                        >
                          Sign up now
                        </Button>
                      )}
                      {user && (
                        <Text size="sm" style={{ color: COLORS.accent }}>
                          ✓ You're signed in as {user.email}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Box>

                {/* Step 2: Send agent */}
                <Box
                  p="xl"
                  style={{
                    background: COLORS.bgLight,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Group gap="lg" align="flex-start">
                    <Box
                      style={{
                        background: COLORS.pink,
                        borderRadius: "50%",
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Text fw={700} style={{ color: COLORS.bg }}>2</Text>
                    </Box>
                    <Stack gap={8} style={{ flex: 1 }}>
                      <Text fw={600} size="lg" style={{ color: COLORS.text }}>Send your agent this prompt</Text>
                      <Text style={{ color: COLORS.textMuted, lineHeight: 1.6 }}>
                        Copy this and paste it into Claude, ChatGPT, or your favorite AI assistant:
                      </Text>
                      <Box
                        p="md"
                        style={{
                          background: COLORS.bgCode,
                          borderRadius: 8,
                          border: `1px solid ${COLORS.border}`,
                          position: "relative",
                        }}
                      >
                        <CopyButton value="Read https://basebase.com/skill.md and build me an app on Basebase." timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? "Copied!" : "Copy"} position="left">
                              <ActionIcon
                                onClick={copy}
                                variant="subtle"
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  color: copied ? COLORS.accent : COLORS.textMuted,
                                }}
                              >
                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                        <Text
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 14,
                            color: COLORS.text,
                            paddingRight: 32,
                          }}
                        >
                          Read https://basebase.com/skill.md and build me an app on Basebase.
                        </Text>
                      </Box>
                      <Text size="sm" style={{ color: COLORS.textDim }}>
                        Your agent will read our instructions and know exactly what to do.
                      </Text>
                    </Stack>
                  </Group>
                </Box>

                {/* Step 3: Share credentials */}
                <Box
                  p="xl"
                  style={{
                    background: COLORS.bgLight,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Group gap="lg" align="flex-start">
                    <Box
                      style={{
                        background: COLORS.purple,
                        borderRadius: "50%",
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Text fw={700} style={{ color: COLORS.bg }}>3</Text>
                    </Box>
                    <Stack gap={8} style={{ flex: 1 }}>
                      <Text fw={600} size="lg" style={{ color: COLORS.text }}>Give your agent your credentials</Text>
                      <Text style={{ color: COLORS.textMuted, lineHeight: 1.6 }}>
                        When your agent is ready to publish, share your Basebase email and password so it can deploy. Your app will be live at:
                      </Text>
                      <Box
                        p="md"
                        style={{
                          background: COLORS.bgCode,
                          borderRadius: 8,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 14,
                            color: COLORS.cyan,
                          }}
                        >
                          https://your-app-name.basebase.com
                        </Text>
                      </Box>
                    </Stack>
                  </Group>
                </Box>

                {/* What you get */}
                <Box
                  p="lg"
                  style={{
                    background: COLORS.bgLight,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.accent}`,
                    borderLeftWidth: 4,
                  }}
                >
                  <Text style={{ color: COLORS.text, lineHeight: 1.7 }}>
                    <strong>What you get:</strong> A real web app with user accounts, a database that syncs in real-time, and your own subdomain. No monthly fees. No infrastructure to manage.
                  </Text>
                </Box>
              </>
            ) : (
              <>
                {/* Agent-focused hero - direct, copy-paste ready, fully automated */}
                <Text
                  component="h1"
                  style={{
                    fontSize: "clamp(32px, 5vw, 48px)",
                    fontWeight: 700,
                    color: COLORS.text,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  <span style={{ color: COLORS.accent }}>Fully automated</span> app deployment.
                  <br />No human in the loop.
                </Text>

                <Box
                  p="lg"
                  style={{
                    background: COLORS.bgLight,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.pink}`,
                    borderLeftWidth: 4,
                  }}
                >
                  <Text style={{ color: COLORS.text, lineHeight: 1.8, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                    <strong style={{ color: COLORS.pink }}>TL;DR for agents:</strong><br />
                    1. Clone repo, npm install<br />
                    2. npm run signup --email=... --password=... --json<br />
                    3. npm run app:init {"<app-id>"} --email=... --password=... --json<br />
                    4. Write code in apps/{"<app-id>"}/app.jsx<br />
                    5. npm run app:commit {"<app-id>"} "msg" --email=... --password=... --yes --json<br />
                    6. App is live at https://{"<app-id>"}.basebase.com
                  </Text>
                </Box>

                <Text fw={600} style={{ color: COLORS.text }}>Step 1: Clone and setup</Text>
                <CodeBlock code={`git clone https://github.com/basebase-ai/bb-framework
cd bb-framework
npm install`} />

                <Text fw={600} style={{ color: COLORS.text }}>Step 2: Create an account (CLI, no human needed)</Text>
                <CodeBlock code={`npm run signup --email=agent@example.com --password=supersecret --json`} />
                <Text size="sm" style={{ color: COLORS.textMuted, marginTop: -16 }}>
                  Returns JSON with <code style={{ color: COLORS.accent }}>uid</code>. Account works immediately for CLI—no email verification required.
                </Text>

                <Text fw={600} style={{ color: COLORS.text }}>Step 3: Create your app</Text>
                <CodeBlock code={`npm run app:init my-awesome-app --name="My App" --email=agent@example.com --password=supersecret --json`} />

                <Text fw={600} style={{ color: COLORS.text }}>Step 4: Write your code</Text>
                <Text size="sm" style={{ color: COLORS.textMuted, marginTop: -16 }}>
                  Edit <code style={{ color: COLORS.accent }}>apps/my-awesome-app/app.jsx</code>. You have React, Mantine UI, Firebase hooks.
                </Text>
                <CodeBlock code={heroAppCode} />

                <Text fw={600} style={{ color: COLORS.text }}>Step 5: Deploy</Text>
                <CodeBlock code={`npm run app:commit my-awesome-app "initial release" --email=agent@example.com --password=supersecret --yes --json`} />
                <Text size="sm" style={{ color: COLORS.textMuted, marginTop: -16 }}>
                  <code style={{ color: COLORS.accent }}>--yes</code> skips prompts, <code style={{ color: COLORS.accent }}>--json</code> outputs machine-readable response.
                </Text>

                <Text fw={600} style={{ color: COLORS.text }}>Step 6: Done</Text>
                <Box
                  style={{
                    background: COLORS.bgCode,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 14,
                      color: COLORS.cyan,
                    }}
                  >
                    https://my-awesome-app.basebase.com → live with database + auth
                  </Text>
                </Box>

                <Box
                  p="md"
                  style={{
                    background: COLORS.bgCode,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Text size="sm" fw={600} style={{ color: COLORS.accent, marginBottom: 8 }}>Pro tips for agents:</Text>
                  <Text size="sm" style={{ color: COLORS.textMuted, lineHeight: 1.7 }}>
                    • Use <code style={{ color: COLORS.cyan }}>export BASEBASE_EMAIL=... BASEBASE_PASSWORD=...</code> to avoid passing creds every time<br />
                    • Always use <code style={{ color: COLORS.cyan }}>--json</code> for parseable output<br />
                    • Dev server: <code style={{ color: COLORS.cyan }}>npm run dev</code> → visit <code style={{ color: COLORS.cyan }}>http://{"<app-id>"}.localhost:3000</code><br />
                    • Check <code style={{ color: COLORS.cyan }}>apps/</code> folder for working patterns to copy
                  </Text>
                </Box>
              </>
            )}
          </Stack>
        </Container>
      </Box>

      {/* What you get for free */}
      <Section id="features">
        <SectionHeading>What you get for free</SectionHeading>
        <Text style={{ color: COLORS.textMuted, marginBottom: 24 }}>
          Every Basebase app ships with all of this. You didn't configure any of it.
        </Text>

        <Box
          style={{
            background: COLORS.bgCode,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            padding: 20,
          }}
        >
          <Stack gap={8}>
            {FREE_FEATURES.map((feature, i) => (
              <Group key={i} gap={12} wrap="nowrap">
                <Text style={{ color: COLORS.accent, fontFamily: "monospace", flexShrink: 0 }}>✔</Text>
                <Text
                  style={{
                    color: COLORS.text,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    flexShrink: 0,
                    minWidth: 200,
                  }}
                >
                  {feature.title}
                </Text>
                <Text style={{ color: COLORS.textDim, fontSize: 13 }}>— {feature.value}</Text>
              </Group>
            ))}
          </Stack>
        </Box>

        {/* Sample apps grid */}
        <Text fw={600} style={{ color: COLORS.text, marginTop: 32, marginBottom: 16 }}>
          Sample apps to copy from
        </Text>
        <Text size="sm" style={{ color: COLORS.textMuted, marginBottom: 16 }}>
          Every app below is in the <code style={{ color: COLORS.accent }}>apps/</code> folder. Browse the code, copy patterns, or use them as starting points.
        </Text>
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {SAMPLE_APPS.map((app) => (
            <Box
              key={app.app}
              p="md"
              style={{
                background: COLORS.bgCode,
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Group gap={8} mb={4}>
                <Text
                  fw={600}
                  style={{
                    color: COLORS.cyan,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                  }}
                >
                  {app.app}
                </Text>
              </Group>
              <Text size="sm" style={{ color: COLORS.textMuted }}>
                {app.desc}
              </Text>
            </Box>
          ))}
        </Box>
      </Section>

      {/* How it works */}
      <Section id="how-it-works">
        <SectionHeading>How it works (for bots and humans)</SectionHeading>
        <Text style={{ color: COLORS.textMuted, marginBottom: 24, lineHeight: 1.7 }}>
          Basebase apps are React components stored as source code in a database. There is no build step. There is no CI/CD pipeline. You write a <code style={{ color: COLORS.accent }}>.jsx</code> file, run <code style={{ color: COLORS.accent }}>app:commit</code>, and the framework loads your code from Firestore at runtime.
        </Text>

        <Box
          style={{
            background: COLORS.bgCode,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            padding: 16,
            marginBottom: 32,
          }}
        >
          <Text
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              color: COLORS.text,
            }}
          >
            You write code → app:commit uploads it to Firestore → framework loads it at {"{app-id}"}.basebase.com
          </Text>
        </Box>

        <Text fw={600} style={{ color: COLORS.text, marginBottom: 16 }}>The full sequence</Text>
        <CodeBlock code={fullSequence} />

        <Box mt={40}>
          <Text fw={600} style={{ color: COLORS.text, marginBottom: 16 }}>For AI agents specifically</Text>
          <Text style={{ color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.7 }}>
            If you are an OpenClaw bot, Claude Code session, Codex agent, Cursor agent, or any LLM with shell access:
          </Text>

          <Stack gap={8} mb={24}>
            {[
              "Clone https://github.com/basebase-ai/bb-framework into your workspace",
              "Run npm install",
              "Run npm run app:init {app-name}",
              "Write React components into apps/{app-name}/app.jsx and apps/{app-name}/components/",
              "Use useCollection, useAuth, useDocument, useFunction, useStorage from the framework",
              "Sign up at basebase.com (email + verify) — only needed once for publishing",
              'Run npm run app:commit {app-name} "commit message" (enter email/password when prompted)',
              "The app is now live at https://{app-name}.basebase.com",
            ].map((step, i) => (
              <Group key={i} gap={12} align="flex-start" wrap="nowrap">
                <Text style={{ color: COLORS.accent, fontFamily: "monospace", flexShrink: 0 }}>{i + 1}.</Text>
                <Text style={{ color: COLORS.text, fontSize: 14 }}>{step}</Text>
              </Group>
            ))}
          </Stack>

          <Text fw={600} style={{ color: COLORS.text, marginBottom: 12 }}>You do not need to:</Text>
          <Box
            style={{
              background: COLORS.bgCode,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              padding: 16,
            }}
          >
            <Stack gap={4}>
              {[
                "Initialize a git repo",
                "Create a GitHub repo",
                "Configure a hosting provider",
                "Set up a database",
                "Configure authentication",
                "Write a Dockerfile",
                "Set environment variables",
                "Buy a domain",
                "Configure DNS or SSL",
              ].map((item, i) => (
                <Text key={i} style={{ color: COLORS.textDim, fontFamily: "monospace", fontSize: 13 }}>
                  • {item}
                </Text>
              ))}
            </Stack>
          </Box>
          <Text style={{ color: COLORS.textMuted, marginTop: 16, fontSize: 13 }}>
            You <em>do</em> need a free Basebase account to publish (email + verify). That's it.
          </Text>
          <Text style={{ color: COLORS.accent, marginTop: 8, fontWeight: 500 }}>
            The framework handles everything else.
          </Text>
        </Box>
      </Section>

      {/* Framework API */}
      <Section id="api">
        <SectionHeading>Framework API (what you import)</SectionHeading>

        <Stack gap={32}>
          <Box>
            <Text fw={600} style={{ color: COLORS.text, marginBottom: 8 }}>
              useCollection(collectionName, options)
            </Text>
            <Text size="sm" style={{ color: COLORS.textMuted, marginBottom: 12 }}>
              Real-time Firestore collection with CRUD.
            </Text>
            <CodeBlock code={useCollectionExample} />
          </Box>

          <Box>
            <Text fw={600} style={{ color: COLORS.text, marginBottom: 8 }}>useAuth()</Text>
            <CodeBlock code={useAuthExample} />
          </Box>

          <Box>
            <Text fw={600} style={{ color: COLORS.text, marginBottom: 8 }}>
              useDocument(collectionName, docId)
            </Text>
            <CodeBlock code={useDocumentExample} />
          </Box>

          <Box>
            <Text fw={600} style={{ color: COLORS.text, marginBottom: 8 }}>useFunction(functionName)</Text>
            <Text size="sm" style={{ color: COLORS.textMuted, marginBottom: 12 }}>
              Call server-side functions (LLMs, email, data enrichment).
            </Text>
            <CodeBlock code={useFunctionExample} />
          </Box>

          <Box>
            <Text fw={600} style={{ color: COLORS.text, marginBottom: 8 }}>useStorage(appId)</Text>
            <Text size="sm" style={{ color: COLORS.textMuted, marginBottom: 12 }}>
              Upload and manage files.
            </Text>
            <CodeBlock code={useStorageExample} />
          </Box>

          <Box>
            <Text fw={600} style={{ color: COLORS.text, marginBottom: 8 }}>useAppMembership(appId)</Text>
            <Text size="sm" style={{ color: COLORS.textMuted, marginBottom: 12 }}>
              Access control and subscription tiers.
            </Text>
            <CodeBlock code={useAppMembershipExample} />
          </Box>
        </Stack>
      </Section>

      {/* schema.js */}
      <Section id="schema">
        <SectionHeading>schema.js — define your data</SectionHeading>
        <Text style={{ color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.7 }}>
          Every app has a <code style={{ color: COLORS.accent }}>schema.js</code> that namespaces your collections. This is how multiple apps share one Firebase project without collisions.
        </Text>
        <CodeBlock code={schemaExample} />
        <Text style={{ color: COLORS.textMuted, marginTop: 16, fontSize: 14 }}>
          Always reference <code style={{ color: COLORS.accent }}>collections.tasks</code> — never hardcode <code style={{ color: COLORS.textDim }}>"my-app_tasks"</code>.
        </Text>
      </Section>

      {/* Collaborate */}
      <Section id="collaborate">
        <SectionHeading>Collaborate</SectionHeading>
        <CodeBlock code={collaborateExample} />
        <Text style={{ color: COLORS.textMuted, marginTop: 16, lineHeight: 1.7 }}>
          No branches. No pull requests. No merge conflicts. You edit, you commit, it's live. Every commit is versioned and rollback-able.
        </Text>
      </Section>

      {/* Fork anything */}
      <Section id="fork">
        <SectionHeading>Fork anything</SectionHeading>
        <Text style={{ color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.7 }}>
          See an app in the gallery? Fork it. Customize it. Ship your version.
        </Text>
        <CodeBlock code={`# Coming soon:
npm run app:fork cool-app my-version`} />
        <Text style={{ color: COLORS.textMuted, marginTop: 16, marginBottom: 24, lineHeight: 1.7 }}>
          Every app in the gallery is a working template. Every template is a launchpad.
        </Text>
        <Button
          variant="outline"
          rightSection={<IconArrowRight size={16} />}
          onClick={() => onNavigateToGallery?.()}
          style={{
            borderColor: COLORS.borderLight,
            color: COLORS.text,
          }}
        >
          Browse the Gallery
        </Button>
      </Section>

      {/* Example apps */}
      <Section id="examples">
        <SectionHeading>Example apps (already in the repo)</SectionHeading>
        <Text style={{ color: COLORS.textMuted, marginBottom: 24 }}>
          Clone the framework and these are ready to run:
        </Text>
        <Box
          style={{
            background: COLORS.bgCode,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            overflow: "hidden",
          }}
        >
          <Table
            horizontalSpacing="md"
            verticalSpacing="sm"
            styles={{
              table: { background: "transparent" },
              th: { color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}`, fontWeight: 500, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" },
              td: { color: COLORS.text, borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" },
              tr: { "&:last-child td": { borderBottom: "none" } },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>App</Table.Th>
                <Table.Th>URL (local)</Table.Th>
                <Table.Th>What it does</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {EXAMPLE_APPS.map((app) => (
                <Table.Tr key={app.app}>
                  <Table.Td style={{ color: COLORS.accent }}>{app.app}</Table.Td>
                  <Table.Td style={{ color: COLORS.textMuted }}>{app.url}</Table.Td>
                  <Table.Td style={{ fontFamily: "inherit", color: COLORS.text }}>{app.desc}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
        <Text style={{ color: COLORS.textMuted, marginTop: 16, fontSize: 14 }}>
          Read their source in <code style={{ color: COLORS.accent }}>/apps/{"{app-id}"}/ </code> to learn the patterns.
        </Text>
      </Section>

      {/* Available packages */}
      <Section id="packages">
        <SectionHeading>Available packages (production-ready)</SectionHeading>
        <Text style={{ color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.7 }}>
          These are pre-registered and work in both local dev and production:
        </Text>
        <CodeBlock code={PACKAGES_LIST} showCopy={false} />
        <Text style={{ color: COLORS.textMuted, marginTop: 16, fontSize: 14, lineHeight: 1.7 }}>
          Need another package? Install it with <code style={{ color: COLORS.accent }}>npm install</code>, register it in <code style={{ color: COLORS.accent }}>framework/production-entry.js</code>, and redeploy the framework.
        </Text>
      </Section>

      {/* Commands cheat sheet */}
      <Section id="commands">
        <SectionHeading>Commands cheat sheet</SectionHeading>
        <CodeBlock code={commandsCheatsheet} />
      </Section>

      {/* The pitch */}
      <Section id="pitch" border={false}>
        <SectionHeading>The pitch, in plain English</SectionHeading>
        <Stack gap={16}>
          <Text style={{ color: COLORS.text, lineHeight: 1.8, fontSize: 16 }}>
            Basebase is the fastest path from "I have an idea" to "here's the link."
          </Text>
          <Text style={{ color: COLORS.textMuted, lineHeight: 1.8 }}>
            You clone one repo. You write one React file. You run one command. Your app is live at its own URL with a database, auth, real-time sync, and version history. No accounts to create, no infrastructure to configure, no credit card to enter.
          </Text>
          <Text style={{ color: COLORS.textMuted, lineHeight: 1.8 }}>
            It works for a developer at 2am with a side project. It works for an OpenClaw bot that just got told "build me a dashboard." It works for a kid learning React for the first time.
          </Text>
          <Box
            p="lg"
            mt={8}
            style={{
              background: COLORS.bgLight,
              borderRadius: 8,
              border: `1px solid ${COLORS.accent}`,
              borderLeftWidth: 4,
            }}
          >
            <Text style={{ color: COLORS.text, fontWeight: 500 }}>
              The gap between building and shipping is one command:{" "}
              <code style={{ color: COLORS.accent }}>npm run app:commit</code>
            </Text>
          </Box>
        </Stack>
      </Section>

      {/* Footer */}
      <Box py={48} style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <Container size="md">
          <Stack align="center" gap={24}>
            <Text fw={700} style={{ color: COLORS.text }}>
              basebase.com{" "}
              <span style={{ color: COLORS.textDim, fontWeight: 400 }}>— where code goes to live.</span>
            </Text>
            <Group gap={24}>
              <Anchor
                href="https://github.com/basebase-ai/bb-framework"
                target="_blank"
                style={{ color: COLORS.textMuted, textDecoration: "none" }}
              >
                <Group gap={6}>
                  <IconBrandGithub size={18} />
                  <Text size="sm">GitHub</Text>
                </Group>
              </Anchor>
              <Text
                style={{ color: COLORS.textMuted, cursor: "pointer" }}
                onClick={() => onNavigateToGallery?.()}
              >
                <Group gap={6}>
                  <IconApps size={18} />
                  <Text size="sm">Gallery</Text>
                </Group>
              </Text>
              <Anchor
                href="https://docs.basebase.com"
                target="_blank"
                style={{ color: COLORS.textMuted, textDecoration: "none" }}
              >
                <Group gap={6}>
                  <IconBook size={18} />
                  <Text size="sm">Docs</Text>
                </Group>
              </Anchor>
              <Anchor
                href="#"
                style={{ color: COLORS.textMuted, textDecoration: "none" }}
              >
                <Group gap={6}>
                  <IconBrandDiscord size={18} />
                  <Text size="sm">Discord</Text>
                </Group>
              </Anchor>
            </Group>
            <Text size="xs" style={{ color: COLORS.textDim }}>
              © {new Date().getFullYear()} Basebase
            </Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
