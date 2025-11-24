import React from "react";
import { Card, Image, Text, Badge, Group, Stack } from "@mantine/core";
import { IconMapPin, IconCalendar, IconExternalLink } from "@tabler/icons-react";

export function EventCard({ event }) {
  const startDate = event.start?.toDate ? event.start.toDate() : new Date(event.start);
  const endDate = event.end?.toDate ? event.end.toDate() : new Date(event.end);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const handleClick = () => {
    if (event.eventUrl) {
      window.open(event.eventUrl, '_blank');
    }
  };

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder
      style={{ cursor: event.eventUrl ? 'pointer' : 'default', height: '100%' }}
      onClick={handleClick}
    >
      <Card.Section>
        <Image
          src={event.imageUrl || 'https://placehold.co/600x400?text=No+Image'}
          height={200}
          alt={event.title || 'Event image'}
          fit="cover"
        />
      </Card.Section>

      <Stack gap="sm" mt="md">
        <Text fw={600} size="lg" lineClamp={2}>
          {event.title}
        </Text>

        <Group gap="xs" wrap="nowrap" align="flex-start">
          <IconCalendar size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <Text size="sm" c="dimmed">
            {formatDate(startDate)}
          </Text>
        </Group>

        <Group gap="xs" wrap="nowrap" align="flex-start">
          <IconCalendar size={16} style={{ flexShrink: 0, marginTop: 2, opacity: 0 }} />
          <Text size="sm" c="dimmed">
            {formatTime(startDate)} - {formatTime(endDate)}
          </Text>
        </Group>

        {event.location && (
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconMapPin size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <Text size="sm" c="dimmed" style={{ flex: 1, wordBreak: 'break-word' }}>
              {event.location}
            </Text>
          </Group>
        )}

        {event.description && (
          <Text size="sm" lineClamp={3} mt="xs">
            {event.description}
          </Text>
        )}

        {event.calendarName && (
          <Badge color="blue" variant="light" size="sm" mt="xs">
            {event.calendarName}
          </Badge>
        )}
      </Stack>
    </Card>
  );
}

