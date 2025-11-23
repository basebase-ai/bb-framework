/**
 * PageList - List of table pages
 */

import React, { useState } from "react";
import {
  Container,
  Title,
  Button,
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  Loader,
  Center,
  Modal,
  TextInput,
  Select,
} from "@mantine/core";
import { IconPlus, IconTable } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, FIELD_TYPES } from "../schema.js";
import { DataSeeder } from "./DataSeeder.jsx";

// Default column configuration for stock analyses
const DEFAULT_STOCK_FIELDS = [
  {
    id: "ticker",
    label: "Ticker",
    fieldName: "ticker",
    fieldType: FIELD_TYPES.TEXT,
    icon: "IconBuildingBank",
    width: 120,
    visible: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "currentPrice",
    label: "Current Price",
    fieldName: "currentPrice",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconCurrencyDollar",
    decimals: 2,
    width: 120,
    visible: true,
    sortable: true,
  },
  {
    id: "status",
    label: "Status",
    fieldName: "status",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconCheck",
    width: 120,
    visible: true,
    options: [
      { value: "Complete", label: "Complete", color: "teal.6" },
      { value: "In Progress", label: "In Progress", color: "blue.6" },
      { value: "Pending", label: "Pending", color: "gray.6" },
    ],
  },
  {
    id: "recommendation",
    label: "Recommendation",
    fieldName: "recommendation",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconBulb",
    width: 150,
    visible: true,
    options: [
      { value: "Buy", label: "Buy", color: "teal.6" },
      { value: "Moderate Buy", label: "Moderate Buy", color: "cyan.6" },
      { value: "Hold", label: "Hold", color: "yellow.7" },
      { value: "Moderate Sell", label: "Moderate Sell", color: "orange.6" },
      { value: "Sell", label: "Sell", color: "red.6" },
    ],
  },
  {
    id: "compositeScore",
    label: "Composite Score",
    fieldName: "compositeScore",
    fieldType: FIELD_TYPES.PROGRESS_BAR,
    icon: "IconChartBar",
    description: "Overall score from 0-5",
    max: 5,
    decimals: 2,
    width: 150,
    visible: true,
  },
  {
    id: "dataQuality",
    label: "Data Quality",
    fieldName: "dataQuality",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconCheck",
    width: 120,
    visible: true,
    options: [
      { value: "Excellent", label: "Excellent", color: "teal.6" },
      { value: "Good", label: "Good", color: "green.6" },
      { value: "Fair", label: "Fair", color: "yellow.7" },
      { value: "Poor", label: "Poor", color: "orange.6" },
    ],
  },
  {
    id: "dataCompleteness",
    label: "Data Completeness",
    fieldName: "dataCompleteness",
    fieldType: FIELD_TYPES.RING_CHART,
    icon: "IconChartDonut",
    description: "Percentage of data fields populated",
    max: 100,
    width: 140,
    visible: true,
  },
  {
    id: "patternSignal",
    label: "Pattern Signal",
    fieldName: "patternSignal",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconWaveSine",
    width: 160,
    visible: true,
    options: [
      { value: "Extremely Bullish", label: "Extremely Bullish", color: "pink.5" },
      { value: "Bullish", label: "Bullish", color: "teal.6" },
      { value: "Neutral", label: "Neutral", color: "orange.5" },
      { value: "Bearish", label: "Bearish", color: "cyan.7" },
      { value: "Extremely Bearish", label: "Extremely Bearish", color: "red.6" },
    ],
  },
  {
    id: "detectedPatterns",
    label: "Detected Patterns",
    fieldName: "detectedPatterns",
    fieldType: FIELD_TYPES.MULTI_SELECT,
    icon: "IconChartLine",
    width: 220,
    visible: true,
    options: [
      { value: "Strong Uptrend", label: "Strong Uptrend", color: "green.6" },
      { value: "MACD Bullish", label: "MACD Bullish", color: "teal.6" },
      { value: "MACD Bearish", label: "MACD Bearish", color: "red.6" },
      { value: "RSI Oversold", label: "RSI Oversold", color: "orange.6" },
      { value: "RSI Overbought", label: "RSI Overbought", color: "pink.5" },
    ],
  },
  {
    id: "technicalScore",
    label: "Technical Score",
    fieldName: "technicalScore",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconChartLine",
    decimals: 1,
    width: 130,
    visible: true,
  },
  {
    id: "fundamentalScore",
    label: "Fundamental Score",
    fieldName: "fundamentalScore",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconCalculator",
    decimals: 1,
    width: 160,
    visible: true,
  },
];

export function PageList({ onNavigateTo }) {
  const { user } = useAuth();
  const { data: pages, loading, add } = useCollection(collections.pages);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      notifications.show({
        title: "Name required",
        message: "Please enter a page name",
        color: "red",
      });
      return;
    }

    setCreating(true);
    try {
      const newPage = {
        name: name.trim(),
        description: description.trim(),
        collectionName: "stock-analyses",
        fields: DEFAULT_STOCK_FIELDS,
        sortBy: "ticker",
        sortDirection: "asc",
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docId = await add(newPage);
      
      notifications.show({
        title: "Success",
        message: "Page created successfully",
        color: "green",
      });

      setCreateModalOpened(false);
      setName("");
      setDescription("");
      onNavigateTo(docId);
    } catch (error) {
      console.error("Error creating page:", error);
      notifications.show({
        title: "Error",
        message: "Failed to create page",
        color: "red",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1}>Pages</Title>
            <Text c="dimmed" size="sm">
              Notion-like data tables for your collections
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpened(true)}
          >
            New Page
          </Button>
        </Group>

        {/* Temporary: Remove after seeding data */}
        <DataSeeder />

        <Stack gap="md">
          {pages.length === 0 ? (
            <Paper p="xl" withBorder>
              <Center>
                <Stack align="center" gap="md">
                  <IconTable size={48} opacity={0.3} />
                  <Text c="dimmed">No pages yet. Create your first table!</Text>
                  <Button onClick={() => setCreateModalOpened(true)}>
                    Create Page
                  </Button>
                </Stack>
              </Center>
            </Paper>
          ) : (
            pages.map((page) => (
              <Paper
                key={page.id}
                p="md"
                withBorder
                style={{ cursor: "pointer" }}
                onClick={() => onNavigateTo(page.id)}
              >
                <Group justify="space-between">
                  <div>
                    <Group gap="xs">
                      <IconTable size={20} />
                      <Title order={4}>{page.name}</Title>
                    </Group>
                    {page.description && (
                      <Text size="sm" c="dimmed" mt="xs">
                        {page.description}
                      </Text>
                    )}
                  </div>
                  <Badge variant="light">
                    {page.fields?.filter(f => f.visible).length || 0} columns
                  </Badge>
                </Group>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>

      {/* Create Page Modal */}
      <Modal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        title="Create New Page"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Page Name"
            placeholder="e.g., Portfolio, Stock Watchlist"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Description"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Text size="sm" c="dimmed">
            This will create a table for the "stock-analyses" collection with default columns.
          </Text>
          <Button onClick={handleCreate} loading={creating} fullWidth>
            Create Page
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}

