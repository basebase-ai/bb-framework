/**
 * ImproveThisButton - Floating action button to explain Basebase editing
 */

import React, { useState } from "react";
import {
  Modal,
  Stack,
  Text,
  Button,
  List,
  ThemeIcon,
  Group,
} from "@mantine/core";
import { IconSparkles, IconCheck, IconExternalLink } from "@tabler/icons-react";

export function ImproveThisButton() {
  const [opened, setOpened] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <Button
        size="md"
        radius="xl"
        leftSection={<Text size="lg">✨</Text>}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 1000,
          boxShadow: "0 8px 24px rgba(147, 51, 234, 0.3)",
        }}
        onClick={() => setOpened(true)}
        gradient={{ from: "violet", to: "grape", deg: 135 }}
        variant="gradient"
      >
        Improve This!
      </Button>

      {/* Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <Group gap="xs">
            <Text size="xl">✨</Text>
            <Text size="lg" fw={600}>
              Improve this App Now!
            </Text>
          </Group>
        }
        size="md"
        centered
      >
        <Stack gap="lg">
          <Text size="md">
            This app is powered by Basebase, which means <strong>you can change anything</strong> about this app right now - in the
            next 5 minutes!
          </Text>

          <List
            spacing="sm"
            size="sm"
            center
            icon={
              <ThemeIcon color="blue" size={20} radius="xl" variant="light">
                <IconCheck size={12} />
              </ThemeIcon>
            }
          >
            <List.Item>Add a feature!</List.Item>
            <List.Item>Fix a bug!</List.Item>
            <List.Item>Change the fonts and colors!</List.Item>
            <List.Item>Customize the layout!</List.Item>
          </List>

          <Text size="sm" c="dimmed">
            To get started, go to the app listing on Basebase and click <strong>"Edit"</strong> and
            follow the directions.
          </Text>

          <Button
            component="a"
            href="https://playground.basebase.ai/app/todo-app"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            rightSection={<IconExternalLink size={16} />}
            gradient={{ from: "violet", to: "grape", deg: 135 }}
            variant="gradient"
            fullWidth
          >
            Edit This App on Basebase
          </Button>
        </Stack>
      </Modal>
    </>
  );
}

