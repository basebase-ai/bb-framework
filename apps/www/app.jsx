/**
 * Basebase WWW - Main marketing site and app gallery
 * 
 * Routes:
 *   /                     - Public homepage (marketing)
 *   /gallery              - App gallery (public, auth-aware)
 *   /gallery/app/:appId   - App details (public, auth-aware)
 *   /terms                - Terms of service (public)
 *   /privacy              - Privacy policy (public)
 *   /about                - About us (public)
 *   /pricing              - Pricing page (public)
 *   /integrations         - Integrations page (public, auth-aware)
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AppRouter, RouteContent } from "../../framework/components/AppRouter.jsx";
import { useRoute } from "../../framework/hooks/useRoute.js";

// Page components
import PublicHomepage from "./components/PublicHomepage.jsx";
import TermsOfService from "./components/TermsOfService.jsx";
import PrivacyPolicy from "./components/PrivacyPolicy.jsx";
import AboutUs from "./components/AboutUs.jsx";
import Pricing from "./components/Pricing.jsx";
import IntegrationsPage from "./components/IntegrationsPage.jsx";
import GalleryPage from "./components/GalleryPage.jsx";
import AppDetailsPageWrapper from "./components/AppDetailsPageWrapper.jsx";

import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// ============================================================================
// Route Components (wrap existing pages with routing)
// ============================================================================

/**
 * Homepage - marketing landing page
 */
function HomePage() {
  const { navigate } = useRoute();
  
  return (
    <PublicHomepage 
      onSignIn={() => navigate("/gallery")}
      onNavigateToTerms={() => navigate("/terms")}
      onNavigateToPrivacy={() => navigate("/privacy")}
      onNavigateToAbout={() => navigate("/about")}
      onNavigateToPricing={() => navigate("/pricing")}
      onNavigateToIntegrations={() => navigate("/integrations")}
    />
  );
}

/**
 * Terms page
 */
function TermsPage() {
  const { navigate } = useRoute();
  return <TermsOfService onBack={() => navigate("/")} />;
}

/**
 * Privacy page
 */
function PrivacyPage() {
  const { navigate } = useRoute();
  return <PrivacyPolicy onBack={() => navigate("/")} />;
}

/**
 * About page
 */
function AboutPage() {
  const { navigate } = useRoute();
  return <AboutUs onBack={() => navigate("/")} />;
}

/**
 * Pricing page
 */
function PricingPage() {
  const { navigate } = useRoute();
  return <Pricing onBack={() => navigate("/")} onSignIn={() => navigate("/gallery")} />;
}

/**
 * Integrations page
 */
function IntegrationsPageWrapper() {
  const { navigate } = useRoute();
  return <IntegrationsPage onBack={() => navigate("/")} />;
}

// ============================================================================
// Route Definitions
// ============================================================================

/** @type {import('../../framework/components/AppRouter.jsx').RouteDefinition[]} */
const routes = [
  // Public pages
  { path: "/", component: HomePage },
  { path: "/terms", component: TermsPage },
  { path: "/privacy", component: PrivacyPage },
  { path: "/about", component: AboutPage },
  { path: "/pricing", component: PricingPage },
  { path: "/integrations", component: IntegrationsPageWrapper },
  
  // Gallery (public but auth-aware)
  { path: "/gallery", component: GalleryPage },
  { path: "/gallery/app/:appId", component: AppDetailsPageWrapper },
];

// ============================================================================
// Mantine Theme
// ============================================================================

const mantineTheme = {
  primaryColor: "coral",
  scale: 0.92,
  colors: {
    coral: [
      "#fff0ed",
      "#ffe0db",
      "#ffc1b5",
      "#ffa08f",
      "#ff8872",
      "#ff715b",  // Primary - Vibrant Coral
      "#e5654f",
      "#cc5a47",
      "#b24f3e",
      "#994435",
    ],
    slate: [
      "#e8eced",
      "#d1d9da",
      "#a3b3b5",
      "#758d90",
      "#57757a",
      "#416165",  // Dark Slate Grey
      "#3a5759",
      "#334d4e",
      "#2c4344",
      "#25393a",
    ],
    teal: [
      "#e0f7f7",
      "#c1efee",
      "#83dfdd",
      "#45cfcc",
      "#2bc4c2",
      "#17bebb",  // Tropical Teal
      "#14aaa8",
      "#119795",
      "#0e8382",
      "#0b706f",
    ],
  },
  fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
  fontSizes: {
    xs: "0.75rem",
    sm: "0.85rem",
    md: "0.95rem",
    lg: "1.05rem",
    xl: "1.15rem",
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.7rem",
    md: "0.9rem",
    lg: "1.1rem",
    xl: "1.4rem",
  },
  headings: {
    fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
    fontWeight: 600,
    sizes: {
      h1: { fontSize: "1.85rem" },
      h2: { fontSize: "1.6rem" },
      h3: { fontSize: "1.35rem" },
    },
  },
  defaultRadius: "md",
  components: {
    Button: { defaultProps: { size: "xs" } },
    TextInput: { defaultProps: { size: "sm" } },
    Textarea: { defaultProps: { size: "sm" } },
    Select: { defaultProps: { size: "sm" } },
    Autocomplete: { defaultProps: { size: "sm" } },
    Card: { defaultProps: { padding: "sm", radius: "md" } },
    Badge: { defaultProps: { size: "xs" } },
    Avatar: { defaultProps: { size: "md" } },
    ActionIcon: { defaultProps: { size: "sm" } },
  },
};

// ============================================================================
// Main App
// ============================================================================

function App() {
  console.log("🎨 App component rendering...");
  
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={mantineTheme}
      withGlobalStyles
      withNormalizeCSS
    >
      <Notifications position="top-right" />
      <AppRouter appId={APP_ID} routes={routes} />
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
/** @type {import('react-dom/client').Root | undefined} */
let root;

function render() {
  console.log("🚀 Mounting app to DOM...");
  if (!root) {
    root = createRoot(container);
  }
  root.render(<App />);
}

render();

// Enable hot reload in development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
