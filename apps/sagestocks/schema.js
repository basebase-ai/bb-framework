/**
 * SageStocks - Stock Analysis Dashboard
 *
 * A specialized table viewer for managing and analyzing stock data using
 * the SageStocks API integration.
 *
 * Collections:
 * - pages: Table view configurations (collection name, field configs, formatting)
 * - stock-analyses: Stock analysis results from SageStocks API
 */

export const APP_ID = 'sagestocks';

export const collections = {
  // Global collections
  apps: "apps",
  users: "users",

  // App-specific collections
  pages: `${APP_ID}_pages`,
  holdings: `${APP_ID}_holdings`,
  quotes: `${APP_ID}_quotes`,
  // Note: Other collections are referenced dynamically via getCollection()
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
            fieldName: { type: "string" }, // Data property name (supports dot notation for nested)
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
  // Note: Collections displayed in basetable don't need predefined schemas
  // Fields are discovered dynamically from actual documents
};

// Default column configuration for stock analyses
// Supports nested paths (e.g., "scores.composite")
export const DEFAULT_STOCK_FIELDS = [
  {
    id: "ticker",
    label: "Ticker",
    fieldName: "ticker",
    fieldType: FIELD_TYPES.TEXT,
    icon: "IconBuildingBank",
    width: 100,
    visible: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "success",
    label: "Success",
    fieldName: "success",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconCheck",
    width: 100,
    visible: true,
    options: [
      { value: true, label: "Success", color: "green.6" },
      { value: false, label: "Failed", color: "red.6" },
    ],
  },
  // Scores (nested)
  {
    id: "scores_composite",
    label: "Composite Score",
    fieldName: "scores.composite",
    fieldType: FIELD_TYPES.PROGRESS_BAR,
    icon: "IconChartBar",
    description: "Overall score from 0-5",
    max: 5,
    decimals: 2,
    width: 160,
    visible: true,
  },
  {
    id: "scores_recommendation",
    label: "Recommendation",
    fieldName: "scores.recommendation",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconBulb",
    width: 140,
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
    id: "scores_technical",
    label: "Technical",
    fieldName: "scores.technical",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconChartLine",
    decimals: 2,
    width: 100,
    visible: true,
  },
  {
    id: "scores_fundamental",
    label: "Fundamental",
    fieldName: "scores.fundamental",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconCalculator",
    decimals: 2,
    width: 120,
    visible: true,
  },
  {
    id: "scores_macro",
    label: "Macro",
    fieldName: "scores.macro",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconWorld",
    decimals: 2,
    width: 100,
    visible: false,
  },
  {
    id: "scores_risk",
    label: "Risk",
    fieldName: "scores.risk",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconAlertTriangle",
    decimals: 2,
    width: 100,
    visible: false,
  },
  {
    id: "scores_sentiment",
    label: "Sentiment",
    fieldName: "scores.sentiment",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconMoodSmile",
    decimals: 2,
    width: 110,
    visible: false,
  },
  {
    id: "scores_marketAlignment",
    label: "Market Alignment",
    fieldName: "scores.marketAlignment",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconTrendingUp",
    decimals: 2,
    width: 150,
    visible: false,
  },
  // Data Quality (nested)
  {
    id: "dataQuality_grade",
    label: "Data Quality",
    fieldName: "dataQuality.grade",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconCertificate",
    width: 130,
    visible: true,
    options: [
      { value: "A", label: "A - Excellent", color: "teal.6" },
      { value: "A - Excellent", label: "A - Excellent", color: "teal.6" },
      { value: "B", label: "B - Good", color: "green.6" },
      { value: "C", label: "C - Fair", color: "yellow.7" },
      { value: "F", label: "F - Poor", color: "red.6" },
    ],
  },
  {
    id: "dataQuality_completeness",
    label: "Completeness",
    fieldName: "dataQuality.completeness",
    fieldType: FIELD_TYPES.RING_CHART,
    icon: "IconChartDonut",
    description: "Data completeness (0-1)",
    max: 1,
    decimals: 2,
    width: 130,
    visible: true,
  },
  {
    id: "dataQuality_confidence",
    label: "Confidence",
    fieldName: "dataQuality.confidence",
    fieldType: FIELD_TYPES.TEXT,
    icon: "IconShieldCheck",
    width: 110,
    visible: false,
  },
  // Performance (nested)
  {
    id: "performance_duration",
    label: "Duration (ms)",
    fieldName: "performance.duration",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconClock",
    decimals: 0,
    width: 130,
    visible: false,
  },
  {
    id: "performance_fmpCalls",
    label: "FMP Calls",
    fieldName: "performance.fmpCalls",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconApi",
    width: 110,
    visible: false,
  },
  {
    id: "performance_fredCalls",
    label: "FRED Calls",
    fieldName: "performance.fredCalls",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconApi",
    width: 110,
    visible: false,
  },
  {
    id: "performance_notionCalls",
    label: "Notion Calls",
    fieldName: "performance.notionCalls",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconApi",
    width: 120,
    visible: false,
  },
  // LLM Metadata (nested)
  {
    id: "llmMetadata_provider",
    label: "LLM Provider",
    fieldName: "llmMetadata.provider",
    fieldType: FIELD_TYPES.TEXT,
    icon: "IconBrain",
    width: 140,
    visible: false,
  },
  {
    id: "llmMetadata_model",
    label: "LLM Model",
    fieldName: "llmMetadata.model",
    fieldType: FIELD_TYPES.TEXT,
    icon: "IconBrain",
    width: 180,
    visible: false,
  },
  {
    id: "llmMetadata_cost",
    label: "LLM Cost",
    fieldName: "llmMetadata.cost",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconCurrencyDollar",
    decimals: 4,
    width: 100,
    visible: false,
  },
  {
    id: "llmMetadata_tokensUsed_total",
    label: "Total Tokens",
    fieldName: "llmMetadata.tokensUsed.total",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconNumbers",
    width: 120,
    visible: false,
  },
  // Rate Limit (nested)
  {
    id: "rateLimit_remaining",
    label: "Rate Limit Remaining",
    fieldName: "rateLimit.remaining",
    fieldType: FIELD_TYPES.NUMBER,
    icon: "IconHourglass",
    width: 170,
    visible: false,
  },
  // Workflow (nested)
  {
    id: "workflow_status",
    label: "Workflow Status",
    fieldName: "workflow.status",
    fieldType: FIELD_TYPES.BADGE,
    icon: "IconChecklist",
    width: 140,
    visible: false,
    options: [
      { value: "Completed", label: "Completed", color: "green.6" },
      { value: "In Progress", label: "In Progress", color: "blue.6" },
      { value: "Failed", label: "Failed", color: "red.6" },
    ],
  },
  // Page IDs
  {
    id: "analysesPageId",
    label: "Analyses Page ID",
    fieldName: "analysesPageId",
    fieldType: FIELD_TYPES.TEXT,
    icon: "IconLink",
    width: 160,
    visible: false,
  },
  {
    id: "childAnalysisPageId",
    label: "Analysis Page ID",
    fieldName: "childAnalysisPageId",
    fieldType: FIELD_TYPES.TEXT,
    icon: "IconLink",
    width: 160,
    visible: false,
  },
];
