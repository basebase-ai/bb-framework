import React from "react";
import { Modal, Text, Button, Group, Stack, Divider } from "@mantine/core";
import { IconRocket } from "@tabler/icons-react";

export default function CreateAppModal({ opened, onClose }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group spacing="xs">
          <IconRocket size={24} color="#1D1D1F" />
          <Text weight={600} size="lg" style={{ color: '#1D1D1F' }}>
            Create Your Own App!
          </Text>
        </Group>
      }
      size="lg"
    >
      <Stack spacing="xl">
        <Stack spacing="md">
          <Text size="md" color="dimmed">
            Creating a Basebase app is straightforward with the right tools. Here's what you need:
          </Text>

          <Stack spacing="sm">
            <Group spacing="xs">
              <Text size="lg">🎨</Text>
              <Text size="sm" weight={500}>
                Install your favorite coding assistant (Cursor, Antigravity, Claude Code, etc.)
              </Text>
            </Group>
          </Stack>

          <Divider label="Then in the terminal, run the following commands" labelPosition="center" />

          <div>
            <Text size="sm" weight={600} mb="xs">1. Clone the repository</Text>
            <code style={{
              display: "block",
              padding: "12px",
              background: "#F5F5F7",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#1D1D1F",
              fontFamily: "SF Mono, Monaco, Menlo, monospace",
            }}>
              git clone https://github.com/basebase-ai/bb-framework.git
            </code>
          </div>

          <div>
            <Text size="sm" weight={600} mb="xs">2. Install dependencies</Text>
            <code style={{
              display: "block",
              padding: "12px",
              background: "#F5F5F7",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#1D1D1F",
              fontFamily: "SF Mono, Monaco, Menlo, monospace",
            }}>
              cd bb-framework && npm install
            </code>
          </div>

          <div>
            <Text size="sm" weight={600} mb="xs">3. Create your app</Text>
            <code style={{
              display: "block",
              padding: "12px",
              background: "#F5F5F7",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#1D1D1F",
              fontFamily: "SF Mono, Monaco, Menlo, monospace",
            }}>
              npm run app:init
            </code>
          </div>
            
          <div>
            <Text size="sm" weight={600} mb="xs">4. Start Prompting!</Text>
          </div>
        </Stack>

        <Group position="right" mt="md">
          <Button
            variant="filled"
            color="dark"
            onClick={onClose}
            size="md"
          >
            Got it, let's build!
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

