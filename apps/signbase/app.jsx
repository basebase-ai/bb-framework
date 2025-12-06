/**
 * SignBase - Document Signing Application
 * A DocuSign-like system for uploading, viewing, and signing PDF documents
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Avatar,
  Button,
  SegmentedControl,
  Badge,
  Burger,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconFileText,
  IconUpload,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useRouter } from "../../framework/hooks/useRouter.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { useAppStore } from "./stores/appStore.js";
import { APP_ID, collections } from "./schema.js";

// Components
import { DocumentGallery } from "./components/DocumentGallery.jsx";
import { DocumentViewer } from "./components/DocumentViewer.jsx";
import { UploadDocumentModal } from "./components/UploadDocumentModal.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * Parse the current path to extract route info
 * @param {string} path - Current URL path
 * @returns {{ view: 'gallery' | 'viewer', documentId: string | null }}
 */
function parseRoute(path) {
  // Match /document/:id pattern
  const documentMatch = path.match(/^\/document\/([^/]+)/);
  if (documentMatch) {
    return { view: "viewer", documentId: documentMatch[1] };
  }
  // Default to gallery
  return { view: "gallery", documentId: null };
}

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  
  // Router for URL-based navigation
  const { path, navigate, back } = useRouter();
  
  // Parse current route
  const route = useMemo(() => parseRoute(path), [path]);
  
  const {
    filterMode,
    setFilterMode,
    uploadModalOpen,
    openUploadModal,
    closeUploadModal,
    sidebarOpen,
    toggleSidebar,
  } = useAppStore();

  // Fetch documents - always subscribe (auth is handled by AuthProvider)
  const { data: documents, loading: documentsLoading } = useCollection(
    collections.documents
  );

  // Fetch signatures for the current user (for tracking which docs they've signed)
  const { data: userSignatures } = useCollection(
    collections.signatures,
    {
      where: user?.uid ? [["signerId", "==", user.uid]] : [],
    }
  );

  // Fetch ALL signatures for the map display
  const { data: allSignatures } = useCollection(collections.signatures);

  // Only show loading if actively fetching data
  const isLoading = documentsLoading;

  // Filter documents based on user's relationship and filter mode
  const filteredDocuments = useMemo(() => {
    if (!documents || !user || !Array.isArray(documents)) return [];

    const userEmail = user.email?.toLowerCase() || "";
    const signedDocIds = new Set(userSignatures?.map((s) => s.documentId) || []);

    return documents.filter((doc) => {
      const isOwner = doc.owner === user.uid;
      const isInvitedSigner = doc.signers?.some(
        (s) => s.email?.toLowerCase() === userEmail || s.userId === user.uid
      );
      const hasSigned = signedDocIds.has(doc.id);

      if (!isOwner && !isInvitedSigner) return false;

      switch (filterMode) {
        case "owned":
          return isOwner;
        case "to_sign":
          return isInvitedSigner && !hasSigned;
        case "signed":
          return hasSigned;
        default:
          return true;
      }
    });
  }, [documents, user, filterMode, userSignatures]);

  // Get selected document from route
  const selectedDocument = useMemo(() => {
    if (!route.documentId || !documents) return null;
    return documents.find((d) => d.id === route.documentId) || null;
  }, [route.documentId, documents]);

  // Count badges for filter
  const counts = useMemo(() => {
    if (!documents || !user || !Array.isArray(documents))
      return { all: 0, owned: 0, toSign: 0, signed: 0 };

    const userEmail = user.email?.toLowerCase() || "";
    const signedDocIds = new Set(userSignatures?.map((s) => s.documentId) || []);

    let all = 0;
    let owned = 0;
    let toSign = 0;
    let signed = 0;

    documents.forEach((doc) => {
      const isOwner = doc.owner === user.uid;
      const isInvitedSigner = doc.signers?.some(
        (s) => s.email?.toLowerCase() === userEmail || s.userId === user.uid
      );
      const hasSigned = signedDocIds.has(doc.id);

      if (isOwner || isInvitedSigner) {
        all++;
        if (isOwner) owned++;
        if (isInvitedSigner && !hasSigned) toSign++;
        if (hasSigned) signed++;
      }
    });

    return { all, owned, toSign, signed };
  }, [documents, user, userSignatures]);

  // Navigate to document
  const selectDocument = (docId) => {
    navigate(`/document/${docId}`);
  };

  // Go back to gallery
  const goToGallery = () => {
    navigate("/");
  };

  // Handle browser back button going to gallery
  const handleBack = () => {
    back();
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={sidebarOpen}
              onClick={toggleSidebar}
              hiddenFrom="sm"
              size="sm"
            />
            {route.view === "viewer" ? (
              <Button
                variant="subtle"
                size="compact-md"
                leftSection={<IconArrowLeft size={18} />}
                onClick={handleBack}
                px="xs"
              >
                Back
              </Button>
            ) : (
              <IconFileText size={28} color="#228be6" />
            )}
            <Title order={3}>SignBase</Title>
            {route.view === "viewer" && selectedDocument && (
              <Badge variant="light" color="blue" size="lg" visibleFrom="sm">
                {selectedDocument.title || selectedDocument.name}
              </Badge>
            )}
          </Group>

          <Group gap="md">
            {route.view === "gallery" && (
              <>
                <SegmentedControl
                  size="xs"
                  value={filterMode}
                  onChange={setFilterMode}
                  data={[
                    { label: `All (${counts.all})`, value: "all" },
                    { label: `My Docs (${counts.owned})`, value: "owned" },
                    { label: `To Sign (${counts.toSign})`, value: "to_sign" },
                    { label: `Signed (${counts.signed})`, value: "signed" },
                  ]}
                  visibleFrom="sm"
                />
                <Button
                  leftSection={<IconUpload size={16} />}
                  onClick={openUploadModal}
                >
                  Upload
                </Button>
              </>
            )}
            {user && (
              <Group
                gap="xs"
                style={{ cursor: "pointer" }}
                onClick={() => setProfileModalOpened(true)}
              >
                <Avatar
                  src={profile?.photoURL}
                  alt={profile?.displayName || user.email}
                  size="sm"
                  radius="xl"
                />
                <Text size="sm" c="dimmed" visibleFrom="md">
                  {profile?.displayName || user.email}
                </Text>
              </Group>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {route.view === "gallery" ? (
          <DocumentGallery
            documents={filteredDocuments}
            allDocuments={documents || []}
            signatures={userSignatures || []}
            allSignatures={allSignatures || []}
            loading={isLoading}
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            counts={counts}
            onSelectDocument={selectDocument}
          />
        ) : (
          <DocumentViewer
            document={selectedDocument}
            signatures={userSignatures || []}
          />
        )}
      </AppShell.Main>

      {/* Modals */}
      <UploadDocumentModal
        opened={uploadModalOpen}
        onClose={closeUploadModal}
      />

      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
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

// Mount app (only once)
const container = document.getElementById("app");
let root;

function render() {
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
