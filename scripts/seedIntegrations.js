#!/usr/bin/env node
/**
 * Seed Integrations Collection
 *
 * Creates/updates a canonical set of integrations in the `integrations` collection.
 * Uses Firebase Admin SDK with service account credentials.
 *
 * Usage:
 *   node scripts/seedIntegrations.js [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Show what would be written without actually writing
 *   --force    Overwrite name/status/scopes even if doc already exists
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Load service account credentials
const serviceAccountPath = join(
  rootDir,
  "vibe-together-d2159-firebase-adminsdk-fbsvc-920807cb5c.json"
);

/** @type {import("firebase-admin").ServiceAccount} */
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

// Collection name (namespaced for www app, _public suffix for public read access)
const COLLECTION_NAME = "www_integrations_public";

/** @type {{ id: string; name: string; status: "completed" | "beta" | "planned"; scopes: string[]; icon: string; iconColor: string }[]} */
const SEED_DATA = [
  {
    id: "gmail",
    name: "Gmail",
    status: "completed",
    scopes: ["Read emails", "Send emails", "Search inbox"],
    icon: "SiGmail",
    iconColor: "#EA4335",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    status: "completed",
    scopes: ["Read contacts", "Read companies", "Read deals"],
    icon: "SiHubspot",
    iconColor: "#ff7a59",
  },
  {
    id: "slack",
    name: "Slack",
    status: "completed",
    scopes: [
      "Read channels",
      "Read messages",
      "Send messages",
      "Summarize channels",
    ],
    icon: "SiSlack",
    iconColor: "#4A154B",
  },
  {
    id: "sheets",
    name: "Google Sheets",
    status: "completed",
    scopes: ["List spreadsheets", "Read sheet data", "Write sheet data"],
    icon: "SiGooglesheets",
    iconColor: "#0F9D58",
  },
  {
    id: "airtable",
    name: "Airtable",
    status: "completed",
    scopes: ["List bases", "List tables", "Read records", "Write records"],
    icon: "SiAirtable",
    iconColor: "#18BFFF",
  },
  {
    id: "supabase",
    name: "Supabase",
    status: "completed",
    scopes: ["Query tables", "Insert rows", "Update rows"],
    icon: "SiSupabase",
    iconColor: "#3ECF8E",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    status: "completed",
    scopes: ["Read contacts", "Read accounts", "Read opportunities"],
    icon: "SiSalesforce",
    iconColor: "#00A1E0",
  },
  {
    id: "github",
    name: "GitHub",
    status: "completed",
    scopes: ["List repos", "Read issues", "Read pull requests"],
    icon: "SiGithub",
    iconColor: "#333333",
  },
  {
    id: "notion",
    name: "Notion",
    status: "completed",
    scopes: ["List pages", "Read page content", "List databases"],
    icon: "SiNotion",
    iconColor: "#000000",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    status: "completed",
    scopes: ["List calendars", "Read events", "Create events"],
    icon: "SiGooglecalendar",
    iconColor: "#4285F4",
  },
  {
    id: "stripe",
    name: "Stripe",
    status: "completed",
    scopes: ["Read customers", "Read payments", "Read balance"],
    icon: "SiStripe",
    iconColor: "#635BFF",
  },
  {
    id: "linkedin",
    name: "LinkedIn (Airtop)",
    status: "completed",
    scopes: ["View profiles", "Search people", "Extract profile data"],
    icon: "SiLinkedin",
    iconColor: "#0A66C2",
  },
  // ============================================
  // PLANNED INTEGRATIONS (100+)
  // ============================================

  // --- CRM & Sales ---
  {
    id: "pipedrive",
    name: "Pipedrive",
    status: "planned",
    scopes: [],
    icon: "SiPipedrive",
    iconColor: "#25292C",
  },
  {
    id: "zoho_crm",
    name: "Zoho CRM",
    status: "planned",
    scopes: [],
    icon: "SiZoho",
    iconColor: "#C8202B",
  },
  {
    id: "freshsales",
    name: "Freshsales",
    status: "planned",
    scopes: [],
    icon: "SiFreshworks",
    iconColor: "#F26522",
  },
  {
    id: "close",
    name: "Close CRM",
    status: "planned",
    scopes: [],
    icon: "SiClose",
    iconColor: "#1A1A1A",
  },
  {
    id: "copper",
    name: "Copper",
    status: "planned",
    scopes: [],
    icon: "SiCopper",
    iconColor: "#F7A928",
  },
  {
    id: "insightly",
    name: "Insightly",
    status: "planned",
    scopes: [],
    icon: "SiInsightly",
    iconColor: "#3333FF",
  },
  {
    id: "outreach",
    name: "Outreach",
    status: "planned",
    scopes: [],
    icon: "SiOutreach",
    iconColor: "#5951FF",
  },
  {
    id: "salesloft",
    name: "SalesLoft",
    status: "planned",
    scopes: [],
    icon: "SiSalesloft",
    iconColor: "#1F3A93",
  },
  {
    id: "apollo",
    name: "Apollo.io",
    status: "planned",
    scopes: [],
    icon: "SiApollo",
    iconColor: "#4D4DFF",
  },
  {
    id: "gong",
    name: "Gong",
    status: "planned",
    scopes: [],
    icon: "SiGong",
    iconColor: "#7C3AED",
  },
  {
    id: "chorus",
    name: "Chorus.ai",
    status: "planned",
    scopes: [],
    icon: "SiChorus",
    iconColor: "#00B4D8",
  },
  {
    id: "clearbit",
    name: "Clearbit",
    status: "planned",
    scopes: [],
    icon: "SiClearbit",
    iconColor: "#2563EB",
  },
  {
    id: "zoominfo",
    name: "ZoomInfo",
    status: "planned",
    scopes: [],
    icon: "SiZoominfo",
    iconColor: "#E44134",
  },

  // --- Marketing Automation ---
  {
    id: "mailchimp",
    name: "Mailchimp",
    status: "planned",
    scopes: [],
    icon: "SiMailchimp",
    iconColor: "#FFE01B",
  },
  {
    id: "marketo",
    name: "Marketo",
    status: "planned",
    scopes: [],
    icon: "SiMarketo",
    iconColor: "#5C4C9F",
  },
  {
    id: "pardot",
    name: "Pardot",
    status: "planned",
    scopes: [],
    icon: "SiSalesforce",
    iconColor: "#00A1E0",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    status: "planned",
    scopes: [],
    icon: "SiKlaviyo",
    iconColor: "#29AB87",
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    status: "planned",
    scopes: [],
    icon: "SiActivecampaign",
    iconColor: "#356AE6",
  },
  {
    id: "sendinblue",
    name: "Brevo (Sendinblue)",
    status: "planned",
    scopes: [],
    icon: "SiBrevo",
    iconColor: "#0092FF",
  },
  {
    id: "constant_contact",
    name: "Constant Contact",
    status: "planned",
    scopes: [],
    icon: "SiConstantcontact",
    iconColor: "#0D4EA6",
  },
  {
    id: "convertkit",
    name: "ConvertKit",
    status: "planned",
    scopes: [],
    icon: "SiConvertkit",
    iconColor: "#FB6970",
  },
  {
    id: "drip",
    name: "Drip",
    status: "planned",
    scopes: [],
    icon: "SiDrip",
    iconColor: "#EA00FF",
  },
  {
    id: "customer_io",
    name: "Customer.io",
    status: "planned",
    scopes: [],
    icon: "SiCustomerio",
    iconColor: "#2BC4E3",
  },
  {
    id: "iterable",
    name: "Iterable",
    status: "planned",
    scopes: [],
    icon: "SiIterable",
    iconColor: "#6C47FF",
  },

  // --- Analytics & BI ---
  {
    id: "google_analytics",
    name: "Google Analytics",
    status: "planned",
    scopes: [],
    icon: "SiGoogleanalytics",
    iconColor: "#E37400",
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    status: "planned",
    scopes: [],
    icon: "SiMixpanel",
    iconColor: "#7856FF",
  },
  {
    id: "amplitude",
    name: "Amplitude",
    status: "planned",
    scopes: [],
    icon: "SiAmplitude",
    iconColor: "#1E61F0",
  },
  {
    id: "segment",
    name: "Segment",
    status: "planned",
    scopes: [],
    icon: "SiSegment",
    iconColor: "#52BD94",
  },
  {
    id: "heap",
    name: "Heap",
    status: "planned",
    scopes: [],
    icon: "SiHeap",
    iconColor: "#FF5E1F",
  },
  {
    id: "tableau",
    name: "Tableau",
    status: "planned",
    scopes: [],
    icon: "SiTableau",
    iconColor: "#E97627",
  },
  {
    id: "looker",
    name: "Looker",
    status: "planned",
    scopes: [],
    icon: "SiLooker",
    iconColor: "#4285F4",
  },
  {
    id: "powerbi",
    name: "Power BI",
    status: "planned",
    scopes: [],
    icon: "SiPowerbi",
    iconColor: "#F2C811",
  },
  {
    id: "metabase",
    name: "Metabase",
    status: "planned",
    scopes: [],
    icon: "SiMetabase",
    iconColor: "#509EE3",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    status: "planned",
    scopes: [],
    icon: "SiSnowflake",
    iconColor: "#29B5E8",
  },
  {
    id: "databricks",
    name: "Databricks",
    status: "planned",
    scopes: [],
    icon: "SiDatabricks",
    iconColor: "#FF3621",
  },
  {
    id: "bigquery",
    name: "BigQuery",
    status: "planned",
    scopes: [],
    icon: "SiGooglebigquery",
    iconColor: "#669DF6",
  },
  {
    id: "redshift",
    name: "Amazon Redshift",
    status: "planned",
    scopes: [],
    icon: "SiAmazonredshift",
    iconColor: "#8C4FFF",
  },

  // --- Project Management ---
  {
    id: "asana",
    name: "Asana",
    status: "planned",
    scopes: [],
    icon: "SiAsana",
    iconColor: "#F06A6A",
  },
  {
    id: "jira",
    name: "Jira",
    status: "planned",
    scopes: [],
    icon: "SiJira",
    iconColor: "#0052CC",
  },
  {
    id: "monday",
    name: "Monday.com",
    status: "planned",
    scopes: [],
    icon: "SiMonday",
    iconColor: "#FF3D57",
  },
  {
    id: "trello",
    name: "Trello",
    status: "planned",
    scopes: [],
    icon: "SiTrello",
    iconColor: "#0079BF",
  },
  {
    id: "clickup",
    name: "ClickUp",
    status: "planned",
    scopes: [],
    icon: "SiClickup",
    iconColor: "#7B68EE",
  },
  {
    id: "basecamp",
    name: "Basecamp",
    status: "planned",
    scopes: [],
    icon: "SiBasecamp",
    iconColor: "#1D2D35",
  },
  {
    id: "wrike",
    name: "Wrike",
    status: "planned",
    scopes: [],
    icon: "SiWrike",
    iconColor: "#08CF65",
  },
  {
    id: "teamwork",
    name: "Teamwork",
    status: "planned",
    scopes: [],
    icon: "SiTeamwork",
    iconColor: "#6B47DC",
  },
  {
    id: "smartsheet",
    name: "Smartsheet",
    status: "planned",
    scopes: [],
    icon: "SiSmartsheet",
    iconColor: "#0073EA",
  },
  {
    id: "linear",
    name: "Linear",
    status: "planned",
    scopes: [],
    icon: "SiLinear",
    iconColor: "#5E6AD2",
  },

  // --- Communication ---
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    status: "planned",
    scopes: [],
    icon: "SiMicrosoftteams",
    iconColor: "#6264A7",
  },
  {
    id: "zoom",
    name: "Zoom",
    status: "planned",
    scopes: [],
    icon: "SiZoom",
    iconColor: "#2D8CFF",
  },
  {
    id: "discord",
    name: "Discord",
    status: "planned",
    scopes: [],
    icon: "SiDiscord",
    iconColor: "#5865F2",
  },
  {
    id: "intercom",
    name: "Intercom",
    status: "planned",
    scopes: [],
    icon: "SiIntercom",
    iconColor: "#6AFDEF",
  },
  {
    id: "drift",
    name: "Drift",
    status: "planned",
    scopes: [],
    icon: "SiDrift",
    iconColor: "#0176FF",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    status: "planned",
    scopes: [],
    icon: "SiZendesk",
    iconColor: "#03363D",
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    status: "planned",
    scopes: [],
    icon: "SiFreshworks",
    iconColor: "#F26522",
  },
  {
    id: "helpscout",
    name: "Help Scout",
    status: "planned",
    scopes: [],
    icon: "SiHelpscout",
    iconColor: "#1292EE",
  },
  {
    id: "front",
    name: "Front",
    status: "planned",
    scopes: [],
    icon: "SiFront",
    iconColor: "#0067FF",
  },
  {
    id: "twilio",
    name: "Twilio",
    status: "planned",
    scopes: [],
    icon: "SiTwilio",
    iconColor: "#F22F46",
  },

  // --- E-commerce & Payments ---
  {
    id: "shopify",
    name: "Shopify",
    status: "planned",
    scopes: [],
    icon: "SiShopify",
    iconColor: "#7AB55C",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    status: "planned",
    scopes: [],
    icon: "SiWoocommerce",
    iconColor: "#96588A",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    status: "planned",
    scopes: [],
    icon: "SiBigcommerce",
    iconColor: "#121118",
  },
  {
    id: "magento",
    name: "Magento",
    status: "planned",
    scopes: [],
    icon: "SiMagento",
    iconColor: "#EE672F",
  },
  {
    id: "square",
    name: "Square",
    status: "planned",
    scopes: [],
    icon: "SiSquare",
    iconColor: "#3E4348",
  },
  {
    id: "paypal",
    name: "PayPal",
    status: "planned",
    scopes: [],
    icon: "SiPaypal",
    iconColor: "#003087",
  },
  {
    id: "braintree",
    name: "Braintree",
    status: "planned",
    scopes: [],
    icon: "SiBraintree",
    iconColor: "#000000",
  },
  {
    id: "chargebee",
    name: "Chargebee",
    status: "planned",
    scopes: [],
    icon: "SiChargebee",
    iconColor: "#FF6F47",
  },
  {
    id: "recurly",
    name: "Recurly",
    status: "planned",
    scopes: [],
    icon: "SiRecurly",
    iconColor: "#F0598D",
  },
  {
    id: "paddle",
    name: "Paddle",
    status: "planned",
    scopes: [],
    icon: "SiPaddle",
    iconColor: "#FFCE00",
  },

  // --- Advertising ---
  {
    id: "google_ads",
    name: "Google Ads",
    status: "planned",
    scopes: [],
    icon: "SiGoogleads",
    iconColor: "#4285F4",
  },
  {
    id: "facebook_ads",
    name: "Meta Ads",
    status: "planned",
    scopes: [],
    icon: "SiMeta",
    iconColor: "#0081FB",
  },
  {
    id: "linkedin_ads",
    name: "LinkedIn Ads",
    status: "planned",
    scopes: [],
    icon: "SiLinkedin",
    iconColor: "#0A66C2",
  },
  {
    id: "twitter_ads",
    name: "X Ads",
    status: "planned",
    scopes: [],
    icon: "SiX",
    iconColor: "#000000",
  },
  {
    id: "tiktok_ads",
    name: "TikTok Ads",
    status: "planned",
    scopes: [],
    icon: "SiTiktok",
    iconColor: "#000000",
  },
  {
    id: "snapchat_ads",
    name: "Snapchat Ads",
    status: "planned",
    scopes: [],
    icon: "SiSnapchat",
    iconColor: "#FFFC00",
  },
  {
    id: "bing_ads",
    name: "Microsoft Ads",
    status: "planned",
    scopes: [],
    icon: "SiMicrosoftbing",
    iconColor: "#258FFA",
  },
  {
    id: "amazon_ads",
    name: "Amazon Ads",
    status: "planned",
    scopes: [],
    icon: "SiAmazon",
    iconColor: "#FF9900",
  },
  {
    id: "pinterest_ads",
    name: "Pinterest Ads",
    status: "planned",
    scopes: [],
    icon: "SiPinterest",
    iconColor: "#E60023",
  },
  {
    id: "taboola",
    name: "Taboola",
    status: "planned",
    scopes: [],
    icon: "SiTaboola",
    iconColor: "#0064F4",
  },
  {
    id: "outbrain",
    name: "Outbrain",
    status: "planned",
    scopes: [],
    icon: "SiOutbrain",
    iconColor: "#FF5000",
  },
  {
    id: "criteo",
    name: "Criteo",
    status: "planned",
    scopes: [],
    icon: "SiCriteo",
    iconColor: "#F47224",
  },

  // --- HR & Recruiting ---
  {
    id: "workday",
    name: "Workday",
    status: "planned",
    scopes: [],
    icon: "SiWorkday",
    iconColor: "#0072CF",
  },
  {
    id: "bamboohr",
    name: "BambooHR",
    status: "planned",
    scopes: [],
    icon: "SiBamboohr",
    iconColor: "#73C41D",
  },
  {
    id: "gusto",
    name: "Gusto",
    status: "planned",
    scopes: [],
    icon: "SiGusto",
    iconColor: "#F45D48",
  },
  {
    id: "rippling",
    name: "Rippling",
    status: "planned",
    scopes: [],
    icon: "SiRippling",
    iconColor: "#FFC400",
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    status: "planned",
    scopes: [],
    icon: "SiGreenhouse",
    iconColor: "#3AB549",
  },
  {
    id: "lever",
    name: "Lever",
    status: "planned",
    scopes: [],
    icon: "SiLever",
    iconColor: "#49B6B2",
  },
  {
    id: "ashby",
    name: "Ashby",
    status: "planned",
    scopes: [],
    icon: "SiAshby",
    iconColor: "#6366F1",
  },
  {
    id: "deel",
    name: "Deel",
    status: "planned",
    scopes: [],
    icon: "SiDeel",
    iconColor: "#15357A",
  },
  {
    id: "lattice",
    name: "Lattice",
    status: "planned",
    scopes: [],
    icon: "SiLattice",
    iconColor: "#F87171",
  },
  {
    id: "namely",
    name: "Namely",
    status: "planned",
    scopes: [],
    icon: "SiNamely",
    iconColor: "#0077B5",
  },

  // --- Accounting & Finance ---
  {
    id: "quickbooks",
    name: "QuickBooks",
    status: "planned",
    scopes: [],
    icon: "SiQuickbooks",
    iconColor: "#2CA01C",
  },
  {
    id: "xero",
    name: "Xero",
    status: "planned",
    scopes: [],
    icon: "SiXero",
    iconColor: "#13B5EA",
  },
  {
    id: "freshbooks",
    name: "FreshBooks",
    status: "planned",
    scopes: [],
    icon: "SiFreshbooks",
    iconColor: "#0075DD",
  },
  {
    id: "wave",
    name: "Wave",
    status: "planned",
    scopes: [],
    icon: "SiWave",
    iconColor: "#2A79E1",
  },
  {
    id: "netsuite",
    name: "NetSuite",
    status: "planned",
    scopes: [],
    icon: "SiOracle",
    iconColor: "#F80000",
  },
  {
    id: "sage",
    name: "Sage",
    status: "planned",
    scopes: [],
    icon: "SiSage",
    iconColor: "#00D639",
  },
  {
    id: "bill",
    name: "Bill.com",
    status: "planned",
    scopes: [],
    icon: "SiBilldotcom",
    iconColor: "#00C4CC",
  },
  {
    id: "expensify",
    name: "Expensify",
    status: "planned",
    scopes: [],
    icon: "SiExpensify",
    iconColor: "#0D8F77",
  },
  {
    id: "brex",
    name: "Brex",
    status: "planned",
    scopes: [],
    icon: "SiBrex",
    iconColor: "#000000",
  },
  {
    id: "ramp",
    name: "Ramp",
    status: "planned",
    scopes: [],
    icon: "SiRamp",
    iconColor: "#06AA4F",
  },

  // --- Cloud Storage & Files ---
  {
    id: "google_drive",
    name: "Google Drive",
    status: "planned",
    scopes: [],
    icon: "SiGoogledrive",
    iconColor: "#4285F4",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    status: "planned",
    scopes: [],
    icon: "SiDropbox",
    iconColor: "#0061FF",
  },
  {
    id: "box",
    name: "Box",
    status: "planned",
    scopes: [],
    icon: "SiBox",
    iconColor: "#0061D5",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    status: "planned",
    scopes: [],
    icon: "SiMicrosoftonedrive",
    iconColor: "#0078D4",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    status: "planned",
    scopes: [],
    icon: "SiMicrosoftsharepoint",
    iconColor: "#038387",
  },

  // --- Developer Tools ---
  {
    id: "gitlab",
    name: "GitLab",
    status: "planned",
    scopes: [],
    icon: "SiGitlab",
    iconColor: "#FC6D26",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    status: "planned",
    scopes: [],
    icon: "SiBitbucket",
    iconColor: "#0052CC",
  },
  {
    id: "circleci",
    name: "CircleCI",
    status: "planned",
    scopes: [],
    icon: "SiCircleci",
    iconColor: "#343434",
  },
  {
    id: "jenkins",
    name: "Jenkins",
    status: "planned",
    scopes: [],
    icon: "SiJenkins",
    iconColor: "#D24939",
  },
  {
    id: "datadog",
    name: "Datadog",
    status: "planned",
    scopes: [],
    icon: "SiDatadog",
    iconColor: "#632CA6",
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    status: "planned",
    scopes: [],
    icon: "SiPagerduty",
    iconColor: "#06AC38",
  },
  {
    id: "sentry",
    name: "Sentry",
    status: "planned",
    scopes: [],
    icon: "SiSentry",
    iconColor: "#362D59",
  },
  {
    id: "launchdarkly",
    name: "LaunchDarkly",
    status: "planned",
    scopes: [],
    icon: "SiLaunchdarkly",
    iconColor: "#405BFF",
  },

  // --- Productivity & Docs ---
  {
    id: "confluence",
    name: "Confluence",
    status: "planned",
    scopes: [],
    icon: "SiConfluence",
    iconColor: "#172B4D",
  },
  {
    id: "coda",
    name: "Coda",
    status: "planned",
    scopes: [],
    icon: "SiCoda",
    iconColor: "#F46A54",
  },
  {
    id: "figma",
    name: "Figma",
    status: "planned",
    scopes: [],
    icon: "SiFigma",
    iconColor: "#F24E1E",
  },
  {
    id: "miro",
    name: "Miro",
    status: "planned",
    scopes: [],
    icon: "SiMiro",
    iconColor: "#FFD02F",
  },
  {
    id: "loom",
    name: "Loom",
    status: "planned",
    scopes: [],
    icon: "SiLoom",
    iconColor: "#625DF5",
  },
  {
    id: "calendly",
    name: "Calendly",
    status: "planned",
    scopes: [],
    icon: "SiCalendly",
    iconColor: "#006BFF",
  },
  {
    id: "docusign",
    name: "DocuSign",
    status: "planned",
    scopes: [],
    icon: "SiDocusign",
    iconColor: "#FFCC22",
  },
  {
    id: "pandadoc",
    name: "PandaDoc",
    status: "planned",
    scopes: [],
    icon: "SiPandadoc",
    iconColor: "#46C17D",
  },
  {
    id: "typeform",
    name: "Typeform",
    status: "planned",
    scopes: [],
    icon: "SiTypeform",
    iconColor: "#262627",
  },
  {
    id: "surveymonkey",
    name: "SurveyMonkey",
    status: "planned",
    scopes: [],
    icon: "SiSurveymonkey",
    iconColor: "#00BF6F",
  },

  // --- Social & Content ---
  {
    id: "hootsuite",
    name: "Hootsuite",
    status: "planned",
    scopes: [],
    icon: "SiHootsuite",
    iconColor: "#143059",
  },
  {
    id: "buffer",
    name: "Buffer",
    status: "planned",
    scopes: [],
    icon: "SiBuffer",
    iconColor: "#231F20",
  },
  {
    id: "sproutsocial",
    name: "Sprout Social",
    status: "planned",
    scopes: [],
    icon: "SiSproutsocial",
    iconColor: "#59CB59",
  },
  {
    id: "later",
    name: "Later",
    status: "planned",
    scopes: [],
    icon: "SiLater",
    iconColor: "#F83678",
  },
  {
    id: "youtube",
    name: "YouTube",
    status: "planned",
    scopes: [],
    icon: "SiYoutube",
    iconColor: "#FF0000",
  },
  {
    id: "vimeo",
    name: "Vimeo",
    status: "planned",
    scopes: [],
    icon: "SiVimeo",
    iconColor: "#1AB7EA",
  },
  {
    id: "wordpress",
    name: "WordPress",
    status: "planned",
    scopes: [],
    icon: "SiWordpress",
    iconColor: "#21759B",
  },
  {
    id: "webflow",
    name: "Webflow",
    status: "planned",
    scopes: [],
    icon: "SiWebflow",
    iconColor: "#4353FF",
  },
  {
    id: "contentful",
    name: "Contentful",
    status: "planned",
    scopes: [],
    icon: "SiContentful",
    iconColor: "#2478CC",
  },
  {
    id: "sanity",
    name: "Sanity",
    status: "planned",
    scopes: [],
    icon: "SiSanity",
    iconColor: "#F03E2F",
  },

  // --- Database & Backend ---
  {
    id: "mongodb",
    name: "MongoDB",
    status: "completed",
    scopes: [
      "Query collections",
      "Insert documents",
      "Update documents",
      "Delete documents",
    ],
    icon: "SiMongodb",
    iconColor: "#47A248",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    status: "completed",
    scopes: ["Query tables", "Insert rows", "Update rows", "Delete rows"],
    icon: "SiPostgresql",
    iconColor: "#4169E1",
  },
  {
    id: "mysql",
    name: "MySQL",
    status: "planned",
    scopes: [],
    icon: "SiMysql",
    iconColor: "#4479A1",
  },
  {
    id: "redis",
    name: "Redis",
    status: "planned",
    scopes: [],
    icon: "SiRedis",
    iconColor: "#DC382D",
  },
  {
    id: "elasticsearch",
    name: "Elasticsearch",
    status: "planned",
    scopes: [],
    icon: "SiElasticsearch",
    iconColor: "#005571",
  },
  {
    id: "firebase",
    name: "Firebase",
    status: "planned",
    scopes: [],
    icon: "SiFirebase",
    iconColor: "#FFCA28",
  },
  {
    id: "aws",
    name: "AWS",
    status: "planned",
    scopes: [],
    icon: "SiAmazonwebservices",
    iconColor: "#FF9900",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    status: "planned",
    scopes: [],
    icon: "SiMicrosoftazure",
    iconColor: "#0078D4",
  },
  {
    id: "gcp",
    name: "Google Cloud",
    status: "planned",
    scopes: [],
    icon: "SiGooglecloud",
    iconColor: "#4285F4",
  },
  {
    id: "heroku",
    name: "Heroku",
    status: "planned",
    scopes: [],
    icon: "SiHeroku",
    iconColor: "#430098",
  },
  {
    id: "vercel",
    name: "Vercel",
    status: "planned",
    scopes: [],
    icon: "SiVercel",
    iconColor: "#000000",
  },
  {
    id: "netlify",
    name: "Netlify",
    status: "planned",
    scopes: [],
    icon: "SiNetlify",
    iconColor: "#00C7B7",
  },
];

/**
 * @param {{ dryRun: boolean; force: boolean }} options
 */
async function seedIntegrations({ dryRun, force }) {
  console.log(chalk.cyan(`\n📦 Seeding ${COLLECTION_NAME} collection...\n`));

  if (dryRun) {
    console.log(chalk.yellow("🔍 DRY RUN — no changes will be written\n"));
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const integ of SEED_DATA) {
    const ref = db.collection(COLLECTION_NAME).doc(integ.id);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(chalk.green(`  ➕ CREATE: ${integ.name} (${integ.id})`));
      created += 1;

      if (!dryRun) {
        await ref.set({
          name: integ.name,
          status: integ.status,
          scopes: integ.scopes,
          icon: integ.icon,
          iconColor: integ.iconColor,
          votes: [],
          createdAt: FieldValue.serverTimestamp(),
          createdBy: "admin-script",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "admin-script",
        });
      }
      continue;
    }

    const data = snap.data() || {};
    const hasVotes = Array.isArray(data.votes);
    const hasScopes = Array.isArray(data.scopes) && data.scopes.length > 0;
    const hasIcon = typeof data.icon === "string" && data.icon.trim() !== "";
    const hasIconColor =
      typeof data.iconColor === "string" && data.iconColor.trim() !== "";
    const shouldUpdateName =
      force || typeof data.name !== "string" || data.name.trim() === "";
    const shouldUpdateStatus =
      force || typeof data.status !== "string" || data.status.trim() === "";
    const shouldUpdateScopes = force || !hasScopes;
    const shouldUpdateIcon = force || !hasIcon;
    const shouldUpdateIconColor = force || !hasIconColor;
    const shouldInitVotes = !hasVotes;

    if (
      shouldUpdateName ||
      shouldUpdateStatus ||
      shouldUpdateScopes ||
      shouldUpdateIcon ||
      shouldUpdateIconColor ||
      shouldInitVotes
    ) {
      console.log(chalk.blue(`  🔄 UPDATE: ${integ.name} (${integ.id})`));
      updated += 1;

      if (!dryRun) {
        /** @type {Record<string, unknown>} */
        const patch = {
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "admin-script",
        };
        if (shouldUpdateName) patch.name = integ.name;
        if (shouldUpdateStatus) patch.status = integ.status;
        if (shouldUpdateScopes) patch.scopes = integ.scopes;
        if (shouldUpdateIcon) patch.icon = integ.icon;
        if (shouldUpdateIconColor) patch.iconColor = integ.iconColor;
        if (shouldInitVotes) patch.votes = [];

        await ref.set(patch, { merge: true });
      }
    } else {
      console.log(chalk.gray(`  ⏭️  SKIP:   ${integ.name} (${integ.id})`));
      skipped += 1;
    }
  }

  console.log(chalk.cyan("\n─".repeat(40)));
  console.log(
    chalk.white(
      `\n✅ Done! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}\n`
    )
  );

  if (dryRun) {
    console.log(chalk.yellow("Re-run without --dry-run to apply changes.\n"));
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

// Main
(async () => {
  try {
    await seedIntegrations({ dryRun, force });
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
})();
