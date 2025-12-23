/**
 * PageList - Homepage showing all wiki pages with search
 */

import React, { useState, useMemo } from "react";
import {
  Container,
  Title,
  TextInput,
  Button,
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  Loader,
  Center,
} from "@mantine/core";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useRoute } from "../../../framework/hooks/useRoute.js";
import { CreatePageModal } from "./CreatePageModal.jsx";
import { collections } from "../schema.js";

export function PageList() {
  const { authenticated, promptSignIn } = useAuth();
  const { navigate } = useRoute();
  const { data: pages, loading } = useCollection(collections.pages);
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpened, setCreateModalOpened] = useState(false);

  // Get all unique user IDs from pages
  const userIds = useMemo(() => {
    if (!pages) return [];
    /** @type {Set<string>} */
    const ids = new Set();
    pages.forEach((page) => {
      if (page.createdBy) ids.add(page.createdBy);
      if (page.contributors) {
        page.contributors.forEach((/** @type {string} */ id) => ids.add(id));
      }
    });
    return Array.from(ids);
  }, [pages]);

  const { profiles } = useUserProfiles(userIds);

  // Filter pages based on search query
  const filteredPages = useMemo(() => {
    if (!pages) return [];
    if (!searchQuery.trim()) return pages;
    
    const query = searchQuery.toLowerCase();
    return pages.filter((page) =>
      page.title.toLowerCase().includes(query)
    );
  }, [pages, searchQuery]);

  // Sort by most recently updated
  const sortedPages = useMemo(() => {
    return [...filteredPages].sort((a, b) => {
      const aTime = a.updatedAt?.toMillis() || 0;
      const bTime = b.updatedAt?.toMillis() || 0;
      return bTime - aTime;
    });
  }, [filteredPages]);

  const getDisplayName = (/** @type {string} */ uid) => {
    const profile = profiles.get(uid);
    return profile?.displayName || profile?.email || "Unknown";
  };

  const handleCreatePage = () => {
    if (!authenticated) {
      promptSignIn();
      return;
    }
    setCreateModalOpened(true);
  };

  const handlePageCreated = (/** @type {string} */ slug) => {
    setCreateModalOpened(false);
    navigate(`/${slug}`);
  };

  if (loading) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={1}>Basepedia</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreatePage}
          >
            Create Page
          </Button>
        </Group>

        <TextInput
          placeholder="Search pages..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          size="md"
        />

        <Stack gap="md">
          {sortedPages.length === 0 ? (
            <Paper p="xl" withBorder>
              <Center>
                <Text c="dimmed">
                  {searchQuery
                    ? "No pages found matching your search"
                    : "No pages yet. Create the first one!"}
                </Text>
              </Center>
            </Paper>
          ) : (
            sortedPages.map((page) => (
              <Paper
                key={page.id}
                p="md"
                withBorder
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/${page.slug}`)}
              >
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Title order={3}>{page.title}</Title>
                    <Badge variant="light" size="sm">
                      {page.contributors?.length || 0} contributor
                      {page.contributors?.length !== 1 ? "s" : ""}
                    </Badge>
                  </Group>
                  
                  <Text size="sm" c="dimmed">
                    Created by {getDisplayName(page.createdBy)}
                    {page.updatedAt && (
                      <> • Updated {page.updatedAt.toDate().toLocaleDateString()}</>
                    )}
                  </Text>

                  {page.content && (
                    <Text size="sm" lineClamp={2} c="dimmed">
                      {page.content.substring(0, 150)}...
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>

      {/* Create Page Modal */}
      <CreatePageModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onPageCreated={handlePageCreated}
      />
    </Container>
  );
}
