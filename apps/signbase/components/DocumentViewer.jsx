/**
 * DocumentViewer - Renders PDF documents and handles signing
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Stack,
  Group,
  Paper,
  Text,
  Button,
  Badge,
  Alert,
  TextInput,
  Modal,
  Center,
  Loader,
  Title,
  Card,
  Avatar,
  ThemeIcon,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPencil,
  IconCheck,
  IconUserPlus,
  IconDownload,
  IconClock,
  IconSignature,
  IconMail,
  IconAlertCircle,
  IconSparkles,
} from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections } from "../schema.js";
import { InviteSignerModal } from "./InviteSignerModal.jsx";

// Load PDF.js from CDN for text extraction
let pdfjsLib = null;
const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib;
  
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  document.head.appendChild(script);
  
  await new Promise((resolve) => {
    script.onload = resolve;
  });
  
  pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  
  return pdfjsLib;
};

/**
 * Extract text from a PDF URL
 * @param {string} url - PDF URL
 * @returns {Promise<string>} Extracted text
 */
async function extractPdfTextFromUrl(url) {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument(url).promise;
  
  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 20);
  
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  
  if (fullText.length > 10000) {
    fullText = fullText.substring(0, 10000) + "...[truncated]";
  }
  
  return fullText;
}

/**
 * @typedef {Object} DocumentViewerProps
 * @property {Object | null} document
 * @property {Array} signatures
 */

/**
 * @param {DocumentViewerProps} props
 */
export function DocumentViewer({ document: doc, signatures: userSignatures }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signing, setSigning] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  
  // Summary generation state
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [localSummary, setLocalSummary] = useState(null);
  const summaryAttemptedRef = useRef(new Set()); // Track which docs we've tried to summarize
  
  const { call: callLLM } = useFunction("askLLM");

  // Fetch all signatures for this document
  const { data: docSignatures, loading: signaturesLoading } = useCollection(
    collections.signatures,
    {
      where: doc?.id ? [["documentId", "==", doc.id]] : [],
      realtime: true,
    }
  );

  // Get signer user IDs for profile lookup
  const signerUserIds = React.useMemo(() => {
    const ids = new Set();
    docSignatures?.forEach((sig) => ids.add(sig.signerId));
    doc?.signers?.forEach((s) => {
      if (s.userId) ids.add(s.userId);
    });
    return Array.from(ids);
  }, [docSignatures, doc?.signers]);

  // Fetch profiles of signers
  const { profiles: signerProfiles } = useUserProfiles(signerUserIds);

  // Update document collection reference
  const { update: updateDocument } = useCollection(collections.documents);

  // Add signature
  const { add: addSignature } = useCollection(collections.signatures);

  // Pre-fill signature name from profile
  useEffect(() => {
    if (profile?.displayName) {
      setSignatureName(profile.displayName);
    }
  }, [profile]);

  // Reset PDF loading state when document changes
  useEffect(() => {
    setPdfLoading(true);
    setPdfError(null);
    setLocalSummary(null);
  }, [doc?.id]);

  // Generate summary if document doesn't have one
  useEffect(() => {
    const generateSummaryIfNeeded = async () => {
      // Skip if no doc, already has summary, already generating, or already attempted for this doc
      if (!doc?.id || doc.summary || generatingSummary || summaryAttemptedRef.current.has(doc.id)) {
        return;
      }
      
      // Mark this doc as attempted
      summaryAttemptedRef.current.add(doc.id);
      
      setGeneratingSummary(true);
      
      try {
        console.log("Generating summary for document:", doc.id);
        
        // Extract text from PDF
        const pdfText = await extractPdfTextFromUrl(doc.fileUrl);
        
        if (!pdfText || pdfText.trim().length < 50) {
          console.log("PDF text too short, skipping summary");
          setGeneratingSummary(false);
          return;
        }
        
        // Call LLM to generate summary
        const result = await callLLM({
          provider: "openai",
          model: "gpt-4o-mini",
          message: `Please provide a concise summary of the following document. The summary should:
1. Explain what type of document this is (contract, agreement, letter, etc.)
2. Identify the main parties involved (if applicable)
3. Summarize the key points and obligations
4. Highlight any important dates, amounts, or deadlines
5. Note anything that would be important for someone who needs to sign this document

Keep the summary to 2-3 paragraphs maximum.

Document text:
${pdfText}`,
          options: { maxTokens: 500 },
        });
        
        if (result?.response) {
          // Update the document with the summary
          await updateDocument(doc.id, {
            summary: result.response,
            summaryGeneratedAt: new Date(),
          });
          
          // Also set local state so it displays immediately
          setLocalSummary(result.response);
        }
      } catch (err) {
        console.error("Error generating summary:", err);
        // Don't block viewing if summary fails
      } finally {
        setGeneratingSummary(false);
      }
    };
    
    generateSummaryIfNeeded();
  }, [doc?.id, doc?.summary, doc?.fileUrl, generatingSummary, callLLM, updateDocument]);

  if (!doc) {
    return (
      <Center h={400}>
        <Text c="dimmed">No document selected</Text>
      </Center>
    );
  }

  const isOwner = doc.owner === user?.uid;
  const userEmail = user?.email?.toLowerCase();

  // Check if current user needs to sign
  const needsToSign =
    doc.signers?.some(
      (s) =>
        (s.email?.toLowerCase() === userEmail || s.userId === user?.uid) &&
        s.status !== "signed"
    ) && !docSignatures?.some((s) => s.signerId === user?.uid);

  // Check if user has already signed
  const hasSigned = docSignatures?.some((s) => s.signerId === user?.uid);

  // Get user's location for signature
  const getLocation = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log("Got coordinates:", { latitude, longitude, accuracy });
          
          // Try to reverse geocode to get city/region/country
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
              { headers: { "Accept-Language": "en" } }
            );
            const data = await response.json();
            console.log("Geocode response:", data);
            const address = data.address || {};
            
            const locationData = {
              latitude,
              longitude,
              accuracy,
              city: address.city || address.town || address.village || address.municipality || null,
              region: address.state || address.county || null,
              country: address.country || null,
            };
            console.log("Location data to save:", locationData);
            resolve(locationData);
          } catch (err) {
            console.error("Geocoding error:", err);
            // If geocoding fails, just return coords
            resolve({ latitude, longitude, accuracy, city: null, region: null, country: null });
          }
        },
        (err) => {
          // User denied or error - continue without location
          console.log("Geolocation error:", err);
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  };

  // Handle signing
  const handleSign = async () => {
    if (!signatureName.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter your name as your signature",
        color: "red",
      });
      return;
    }

    setSigning(true);
    try {
      // Get location (non-blocking - won't fail if denied)
      const location = await getLocation();

      // Add signature record
      await addSignature({
        documentId: doc.id,
        signerId: user.uid,
        signerEmail: user.email,
        signerName: profile?.displayName || user.email,
        signatureText: signatureName.trim(),
        signedAt: new Date(),
        location,
        userAgent: navigator.userAgent,
      });

      // Update signer status in document
      const updatedSigners = doc.signers.map((s) => {
        if (s.email?.toLowerCase() === userEmail || s.userId === user.uid) {
          return { ...s, status: "signed", userId: user.uid };
        }
        return s;
      });

      // Check if all signers have signed
      const allSigned = updatedSigners.every((s) => s.status === "signed");

      await updateDocument(doc.id, {
        signers: updatedSigners,
        status: allSigned ? "completed" : "pending",
        ...(allSigned ? { completedAt: new Date() } : {}),
      });

      notifications.show({
        title: "Success",
        message: "Document signed successfully!",
        color: "green",
      });

      setSignModalOpen(false);
    } catch (error) {
      console.error("Error signing document:", error);
      notifications.show({
        title: "Error",
        message: "Failed to sign document. Please try again.",
        color: "red",
      });
    } finally {
      setSigning(false);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format location for display
  const formatLocationString = (location) => {
    if (!location) return null;
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    if (location.country && !location.region) parts.push(location.country);
    if (parts.length > 0) return parts.join(", ");
    // Fallback to coordinates
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`;
    }
    return null;
  };

  return (
    <Stack gap="md">
      {/* Document Header */}
      <Paper p="md" withBorder>
        <Group justify="space-between" wrap="wrap">
          <Stack gap={4}>
            <Group gap="xs">
              <Title order={4}>{doc.title || doc.name}</Title>
              <Badge
                color={
                  doc.status === "completed"
                    ? "green"
                    : doc.status === "pending"
                    ? "blue"
                    : "gray"
                }
              >
                {doc.status === "completed"
                  ? "Completed"
                  : doc.status === "pending"
                  ? "Awaiting Signatures"
                  : "Draft"}
              </Badge>
            </Group>
            {doc.description && (
              <Text size="sm" c="dimmed">
                {doc.description}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              Uploaded {formatDate(doc.createdAt)}
            </Text>
          </Stack>

          <Group gap="xs">
            {isOwner && doc.status !== "completed" && (
              <Button
                variant="light"
                leftSection={<IconUserPlus size={16} />}
                onClick={() => setInviteModalOpen(true)}
              >
                Invite Signer
              </Button>
            )}
            {needsToSign && (
              <Button
                color="green"
                leftSection={<IconPencil size={16} />}
                onClick={() => setSignModalOpen(true)}
              >
                Sign Document
              </Button>
            )}
            {hasSigned && (
              <Badge
                size="lg"
                color="green"
                leftSection={<IconCheck size={14} />}
              >
                You've Signed
              </Badge>
            )}
            <Tooltip label="Download PDF">
              <ActionIcon
                variant="light"
                size="lg"
                component="a"
                href={doc.fileUrl}
                target="_blank"
                download
              >
                <IconDownload size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Signers List */}
      {doc.signers && doc.signers.length > 0 && (
        <Paper p="md" withBorder>
          <Text fw={500} mb="sm">
            Signers ({docSignatures?.length || 0}/{doc.signers.length})
          </Text>
          <Stack gap="xs">
            {doc.signers.map((signer, index) => {
              const signature = docSignatures?.find(
                (s) =>
                  s.signerEmail?.toLowerCase() ===
                    signer.email?.toLowerCase() || s.signerId === signer.userId
              );
              // signerProfiles is a Map - get by userId if available
              const signerProfile = signer.userId 
                ? signerProfiles?.get(signer.userId) 
                : null;

              return (
                <Group key={index} justify="space-between">
                  <Group gap="sm">
                    <Avatar
                      src={signerProfile?.photoURL}
                      size="sm"
                      radius="xl"
                    >
                      {signer.email?.[0]?.toUpperCase()}
                    </Avatar>
                    <Stack gap={0}>
                      <Text size="sm">
                        {signerProfile?.displayName || signer.email}
                      </Text>
                      {signerProfile?.displayName && (
                        <Text size="xs" c="dimmed">
                          {signer.email}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                  {signature ? (
                    <Group gap="xs">
                      <ThemeIcon size="sm" color="green" variant="light">
                        <IconCheck size={12} />
                      </ThemeIcon>
                      <Text size="xs" c="dimmed">
                        Signed {formatDate(signature.signedAt)}
                      </Text>
                    </Group>
                  ) : (
                    <Group gap="xs">
                      <ThemeIcon size="sm" color="orange" variant="light">
                        <IconClock size={12} />
                      </ThemeIcon>
                      <Text size="xs" c="dimmed">
                        Pending
                      </Text>
                    </Group>
                  )}
                </Group>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Alert for user to sign */}
      {needsToSign && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Your signature is required"
          color="orange"
        >
          Please review the document below and click "Sign Document" to add your
          signature.
        </Alert>
      )}

      {/* AI Summary */}
      {(doc.summary || localSummary || generatingSummary) && (
        <Paper p="md" withBorder bg="blue.0">
          <Group gap="xs" mb="sm">
            <IconSparkles size={18} color="#228be6" />
            <Text fw={600} c="blue.7">
              AI Document Summary
            </Text>
            {generatingSummary && (
              <Loader size="xs" color="blue" />
            )}
          </Group>
          {generatingSummary && !doc.summary && !localSummary ? (
            <Text size="sm" c="dimmed" fs="italic">
              Generating summary... This may take a moment.
            </Text>
          ) : (
            <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {doc.summary || localSummary}
            </Text>
          )}
          {doc.summaryGeneratedAt && (
            <Text size="xs" c="dimmed" mt="sm">
              Generated {formatDate(doc.summaryGeneratedAt)}
            </Text>
          )}
        </Paper>
      )}

      {/* PDF Viewer */}
      <Paper
        withBorder
        style={{ 
          height: "calc(100vh - 300px)", 
          minHeight: 500,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {pdfLoading && (
          <Center 
            style={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              backgroundColor: "white",
              zIndex: 10,
            }}
          >
            <Stack align="center">
              <Loader size="lg" />
              <Text c="dimmed">Loading document...</Text>
            </Stack>
          </Center>
        )}
        {pdfError ? (
          <Center h="100%">
            <Stack align="center">
              <Text c="red">{pdfError}</Text>
              <Button
                variant="light"
                component="a"
                href={doc.fileUrl}
                target="_blank"
              >
                Open in new tab
              </Button>
            </Stack>
          </Center>
        ) : (
          <iframe
            src={doc.fileUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            onLoad={() => setPdfLoading(false)}
            onError={() => {
              setPdfLoading(false);
              setPdfError("Failed to load PDF. Try opening in a new tab.");
            }}
            title={doc.title || doc.name}
          />
        )}
      </Paper>

      {/* Signature History */}
      {docSignatures && docSignatures.length > 0 && (
        <Paper p="md" withBorder>
          <Text fw={500} mb="sm">
            Signature History
          </Text>
          <Stack gap="xs">
            {docSignatures.map((sig) => {
              // signerProfiles is a Map - get by signerId
              const signerProfile = signerProfiles?.get(sig.signerId);
              return (
                <Card key={sig.id} withBorder padding="sm">
                  <Group justify="space-between">
                    <Group gap="sm">
                      <ThemeIcon color="green" variant="light">
                        <IconSignature size={16} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>
                          {signerProfile?.displayName || sig.signerName}
                        </Text>
                        <Text
                          size="lg"
                          style={{ fontFamily: "cursive", fontStyle: "italic" }}
                        >
                          {sig.signatureText}
                        </Text>
                      </Stack>
                    </Group>
                    <Stack gap={0} align="flex-end">
                      <Text size="xs" c="dimmed">
                        {formatDate(sig.signedAt)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {sig.signerEmail}
                      </Text>
                      {sig.location && (
                        <Text size="xs" c="dimmed">
                          📍 {formatLocationString(sig.location)}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Sign Modal */}
      <Modal
        opened={signModalOpen}
        onClose={() => setSignModalOpen(false)}
        title="Sign Document"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            By signing this document, you are legally agreeing to its contents.
            Your signature will be recorded with a timestamp.
          </Alert>

          <TextInput
            label="Type your full legal name as your signature"
            placeholder="John Doe"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            size="lg"
            styles={{
              input: {
                fontFamily: "cursive",
                fontStyle: "italic",
                fontSize: "1.5rem",
              },
            }}
          />

          {signatureName && (
            <Paper p="md" withBorder bg="gray.0">
              <Text size="sm" c="dimmed" mb="xs">
                Signature Preview:
              </Text>
              <Text
                size="xl"
                style={{ fontFamily: "cursive", fontStyle: "italic" }}
              >
                {signatureName}
              </Text>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setSignModalOpen(false)}
              disabled={signing}
            >
              Cancel
            </Button>
            <Button
              color="green"
              onClick={handleSign}
              loading={signing}
              leftSection={<IconPencil size={16} />}
            >
              Sign Document
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Invite Modal */}
      <InviteSignerModal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        document={doc}
      />
    </Stack>
  );
}

