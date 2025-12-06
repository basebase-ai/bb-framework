/**
 * AnalysesTable - Simple stock analyses table with localStorage preferences
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  Container,
  Title,
  Button,
  Group,
  Stack,
  ActionIcon,
  Text,
  Loader,
  Center,
  Paper,
  Menu,
  TextInput,
  ScrollArea,
  Modal,
  Checkbox,
  Drawer,
} from "@mantine/core";
import {
  IconSettings,
  IconChevronUp,
  IconChevronDown,
  IconSearch,
  IconDotsVertical,
  IconChartLine,
  IconEye,
  IconRefresh,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { deleteDoc, doc } from "firebase/firestore";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { db } from "../../../framework/core/firebase-init.js";
import { getCollection, APP_ID, DEFAULT_STOCK_FIELDS } from "../schema.js";
import { TableCell } from "./TableCell.jsx";
import { TaskViewer } from "./TaskViewer.jsx";
import { getNestedValue } from "../utils/nestedData.js";
import * as TablerIcons from "@tabler/icons-react";

const STORAGE_KEY = "sagestocks_column_prefs";

// Default visible columns (sensible subset)
const DEFAULT_VISIBLE_COLUMNS = [
  "ticker",
  "createdAt_ago",
  "scores_composite",
  "scores_recommendation",
  "dataQuality_grade",
];

/**
 * Load column preferences from localStorage
 * @returns {{ visibleColumns: string[], columnOrder: string[] } | null}
 */
function loadColumnPrefs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load column prefs:", e);
  }
  return null;
}

/**
 * Save column preferences to localStorage
 * @param {{ visibleColumns: string[], columnOrder: string[] }} prefs
 */
function saveColumnPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save column prefs:", e);
  }
}

/**
 * @param {{ onViewAnalysis?: (ticker: string) => void }} props
 */
export function AnalysesTable({ onViewAnalysis }) {
  const { user } = useAuth();
  const collectionName = getCollection("stock-analyses");
  const { data: records, loading: recordsLoading } = useCollection(collectionName, {
    realtime: !!user,
  });

  const [sortBy, setSortBy] = useState(/** @type {string | null} */ (null));
  const [sortDirection, setSortDirection] = useState(/** @type {"asc" | "desc"} */ ("asc"));
  const [filterText, setFilterText] = useState("");
  const [settingsOpened, setSettingsOpened] = useState(false);

  // Stock analysis modal state
  const [analyzeModalOpened, setAnalyzeModalOpened] = useState(false);
  const [tickerInput, setTickerInput] = useState("");

  // Task viewer state
  const [taskViewerOpened, setTaskViewerOpened] = useState(false);

  // Use Cloud Function for stock analysis
  const { call: callAnalyzeStock, loading: analyzing, taskId } = useFunction("analyzeStock");

  // Column preferences from localStorage (or defaults)
  const [columnPrefs, setColumnPrefs] = useState(() => {
    const saved = loadColumnPrefs();
    if (saved) return saved;
    
    // Default: use DEFAULT_VISIBLE_COLUMNS in order from DEFAULT_STOCK_FIELDS
    const columnOrder = DEFAULT_STOCK_FIELDS.map((f) => f.id);
    return {
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      columnOrder,
    };
  });

  // Get ordered fields based on preferences
  const orderedFields = useMemo(() => {
    const fieldMap = new Map(DEFAULT_STOCK_FIELDS.map((f) => [f.id, f]));
    
    // Start with saved order, filter to only valid field IDs
    const ordered = columnPrefs.columnOrder
      .filter((id) => fieldMap.has(id))
      .map((id) => fieldMap.get(id));
    
    // Add any new fields that aren't in saved order
    for (const field of DEFAULT_STOCK_FIELDS) {
      if (!columnPrefs.columnOrder.includes(field.id)) {
        ordered.push(field);
      }
    }
    
    return ordered;
  }, [columnPrefs.columnOrder]);

  // Visible fields only
  const visibleFields = useMemo(() => {
    return orderedFields.filter((f) => columnPrefs.visibleColumns.includes(f.id));
  }, [orderedFields, columnPrefs.visibleColumns]);

  // Toggle column visibility
  const toggleColumn = useCallback((fieldId) => {
    setColumnPrefs((prev) => {
      const newVisible = prev.visibleColumns.includes(fieldId)
        ? prev.visibleColumns.filter((id) => id !== fieldId)
        : [...prev.visibleColumns, fieldId];
      
      const newPrefs = { ...prev, visibleColumns: newVisible };
      saveColumnPrefs(newPrefs);
      return newPrefs;
    });
  }, []);

  // Reorder columns (drag and drop would be nice, but checkbox list for now)
  const moveColumn = useCallback((fieldId, direction) => {
    setColumnPrefs((prev) => {
      const order = [...prev.columnOrder];
      const idx = order.indexOf(fieldId);
      if (idx === -1) return prev;
      
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= order.length) return prev;
      
      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      
      const newPrefs = { ...prev, columnOrder: order };
      saveColumnPrefs(newPrefs);
      return newPrefs;
    });
  }, []);

  // Apply sorting and filtering
  const processedRecords = useMemo(() => {
    if (!records) return [];

    let result = [...records];

    // Filter
    if (filterText.trim()) {
      const query = filterText.toLowerCase();
      result = result.filter((record) =>
        Object.values(record).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Sort
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortBy);
        const bVal = getNestedValue(b, sortBy);

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortDirection === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [records, sortBy, sortDirection, filterText]);

  const handleSort = (fieldName) => {
    if (sortBy === fieldName) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(fieldName);
      setSortDirection("asc");
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      const recordRef = doc(db, collectionName, recordId);
      await deleteDoc(recordRef);
      notifications.show({
        title: "Deleted",
        message: "Analysis deleted",
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting record:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete",
        color: "red",
      });
    }
  };

  // Shared function to run analysis for a ticker
  const runAnalysis = async (/** @type {string} */ ticker) => {
    const notifId = `analyzing-${ticker}`;
    
    notifications.show({
      id: notifId,
      title: "Analyzing...",
      message: `Fetching analysis for ${ticker}. This may take 3-5 minutes...`,
      color: "blue",
      autoClose: false,
      loading: true,
    });

    try {
      const result = await callAnalyzeStock(
        { ticker, collectionName: "stock-analyses" },
        { appId: APP_ID }
      );

      notifications.hide(notifId);
      notifications.show({
        title: "Success",
        message: `Analysis for ${result.ticker} added`,
        color: "green",
      });
    } catch (error) {
      notifications.hide(notifId);
      console.error("Error analyzing stock:", error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to analyze stock",
        color: "red",
      });
    }
  };

  const handleAnalyzeStock = async () => {
    if (!tickerInput.trim()) {
      notifications.show({
        title: "Ticker required",
        message: "Please enter a stock ticker symbol",
        color: "red",
      });
      return;
    }

    const ticker = tickerInput.toUpperCase();
    setAnalyzeModalOpened(false);
    setTickerInput("");
    await runAnalysis(ticker);
  };

  const handleRefreshAnalysis = (/** @type {string} */ ticker) => {
    runAnalysis(ticker);
  };

  if (recordsLoading) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl" fluid>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Stock Analyses</Title>
            <Text size="sm" c="dimmed">
              AI-powered stock analysis results
            </Text>
          </div>

          <Group>
            <Button
              leftSection={<IconChartLine size={16} />}
              onClick={() => setAnalyzeModalOpened(true)}
              variant="light"
            >
              Analyze Stock
            </Button>
            {taskId && (
              <Button
                leftSection={<IconEye size={16} />}
                onClick={() => setTaskViewerOpened(true)}
                variant="subtle"
                color="gray"
              >
                View Task
              </Button>
            )}
            <TextInput
              placeholder="Search..."
              leftSection={<IconSearch size={16} />}
              value={filterText}
              onChange={(e) => setFilterText(e.currentTarget.value)}
              style={{ width: 250 }}
            />
            <ActionIcon
              variant="light"
              size="lg"
              onClick={() => setSettingsOpened(true)}
            >
              <IconSettings size={20} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Table */}
        <ScrollArea>
          <Paper withBorder>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
                  {visibleFields.map((field) => {
                    const IconComponent = TablerIcons[field.icon] || TablerIcons.IconColumn;
                    return (
                      <th
                        key={field.id}
                        style={{
                          width: field.width,
                          padding: "12px 8px",
                          textAlign: "left",
                          fontWeight: 600,
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                        onClick={() => handleSort(field.fieldName)}
                      >
                        <Group gap="xs" wrap="nowrap">
                          <IconComponent size={16} opacity={0.6} />
                          <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                            {field.label}
                          </Text>
                          {sortBy === field.fieldName && (
                            sortDirection === "asc" ? (
                              <IconChevronUp size={14} />
                            ) : (
                              <IconChevronDown size={14} />
                            )
                          )}
                        </Group>
                      </th>
                    );
                  })}
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={visibleFields.length + 1}>
                      <Center py="xl">
                        <Text c="dimmed">No analyses yet. Click "Analyze Stock" to get started.</Text>
                      </Center>
                    </td>
                  </tr>
                ) : (
                  processedRecords.map((record) => (
                    <tr
                      key={record.id}
                      style={{
                        borderBottom: "1px solid var(--mantine-color-gray-2)",
                        cursor: onViewAnalysis && record.ticker ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (onViewAnalysis && record.ticker) {
                          onViewAnalysis(record.ticker);
                        }
                      }}
                    >
                      {visibleFields.map((field) => {
                        const isTicker = field.fieldName === "ticker";
                        return (
                          <td
                            key={field.id}
                            style={{ padding: "10px 8px", maxWidth: field.width }}
                          >
                            {isTicker && onViewAnalysis ? (
                              <Text
                                size="sm"
                                fw={600}
                                c="blue"
                                style={{ textDecoration: "underline", cursor: "pointer" }}
                              >
                                {getNestedValue(record, field.fieldName)}
                              </Text>
                            ) : (
                              <TableCell
                                value={getNestedValue(record, field.fieldName)}
                                field={field}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td
                        style={{ padding: "10px 8px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Group gap={4}>
                          {record.ticker && (
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={() => handleRefreshAnalysis(record.ticker)}
                              title={`Re-analyze ${record.ticker}`}
                            >
                              <IconRefresh size={16} />
                            </ActionIcon>
                          )}
                          <Menu position="bottom-end">
                            <Menu.Target>
                              <ActionIcon variant="subtle" size="sm">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {onViewAnalysis && record.ticker && (
                                <Menu.Item onClick={() => onViewAnalysis(record.ticker)}>
                                  View Details
                                </Menu.Item>
                              )}
                              <Menu.Item
                                color="red"
                                onClick={() => handleDeleteRecord(record.id)}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Paper>
        </ScrollArea>

        <Text size="sm" c="dimmed">
          {processedRecords.length} {processedRecords.length === 1 ? "analysis" : "analyses"}
        </Text>
      </Stack>

      {/* Column Settings Drawer */}
      <Drawer
        opened={settingsOpened}
        onClose={() => setSettingsOpened(false)}
        title="Column Settings"
        position="right"
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Toggle columns on/off. Use arrows to reorder.
          </Text>
          {orderedFields.map((field, index) => (
            <Paper key={field.id} p="sm" withBorder>
              <Group justify="space-between">
                <Checkbox
                  label={field.label}
                  checked={columnPrefs.visibleColumns.includes(field.id)}
                  onChange={() => toggleColumn(field.id)}
                />
                <Group gap={4}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveColumn(field.id, "up")}
                  >
                    <IconChevronUp size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    disabled={index === orderedFields.length - 1}
                    onClick={() => moveColumn(field.id, "down")}
                  >
                    <IconChevronDown size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Drawer>

      {/* Stock Analysis Modal */}
      <Modal
        opened={analyzeModalOpened}
        onClose={() => !analyzing && setAnalyzeModalOpened(false)}
        title="Analyze Stock"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Call the SageStocks API to get a comprehensive stock analysis.
            This typically takes 3-5 minutes.
          </Text>

          <TextInput
            label="Stock Ticker"
            placeholder="e.g., AAPL, GOOGL, MSFT"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.currentTarget.value.toUpperCase())}
            required
            disabled={analyzing}
          />

          <Button
            onClick={handleAnalyzeStock}
            loading={analyzing}
            fullWidth
            leftSection={!analyzing && <IconChartLine size={16} />}
          >
            {analyzing ? "Analyzing..." : "Start Analysis"}
          </Button>
        </Stack>
      </Modal>

      {/* Task Viewer Modal */}
      <TaskViewer
        taskId={taskId}
        opened={taskViewerOpened}
        onClose={() => setTaskViewerOpened(false)}
      />
    </Container>
  );
}

