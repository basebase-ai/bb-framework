/**
 * Production Entry Point
 * Dynamically loads app code from Firestore based on URL
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "../config/firebase.config.js";
import { getAppIdFromURL } from "./loader/url-parser.js";
import { AppLoader } from "./loader/app-loader.js";

// Import all framework hooks and utilities that apps might need
import { useAuth } from "./hooks/useAuth.js";
import { useCollection } from "./hooks/useCollection.js";
import { useDocument } from "./hooks/useDocument.js";
import { useAppMembership } from "./hooks/useAppMembership.js";
import { useUserProfile } from "./hooks/useUserProfile.js";
import { useUserProfiles } from "./hooks/useUserProfiles.js";
import { useRouter } from "./hooks/useRouter.js";
import { useFunction } from "./hooks/useFunction.js";
import { useNangoOAuth, NangoIntegrations } from "./hooks/useNangoOAuth.js";
import { useStorage } from "./hooks/useStorage.js";
import { AuthProvider, SignOutButton } from "./components/AuthProvider.jsx";
import { FileUploader } from "./components/FileUploader.jsx";
import { EditImage } from "./components/EditImage.jsx";
import {
  app as firebaseAppInstance,
  auth as firebaseAuthInstance,
  db as firestoreInstance,
  authState,
} from "./core/firebase-init.js";

/**
 * Import all external libraries that apps can use
 *
 * IMPORTANT: When adding a new dependency to package.json that apps will use,
 * you MUST import it here and register it in frameworkExports below.
 *
 * Already registered (from package.json dependencies):
 * - react, react-dom ✅
 * - firebase (submodules: app, auth, firestore) ✅
 * - @mantine/core, @mantine/hooks, @mantine/notifications, @mantine/dates, @mantine/carousel ✅
 * - @tabler/icons-react ✅
 * - react-icons/si ✅ (Simple Icons for brand logos)
 * - zustand ✅
 *
 * Server-side only (don't register):
 * - express, compression, esbuild
 */
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import * as ReactJSXRuntime from "react/jsx-runtime";
import * as Mantine from "@mantine/core";
import * as MantineNotifications from "@mantine/notifications";
import * as MantineHooks from "@mantine/hooks";
import * as MantineDates from "@mantine/dates";
import * as MantineCarousel from "@mantine/carousel";
import * as TablerIcons from "@tabler/icons-react";
import * as Zustand from "zustand";
import { marked } from "marked";
import dayjs from "dayjs";

// TipTap (rich text editor)
import * as TiptapReact from "@tiptap/react";
import { default as TiptapStarterKitDefault } from "@tiptap/starter-kit";
import { default as TiptapPlaceholderDefault } from "@tiptap/extension-placeholder";

// Firebase
import * as FirebaseApp from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import * as FirebaseFirestore from "firebase/firestore";

// PDF viewer
import * as ReactPdf from "react-pdf";

// React Icons (Simple Icons for brand logos)
import * as ReactIconsSi from "react-icons/si";

// Show loading screen (renders into #app, keeps #static-fallback visible for SEO bots)
function showLoading(message = "Loading...") {
  const app = document.getElementById("app");
  if (app) {
    // Don't hide static-fallback during loading - bots need to see it
    // The loading spinner will appear below/after the static content
    app.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8f9fa;
        color: #495057;
      ">
        <div style="
          text-align: center;
          padding: 2rem;
        ">
          <div style="
            width: 48px;
            height: 48px;
            border: 4px solid #e9ecef;
            border-top-color: #228be6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          "></div>
          <div style="font-size: 1.125rem; font-weight: 500;">${message}</div>
        </div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
}

// Show error as a small ribbon at top of page (keeps static-fallback visible for SEO bots)
function showError(title, message, details) {
  // Create error ribbon element
  const ribbon = document.createElement("div");
  ribbon.id = "error-ribbon";
  ribbon.innerHTML = `
    <details style="margin: 0;">
      <summary style="
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
      ">
        <span style="color: #fa5252;">⚠</span>
        <span>${title}</span>
        <span style="
          font-weight: 400;
          color: #868e96;
          margin-left: 0.5rem;
        ">(click to expand)</span>
      </summary>
      <div style="
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #e9ecef;
      ">
        <p style="margin: 0 0 0.5rem; color: #495057; font-size: 0.875rem;">${message}</p>
        ${
          details
            ? `
          <pre style="
            margin: 0.5rem 0 0;
            padding: 0.75rem;
            background: #f1f3f5;
            border-radius: 4px;
            font-size: 0.75rem;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #495057;
            font-family: 'SF Mono', 'Consolas', monospace;
            max-height: 150px;
            overflow-y: auto;
          ">${details}</pre>
        `
            : ""
        }
      </div>
    </details>
  `;
  ribbon.style.cssText = `
    background: #fff5f5;
    border-bottom: 1px solid #ffc9c9;
    padding: 0.75rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  // Insert at very top of body
  document.body.insertBefore(ribbon, document.body.firstChild);
}

// Main initialization
async function init() {
  try {
    console.log("🚀 Production loader starting...");

    // Clear cache on development for testing
    if (window.location.hostname === "localhost") {
      console.log("🧹 Clearing cache for development...");
      localStorage.removeItem("__app_cache");
    }

    // Get app ID from URL
    const appId = getAppIdFromURL();
    console.log("📱 App ID from URL:", appId);

    if (!appId) {
      showError(
        "App Not Found",
        "No app ID specified in the URL.",
        "Please access this site using a valid app URL (e.g., your-app.basebase.io or basebase.io/your-app)"
      );
      return;
    }

    showLoading(`Loading ${appId}...`);

    // Initialize Firebase
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);

    // Create app loader
    const loader = new AppLoader(firebaseApp);

    // Create framework exports that will be available to app code
    const frameworkExports = {
      // React and ecosystem
      react: React,
      "react-dom/client": ReactDOM,
      "react/jsx-runtime": ReactJSXRuntime,

      // State management
      zustand: Zustand,

      // Mantine
      "@mantine/core": Mantine,
      "@mantine/notifications": MantineNotifications,
      "@mantine/hooks": MantineHooks,
      "@mantine/dates": MantineDates,
      "@mantine/carousel": MantineCarousel,

      // Icons
      "@tabler/icons-react": TablerIcons,

      // Markdown
      marked: { marked },

      // Date library
      dayjs: { default: dayjs },

      // TipTap (rich text editor)
      "@tiptap/react": TiptapReact,
      "@tiptap/starter-kit": {
        __esModule: true,
        default: TiptapStarterKitDefault,
        StarterKit: TiptapStarterKitDefault,
      },
      "@tiptap/extension-placeholder": {
        __esModule: true,
        default: TiptapPlaceholderDefault,
        Placeholder: TiptapPlaceholderDefault,
      },

      // Firebase
      "firebase/app": FirebaseApp,
      "firebase/auth": FirebaseAuth,
      "firebase/firestore": FirebaseFirestore,

      // PDF viewer
      "react-pdf": ReactPdf,

      // React Icons (Simple Icons for brand logos)
      "react-icons/si": ReactIconsSi,

      // Framework hooks (with path variants - normalized, relative old styles)
      "framework/hooks/useAuth.js": { useAuth },
      "../framework/hooks/useAuth.js": { useAuth },
      "../../framework/hooks/useAuth.js": { useAuth },
      "framework/hooks/useCollection.js": { useCollection },
      "../framework/hooks/useCollection.js": { useCollection },
      "../../framework/hooks/useCollection.js": { useCollection },
      "framework/hooks/useDocument.js": { useDocument },
      "../framework/hooks/useDocument.js": { useDocument },
      "../../framework/hooks/useDocument.js": { useDocument },
      "framework/hooks/useAppMembership.js": { useAppMembership },
      "../framework/hooks/useAppMembership.js": { useAppMembership },
      "../../framework/hooks/useAppMembership.js": { useAppMembership },
      "framework/hooks/useUserProfile.js": { useUserProfile },
      "../framework/hooks/useUserProfile.js": { useUserProfile },
      "../../framework/hooks/useUserProfile.js": { useUserProfile },
      "framework/hooks/useUserProfiles.js": { useUserProfiles },
      "../framework/hooks/useUserProfiles.js": { useUserProfiles },
      "../../framework/hooks/useUserProfiles.js": { useUserProfiles },
      "framework/hooks/useRouter.js": { useRouter },
      "../framework/hooks/useRouter.js": { useRouter },
      "../../framework/hooks/useRouter.js": { useRouter },
      "framework/hooks/useFunction.js": { useFunction },
      "../framework/hooks/useFunction.js": { useFunction },
      "../../framework/hooks/useFunction.js": { useFunction },
      "framework/hooks/useNangoOAuth.js": { useNangoOAuth, NangoIntegrations },
      "../framework/hooks/useNangoOAuth.js": {
        useNangoOAuth,
        NangoIntegrations,
      },
      "../../framework/hooks/useNangoOAuth.js": {
        useNangoOAuth,
        NangoIntegrations,
      },
      "framework/hooks/useStorage.js": { useStorage },
      "../framework/hooks/useStorage.js": { useStorage },
      "../../framework/hooks/useStorage.js": { useStorage },

      // Framework components (with path variants)
      "framework/components/AuthProvider.js": {
        AuthProvider,
        SignOutButton,
      },
      "../framework/components/AuthProvider.js": {
        AuthProvider,
        SignOutButton,
      },
      "../../framework/components/AuthProvider.js": {
        AuthProvider,
        SignOutButton,
      },
      "framework/components/AuthProvider.jsx": {
        AuthProvider,
        SignOutButton,
      },
      "../framework/components/AuthProvider.jsx": {
        AuthProvider,
        SignOutButton,
      },
      "../../framework/components/AuthProvider.jsx": {
        AuthProvider,
        SignOutButton,
      },
      "framework/components/FileUploader.js": { FileUploader },
      "../framework/components/FileUploader.js": { FileUploader },
      "../../framework/components/FileUploader.js": { FileUploader },
      "framework/components/FileUploader.jsx": { FileUploader },
      "../framework/components/FileUploader.jsx": { FileUploader },
      "../../framework/components/FileUploader.jsx": { FileUploader },
      "framework/components/EditImage.js": { EditImage },
      "../framework/components/EditImage.js": { EditImage },
      "../../framework/components/EditImage.js": { EditImage },
      "framework/components/EditImage.jsx": { EditImage },
      "../framework/components/EditImage.jsx": { EditImage },
      "../../framework/components/EditImage.jsx": { EditImage },

      // Framework core
      "framework/core/firebase-init.js": {
        app: firebaseAppInstance,
        auth: firebaseAuthInstance,
        db: firestoreInstance,
        authState,
      },
      "../framework/core/firebase-init.js": {
        app: firebaseAppInstance,
        auth: firebaseAuthInstance,
        db: firestoreInstance,
        authState,
      },
      "../../framework/core/firebase-init.js": {
        app: firebaseAppInstance,
        auth: firebaseAuthInstance,
        db: firestoreInstance,
        authState,
      },

      // Framework loader utilities
      "framework/loader/url-parser.js": { getAppIdFromURL },
      "../framework/loader/url-parser.js": { getAppIdFromURL },
      "../../framework/loader/url-parser.js": { getAppIdFromURL },
    };

    // Clear the app container before loading the app (preserves #static-fallback for SEO)
    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.innerHTML = "";
    }
    // Note: Don't hide static-fallback here - let the React app hide it after mounting
    // This ensures bots can always see the static content

    // Prepare import.meta for environment variables
    const importMeta = {
      env: {
        // Pass through all VITE_ prefixed env vars from build time
        VITE_GMAIL_CLIENT_ID: import.meta.env.VITE_GMAIL_CLIENT_ID,
        VITE_GMAIL_CLIENT_SECRET: import.meta.env.VITE_GMAIL_CLIENT_SECRET,
        VITE_OAUTH_MANAGER_URL: import.meta.env.VITE_OAUTH_MANAGER_URL,
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD,
      },
    };

    // Load and execute app
    const { appModule, appData, versionHash } = await loader.loadAndExecute(
      appId,
      frameworkExports,
      importMeta
    );

    console.log(`✅ App loaded successfully`);
    console.log(`   Name: ${appData.name || appId}`);
    console.log(`   Version: ${versionHash}`);

    // The app module should have already mounted itself to the DOM
    // (via ReactDOM.render in its entry point)

    // Mark app as loaded - this triggers CSS to hide static fallback
    document.body.classList.add("app-loaded");
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showError(
      "Failed to Load App",
      "An error occurred while loading the application.",
      error.stack || error.message
    );
  }
}

// Start the app
init();
