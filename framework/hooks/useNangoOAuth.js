/**
 * Framework Hook: Nango OAuth Management
 *
 * Provides OAuth integration via Nango, enabling access to 500+ APIs
 * including Google, Salesforce, HubSpot, Notion, Slack, Figma, and more.
 *
 * Uses the Connect Session Token approach (not the deprecated public key).
 * @see https://docs.nango.dev/guides/authorize/overview
 *
 * @example
 * import { useNangoOAuth, NangoIntegrations } from "../../../framework/hooks/useNangoOAuth.js";
 *
 * function MyComponent() {
 *   const { isConnected, connect, disconnect, loading } = useNangoOAuth(NangoIntegrations.hubspot);
 *
 *   return (
 *     <Button onClick={connect} loading={loading}>
 *       {isConnected ? "Reconnect HubSpot" : "Connect HubSpot"}
 *     </Button>
 *   );
 * }
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth.js";
import { useFunction } from "./useFunction.js";

/**
 * Create a Nango client with a session token
 * Note: We create a new instance each time because session tokens are short-lived
 * @param {string} sessionToken - Connect session token from backend
 * @returns {Promise<import('@nangohq/frontend').default>}
 */
async function createNangoClient(sessionToken) {
  // Dynamic import to avoid bundling if not used
  const { default: Nango } = await import("@nangohq/frontend");
  // Initialize with the connect session token
  return new Nango({ connectSessionToken: sessionToken });
}

/**
 * @typedef {Object} NangoConnection
 * @property {string} integrationId - Nango integration ID
 * @property {string} connectionId - Nango's generated connection ID
 * @property {string} endUserId - Our user ID (Firebase UID)
 * @property {string} [createdAt] - When the connection was created
 */

/**
 * @typedef {Object} UseNangoOAuthReturn
 * @property {NangoConnection | null} connection - Current connection info
 * @property {boolean} loading - Whether connection status is loading
 * @property {Error | null} error - Any error that occurred
 * @property {boolean} isConnected - Whether user has connected this integration
 * @property {() => Promise<void>} connect - Initiate OAuth flow
 * @property {() => Promise<void>} disconnect - Revoke OAuth access
 * @property {() => Promise<void>} refresh - Refresh connection status
 */

/**
 * Hook for managing OAuth via Nango
 * @param {string} integrationId - Nango integration ID (e.g., "google-mail", "hubspot", "salesforce")
 * @returns {UseNangoOAuthReturn} OAuth utilities
 */
export function useNangoOAuth(integrationId) {
  const { user } = useAuth();
  /** @type {[NangoConnection | null, React.Dispatch<React.SetStateAction<NangoConnection | null>>]} */
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  /** @type {[Error | null, React.Dispatch<React.SetStateAction<Error | null>>]} */
  const [error, setError] = useState(null);

  const { call: createSessionFn } = useFunction("nangoCreateSession");
  const { call: checkConnectionFn } = useFunction("nangoCheckConnection");
  const { call: deleteConnectionFn } = useFunction("nangoDeleteConnection");

  /**
   * Check connection status
   */
  const checkConnectionStatus = useCallback(async () => {
    if (!user?.uid) {
      setConnection(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await checkConnectionFn({
        integrationId,
        endUserId: user.uid,
      });

      if (result.success && result.connection) {
        setConnection(result.connection);
      } else {
        setConnection(null);
      }
    } catch (err) {
      // No connection exists - that's OK, not an error
      console.log(`No ${integrationId} connection found for user`);
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, integrationId, checkConnectionFn]);

  // Check connection status on mount and when user/integration changes
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  /**
   * Initiate OAuth flow via Nango popup using Connect Session Token
   */
  const connect = useCallback(async () => {
    if (!user) {
      throw new Error("User must be authenticated to connect OAuth");
    }

    try {
      setError(null);
      setLoading(true);

      // Step 1: Get a Connect session token from our backend
      console.log(`🔐 Creating Nango session for ${integrationId}...`);
      const sessionResult = await createSessionFn({ integrationId });

      if (!sessionResult.success || !sessionResult.sessionToken) {
        throw new Error("Failed to create Connect session");
      }

      // Step 2: Create Nango client with the session token
      const nango = await createNangoClient(sessionResult.sessionToken);

      console.log(`🚀 Opening Nango OAuth popup for ${integrationId}...`);

      // Step 3: Initiate OAuth - just pass the integration ID
      const result = await nango.auth(integrationId);

      console.log(`✅ Nango OAuth success for ${integrationId}`, result);

      // Step 4: Refresh connection status to get the new connection details
      await checkConnectionStatus();

      setLoading(false);
      return result;
    } catch (err) {
      console.error(`❌ Nango OAuth failed for ${integrationId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
      throw err;
    }
  }, [user, integrationId, createSessionFn, checkConnectionStatus]);

  /**
   * Disconnect/revoke OAuth access
   */
  const disconnect = useCallback(async () => {
    if (!user) {
      throw new Error("User must be authenticated to disconnect OAuth");
    }

    if (!connection?.connectionId) {
      // No connection to disconnect
      setConnection(null);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      await deleteConnectionFn({
        integrationId,
        connectionId: connection.connectionId,
      });

      console.log(`✅ Disconnected ${integrationId}`);
      setConnection(null);
    } catch (err) {
      console.error(`❌ Failed to disconnect ${integrationId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, integrationId, connection, deleteConnectionFn]);

  return {
    connection,
    loading,
    error,
    isConnected: connection !== null,
    connect,
    disconnect,
    refresh: checkConnectionStatus,
  };
}

/**
 * Available Nango integrations
 * See full list at: https://docs.nango.dev/integrations/overview
 */
export const NangoIntegrations = {
  // ===== Google =====
  googleMail: "google-mail",
  googleCalendar: "google-calendar",
  googleDrive: "google-drive",
  googleSheets: "google-sheet",
  googleContacts: "google-contacts",
  googleAnalytics: "google-analytics",
  googleAds: "google-ads",

  // ===== Microsoft =====
  outlook: "outlook",
  outlookCalendar: "outlook-calendar",
  microsoftTeams: "microsoft-teams",
  oneDrive: "onedrive",
  sharepoint: "sharepoint",
  dynamics365: "dynamics-365",

  // ===== CRM =====
  salesforce: "salesforce",
  hubspot: "hubspot",
  pipedrive: "pipedrive",
  zoho: "zoho-crm",
  copper: "copper",
  freshsales: "freshsales",
  closeio: "close",

  // ===== Project Management =====
  asana: "asana",
  monday: "monday",
  clickup: "clickup",
  trello: "trello",
  notion: "notion",
  jira: "jira",
  linear: "linear",
  basecamp: "basecamp",
  wrike: "wrike",
  smartsheet: "smartsheet",

  // ===== Communication =====
  slack: "slack",
  discord: "discord",
  zoom: "zoom",
  intercom: "intercom",
  zendesk: "zendesk",
  freshdesk: "freshdesk",
  front: "front",

  // ===== Marketing =====
  mailchimp: "mailchimp",
  sendgrid: "sendgrid",
  activeCampaign: "activecampaign",
  klaviyo: "klaviyo",
  constantContact: "constant-contact",
  hootsuite: "hootsuite",
  buffer: "buffer",

  // ===== Social =====
  linkedin: "linkedin",
  twitter: "twitter",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",

  // ===== Design =====
  figma: "figma",
  canva: "canva",
  miro: "miro",
  invision: "invision",

  // ===== Developer =====
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  atlassian: "atlassian",

  // ===== Finance =====
  stripe: "stripe",
  quickbooks: "quickbooks",
  xero: "xero",
  freshbooks: "freshbooks",
  wave: "wave",
  plaid: "plaid",

  // ===== Storage =====
  dropbox: "dropbox",
  box: "box",

  // ===== E-commerce =====
  shopify: "shopify",
  woocommerce: "woocommerce",
  bigcommerce: "bigcommerce",
  magento: "magento",

  // ===== HR =====
  bamboohr: "bamboohr",
  workday: "workday",
  gusto: "gusto",
  rippling: "rippling",

  // ===== Support =====
  serviceNow: "servicenow",
  pagerduty: "pagerduty",

  // ===== Analytics =====
  mixpanel: "mixpanel",
  amplitude: "amplitude",
  segment: "segment",

  // ===== Database/No-Code =====
  airtable: "airtable",
};

export default useNangoOAuth;
