/**
 * Basebase Waitlist Landing Page
 */

import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { 
  MantineProvider, 
  TextInput, 
  Button, 
  Text, 
  Box, 
  Loader, 
  Modal,
  Radio,
  Checkbox,
  Textarea,
  Group,
  Stack
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";
import { collections } from "./schema.js";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// ============================================
// ACCENT COLOR CONFIGURATION
// Tune this to change the overall color scheme
// ============================================
const ACCENT = {
  // Base color: #91159B = RGB(145, 21, 155) - Fuschia/Magenta
  r: 145,
  g: 21,
  b: 155,
  
  // Pre-computed RGBA strings for common use cases
  /** Main highlight color for text */
  get highlight() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.95)`; },
  /** Button background */
  get button() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.92)`; },
  /** Button hover - slightly brighter */
  get buttonHover() { return `rgba(${this.r + 30}, ${this.g + 30}, ${this.b + 30}, 1)`; },
  /** Button disabled */
  get buttonDisabled() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.4)`; },
  /** Subtle accent for icons/bullets */
  get subtle() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.7)`; },
  /** Input focus border */
  get focusBorder() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.4)`; },
  /** Glow - high opacity for center */
  get glowStrong() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.28)`; },
  /** Glow - medium opacity */
  get glowMedium() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.14)`; },
  /** Glow - subtle */
  get glowSubtle() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.05)`; },
  /** Very subtle background accent */
  get bgSubtle() { return `rgba(${this.r}, ${this.g}, ${this.b}, 0.06)`; },
};

// ============================================
// SHARE IMAGE & FAVICON URLs
// Upload images via playground Edit App > Assets
// ============================================
const SHARE_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fplayground%2Fapp-assets%2Fwww%2F1764809987076_basebase_500x500.png?alt=media&token=a887b5a2-98fa-43ae-9c23-ac66de4410e2";
const FAVICON_URL = "https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fplayground%2Fapp-assets%2Fwww%2F1764810123086_favicon.svg?alt=media&token=738c8333-7ad6-4c72-9c07-ab49f5906ee5";

// Set favicon
const setFavicon = () => {
  if (typeof document === "undefined") return;
  
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = FAVICON_URL;
};
setFavicon();

// Add meta tags for social sharing
const addMetaTags = () => {
  if (typeof document === "undefined") return;
  
  const metaTags = [
    // Open Graph
    { property: "og:title", content: "Basebase - The Future of Apps" },
    { property: "og:description", content: "Apps are dead. AI arranges our pixels instantly and at no cost. Welcome to the new era of ephemeral apps." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://www.basebase.ai" },
    { property: "og:image", content: SHARE_IMAGE_URL },
    { property: "og:image:width", content: "500" },
    { property: "og:image:height", content: "500" },
    
    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Basebase - The Future of Apps" },
    { name: "twitter:description", content: "Apps are dead. AI arranges our pixels instantly and at no cost. Welcome to the new era of ephemeral apps." },
    { name: "twitter:image", content: SHARE_IMAGE_URL },
    
    // General
    { name: "description", content: "Apps are dead. AI arranges our pixels instantly and at no cost. Basebase powers the new era of ephemeral, community-sourced apps." },
  ];
  
  metaTags.forEach(({ property, name, content }) => {
    if (!content) return; // Skip empty values
    
    const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
    let meta = document.querySelector(selector);
    
    if (!meta) {
      meta = document.createElement("meta");
      if (property) meta.setAttribute("property", property);
      if (name) meta.setAttribute("name", name);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  });
};
addMetaTags();

// Load Google Fonts
const loadGoogleFonts = () => {
  if (typeof document !== "undefined" && !document.getElementById("google-fonts-www")) {
    // Preconnect for faster loading
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    document.head.insertBefore(preconnect1, document.head.firstChild);
    
    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    document.head.insertBefore(preconnect2, preconnect1.nextSibling);
    
    // Load fonts via Google Fonts API
    const link = document.createElement("link");
    link.id = "google-fonts-www";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bruno+Ace&family=DM+Sans:wght@400;500;600&display=swap";
    document.head.insertBefore(link, preconnect2.nextSibling);
  }
};
loadGoogleFonts();

// Add responsive styles for mobile
const addResponsiveStyles = () => {
  if (typeof document === "undefined" || document.getElementById("www-responsive-styles")) return;
  
  const style = document.createElement("style");
  style.id = "www-responsive-styles";
  style.textContent = `
    @media (max-width: 768px) {
      .www-page {
        padding: 1.5rem !important;
      }
      .www-logo {
        font-size: 3rem !important;
      }
      .www-hero-text {
        font-size: 1.05rem !important;
        margin-bottom: 2rem !important;
      }
      .www-content {
        max-width: 100% !important;
      }
      .www-bullet {
        font-size: 0.9rem !important;
      }
      .www-form {
        max-width: 100% !important;
      }
      .www-footer {
        font-size: 0.6rem !important;
        padding: 0 1rem !important;
      }
    }
    @media (max-width: 480px) {
      .www-page {
        padding: 1.25rem !important;
      }
      .www-logo {
        font-size: 2.5rem !important;
        margin-bottom: 1rem !important;
      }
      .www-hero-text {
        font-size: 1rem !important;
        line-height: 1.6 !important;
      }
      .www-bullet {
        font-size: 0.85rem !important;
      }
    }
  `;
  document.head.appendChild(style);
};
addResponsiveStyles();

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
const accentGlowStyles = {
  position: "absolute",
  top: "-350px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "1000px",
  height: "700px",
  background: `radial-gradient(ellipse at center, ${ACCENT.glowStrong} 0%, ${ACCENT.glowMedium} 25%, ${ACCENT.glowSubtle} 45%, transparent 65%)`,
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
  background: `radial-gradient(circle, ${ACCENT.bgSubtle} 0%, transparent 55%)`,
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
  color: "rgba(255, 255, 255, 0.85)",
  lineHeight: 1.7,
  marginBottom: "2.5rem",
  letterSpacing: "0.005em",
};

/** @type {React.CSSProperties} */
const highlightStyles = {
  color: ACCENT.highlight,
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
  color: ACCENT.subtle,
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
  textAlign: "center",
  width: "100%",
  maxWidth: "90vw",
};

/** @type {React.CSSProperties} */
const modalStyles = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

/** @type {React.CSSProperties} */
const questionLabelStyles = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "1.1rem",
  fontWeight: 500,
  color: "#ffffff",
  marginBottom: "1rem",
};

/** @type {React.CSSProperties} */
const progressStyles = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "0.8rem",
  color: "rgba(255, 255, 255, 0.4)",
  marginBottom: "0.5rem",
};

const TOTAL_QUESTIONS = 4;

const SKILL_LEVELS = [
  { value: "engineer", label: "I'm a trained software engineer" },
  { value: "vibe_success", label: "I'm not formally trained but I've built working app(s) by vibe coding" },
  { value: "vibe_tried", label: "I have tried vibe coding but couldn't build a working app" },
  { value: "never", label: "Never tried to build an app" },
];

const TOOLS = [
  { value: "cursor", label: "Cursor" },
  { value: "claude_code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
  { value: "antigravity", label: "Antigravity" },
  { value: "lovable", label: "Lovable" },
  { value: "other", label: "Other (Base44, v0, etc.)" },
];

/** @param {{ text: string }} props */
function Bullet({ text }) {
  return (
    <div className="www-bullet" style={bulletStyles}>
      <span style={bulletIconStyles}>◆</span>
      {text}
    </div>
  );
}

/**
 * @typedef {Object} SurveyResponses
 * @property {boolean|null} hasAppIdea
 * @property {string} appIdeaDescription
 * @property {string} skillLevel
 * @property {string[]} toolsUsed
 * @property {boolean} willingToChat
 * @property {string} name
 * @property {string} phone
 */

/**
 * @param {{ 
 *   opened: boolean, 
 *   onClose: () => void, 
 *   email: string,
 *   onComplete: () => void 
 * }} props 
 */
function SurveyModal({ opened, onClose, email, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [docId, setDocId] = useState(/** @type {string|null} */ (null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Survey responses
  const [hasAppIdea, setHasAppIdea] = useState(/** @type {string|null} */ (null));
  const [appIdeaDescription, setAppIdeaDescription] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [toolsUsed, setToolsUsed] = useState(/** @type {string[]} */ ([]));
  const [willingToChat, setWillingToChat] = useState(/** @type {string|null} */ (null));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Create initial document when modal opens
  useEffect(() => {
    if (opened && !docId) {
      const createDoc = async () => {
        try {
          const docRef = await addDoc(collection(db, collections.waitlist), {
            email: email.trim().toLowerCase(),
            createdAt: serverTimestamp(),
            surveyStarted: true,
            surveyCompleted: false,
          });
          setDocId(docRef.id);
        } catch (error) {
          console.error("Failed to create waitlist entry:", error);
        }
      };
      createDoc();
    }
  }, [opened, docId, email]);

  // Save responses progressively
  const saveProgress = async (/** @type {Record<string, unknown>} */ updates) => {
    if (!docId) return;
    try {
      await updateDoc(doc(db, collections.waitlist, docId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const handleNext = async () => {
    if (currentQuestion === 1) {
      await saveProgress({ 
        hasAppIdea: hasAppIdea === "yes",
        appIdeaDescription: appIdeaDescription.trim() || null,
      });
    } else if (currentQuestion === 2) {
      await saveProgress({ skillLevel });
    } else if (currentQuestion === 3) {
      await saveProgress({ toolsUsed });
    }
    
    if (currentQuestion < TOTAL_QUESTIONS) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await saveProgress({
        willingToChat: willingToChat === "yes",
        name: willingToChat === "yes" ? name.trim() : null,
        phone: willingToChat === "yes" ? phone.trim() : null,
        surveyCompleted: true,
      });
      onComplete();
      onClose();
    } catch (error) {
      console.error("Failed to complete survey:", error);
      notifications.show({
        title: "Something went wrong",
        message: "Please try again",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (currentQuestion < TOTAL_QUESTIONS) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      await handleComplete();
    }
  };

  const canProceed = () => {
    switch (currentQuestion) {
      case 1: return hasAppIdea !== null;
      case 2: return skillLevel !== "";
      case 3: return true; // Tools are optional
      case 4: return willingToChat !== null;
      default: return false;
    }
  };

  const renderQuestion = () => {
    switch (currentQuestion) {
      case 1:
        return (
          <Stack gap="md">
            <Text style={questionLabelStyles}>
              Do you have an idea for an app you want to create?
            </Text>
            <Radio.Group value={hasAppIdea || ""} onChange={setHasAppIdea}>
              <Stack gap="sm">
                <Radio value="no" label="No" color="grape" />
                <Radio value="yes" label="Yes" color="grape" />
              </Stack>
            </Radio.Group>
            {hasAppIdea === "yes" && (
              <Textarea
                placeholder="Brief description (optional)"
                value={appIdeaDescription}
                onChange={(e) => setAppIdeaDescription(e.target.value)}
                minRows={2}
                styles={{
                  input: {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    "&::placeholder": { color: "rgba(255, 255, 255, 0.3)" },
                  },
                }}
              />
            )}
          </Stack>
        );
      
      case 2:
        return (
          <Stack gap="md">
            <Text style={questionLabelStyles}>
              What's your skill level in app development?
            </Text>
            <Radio.Group value={skillLevel} onChange={setSkillLevel}>
              <Stack gap="sm">
                {SKILL_LEVELS.map((level) => (
                  <Radio 
                    key={level.value} 
                    value={level.value} 
                    label={level.label}
                    color="grape"
                  />
                ))}
              </Stack>
            </Radio.Group>
          </Stack>
        );
      
      case 3:
        return (
          <Stack gap="md">
            <Text style={questionLabelStyles}>
              Which of these tools have you tried in the past?
            </Text>
            <Checkbox.Group value={toolsUsed} onChange={setToolsUsed}>
              <Stack gap="sm">
                {TOOLS.map((tool) => (
                  <Checkbox 
                    key={tool.value} 
                    value={tool.value} 
                    label={tool.label}
                    color="grape"
                  />
                ))}
              </Stack>
            </Checkbox.Group>
          </Stack>
        );
      
      case 4:
        return (
          <Stack gap="md">
            <Text style={questionLabelStyles}>
              Would you be willing to chat with the Basebase team to help you get set up?
            </Text>
            <Radio.Group value={willingToChat || ""} onChange={setWillingToChat}>
              <Stack gap="sm">
                <Radio value="no" label="No thanks" color="grape" />
                <Radio value="yes" label="Yes, I'd love to chat" color="grape" />
              </Stack>
            </Radio.Group>
            {willingToChat === "yes" && (
              <Stack gap="sm">
                <TextInput
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  styles={{
                    input: {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      "&::placeholder": { color: "rgba(255, 255, 255, 0.3)" },
                    },
                  }}
                />
                <TextInput
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  styles={{
                    input: {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      "&::placeholder": { color: "rgba(255, 255, 255, 0.3)" },
                    },
                  }}
                />
              </Stack>
            )}
          </Stack>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Help us understand you better"
      centered
      size="md"
      styles={{
        header: {
          backgroundColor: "#1a1a1f",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        },
        title: {
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: 600,
          color: "#ffffff",
        },
        body: {
          backgroundColor: "#1a1a1f",
          padding: "1.5rem",
        },
        content: {
          backgroundColor: "#1a1a1f",
        },
        close: {
          color: "rgba(255, 255, 255, 0.5)",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        },
      }}
    >
      <Box style={modalStyles}>
        <Text style={progressStyles}>
          Question {currentQuestion} of {TOTAL_QUESTIONS}
        </Text>
        
        {renderQuestion()}
        
        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            color="gray"
            onClick={handleSkip}
            styles={{
              root: {
                color: "rgba(255, 255, 255, 0.5)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                },
              },
            }}
          >
            {currentQuestion === TOTAL_QUESTIONS ? "Skip & finish" : "Skip"}
          </Button>
          
          <Button
            onClick={currentQuestion === TOTAL_QUESTIONS ? handleComplete : handleNext}
            disabled={!canProceed() || isSubmitting}
            loading={isSubmitting}
            styles={{
              root: {
                backgroundColor: ACCENT.button,
                "&:hover": {
                  backgroundColor: ACCENT.buttonHover,
                },
                "&:disabled": {
                  backgroundColor: ACCENT.buttonDisabled,
                },
              },
            }}
          >
            {currentQuestion === TOTAL_QUESTIONS ? "Complete" : "Next"}
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);

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

    // Show the survey modal instead of submitting directly
    setShowSurvey(true);
  };

  const handleSurveyComplete = () => {
    setIsSubmitted(true);
    setEmail("");
    notifications.show({
      title: "You're on the list!",
      message: "We'll be in touch soon.",
      color: "green",
    });
  };

  const handleSurveyClose = () => {
    setShowSurvey(false);
    // If they close without completing, still mark as submitted
    // since we already created the waitlist entry
    setIsSubmitted(true);
    setEmail("");
  };

  if (isSubmitted) {
    return (
      <Box style={formContainerStyles}>
        <Text
          style={{
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "1.15rem",
            color: ACCENT.highlight,
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
    <>
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
                borderColor: ACCENT.focusBorder,
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
              backgroundColor: ACCENT.button,
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
                backgroundColor: ACCENT.buttonHover,
              },
              "&:disabled": {
                backgroundColor: ACCENT.buttonDisabled,
              },
            },
          }}
        >
          {isSubmitting ? <Loader size="sm" color="white" /> : "Get early access"}
        </Button>
      </form>
      
      <SurveyModal
        opened={showSurvey}
        onClose={handleSurveyClose}
        email={email}
        onComplete={handleSurveyComplete}
      />
    </>
  );
}

function LandingPage() {
  return (
    <Box className="www-page" style={pageStyles}>
      {/* Ambient light effects */}
      <Box style={accentGlowStyles} />
      <Box style={subtleGradient1} />
      <Box style={subtleGradient2} />

      {/* Main content */}
      <Box className="www-content" style={contentStyles}>
        <h1 className="www-logo" style={logoStyles}>Basebase</h1>
        
        <p className="www-hero-text" style={heroTextStyles}>
          The app, as we know it, {" "}
          <span style={highlightStyles}>is dead</span>.
          <br />
          AI arranges our pixels {" "}
          <span style={highlightStyles}>instantly</span> and  <span style={highlightStyles}>at no cost</span>.
          <br />
          Welcome to the new era of {" "} <span style={highlightStyles}>ephemeral apps.</span>
        </p>

        <Box style={bulletWrapperStyles}>
          <Box style={bulletContainerStyles}>
            <Bullet text="Build and share an ephemeral app in 5 minutes" />
            <Bullet text="Customize and contribute to dozens of free apps" />
            <Bullet text="Join a newly empowered developer community!" />
          </Box>
        </Box>

        <WaitlistForm />
      </Box>

      {/* Footer */}
      <Text style={footerStyles}>
        &copy;2025 Basebase, Inc. All rights reserved.
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
