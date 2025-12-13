/**
 * OAuth Integration Test App
 * Test various OAuth integrations via Nango
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Avatar,
  Button,
  Stack,
  Table,
  Paper,
  Badge,
  Alert,
  Loader,
  Center,
  Tabs,
  Select,
  Textarea,
  Card,
  NavLink,
  ScrollArea,
  Box,
  TextInput,
  PasswordInput,
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import {
  IconAddressBook,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconBrandSlack,
  IconMessage,
  IconSparkles,
  IconPlugConnected,
  IconBrandGmail,
  IconMail,
  IconMailOpened,
  IconTable,
  IconFileSpreadsheet,
  IconDatabase,
  IconBrandSupabase,
  IconLink,
  IconKey,
} from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../framework/hooks/useFunction.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * @typedef {Object} HubSpotContact
 * @property {string} id
 * @property {string} [email]
 * @property {string} [firstname]
 * @property {string} [lastname]
 * @property {string} [company]
 * @property {string} [phone]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} SlackChannel
 * @property {string} id
 * @property {string} name
 * @property {boolean} isPrivate
 * @property {number} memberCount
 * @property {string} [topic]
 * @property {string} [purpose]
 */

/**
 * @typedef {Object} GmailMessage
 * @property {string} id
 * @property {string} subject
 * @property {string} from
 * @property {string} snippet
 * @property {string} date
 */

/**
 * @typedef {Object} GoogleSheet
 * @property {string} id
 * @property {string} name
 * @property {string} [createdAt]
 * @property {string} [modifiedAt]
 * @property {string} [url]
 */

/**
 * @typedef {Object} AirtableBase
 * @property {string} id
 * @property {string} name
 * @property {string} [permissionLevel]
 */

/**
 * @typedef {Object} AirtableTable
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 */

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [activeTab, setActiveTab] = useState("gmail");

  // Gmail OAuth via Nango
  const {
    isConnected: gmailConnected,
    connect: connectGmail,
    disconnect: disconnectGmail,
    loading: gmailOauthLoading,
    error: gmailOauthError,
  } = useNangoOAuth(NangoIntegrations.googleMail);

  // HubSpot OAuth via Nango
  const {
    isConnected: hubspotConnected,
    connect: connectHubspot,
    disconnect: disconnectHubspot,
    loading: hubspotOauthLoading,
    error: hubspotOauthError,
  } = useNangoOAuth(NangoIntegrations.hubspot);

  // Slack OAuth via Nango
  const {
    isConnected: slackConnected,
    connect: connectSlack,
    disconnect: disconnectSlack,
    loading: slackOauthLoading,
    error: slackOauthError,
  } = useNangoOAuth(NangoIntegrations.slack);

  // Google Sheets OAuth via Nango
  const {
    isConnected: sheetsConnected,
    connect: connectSheets,
    disconnect: disconnectSheets,
    loading: sheetsOauthLoading,
    error: sheetsOauthError,
  } = useNangoOAuth(NangoIntegrations.googleSheets);

  // Airtable OAuth via Nango
  const {
    isConnected: airtableConnected,
    connect: connectAirtable,
    disconnect: disconnectAirtable,
    loading: airtableOauthLoading,
    error: airtableOauthError,
  } = useNangoOAuth(NangoIntegrations.airtable);

  // Gmail functions
  const { call: scanGmail, loading: scanningGmail } = useFunction("scanGmail");

  // HubSpot functions
  const { call: fetchContacts, loading: fetchingContacts } =
    useFunction("fetchHubspotContacts");

  // Slack functions
  const { call: fetchChannels, loading: fetchingChannels } =
    useFunction("fetchSlackChannels");
  const { call: summarizeChannel, loading: summarizing } =
    useFunction("summarizeSlackChannel");

  // Google Sheets functions
  const { call: listSheets, loading: listingSheets } =
    useFunction("listGoogleSheets");
  const { call: fetchSheet, loading: fetchingSheet } =
    useFunction("fetchGoogleSheet");

  // Airtable functions
  const { call: listBases, loading: listingBases } =
    useFunction("listAirtableBases");
  const { call: listTables, loading: listingTables } =
    useFunction("listAirtableTables");
  const { call: fetchRecords, loading: fetchingRecords } =
    useFunction("fetchAirtableRecords");

  // Supabase functions
  const { call: saveSupabaseCreds, loading: savingSupabaseCreds } =
    useFunction("saveSupabaseCredentials");
  const { call: getSupabaseCreds, loading: gettingSupabaseCreds } =
    useFunction("getSupabaseCredentials");
  const { call: deleteSupabaseCreds, loading: deletingSupabaseCreds } =
    useFunction("deleteSupabaseCredentials");
  const { call: listSupabaseTables, loading: listingSupabaseTables } =
    useFunction("listSupabaseTables");
  const { call: fetchSupabaseData, loading: fetchingSupabaseData } =
    useFunction("fetchSupabaseData");

  // Gmail state
  /** @type {[number | null, React.Dispatch<React.SetStateAction<number | null>>]} */
  const [gmailCount, setGmailCount] = useState(null);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [gmailError, setGmailError] = useState(null);

  // HubSpot state
  /** @type {[HubSpotContact[], React.Dispatch<React.SetStateAction<HubSpotContact[]>>]} */
  const [contacts, setContacts] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [hubspotError, setHubspotError] = useState(null);

  // Slack state
  /** @type {[SlackChannel[], React.Dispatch<React.SetStateAction<SlackChannel[]>>]} */
  const [channels, setChannels] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedChannel, setSelectedChannel] = useState(null);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [summary, setSummary] = useState(null);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [slackError, setSlackError] = useState(null);

  // Google Sheets state
  /** @type {[GoogleSheet[], React.Dispatch<React.SetStateAction<GoogleSheet[]>>]} */
  const [sheets, setSheets] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedSheet, setSelectedSheet] = useState(null);
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [sheetHeaders, setSheetHeaders] = useState([]);
  /** @type {[Record<string, string>[], React.Dispatch<React.SetStateAction<Record<string, string>[]>>]} */
  const [sheetData, setSheetData] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [sheetsError, setSheetsError] = useState(null);

  // Airtable state
  /** @type {[AirtableBase[], React.Dispatch<React.SetStateAction<AirtableBase[]>>]} */
  const [bases, setBases] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedBase, setSelectedBase] = useState(null);
  /** @type {[AirtableTable[], React.Dispatch<React.SetStateAction<AirtableTable[]>>]} */
  const [tables, setTables] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedTable, setSelectedTable] = useState(null);
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [airtableFields, setAirtableFields] = useState([]);
  /** @type {[Record<string, unknown>[], React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>]} */
  const [airtableRecords, setAirtableRecords] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [airtableError, setAirtableError] = useState(null);

  // Supabase state
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [supabaseUrl, setSupabaseUrl] = useState("");
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [supabaseKey, setSupabaseKey] = useState("");
  /** @type {[{name: string}[], React.Dispatch<React.SetStateAction<{name: string}[]>>]} */
  const [supabaseTables, setSupabaseTables] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedSupabaseTable, setSelectedSupabaseTable] = useState(null);
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [supabaseColumns, setSupabaseColumns] = useState([]);
  /** @type {[Record<string, unknown>[], React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>]} */
  const [supabaseData, setSupabaseData] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [supabaseError, setSupabaseError] = useState(null);

  // Check Supabase connection on mount
  React.useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        const result = await getSupabaseCreds({});
        if (result.success && result.hasCredentials) {
          setSupabaseConnected(true);
          setSupabaseUrl(result.projectUrl || "");
        }
      } catch (err) {
        // No credentials saved - that's OK
      }
    };
    if (user) {
      checkSupabaseConnection();
    }
  }, [user]);

  // Integration config for sidebar
  const integrations = [
    {
      id: "gmail",
      label: "Gmail",
      icon: IconBrandGmail,
      color: "#EA4335",
      connected: gmailConnected,
    },
    {
      id: "hubspot",
      label: "HubSpot",
      icon: IconAddressBook,
      color: "#ff7a59",
      connected: hubspotConnected,
    },
    {
      id: "slack",
      label: "Slack",
      icon: IconBrandSlack,
      color: "#4A154B",
      connected: slackConnected,
    },
    {
      id: "sheets",
      label: "Google Sheets",
      icon: IconFileSpreadsheet,
      color: "#0F9D58",
      connected: sheetsConnected,
    },
    {
      id: "airtable",
      label: "Airtable",
      icon: IconDatabase,
      color: "#18BFFF",
      connected: airtableConnected,
    },
    {
      id: "supabase",
      label: "Supabase",
      icon: IconBrandSupabase,
      color: "#3ECF8E",
      connected: supabaseConnected,
    },
  ];

  // Gmail handlers
  const handleConnectGmail = async () => {
    try {
      await connectGmail();
      notifications.show({
        title: "Connected!",
        message: "Gmail connected successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Connection Failed",
        message: err instanceof Error ? err.message : "Failed to connect",
        color: "red",
      });
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
      setGmailCount(null);
      notifications.show({
        title: "Disconnected",
        message: "Gmail has been disconnected",
        color: "gray",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to disconnect",
        color: "red",
      });
    }
  };

  const handleScanGmail = async () => {
    try {
      setGmailError(null);
      const result = await scanGmail({ userId: user?.uid });

      if (result.success) {
        setGmailCount(result.importantCount || 0);
        notifications.show({
          title: "Scan Complete",
          message: `Found ${result.importantCount || 0} important emails`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to scan");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan Gmail";
      setGmailError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  // HubSpot handlers
  const handleConnectHubspot = async () => {
    try {
      await connectHubspot();
      notifications.show({
        title: "Connected!",
        message: "HubSpot connected successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Connection Failed",
        message: err instanceof Error ? err.message : "Failed to connect",
        color: "red",
      });
    }
  };

  const handleDisconnectHubspot = async () => {
    try {
      await disconnectHubspot();
      setContacts([]);
      notifications.show({
        title: "Disconnected",
        message: "HubSpot has been disconnected",
        color: "gray",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to disconnect",
        color: "red",
      });
    }
  };

  const handleFetchContacts = async () => {
    try {
      setHubspotError(null);
      const result = await fetchContacts({});

      if (result.success && result.contacts) {
        setContacts(result.contacts);
        notifications.show({
          title: "Contacts Loaded",
          message: `Loaded ${result.contacts.length} contacts from HubSpot`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch contacts");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch contacts";
      setHubspotError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  // Slack handlers
  const handleConnectSlack = async () => {
    try {
      await connectSlack();
      notifications.show({
        title: "Connected!",
        message: "Slack connected successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Connection Failed",
        message: err instanceof Error ? err.message : "Failed to connect",
        color: "red",
      });
    }
  };

  const handleDisconnectSlack = async () => {
    try {
      await disconnectSlack();
      setChannels([]);
      setSelectedChannel(null);
      setSummary(null);
      notifications.show({
        title: "Disconnected",
        message: "Slack has been disconnected",
        color: "gray",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to disconnect",
        color: "red",
      });
    }
  };

  const handleFetchChannels = async () => {
    try {
      setSlackError(null);
      const result = await fetchChannels({});

      if (result.success && result.channels) {
        setChannels(result.channels);
        notifications.show({
          title: "Channels Loaded",
          message: `Found ${result.channels.length} channels`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch channels");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch channels";
      setSlackError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleSummarize = async () => {
    if (!selectedChannel) {
      notifications.show({
        title: "Select a Channel",
        message: "Please select a channel first",
        color: "yellow",
      });
      return;
    }

    try {
      setSlackError(null);
      setSummary(null);

      const channel = channels.find((c) => c.id === selectedChannel);
      const result = await summarizeChannel({
        channelId: selectedChannel,
        channelName: channel?.name || selectedChannel,
        messageLimit: 50,
      });

      if (result.success && result.summary) {
        setSummary(result.summary);
        notifications.show({
          title: "Summary Generated",
          message: `Analyzed ${result.messageCount} messages`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to summarize");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to summarize channel";
      setSlackError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  // Google Sheets handlers
  const handleConnectSheets = async () => {
    try {
      await connectSheets();
      notifications.show({
        title: "Connected!",
        message: "Google Sheets connected successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Connection Failed",
        message: err instanceof Error ? err.message : "Failed to connect",
        color: "red",
      });
    }
  };

  const handleDisconnectSheets = async () => {
    try {
      await disconnectSheets();
      setSheets([]);
      setSelectedSheet(null);
      setSheetHeaders([]);
      setSheetData([]);
      notifications.show({
        title: "Disconnected",
        message: "Google Sheets has been disconnected",
        color: "gray",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to disconnect",
        color: "red",
      });
    }
  };

  const handleListSheets = async () => {
    try {
      setSheetsError(null);
      const result = await listSheets({});

      if (result.success && result.sheets) {
        setSheets(result.sheets);
        notifications.show({
          title: "Sheets Loaded",
          message: `Found ${result.sheets.length} spreadsheets`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list sheets");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to list sheets";
      setSheetsError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleFetchSheet = async () => {
    if (!selectedSheet) {
      notifications.show({
        title: "Select a Sheet",
        message: "Please select a spreadsheet first",
        color: "yellow",
      });
      return;
    }

    try {
      setSheetsError(null);
      setSheetHeaders([]);
      setSheetData([]);

      const result = await fetchSheet({
        spreadsheetId: selectedSheet,
        range: "Sheet1",
      });

      if (result.success) {
        setSheetHeaders(result.headers || []);
        setSheetData(result.data || []);
        notifications.show({
          title: "Data Loaded",
          message: `Loaded ${result.totalRows || 0} rows`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch sheet data");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch sheet data";
      setSheetsError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  // Airtable handlers
  const handleConnectAirtable = async () => {
    try {
      await connectAirtable();
      notifications.show({
        title: "Connected!",
        message: "Airtable connected successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Connection Failed",
        message: err instanceof Error ? err.message : "Failed to connect",
        color: "red",
      });
    }
  };

  const handleDisconnectAirtable = async () => {
    try {
      await disconnectAirtable();
      setBases([]);
      setSelectedBase(null);
      setTables([]);
      setSelectedTable(null);
      setAirtableFields([]);
      setAirtableRecords([]);
      notifications.show({
        title: "Disconnected",
        message: "Airtable has been disconnected",
        color: "gray",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to disconnect",
        color: "red",
      });
    }
  };

  const handleListBases = async () => {
    try {
      setAirtableError(null);
      const result = await listBases({});

      if (result.success && result.bases) {
        setBases(result.bases);
        notifications.show({
          title: "Bases Loaded",
          message: `Found ${result.bases.length} bases`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list bases");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to list bases";
      setAirtableError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleSelectBase = async (baseId) => {
    setSelectedBase(baseId);
    setTables([]);
    setSelectedTable(null);
    setAirtableFields([]);
    setAirtableRecords([]);

    if (!baseId) return;

    try {
      setAirtableError(null);
      const result = await listTables({ baseId });

      if (result.success && result.tables) {
        setTables(result.tables);
      } else {
        throw new Error(result.error || "Failed to list tables");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to list tables";
      setAirtableError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleFetchRecords = async () => {
    if (!selectedBase || !selectedTable) {
      notifications.show({
        title: "Select Base and Table",
        message: "Please select a base and table first",
        color: "yellow",
      });
      return;
    }

    try {
      setAirtableError(null);
      setAirtableFields([]);
      setAirtableRecords([]);

      const result = await fetchRecords({
        baseId: selectedBase,
        tableId: selectedTable,
      });

      if (result.success) {
        setAirtableFields(result.fields || []);
        setAirtableRecords(result.records || []);
        notifications.show({
          title: "Records Loaded",
          message: `Loaded ${result.totalRecords || 0} records`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch records");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch records";
      setAirtableError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  // Supabase handlers
  const handleConnectSupabase = async () => {
    if (!supabaseUrl || !supabaseKey) {
      notifications.show({
        title: "Missing Credentials",
        message: "Please enter both Project URL and API Key",
        color: "yellow",
      });
      return;
    }

    try {
      setSupabaseError(null);
      const result = await saveSupabaseCreds({
        projectUrl: supabaseUrl,
        apiKey: supabaseKey,
      });

      if (result.success) {
        setSupabaseConnected(true);
        setSupabaseKey(""); // Clear key from state for security
        notifications.show({
          title: "Connected!",
          message: "Supabase credentials saved successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      } else {
        throw new Error(result.error || "Failed to save credentials");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect";
      setSupabaseError(message);
      notifications.show({
        title: "Connection Failed",
        message,
        color: "red",
      });
    }
  };

  const handleDisconnectSupabase = async () => {
    try {
      await deleteSupabaseCreds({});
      setSupabaseConnected(false);
      setSupabaseUrl("");
      setSupabaseKey("");
      setSupabaseTables([]);
      setSelectedSupabaseTable(null);
      setSupabaseColumns([]);
      setSupabaseData([]);
      notifications.show({
        title: "Disconnected",
        message: "Supabase credentials removed",
        color: "gray",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to disconnect",
        color: "red",
      });
    }
  };

  const handleListSupabaseTables = async () => {
    try {
      setSupabaseError(null);
      const result = await listSupabaseTables({});

      if (result.success && result.tables) {
        setSupabaseTables(result.tables);
        notifications.show({
          title: "Tables Loaded",
          message: `Found ${result.tables.length} tables`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list tables");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to list tables";
      setSupabaseError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleFetchSupabaseData = async () => {
    if (!selectedSupabaseTable) {
      notifications.show({
        title: "Select a Table",
        message: "Please select a table first",
        color: "yellow",
      });
      return;
    }

    try {
      setSupabaseError(null);
      setSupabaseColumns([]);
      setSupabaseData([]);

      const result = await fetchSupabaseData({
        tableName: selectedSupabaseTable,
      });

      if (result.success) {
        setSupabaseColumns(result.columns || []);
        setSupabaseData(result.data || []);
        notifications.show({
          title: "Data Loaded",
          message: `Loaded ${result.fetchedCount || 0} of ${result.totalCount || 0} records`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch data");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch data";
      setSupabaseError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "gmail":
        return (
          <Stack gap="lg">
            <Paper shadow="sm" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconBrandGmail size={40} color="#EA4335" />
                  <div>
                    <Text fw={500} size="lg">
                      Gmail Connection
                    </Text>
                    <Text size="sm" c="dimmed">
                      Connect Gmail to scan your inbox
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  {gmailConnected && (
                    <Badge
                      color="green"
                      size="lg"
                      leftSection={<IconCheck size={14} />}
                    >
                      Connected
                    </Badge>
                  )}
                  <Button
                    onClick={gmailConnected ? handleDisconnectGmail : handleConnectGmail}
                    loading={gmailOauthLoading}
                    color={gmailConnected ? "gray" : "red"}
                    variant={gmailConnected ? "light" : "filled"}
                  >
                    {gmailConnected ? "Disconnect" : "Connect Gmail"}
                  </Button>
                </Group>
              </Group>

              {gmailOauthError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mt="md">
                  {gmailOauthError.message}
                </Alert>
              )}
            </Paper>

            {gmailConnected && (
              <Paper shadow="sm" p="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>Inbox Scanner</Title>
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleScanGmail}
                      loading={scanningGmail}
                    >
                      Scan Inbox
                    </Button>
                  </Group>

                  {gmailError && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red">
                      {gmailError}
                    </Alert>
                  )}

                  {scanningGmail ? (
                    <Center py="xl">
                      <Stack align="center" gap="sm">
                        <Loader size="lg" />
                        <Text size="sm" c="dimmed">Scanning inbox...</Text>
                      </Stack>
                    </Center>
                  ) : gmailCount !== null ? (
                    <Card withBorder>
                      <Center py="lg">
                        <Stack align="center" gap="sm">
                          <IconMailOpened size={48} color="#EA4335" />
                          <Text size="xl" fw={600}>
                            {gmailCount} important emails
                          </Text>
                          <Text size="sm" c="dimmed">
                            Found in your inbox
                          </Text>
                        </Stack>
                      </Center>
                    </Card>
                  ) : (
                    <Text c="dimmed" ta="center" py="xl">
                      Click "Scan Inbox" to check for important emails
                    </Text>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        );

      case "hubspot":
        return (
          <Stack gap="lg">
            <Paper shadow="sm" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconAddressBook size={40} color="#ff7a59" />
                  <div>
                    <Text fw={500} size="lg">
                      HubSpot Connection
                    </Text>
                    <Text size="sm" c="dimmed">
                      Connect your HubSpot account to view contacts
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  {hubspotConnected && (
                    <Badge
                      color="green"
                      size="lg"
                      leftSection={<IconCheck size={14} />}
                    >
                      Connected
                    </Badge>
                  )}
                  <Button
                    onClick={
                      hubspotConnected
                        ? handleDisconnectHubspot
                        : handleConnectHubspot
                    }
                    loading={hubspotOauthLoading}
                    color={hubspotConnected ? "gray" : "orange"}
                    variant={hubspotConnected ? "light" : "filled"}
                  >
                    {hubspotConnected ? "Disconnect" : "Connect HubSpot"}
                  </Button>
                </Group>
              </Group>

              {hubspotOauthError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  mt="md"
                >
                  {hubspotOauthError.message}
                </Alert>
              )}
            </Paper>

            {hubspotConnected && (
              <Paper shadow="sm" p="lg" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Contacts</Title>
                  <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleFetchContacts}
                    loading={fetchingContacts}
                  >
                    {contacts.length > 0 ? "Refresh" : "Load Contacts"}
                  </Button>
                </Group>

                {hubspotError && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    mb="md"
                  >
                    {hubspotError}
                  </Alert>
                )}

                {fetchingContacts ? (
                  <Center py="xl">
                    <Loader size="lg" />
                  </Center>
                ) : contacts.length > 0 ? (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Company</Table.Th>
                        <Table.Th>Phone</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {contacts.map((contact) => (
                        <Table.Tr key={contact.id}>
                          <Table.Td>
                            {[contact.firstname, contact.lastname]
                              .filter(Boolean)
                              .join(" ") || "-"}
                          </Table.Td>
                          <Table.Td>{contact.email || "-"}</Table.Td>
                          <Table.Td>{contact.company || "-"}</Table.Td>
                          <Table.Td>{contact.phone || "-"}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    No contacts loaded. Click "Load Contacts" to fetch from
                    HubSpot.
                  </Text>
                )}
              </Paper>
            )}
          </Stack>
        );

      case "slack":
        return (
          <Stack gap="lg">
            <Paper shadow="sm" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconBrandSlack size={40} color="#4A154B" />
                  <div>
                    <Text fw={500} size="lg">
                      Slack Connection
                    </Text>
                    <Text size="sm" c="dimmed">
                      Connect Slack to summarize channel conversations
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  {slackConnected && (
                    <Badge
                      color="green"
                      size="lg"
                      leftSection={<IconCheck size={14} />}
                    >
                      Connected
                    </Badge>
                  )}
                  <Button
                    onClick={
                      slackConnected ? handleDisconnectSlack : handleConnectSlack
                    }
                    loading={slackOauthLoading}
                    color={slackConnected ? "gray" : "violet"}
                    variant={slackConnected ? "light" : "filled"}
                  >
                    {slackConnected ? "Disconnect" : "Connect Slack"}
                  </Button>
                </Group>
              </Group>

              {slackOauthError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  mt="md"
                >
                  {slackOauthError.message}
                </Alert>
              )}
            </Paper>

            {slackConnected && (
              <Paper shadow="sm" p="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>Channel Summarizer</Title>
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleFetchChannels}
                      loading={fetchingChannels}
                      variant="light"
                    >
                      {channels.length > 0 ? "Refresh" : "Load Channels"}
                    </Button>
                  </Group>

                  {slackError && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red">
                      {slackError}
                    </Alert>
                  )}

                  {channels.length > 0 && (
                    <>
                      <Select
                        label="Select a channel to summarize"
                        placeholder="Choose a channel..."
                        data={channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}${ch.isPrivate ? " 🔒" : ""} (${ch.memberCount} members)`,
                        }))}
                        value={selectedChannel}
                        onChange={setSelectedChannel}
                        searchable
                        leftSection={<IconMessage size={16} />}
                      />

                      <Button
                        onClick={handleSummarize}
                        loading={summarizing}
                        disabled={!selectedChannel}
                        leftSection={<IconSparkles size={16} />}
                        color="violet"
                      >
                        Generate Summary
                      </Button>
                    </>
                  )}

                  {fetchingChannels && (
                    <Center py="xl">
                      <Loader size="lg" />
                    </Center>
                  )}

                  {!fetchingChannels && channels.length === 0 && (
                    <Text c="dimmed" ta="center" py="md">
                      Click "Load Channels" to see your Slack channels
                    </Text>
                  )}

                  {summarizing && (
                    <Card withBorder>
                      <Center py="xl">
                        <Stack align="center" gap="sm">
                          <Loader size="md" />
                          <Text size="sm" c="dimmed">
                            Analyzing messages and generating summary...
                          </Text>
                        </Stack>
                      </Center>
                    </Card>
                  )}

                  {summary && !summarizing && (
                    <Card withBorder>
                      <Stack gap="sm">
                        <Group gap="xs">
                          <IconSparkles size={18} color="#7c3aed" />
                          <Text fw={500}>Channel Summary</Text>
                        </Group>
                        <Textarea
                          value={summary}
                          readOnly
                          autosize
                          minRows={4}
                          maxRows={15}
                          styles={{
                            input: {
                              backgroundColor: "#f8f9fa",
                              border: "none",
                            },
                          }}
                        />
                      </Stack>
                    </Card>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        );

      case "sheets":
        return (
          <Stack gap="lg">
            <Paper shadow="sm" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconFileSpreadsheet size={40} color="#0F9D58" />
                  <div>
                    <Text fw={500} size="lg">
                      Google Sheets Connection
                    </Text>
                    <Text size="sm" c="dimmed">
                      Connect to read data from your spreadsheets
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  {sheetsConnected && (
                    <Badge
                      color="green"
                      size="lg"
                      leftSection={<IconCheck size={14} />}
                    >
                      Connected
                    </Badge>
                  )}
                  <Button
                    onClick={
                      sheetsConnected ? handleDisconnectSheets : handleConnectSheets
                    }
                    loading={sheetsOauthLoading}
                    color={sheetsConnected ? "gray" : "green"}
                    variant={sheetsConnected ? "light" : "filled"}
                  >
                    {sheetsConnected ? "Disconnect" : "Connect Google Sheets"}
                  </Button>
                </Group>
              </Group>

              {sheetsOauthError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  mt="md"
                >
                  {sheetsOauthError.message}
                </Alert>
              )}
            </Paper>

            {sheetsConnected && (
              <Paper shadow="sm" p="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>Spreadsheet Viewer</Title>
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleListSheets}
                      loading={listingSheets}
                      variant="light"
                    >
                      {sheets.length > 0 ? "Refresh" : "Load Spreadsheets"}
                    </Button>
                  </Group>

                  {sheetsError && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red">
                      {sheetsError}
                    </Alert>
                  )}

                  {sheets.length > 0 && (
                    <>
                      <Select
                        label="Select a spreadsheet"
                        placeholder="Choose a spreadsheet..."
                        data={sheets.map((sheet) => ({
                          value: sheet.id,
                          label: sheet.name,
                        }))}
                        value={selectedSheet}
                        onChange={setSelectedSheet}
                        searchable
                        leftSection={<IconTable size={16} />}
                      />

                      <Button
                        onClick={handleFetchSheet}
                        loading={fetchingSheet}
                        disabled={!selectedSheet}
                        leftSection={<IconTable size={16} />}
                        color="green"
                      >
                        Load Data
                      </Button>
                    </>
                  )}

                  {listingSheets && (
                    <Center py="xl">
                      <Loader size="lg" />
                    </Center>
                  )}

                  {!listingSheets && sheets.length === 0 && (
                    <Text c="dimmed" ta="center" py="md">
                      Click "Load Spreadsheets" to see your Google Sheets
                    </Text>
                  )}

                  {fetchingSheet && (
                    <Card withBorder>
                      <Center py="xl">
                        <Stack align="center" gap="sm">
                          <Loader size="md" />
                          <Text size="sm" c="dimmed">
                            Loading spreadsheet data...
                          </Text>
                        </Stack>
                      </Center>
                    </Card>
                  )}

                  {sheetData.length > 0 && !fetchingSheet && (
                    <Card withBorder p={0}>
                      <ScrollArea>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              {sheetHeaders.map((header, idx) => (
                                <Table.Th key={idx}>{header}</Table.Th>
                              ))}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {sheetData.slice(0, 50).map((row, rowIdx) => (
                              <Table.Tr key={rowIdx}>
                                {sheetHeaders.map((header, colIdx) => (
                                  <Table.Td key={colIdx}>
                                    {row[header] || "-"}
                                  </Table.Td>
                                ))}
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                      {sheetData.length > 50 && (
                        <Text size="sm" c="dimmed" ta="center" py="sm">
                          Showing 50 of {sheetData.length} rows
                        </Text>
                      )}
                    </Card>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        );

      case "airtable":
        return (
          <Stack gap="lg">
            <Paper shadow="sm" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconDatabase size={40} color="#18BFFF" />
                  <div>
                    <Text fw={500} size="lg">
                      Airtable Connection
                    </Text>
                    <Text size="sm" c="dimmed">
                      Connect to read data from your Airtable bases
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  {airtableConnected && (
                    <Badge
                      color="green"
                      size="lg"
                      leftSection={<IconCheck size={14} />}
                    >
                      Connected
                    </Badge>
                  )}
                  <Button
                    onClick={
                      airtableConnected
                        ? handleDisconnectAirtable
                        : handleConnectAirtable
                    }
                    loading={airtableOauthLoading}
                    color={airtableConnected ? "gray" : "cyan"}
                    variant={airtableConnected ? "light" : "filled"}
                  >
                    {airtableConnected ? "Disconnect" : "Connect Airtable"}
                  </Button>
                </Group>
              </Group>

              {airtableOauthError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  mt="md"
                >
                  {airtableOauthError.message}
                </Alert>
              )}
            </Paper>

            {airtableConnected && (
              <Paper shadow="sm" p="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>Airtable Browser</Title>
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleListBases}
                      loading={listingBases}
                      variant="light"
                    >
                      {bases.length > 0 ? "Refresh" : "Load Bases"}
                    </Button>
                  </Group>

                  {airtableError && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red">
                      {airtableError}
                    </Alert>
                  )}

                  {bases.length > 0 && (
                    <>
                      <Select
                        label="Select a base"
                        placeholder="Choose a base..."
                        data={bases.map((base) => ({
                          value: base.id,
                          label: base.name,
                        }))}
                        value={selectedBase}
                        onChange={handleSelectBase}
                        searchable
                        leftSection={<IconDatabase size={16} />}
                      />

                      {listingTables && (
                        <Center py="md">
                          <Loader size="sm" />
                        </Center>
                      )}

                      {tables.length > 0 && (
                        <>
                          <Select
                            label="Select a table"
                            placeholder="Choose a table..."
                            data={tables.map((table) => ({
                              value: table.id,
                              label: table.name,
                            }))}
                            value={selectedTable}
                            onChange={setSelectedTable}
                            searchable
                            leftSection={<IconTable size={16} />}
                          />

                          <Button
                            onClick={handleFetchRecords}
                            loading={fetchingRecords}
                            disabled={!selectedTable}
                            leftSection={<IconTable size={16} />}
                            color="cyan"
                          >
                            Load Records
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {listingBases && (
                    <Center py="xl">
                      <Loader size="lg" />
                    </Center>
                  )}

                  {!listingBases && bases.length === 0 && (
                    <Text c="dimmed" ta="center" py="md">
                      Click "Load Bases" to see your Airtable bases
                    </Text>
                  )}

                  {fetchingRecords && (
                    <Card withBorder>
                      <Center py="xl">
                        <Stack align="center" gap="sm">
                          <Loader size="md" />
                          <Text size="sm" c="dimmed">
                            Loading records...
                          </Text>
                        </Stack>
                      </Center>
                    </Card>
                  )}

                  {airtableRecords.length > 0 && !fetchingRecords && (
                    <Card withBorder p={0}>
                      <ScrollArea>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              {airtableFields.map((field, idx) => (
                                <Table.Th key={idx}>{field}</Table.Th>
                              ))}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {airtableRecords.slice(0, 50).map((record, rowIdx) => (
                              <Table.Tr key={record.id || rowIdx}>
                                {airtableFields.map((field, colIdx) => (
                                  <Table.Td key={colIdx}>
                                    {String(record[field] ?? "-")}
                                  </Table.Td>
                                ))}
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                      {airtableRecords.length > 50 && (
                        <Text size="sm" c="dimmed" ta="center" py="sm">
                          Showing 50 of {airtableRecords.length} records
                        </Text>
                      )}
                    </Card>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        );

      case "supabase":
        return (
          <Stack gap="lg">
            <Paper shadow="sm" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconBrandSupabase size={40} color="#3ECF8E" />
                  <div>
                    <Text fw={500} size="lg">
                      Supabase Connection
                    </Text>
                    <Text size="sm" c="dimmed">
                      Connect to your Supabase PostgreSQL database
                    </Text>
                  </div>
                </Group>

                {supabaseConnected && (
                  <Group gap="sm">
                    <Badge
                      color="green"
                      size="lg"
                      leftSection={<IconCheck size={14} />}
                    >
                      Connected
                    </Badge>
                    <Button
                      onClick={handleDisconnectSupabase}
                      loading={deletingSupabaseCreds}
                      color="gray"
                      variant="light"
                    >
                      Disconnect
                    </Button>
                  </Group>
                )}
              </Group>

              {!supabaseConnected && (
                <Stack gap="md" mt="lg">
                  <TextInput
                    label="Project URL"
                    placeholder="https://your-project.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    leftSection={<IconLink size={16} />}
                  />
                  <PasswordInput
                    label="API Key"
                    placeholder="Your Supabase anon or service role key"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    leftSection={<IconKey size={16} />}
                  />
                  <Button
                    onClick={handleConnectSupabase}
                    loading={savingSupabaseCreds}
                    color="green"
                    leftSection={<IconBrandSupabase size={16} />}
                  >
                    Connect Supabase
                  </Button>
                </Stack>
              )}

              {supabaseError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  mt="md"
                >
                  {supabaseError}
                </Alert>
              )}
            </Paper>

            {supabaseConnected && (
              <Paper shadow="sm" p="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>Database Browser</Title>
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleListSupabaseTables}
                      loading={listingSupabaseTables}
                      variant="light"
                    >
                      {supabaseTables.length > 0 ? "Refresh" : "Load Tables"}
                    </Button>
                  </Group>

                  {supabaseTables.length > 0 && (
                    <>
                      <Select
                        label="Select a table"
                        placeholder="Choose a table..."
                        data={supabaseTables.map((table) => ({
                          value: table.name,
                          label: table.name,
                        }))}
                        value={selectedSupabaseTable}
                        onChange={setSelectedSupabaseTable}
                        searchable
                        leftSection={<IconTable size={16} />}
                      />

                      <Button
                        onClick={handleFetchSupabaseData}
                        loading={fetchingSupabaseData}
                        disabled={!selectedSupabaseTable}
                        leftSection={<IconTable size={16} />}
                        color="green"
                      >
                        Load Data
                      </Button>
                    </>
                  )}

                  {listingSupabaseTables && (
                    <Center py="xl">
                      <Loader size="lg" />
                    </Center>
                  )}

                  {!listingSupabaseTables && supabaseTables.length === 0 && (
                    <Text c="dimmed" ta="center" py="md">
                      Click "Load Tables" to see your Supabase tables
                    </Text>
                  )}

                  {fetchingSupabaseData && (
                    <Card withBorder>
                      <Center py="xl">
                        <Stack align="center" gap="sm">
                          <Loader size="md" />
                          <Text size="sm" c="dimmed">
                            Loading data...
                          </Text>
                        </Stack>
                      </Center>
                    </Card>
                  )}

                  {supabaseData.length > 0 && !fetchingSupabaseData && (
                    <Card withBorder p={0}>
                      <ScrollArea>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              {supabaseColumns.map((col, idx) => (
                                <Table.Th key={idx}>{col}</Table.Th>
                              ))}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {supabaseData.slice(0, 50).map((row, rowIdx) => (
                              <Table.Tr key={rowIdx}>
                                {supabaseColumns.map((col, colIdx) => (
                                  <Table.Td key={colIdx}>
                                    {String(row[col] ?? "-")}
                                  </Table.Td>
                                ))}
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                      {supabaseData.length > 50 && (
                        <Text size="sm" c="dimmed" ta="center" py="sm">
                          Showing 50 of {supabaseData.length} records
                        </Text>
                      )}
                    </Card>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <IconPlugConnected size={28} color="#228be6" />
            <Title order={3}>OAuth Test</Title>
          </Group>
          {user && (
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Text size="sm" c="dimmed">
                {profile?.displayName || user.email}
              </Text>
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email || "User"}
                size="sm"
                radius="xl"
              >
                {(profile?.displayName || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <AppShell.Section grow component={ScrollArea}>
          <Text size="xs" fw={500} c="dimmed" mb="xs" px="sm">
            INTEGRATIONS
          </Text>
          {integrations.map((item) => (
            <NavLink
              key={item.id}
              active={activeTab === item.id}
              label={item.label}
              leftSection={<item.icon size={20} color={item.color} />}
              rightSection={
                item.connected ? (
                  <Badge size="xs" color="green" variant="filled">
                    ✓
                  </Badge>
                ) : null
              }
              onClick={() => setActiveTab(item.id)}
              style={{ borderRadius: 8 }}
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={900}>{renderContent()}</Box>
      </AppShell.Main>

      {user && (
        <ProfileModal
          opened={profileModalOpened}
          onClose={() => setProfileModalOpened(false)}
        />
      )}
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider appId={APP_ID}>
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app
const container = document.getElementById("app");
/** @type {import('react-dom/client').Root | null} */
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
