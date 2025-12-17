/**
 * DocsSidebar - Navigation sidebar for documentation
 */

import React from "react";
import {
  Stack,
  Text,
  NavLink,
  ScrollArea,
  Group,
  Badge,
  TextInput,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { IconSearch, IconPlus, IconFileText } from "@tabler/icons-react";
import { DOC_CATEGORIES } from "../schema.js";

/**
 * @typedef {Object} Doc
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} category
 * @property {number} order
 * @property {boolean} published
 */

/**
 * @param {{
 *   docs: Doc[];
 *   selectedSlug: string | null;
 *   onSelectDoc: (slug: string) => void;
 *   onCreateDoc?: () => void;
 *   isAdmin: boolean;
 *   searchQuery: string;
 *   onSearchChange: (query: string) => void;
 * }} props
 */
export function DocsSidebar({ 
  docs, 
  selectedSlug, 
  onSelectDoc, 
  onCreateDoc,
  isAdmin,
  searchQuery,
  onSearchChange,
}) {
  // Group docs by category
  const docsByCategory = DOC_CATEGORIES.reduce((acc, category) => {
    acc[category] = docs
      .filter(doc => doc.category === category)
      .filter(doc => isAdmin || doc.published)
      .filter(doc => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || doc.slug.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return acc;
  }, /** @type {Record<string, Doc[]>} */ ({}));

  // Filter out empty categories
  const nonEmptyCategories = DOC_CATEGORIES.filter(cat => docsByCategory[cat].length > 0);

  return (
    <Stack gap={0} h="100%">
      {/* Search */}
      <Group px="md" py="sm" gap="xs">
        <TextInput
          placeholder="Search docs..."
          leftSection={<IconSearch size={14} />}
          size="xs"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        {isAdmin && onCreateDoc && (
          <ActionIcon 
            variant="light" 
            color="blue" 
            onClick={onCreateDoc}
            title="Create new doc"
          >
            <IconPlus size={16} />
          </ActionIcon>
        )}
      </Group>

      <Divider />

      {/* Navigation */}
      <ScrollArea style={{ flex: 1 }} px="xs" py="sm">
        <Stack gap="lg">
          {nonEmptyCategories.map((category) => (
            <Stack key={category} gap={4}>
              <Text 
                size="xs" 
                fw={600} 
                c="dimmed" 
                tt="uppercase" 
                px="sm"
                style={{ letterSpacing: "0.05em" }}
              >
                {category}
              </Text>
              <Stack gap={2}>
                {docsByCategory[category].map((doc) => (
                  <NavLink
                    key={doc.id}
                    label={
                      <Group gap="xs" justify="space-between" wrap="nowrap">
                        <Text size="sm" truncate style={{ flex: 1 }}>
                          {doc.title}
                        </Text>
                        {isAdmin && !doc.published && (
                          <Badge size="xs" variant="light" color="yellow">
                            Draft
                          </Badge>
                        )}
                      </Group>
                    }
                    leftSection={<IconFileText size={16} />}
                    active={doc.slug === selectedSlug}
                    onClick={() => onSelectDoc(doc.slug)}
                    variant="light"
                    style={{ borderRadius: 6 }}
                  />
                ))}
              </Stack>
            </Stack>
          ))}

          {nonEmptyCategories.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {searchQuery ? "No docs match your search" : "No documentation yet"}
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

