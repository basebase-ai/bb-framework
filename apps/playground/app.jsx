/**
 * Main app entry point
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import AppPlayground from "./components/AppPlayground.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function App() {
  console.log("🎨 App component rendering...");
  
  return (
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        primaryColor: "violet",
        scale: 0.92,
        colors: {
          dark: [
            "#C1C2C5",
            "#A6A7AB",
            "#909296",
            "#5C5F66",
            "#373A40",
            "#2C2E33",
            "#25262B",
            "#1A1B1E",
            "#141517",
            "#101113",
          ],
        },
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
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
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          fontWeight: 700,
          sizes: {
            h1: { fontSize: "1.85rem" },
            h2: { fontSize: "1.6rem" },
            h3: { fontSize: "1.35rem" },
          },
        },
        defaultRadius: "sm",
        components: {
          Button: { defaultProps: { size: "xs" } },
          TextInput: { defaultProps: { size: "sm" } },
          Textarea: { defaultProps: { size: "sm" } },
          Select: { defaultProps: { size: "sm" } },
          Autocomplete: { defaultProps: { size: "sm" } },
          Card: { defaultProps: { padding: "sm", radius: "sm" } },
          Badge: { defaultProps: { size: "xs" } },
          Avatar: { defaultProps: { size: "md" } },
          ActionIcon: { defaultProps: { size: "sm" } },
        },
      }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Notifications position="top-right" />
      <AuthProvider appId={APP_ID}>
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
