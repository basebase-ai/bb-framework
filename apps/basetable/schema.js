/**
 * Base Table - Notion-like rich data table interface
 *
 * Collections:
 * - pages: Table view configurations (which collection, which fields, formatting)
 * - stock-analyses: Sample data collection
 */

export const APP_ID = "basetable";

export const collections = {
  // Global collections
  apps: "apps",
  users: "users",

  // App-specific collections
  pages: `${APP_ID}_pages`,
  stockAnalyses: `${APP_ID}_stock-analyses`,
};

export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

// Field type definitions
export const FIELD_TYPES = {
  TEXT: "text",
  NUMBER: "number",
  SELECT: "select", // Single select with colored chip
  MULTI_SELECT: "multiSelect", // Multiple colored chips
  DATE: "date",
  PROGRESS_BAR: "progressBar", // Horizontal bar chart (0-max)
  RING_CHART: "ringChart", // Mini ring/donut chart
  BADGE: "badge", // Colored badge/pill
};

export const schema = {
  [`${APP_ID}_pages`]: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      collectionName: { type: "string", required: true }, // e.g., "stock-analyses"
      fields: {
        type: "array",
        items: {
          type: "map",
          properties: {
            id: { type: "string" }, // Field ID
            label: { type: "string" }, // Display name
            fieldName: { type: "string" }, // Data property name
            fieldType: { type: "string" }, // FIELD_TYPES enum
            icon: { type: "string" }, // Icon name (Tabler icon)
            description: { type: "string" }, // Tooltip text
            width: { type: "number" }, // Column width in pixels
            visible: { type: "boolean" }, // Show/hide column
            sortable: { type: "boolean" },
            filterable: { type: "boolean" },
            // Type-specific config
            options: {
              type: "array",
              items: {
                type: "map",
                properties: {
                  value: { type: "string" },
                  label: { type: "string" },
                  color: { type: "string" }, // Mantine color
                },
              },
            },
            max: { type: "number" }, // For progress bars/ring charts
            decimals: { type: "number" }, // Number formatting
          },
        },
      },
      sortBy: { type: "string" }, // Default sort field
      sortDirection: { type: "string" }, // 'asc' or 'desc'
      createdBy: { type: "string", auto: true },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
  },

  [`${APP_ID}_stock-analyses`]: {
    fields: {
      ticker: { type: "string", required: true },
      analysis: { type: "string" },
      analysisCadence: { type: "string" },
      status: { type: "string" },
      currentPrice: { type: "number" },
      recommendation: { type: "string" },
      compositeScore: { type: "number" },
      patternSignal: { type: "string" },
      patternScore: { type: "number" },
      dataQuality: { type: "string" },
      dataCompleteness: { type: "number" },
      detectedPatterns: { type: "array", items: { type: "string" } },
      technicalScore: { type: "number" },
      fundamentalScore: { type: "number" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
  },
};
