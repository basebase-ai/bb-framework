/**
 * Basebase Waitlist Landing Page
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, TextInput, Button, Text, Box, Loader, Stack } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";
import { collections } from "./schema.js";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// Load Google Fonts via @font-face for maximum reliability
const loadGoogleFonts = () => {
  if (typeof document !== "undefined" && !document.getElementById("google-fonts-www")) {
    const style = document.createElement("style");
    style.id = "google-fonts-www";
    style.textContent = `
      @font-face {
        font-family: 'Bruno Ace';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/brunoace/v5/WwkcxPa2E06x4trkOj_kMKoMWNMg.woff2) format('woff2');
      }
      @font-face {
        font-family: 'DM Sans';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHQ.woff2) format('woff2');
      }
      @font-face {
        font-family: 'DM Sans';
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHQ.woff2) format('woff2');
      }
      @font-face {
        font-family: 'DM Sans';
        font-style: normal;
        font-weight: 600;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHQ.woff2) format('woff2');
      }
    `;
    document.head.insertBefore(style, document.head.firstChild);
  }
};
loadGoogleFonts();

/** @type {React.CSSProperties} */
const pageStyles = {
  minHeight: "100vh",
  background: "#08080a",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem",
};

/** @type {React.CSSProperties} */
const purpleGlowStyles = {
  position: "absolute",
  top: "-350px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "1000px",
  height: "700px",
  background: "radial-gradient(ellipse at center, rgba(160, 120, 255, 0.28) 0%, rgba(140, 100, 220, 0.14) 25%, rgba(120, 80, 200, 0.05) 45%, transparent 65%)",
  filter: "blur(90px)",
  pointerEvents: "none",
  zIndex: 0,
};

/** @type {React.CSSProperties} */
const subtleGradient1 = {
  position: "absolute",
  bottom: "-250px",
  right: "-150px",
  width: "700px",
  height: "700px",
  background: "radial-gradient(circle, rgba(90, 50, 160, 0.06) 0%, transparent 55%)",
  filter: "blur(120px)",
  pointerEvents: "none",
  zIndex: 0,
};

/** @type {React.CSSProperties} */
const subtleGradient2 = {
  position: "absolute",
  top: "40%",
  left: "-150px",
  width: "500px",
  height: "500px",
  background: "radial-gradient(circle, rgba(50, 100, 160, 0.05) 0%, transparent 55%)",
  filter: "blur(100px)",
  pointerEvents: "none",
  zIndex: 0,
};

/** @type {React.CSSProperties} */
const contentStyles = {
  position: "relative",
  zIndex: 1,
  maxWidth: "720px",
  textAlign: "center",
};

/** @type {React.CSSProperties} */
const logoStyles = {
  fontFamily: "'Bruno Ace', sans-serif",
  fontSize: "4rem",
  fontWeight: 400,
  color: "#ffffff",
  letterSpacing: "0.02em",
  marginBottom: "1.5rem",
  lineHeight: 1,
};

/** @type {React.CSSProperties} */
const heroTextStyles = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "1.25rem",
  fontWeight: 400,
  color: "rgba(255, 255, 255, 0.6)",
  lineHeight: 1.7,
  marginBottom: "2.5rem",
  letterSpacing: "0.005em",
};

/** @type {React.CSSProperties} */
const highlightStyles = {
  color: "rgba(180, 140, 255, 0.95)",
  fontWeight: 500,
};

/** @type {React.CSSProperties} */
const bulletWrapperStyles = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "3rem",
};

/** @type {React.CSSProperties} */
const bulletContainerStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "0.75rem",
};

/** @type {React.CSSProperties} */
const bulletStyles = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "0.95rem",
  color: "rgba(255, 255, 255, 0.45)",
  letterSpacing: "0.02em",
};

/** @type {React.CSSProperties} */
const bulletIconStyles = {
  color: "rgba(180, 140, 255, 0.7)",
  marginRight: "0.5rem",
};

/** @type {React.CSSProperties} */
const formContainerStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
  width: "100%",
  maxWidth: "420px",
  margin: "0 auto",
};

/** @type {React.CSSProperties} */
const footerStyles = {
  position: "absolute",
  bottom: "2rem",
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "0.7rem",
  color: "rgba(255, 255, 255, 0.2)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

/** @param {{ text: string }} props */
function Bullet({ text }) {
  return (
    <div style={bulletStyles}>
      <span style={bulletIconStyles}>◆</span>
      {text}
    </div>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (/** @type {string} */ emailStr) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSubmit = async (/** @type {React.FormEvent} */ e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      notifications.show({
        title: "Email required",
        message: "Please enter your email address",
        color: "red",
      });
      return;
    }

    if (!validateEmail(email)) {
      notifications.show({
        title: "Invalid email",
        message: "Please enter a valid email address",
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Add directly to Firestore without requiring authentication
      await addDoc(collection(db, collections.waitlist), {
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });
      
      setIsSubmitted(true);
      setEmail("");
      notifications.show({
        title: "You're on the list!",
        message: "We'll be in touch soon.",
        color: "green",
      });
    } catch (error) {
      console.error("Waitlist signup error:", error);
      notifications.show({
        title: "Something went wrong",
        message: "Please try again later",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Box style={formContainerStyles}>
        <Text
          style={{
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "1.15rem",
            color: "rgba(180, 140, 255, 0.95)",
            fontWeight: 500,
          }}
        >
          You're on the waitlist ✓
        </Text>
        <Text
          style={{
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "0.9rem",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          We'll reach out when it's your turn.
        </Text>
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={formContainerStyles}>
      <TextInput
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isSubmitting}
        size="lg"
        radius="md"
        styles={{
          root: { width: "100%" },
          input: {
            backgroundColor: "rgba(255, 255, 255, 0.035)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#ffffff",
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "1rem",
            padding: "1.35rem 1.1rem",
            "&::placeholder": {
              color: "rgba(255, 255, 255, 0.25)",
            },
            "&:focus": {
              borderColor: "rgba(180, 140, 255, 0.4)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          },
        }}
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        size="lg"
        radius="md"
        fullWidth
        styles={{
          root: {
            backgroundColor: "rgba(160, 120, 255, 0.92)",
            color: "#ffffff",
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 600,
            fontSize: "0.95rem",
            height: "auto",
            minHeight: "3.25rem",
            paddingTop: "0.9rem",
            paddingBottom: "0.9rem",
            border: "none",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: "rgba(180, 145, 255, 1)",
            },
            "&:disabled": {
              backgroundColor: "rgba(160, 120, 255, 0.4)",
            },
          },
        }}
      >
        {isSubmitting ? <Loader size="sm" color="white" /> : "Get early access"}
      </Button>
    </form>
  );
}

function LandingPage() {
  return (
    <Box style={pageStyles}>
      {/* Ambient light effects */}
      <Box style={purpleGlowStyles} />
      <Box style={subtleGradient1} />
      <Box style={subtleGradient2} />

      {/* Main content */}
      <Box style={contentStyles}>
        <h1 style={logoStyles}>Basebase</h1>
        
        <p style={heroTextStyles}>
          The app, as we know it, {" "}
          <span style={highlightStyles}>is dead</span>.
          <br />
          AI now arranges our pixels {" "}
          <span style={highlightStyles}>instantly</span> and  <span style={highlightStyles}>at no cost</span>.
          <br />
          Welcome to the new era of {" "} <span style={highlightStyles}>ephemeral apps.</span>
        </p>

        <Box style={bulletWrapperStyles}>
          <Box style={bulletContainerStyles}>
            <Bullet text="Build and share an ephemeral app in 5 minutes" />
            <Bullet text="Customize and contribute to dozens of free apps" />
            <Bullet text="Develop together with your community of users" />
          </Box>
        </Box>

        <WaitlistForm />
      </Box>

      {/* Footer */}
      <Text style={footerStyles}>
        The product of minds from Stanford, MIT, Berkeley & Caltech
      </Text>
    </Box>
  );
}

function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Notifications position="top-center" />
      <LandingPage />
    </MantineProvider>
  );
}

// Mount app
const container = document.getElementById("app");
/** @type {import('react-dom/client').Root | null} */
let root = null;

function render() {
  if (!root && container) {
    root = createRoot(container);
  }
  if (root) {
    root.render(<App />);
  }
}

render();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
