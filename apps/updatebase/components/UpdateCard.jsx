/**
 * UpdateCard - Individual update post card with media support
 */

import React, { useState } from "react";
import {
  Card,
  Text,
  Group,
  Avatar,
  Badge,
  ActionIcon,
  Menu,
  Image,
  Stack,
  Spoiler,
  AspectRatio,
  SimpleGrid,
  Modal,
} from "@mantine/core";
import {
  IconDots,
  IconEdit,
  IconTrash,
  IconMail,
  IconEye,
  IconMessage,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { CommentsSection } from "./CommentsSection.jsx";

/**
 * @typedef {Object} MediaItem
 * @property {'image' | 'video'} type
 * @property {string} url
 * @property {string | undefined} thumbnailUrl
 * @property {string} name
 */

/**
 * @typedef {Object} Update
 * @property {string} id
 * @property {string} orgId
 * @property {string} title
 * @property {string} content
 * @property {string} authorId
 * @property {string} visibility
 * @property {MediaItem[]} media
 * @property {number} commentCount
 * @property {number} viewCount
 * @property {boolean} emailSent
 * @property {Object | null} publishedAt
 * @property {Object | null} createdAt
 */

/**
 * @param {{ update: Update, isTeamMember: boolean, onEdit: (update: Update) => void, onDelete: (id: string) => void, onSendEmail: (update: Update) => void }} props
 */
export function UpdateCard({ update, isTeamMember, onEdit, onDelete, onSendEmail }) {
  const [showComments, setShowComments] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [videoModalUrl, setVideoModalUrl] = useState(null);

  const { profiles } = useUserProfiles([update.authorId]);
  const authorProfile = profiles.get(update.authorId);
  const formattedDate = update.publishedAt?.toDate
    ? new Date(update.publishedAt.toDate()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : update.createdAt?.toDate
    ? new Date(update.createdAt.toDate()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

  const visibilityColor =
    update.visibility === "public"
      ? "green"
      : update.visibility === "subscribers"
      ? "blue"
      : "gray";

  const images = (update.media || []).filter((m) => m.type === "image");
  const videos = (update.media || []).filter((m) => m.type === "video");

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <Avatar
                src={authorProfile?.photoURL}
                alt={authorProfile?.displayName || "Author"}
                size="md"
                radius="xl"
              />
              <div>
                <Text size="sm" fw={500}>
                  {authorProfile?.displayName || authorProfile?.email || "Unknown"}
                </Text>
                <Text size="xs" c="dimmed">
                  {formattedDate}
                </Text>
              </div>
            </Group>

            <Group gap="xs">
              <Badge color={visibilityColor} size="sm" variant="light">
                {update.visibility}
              </Badge>
              {update.emailSent && (
                <Badge color="teal" size="sm" variant="light" leftSection={<IconMail size={10} />}>
                  Sent
                </Badge>
              )}

              {isTeamMember && (
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(update)}>
                      Edit
                    </Menu.Item>
                    {!update.emailSent && update.visibility !== "draft" && (
                      <Menu.Item
                        leftSection={<IconMail size={14} />}
                        onClick={() => onSendEmail(update)}
                      >
                        Send to Subscribers
                      </Menu.Item>
                    )}
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => onDelete(update.id)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </Group>
          </Group>

          {/* Title */}
          <Text size="lg" fw={600}>
            {update.title}
          </Text>

          {/* Content */}
          <Spoiler maxHeight={200} showLabel="Show more" hideLabel="Show less">
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {update.content}
            </Text>
          </Spoiler>

          {/* Images */}
          {images.length > 0 && (
            <SimpleGrid cols={images.length === 1 ? 1 : 2} spacing="sm">
              {images.slice(0, 4).map((media, index) => (
                <AspectRatio key={index} ratio={16 / 9}>
                  <Image
                    src={media.url}
                    alt={media.name || "Update image"}
                    radius="sm"
                    fit="cover"
                    style={{ cursor: "pointer" }}
                    onClick={() => setLightboxImage(media.url)}
                  />
                  {index === 3 && images.length > 4 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                      }}
                    >
                      <Text c="white" size="xl" fw={700}>
                        +{images.length - 4}
                      </Text>
                    </div>
                  )}
                </AspectRatio>
              ))}
            </SimpleGrid>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <Stack gap="sm">
              {videos.map((media, index) => (
                <Card
                  key={index}
                  padding="xs"
                  withBorder
                  style={{ cursor: "pointer" }}
                  onClick={() => setVideoModalUrl(media.url)}
                >
                  <Group gap="sm">
                    <ActionIcon size="lg" variant="filled" color="blue" radius="xl">
                      <IconPlayerPlay size={16} />
                    </ActionIcon>
                    <Text size="sm">{media.name || "Video"}</Text>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}

          {/* Stats & Actions */}
          <Group justify="space-between" pt="xs" style={{ borderTop: "1px solid #e9ecef" }}>
            <Group gap="lg">
              <Group gap={4}>
                <IconEye size={16} color="#868e96" />
                <Text size="xs" c="dimmed">
                  {update.viewCount || 0} views
                </Text>
              </Group>
              <Group
                gap={4}
                style={{ cursor: "pointer" }}
                onClick={() => setShowComments(!showComments)}
              >
                <IconMessage size={16} color={showComments ? "#228be6" : "#868e96"} />
                <Text size="xs" c={showComments ? "blue" : "dimmed"}>
                  {update.commentCount || 0} comments
                </Text>
              </Group>
            </Group>
          </Group>

          {/* Comments Section */}
          {showComments && <CommentsSection updateId={update.id} orgId={update.orgId} />}
        </Stack>
      </Card>

      {/* Image Lightbox */}
      <Modal
        opened={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        size="xl"
        padding={0}
        withCloseButton={false}
        centered
      >
        <Image src={lightboxImage} alt="Full size" fit="contain" />
      </Modal>

      {/* Video Modal */}
      <Modal
        opened={!!videoModalUrl}
        onClose={() => setVideoModalUrl(null)}
        size="xl"
        title="Video"
        centered
      >
        <AspectRatio ratio={16 / 9}>
          <video src={videoModalUrl} controls autoPlay style={{ width: "100%", borderRadius: 8 }}>
            Your browser does not support the video tag.
          </video>
        </AspectRatio>
      </Modal>
    </>
  );
}
