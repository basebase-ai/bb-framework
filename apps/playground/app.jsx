/**
 * Main app entry point
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import AppPlayground from "./components/AppPlayground.jsx";
import PublicHomepage from "./components/PublicHomepage.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function App() {
  console.log("🎨 App component rendering...");
  
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "coral",
        scale: 0.92,
        colors: {
          // Custom vibrant palette
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
      }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Notifications position="top-right" />
      <AuthProvider 
        appId={APP_ID}
        landingPage={(props) => <PublicHomepage {...props} />}
      >
        <AppPlayground />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
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
