/**
 * DocumentGallery - Displays a grid of uploaded documents with signature map
 */

import React, { useMemo } from "react";
import {
  SimpleGrid,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Center,
  Loader,
  Paper,
  ThemeIcon,
  SegmentedControl,
  Box,
  Grid,
} from "@mantine/core";
import {
  IconFileText,
  IconClock,
  IconCheck,
  IconPencil,
  IconFileOff,
  IconMapPin,
} from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { DocumentPreview } from "./DocumentPreview.jsx";
import { SignatureMap } from "./SignatureMap.jsx";
import { RecentActivity } from "./RecentActivity.jsx";

/**
 * @typedef {Object} DocumentGalleryProps
 * @property {Array} documents - Filtered documents for display
 * @property {Array} allDocuments - All documents for activity feed
 * @property {Array} signatures - Current user's signatures
 * @property {Array} allSignatures - All signatures for the map
 * @property {boolean} loading
 * @property {string} filterMode
 * @property {Function} setFilterMode
 * @property {Object} counts
 * @property {Function} onSelectDocument
 */

/**
 * @param {DocumentGalleryProps} props
 */
export function DocumentGallery({
  documents,
  allDocuments,
  signatures,
  allSignatures,
  loading,
  filterMode,
  setFilterMode,
  counts,
  onSelectDocument,
}) {
  const { user } = useAuth();

  // Get unique signer IDs for profile lookup
  const signerIds = useMemo(() => {
    const ids = new Set();
    allSignatures?.forEach((sig) => {
      if (sig.signerId) ids.add(sig.signerId);
    });
    return Array.from(ids);
  }, [allSignatures]);

  // Fetch signer profiles for the map
  const { profiles: signerProfiles } = useUserProfiles(signerIds);

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Show mobile filter on small screens
  const MobileFilter = () => (
    <Box hiddenFrom="sm" mb="md">
      <SegmentedControl
        fullWidth
        size="xs"
        value={filterMode}
        onChange={setFilterMode}
        data={[
          { label: `All (${counts.all})`, value: "all" },
          { label: `Mine (${counts.owned})`, value: "owned" },
          { label: `Sign (${counts.toSign})`, value: "to_sign" },
          { label: `Done (${counts.signed})`, value: "signed" },
        ]}
      />
    </Box>
  );

  if (documents.length === 0) {
    return (
      <>
        <MobileFilter />
        <Center h={400}>
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius="xl" color="gray" variant="light">
              <IconFileOff size={40} />
            </ThemeIcon>
            <Text size="lg" c="dimmed">
              {filterMode === "all"
                ? "No documents yet"
                : filterMode === "owned"
                ? "You haven't uploaded any documents"
                : filterMode === "to_sign"
                ? "No documents waiting for your signature"
                : "You haven't signed any documents yet"}
            </Text>
            <Text size="sm" c="dimmed">
              {filterMode === "all" &&
                "Click 'Upload' to add your first document"}
            </Text>
          </Stack>
        </Center>
      </>
    );
  }

  // Create a set of signed document IDs for quick lookup
  const signedDocIds = new Set(signatures.map((s) => s.documentId));

  return (
    <Stack gap="md">
      <MobileFilter />
      
      {/* Map and Recent Activity Side by Side */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <SignatureMap 
            signatures={allSignatures || []} 
            signerProfiles={signerProfiles} 
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <RecentActivity 
            documents={allDocuments || []}
            signatures={allSignatures || []}
            limit={10}
          />
        </Grid.Col>
      </Grid>

      {/* Document Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
        {documents.map((doc) => {
          const userSignature = signatures.find((s) => s.documentId === doc.id);
          return (
            <DocumentCard
              key={doc.id}
              document={doc}
              onClick={() => onSelectDocument(doc.id)}
              isOwner={doc.owner === user?.uid}
              hasSigned={signedDocIds.has(doc.id)}
              needsSignature={
                doc.signers?.some(
                  (s) =>
                    s.email?.toLowerCase() === user?.email?.toLowerCase() ||
                    s.userId === user?.uid
                ) && !signedDocIds.has(doc.id)
              }
              userSignature={userSignature}
            />
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

/**
 * @typedef {Object} DocumentCardProps
 * @property {Object} document
 * @property {Function} onClick
 * @property {boolean} isOwner
 * @property {boolean} hasSigned
 * @property {boolean} needsSignature
 * @property {Object | null} userSignature - The current user's signature for this doc
 */

/**
 * @param {DocumentCardProps} props
 */
function DocumentCard({ document, onClick, isOwner, hasSigned, needsSignature, userSignature }) {
  // Format location for display
  const formatLocation = (location) => {
    if (!location) return null;
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    if (location.country && !location.region) parts.push(location.country);
    if (parts.length > 0) return parts.join(", ");
    // Fallback to coordinates if no city/region
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`;
    }
    return null;
  };

  // Calculate signature progress
  const totalSigners = document.signers?.length || 0;
  const completedSignatures = document.signers?.filter(
    (s) => s.status === "signed"
  ).length || 0;

  // Determine status badge
  const getStatusBadge = () => {
    if (document.status === "completed") {
      return (
        <Badge color="green" leftSection={<IconCheck size={12} />}>
          Completed
        </Badge>
      );
    }
    if (needsSignature) {
      return (
        <Badge color="orange" leftSection={<IconPencil size={12} />}>
          Sign Now
        </Badge>
      );
    }
    if (document.status === "pending" && totalSigners > 0) {
      return (
        <Badge color="blue" leftSection={<IconClock size={12} />}>
          {completedSignatures}/{totalSigners} Signed
        </Badge>
      );
    }
    if (document.status === "draft") {
      return <Badge color="gray">Draft</Badge>;
    }
    return null;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Card.Section p="md" bg="gray.1">
        {document.fileUrl || document.filePath ? (
          <DocumentPreview 
            fileUrl={document.fileUrl} 
            filePath={document.filePath} 
          />
        ) : (
          <Center>
            <ThemeIcon size={60} radius="md" color="blue" variant="light">
              <IconFileText size={32} />
            </ThemeIcon>
          </Center>
        )}
      </Card.Section>

      <Stack gap="xs" mt="md">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={500} lineClamp={1} style={{ flex: 1 }}>
            {document.title || document.name}
          </Text>
          {isOwner && (
            <Badge size="xs" variant="outline" color="gray">
              Owner
            </Badge>
          )}
        </Group>

        {document.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {document.description}
          </Text>
        )}

        <Group gap="xs">
          {getStatusBadge()}
          {hasSigned && !needsSignature && (
            <Badge
              size="sm"
              color="green"
              variant="light"
              leftSection={<IconCheck size={10} />}
            >
              You signed
            </Badge>
          )}
        </Group>

        {/* Show signing location if available */}
        {userSignature?.location && (
          <Group gap={4}>
            <IconMapPin size={12} color="gray" />
            <Text size="xs" c="dimmed">
              {formatLocation(userSignature.location)}
            </Text>
          </Group>
        )}

        <Group justify="space-between" mt="xs">
          <Text size="xs" c="dimmed">
            {formatDate(document.createdAt)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatSize(document.fileSize)}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}


