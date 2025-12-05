/**
 * PresenceAvatars - Show active users in a document
 * Displays avatars with colored rings and typing indicators
 */

import React from "react";
import {
  Avatar,
  Tooltip,
  Group,
  Text,
  Indicator,
  Stack,
} from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";

/**
 * @typedef {Object} PresenceUser
 * @property {string} odne - User ID (presence document ID)
 * @property {string} displayName - User's display name
 * @property {string | null} photoURL - User's photo URL
 * @property {string} color - User's assigned color
 * @property {boolean} isTyping - Whether user is typing
 */

/**
 * Single user avatar with presence indicator
 * @param {{ user: PresenceUser }} props
 */
function UserAvatar({ user }) {
  return (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="sm" fw={500}>{user.displayName}</Text>
          {user.isTyping && (
            <Text size="xs" c="dimmed">Typing...</Text>
          )}
        </Stack>
      }
      position="bottom"
      withArrow
    >
      <Indicator
        inline
        size={12}
        offset={2}
        position="bottom-end"
        color={user.isTyping ? "green" : "gray"}
        processing={user.isTyping}
        disabled={!user.isTyping}
      >
        <Avatar
          src={user.photoURL}
          alt={user.displayName}
          size="sm"
          radius="xl"
          style={{
            border: `2px solid ${user.color}`,
          }}
        >
          {user.displayName?.charAt(0)?.toUpperCase() || '?'}
        </Avatar>
      </Indicator>
    </Tooltip>
  );
}

/**
 * Overflow indicator for many users
 * @param {{ count: number, users: PresenceUser[] }} props
 */
function OverflowAvatar({ count, users }) {
  const names = users.map(u => u.displayName).join(', ');
  
  return (
    <Tooltip label={names} position="bottom" withArrow>
      <Avatar
        size="sm"
        radius="xl"
        color="gray"
      >
        +{count}
      </Avatar>
    </Tooltip>
  );
}

/**
 * PresenceAvatars component - shows all active users
 * @param {{ users: PresenceUser[], maxVisible?: number }} props
 */
export function PresenceAvatars({ users, maxVisible = 5 }) {
  if (!users || users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const overflowUsers = users.slice(maxVisible);
  const typingCount = users.filter(u => u.isTyping).length;

  return (
    <Group gap="xs">
      {/* Typing indicator text */}
      {typingCount > 0 && (
        <Group gap={4}>
          <IconPencil size={14} color="gray" />
          <Text size="xs" c="dimmed">
            {typingCount === 1 
              ? `${users.find(u => u.isTyping)?.displayName} is typing...`
              : `${typingCount} people typing...`
            }
          </Text>
        </Group>
      )}
      
      {/* User avatars */}
      <Avatar.Group spacing="sm">
        {visibleUsers.map((user) => (
          <UserAvatar key={user.odne} user={user} />
        ))}
        
        {overflowUsers.length > 0 && (
          <OverflowAvatar count={overflowUsers.length} users={overflowUsers} />
        )}
      </Avatar.Group>
    </Group>
  );
}

/**
 * Cursor overlay component for showing other users' cursors in the editor
 * This is a more advanced feature that requires integration with TipTap
 * 
 * @param {{ user: PresenceUser, position: { top: number, left: number } }} props
 */
export function CursorOverlay({ user, position }) {
  if (!position) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* Cursor line */}
      <div
        style={{
          width: 2,
          height: 20,
          backgroundColor: user.color,
          borderRadius: 1,
        }}
      />
      
      {/* User name label */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: 0,
          backgroundColor: user.color,
          color: 'white',
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {user.displayName}
      </div>
    </div>
  );
}

/**
 * Selection highlight for showing other users' selections
 * 
 * @param {{ user: PresenceUser, rects: DOMRect[] }} props
 */
export function SelectionHighlight({ user, rects }) {
  if (!rects || rects.length === 0) return null;

  return (
    <>
      {rects.map((rect, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            backgroundColor: user.color,
            opacity: 0.2,
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      ))}
    </>
  );
}
