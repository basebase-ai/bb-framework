/**
 * TableView - Notion-like rich data table
 */

import React, { useState, useMemo } from "react";
import {
  Container,
  Title,
  Button,
  Group,
  Stack,
  ActionIcon,
  Drawer,
  Text,
  Loader,
  Center,
  Paper,
  Menu,
  Tooltip,
  TextInput,
  ScrollArea,
  Modal,
} from "@mantine/core";
import {
  IconSettings,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconSearch,
  IconDotsVertical,
  IconChartLine,
  IconEye,
} from "@tabler/icons-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { notifications } from "@mantine/notifications";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { db } from "../../../framework/core/firebase-init.js";
import { collections, getCollection, APP_ID } from "../schema.js";
import { TableCell } from "./TableCell.jsx";
import { ColumnConfig } from "./ColumnConfig.jsx";
import { FieldDiscovery } from "./FieldDiscovery.jsx";
import { TaskViewer } from "./TaskViewer.jsx";
import { getNestedValue } from "../utils/nestedData.js";
import * as TablerIcons from "@tabler/icons-react";

/** @typedef {{ pageId: string; onViewAnalysis?: (ticker: string) => void }} TableViewProps */

/**
 * @param {TableViewProps} props
 */
export function TableView({ pageId, onViewAnalysis }) {
  const { user } = useAuth();
  const { data: page, loading: pageLoading } = useDocument(collections.pages, pageId);
  
  // Get collection name, use placeholder while loading
  const collectionName = page?.collectionName 
    ? getCollection(page.collectionName) 
    : "apps"; // Temporary placeholder to satisfy hook
  
  const { data: records, loading: recordsLoading, add } = useCollection(collectionName);

  const [configDrawerOpened, setConfigDrawerOpened] = useState(false);
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterText, setFilterText] = useState("");
  
  // Stock analysis modal state
  const [analyzeModalOpened, setAnalyzeModalOpened] = useState(false);
  const [tickerInput, setTickerInput] = useState("");
  
  // Task viewer state
  const [taskViewerOpened, setTaskViewerOpened] = useState(false);
  
  // Use Cloud Function for stock analysis
  const { call: callAnalyzeStock, loading: analyzing, taskId } = useFunction("analyzeStock");

  // Apply sorting and filtering
  const processedRecords = useMemo(() => {
    // Don't show records until page is loaded
    if (!page || !records) return [];

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
  }, [records, sortBy, sortDirection, filterText, page]);

  const handleSort = (fieldName) => {
    if (sortBy === fieldName) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(fieldName);
      setSortDirection("asc");
    }
  };

  const handleUpdateField = async (fieldId, updates) => {
    if (!page) return;

    try {
      const updatedFields = page.fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      );

      const pageRef = doc(db, collections.pages, pageId);
      await updateDoc(pageRef, {
        fields: updatedFields,
        updatedAt: new Date(),
      });

      notifications.show({
        title: "Success",
        message: "Column updated",
        color: "green",
      });
    } catch (error) {
      console.error("Error updating field:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update column",
        color: "red",
      });
    }
  };

  const handleAddColumn = async () => {
    if (!page) return;

    const newField = {
      id: `field_${Date.now()}`,
      label: "New Column",
      fieldName: "newField",
      fieldType: "text",
      width: 150,
      visible: true,
      sortable: true,
      filterable: true,
    };

    try {
      const pageRef = doc(db, collections.pages, pageId);
      await updateDoc(pageRef, {
        fields: [...page.fields, newField],
        updatedAt: new Date(),
      });

      notifications.show({
        title: "Success",
        message: "Column added",
        color: "green",
      });
    } catch (error) {
      console.error("Error adding field:", error);
      notifications.show({
        title: "Error",
        message: "Failed to add column",
        color: "red",
      });
    }
  };

  const handleDeleteColumn = async (fieldId) => {
    if (!page) return;

    try {
      const updatedFields = page.fields.filter((field) => field.id !== fieldId);
      const pageRef = doc(db, collections.pages, pageId);
      await updateDoc(pageRef, {
        fields: updatedFields,
        updatedAt: new Date(),
      });

      notifications.show({
        title: "Success",
        message: "Column deleted",
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting field:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete column",
        color: "red",
      });
    }
  };

  const handleAddMultipleFields = async (fieldsToAdd) => {
    if (!page) return;

    try {
      const pageRef = doc(db, collections.pages, pageId);
      await updateDoc(pageRef, {
        fields: [...page.fields, ...fieldsToAdd],
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error adding fields:", error);
      throw error;
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!collectionName) return;

    try {
      const recordRef = doc(db, collectionName, recordId);
      await deleteDoc(recordRef);

      notifications.show({
        title: "Deleted",
        message: "Record deleted successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting record:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete record",
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

    if (!page?.collectionName) {
      notifications.show({
        title: "Error",
        message: "Collection name not found",
        color: "red",
      });
      return;
    }

    const ticker = tickerInput.toUpperCase();

    // Close modal immediately so user can do other things
    setAnalyzeModalOpened(false);
    setTickerInput("");

    notifications.show({
      id: "analyzing",
      title: "Analyzing...",
      message: `Fetching analysis for ${ticker}. This may take 3-5 minutes...`,
      color: "blue",
      autoClose: false,
      loading: true,
    });

    try {
      // Call function - taskId will be automatically set by useFunction hook
      const result = await callAnalyzeStock(
        {
          ticker,
          collectionName: page.collectionName,
        },
        {
          appId: APP_ID,
        }
      );

      notifications.hide("analyzing");
      notifications.show({
        title: "Success",
        message: `Analysis for ${result.ticker} added successfully`,
        color: "green",
      });
    } catch (error) {
      notifications.hide("analyzing");
      console.error("Error analyzing stock:", error);
      notifications.show({
        title: "Error",
        message: error.message || "Failed to analyze stock",
        color: "red",
      });
    }
  };

  if (pageLoading || recordsLoading) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!page) {
    return (
      <Container>
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="dimmed">Page configuration not found</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const visibleFields = page.fields?.filter((field) => field.visible) || [];

  return (
    <Container size="xl" fluid>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>{page.name}</Title>
            {page.description && (
              <Text size="sm" c="dimmed">
                {page.description}
              </Text>
            )}
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
              onClick={() => setConfigDrawerOpened(true)}
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
                        }}
                      >
                        <Menu position="bottom-start" withArrow>
                          <Tooltip
                            label={
                              <div>
                                <Text fw={600} size="sm">{field.label}</Text>
                                {field.description && (
                                  <Text size="xs" c="dimmed" mt={2}>
                                    {field.description}
                                  </Text>
                                )}
                              </div>
                            }
                            position="top-start"
                            withArrow
                          >
                            <Menu.Target>
                              <div style={{ cursor: "pointer" }}>
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
                              </div>
                            </Menu.Target>
                          </Tooltip>
                          <Menu.Dropdown>
                            {field.sortable && (
                              <>
                                <Menu.Item
                                  leftSection={<IconChevronUp size={14} />}
                                  onClick={() => {
                                    setSortBy(field.fieldName);
                                    setSortDirection("asc");
                                  }}
                                >
                                  Sort Ascending
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconChevronDown size={14} />}
                                  onClick={() => {
                                    setSortBy(field.fieldName);
                                    setSortDirection("desc");
                                  }}
                                >
                                  Sort Descending
                                </Menu.Item>
                                <Menu.Divider />
                              </>
                            )}
                            <Menu.Item
                              leftSection={<IconSettings size={14} />}
                              onClick={() => setConfigDrawerOpened(true)}
                            >
                              Edit Column
                            </Menu.Item>
                            <Menu.Item
                              color="red"
                              leftSection={<TablerIcons.IconX size={14} />}
                              onClick={() => handleUpdateField(field.id, { visible: false })}
                            >
                              Hide Column
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
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
                        <Text c="dimmed">No data yet</Text>
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
                            style={{
                              padding: "10px 8px",
                              maxWidth: field.width,
                            }}
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
                            <Menu.Item>Edit</Menu.Item>
                            <Menu.Item 
                              color="red"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Paper>
        </ScrollArea>

        <Text size="sm" c="dimmed">
          {processedRecords.length} {processedRecords.length === 1 ? "row" : "rows"}
        </Text>
      </Stack>

      {/* Column Configuration Drawer */}
      <Drawer
        opened={configDrawerOpened}
        onClose={() => setConfigDrawerOpened(false)}
        title="Column Configuration"
        position="right"
        size="lg"
      >
        <Stack gap="lg">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAddColumn}
            fullWidth
          >
            Add Column Manually
          </Button>

          {/* Field Discovery */}
          <FieldDiscovery
            records={records}
            currentFields={page.fields || []}
            onAddFields={handleAddMultipleFields}
          />

          <div>
            <Text fw={600} mb="sm">Configured Columns</Text>
            <Stack gap="sm">
              {page.fields?.map((field) => (
                <ColumnConfig
                  key={field.id}
                  field={field}
                  onUpdate={(updates) => handleUpdateField(field.id, updates)}
                  onDelete={() => handleDeleteColumn(field.id)}
                />
              ))}
            </Stack>
          </div>
        </Stack>
      </Drawer>

      {/* Stock Analysis Modal */}
      <Modal
        opened={analyzeModalOpened}
        onClose={() => !analyzing && setAnalyzeModalOpened(false)}
        title="Analyze Stock"
        centered
        closeOnClickOutside={!analyzing}
        closeOnEscape={!analyzing}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Call the SageStocks API to get a comprehensive stock analysis. 
            This typically takes 3-5 minutes to complete.
          </Text>
          
          <TextInput
            label="Stock Ticker"
            placeholder="e.g., AAPL, GOOGL, MSFT"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.currentTarget.value.toUpperCase())}
            required
            disabled={analyzing}
          />
          
          <Text size="xs" c="dimmed">
            Using your account email for API authentication.
          </Text>
          
          <Button 
            onClick={handleAnalyzeStock} 
            loading={analyzing} 
            fullWidth
            leftSection={!analyzing && <IconChartLine size={16} />}
          >
            {analyzing ? "Analyzing... (3-5 min)" : "Start Analysis"}
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
