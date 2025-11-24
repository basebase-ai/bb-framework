import React from "react";
import {
  Modal,
  Stack,
  Text,
  Image,
  Badge,
  Group,
  Button,
  Divider,
} from "@mantine/core";
import { IconExternalLink, IconShare, IconMapPin, IconCalendar, IconClock } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export function EventDetailsModal({ event, opened, onClose }) {
  if (!event) return null;

  const startDate = event.start?.toDate ? event.start.toDate() : new Date(event.start?.seconds * 1000);
  const endDate = event.end?.toDate ? event.end.toDate() : new Date(event.end?.seconds * 1000);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleGoToSource = () => {
    if (event.eventUrl) {
      window.open(event.eventUrl, '_blank');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: event.title || 'Event',
      text: event.description || '',
      url: event.eventUrl || window.location.href,
    };

    // Check if Web Share API is available (mobile)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback: Copy link to clipboard (desktop)
      const textToCopy = event.eventUrl || window.location.href;
      
      try {
        await navigator.clipboard.writeText(textToCopy);
        notifications.show({
          title: "Link Copied",
          message: "Event link copied to clipboard",
          color: "green",
        });
      } catch (err) {
        notifications.show({
          title: "Copy Failed",
          message: "Could not copy link to clipboard",
          color: "red",
        });
      }
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={event.title}
      size="lg"
    >
      <Stack gap="md">
        {/* Event Image */}
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            height={300}
            fit="cover"
            radius="md"
            alt={event.title}
            fallbackSrc="https://placehold.co/600x400?text=No+Image"
          />
        )}

        {/* Calendar Source Badge */}
        {event.calendarName && (
          <Badge color="blue" variant="light" size="lg">
            {event.calendarName}
          </Badge>
        )}

        {/* Date and Time */}
        <Stack gap="xs">
          <Group gap="xs">
            <IconCalendar size={20} />
            <Text size="md" fw={500}>
              {formatDate(startDate)}
            </Text>
          </Group>

          <Group gap="xs">
            <IconClock size={20} />
            <Text size="md">
              {formatTime(startDate)} - {formatTime(endDate)}
            </Text>
          </Group>
        </Stack>

        {/* Location */}
        {event.location && (
          <>
            <Divider />
            <Group gap="xs" align="flex-start">
              <IconMapPin size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <Text size="md">{event.location}</Text>
            </Group>
          </>
        )}

        {/* Description */}
        {event.description && (
          <>
            <Divider />
            <div>
              <Text size="sm" fw={500} mb="xs">
                About this event
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {event.description}
              </Text>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <Group mt="md" grow>
          {event.eventUrl && (
            <Button
              leftSection={<IconExternalLink size={16} />}
              onClick={handleGoToSource}
              variant="filled"
            >
              Go To Source
            </Button>
          )}
          <Button
            leftSection={<IconShare size={16} />}
            onClick={handleShare}
            variant="light"
          >
            Share
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

