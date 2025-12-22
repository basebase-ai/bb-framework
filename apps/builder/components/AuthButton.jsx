/**
 * AuthButton - Consistent auth UI for header/top-right corner
 * Shows "Sign in" button when unauthenticated, or avatar + name when authenticated
 */

import React from "react";
import { Group, Avatar, Text, Button } from "@mantine/core";

/**
 * @typedef {Object} AuthButtonProps
 * @property {import('firebase/auth').User | null} [user] - Current user
 * @property {{ displayName?: string | null, photoURL?: string | null } | null} [profile] - User profile
 * @property {() => void} [onSignIn] - Called when "Sign in" button is clicked
 * @property {() => void} [onProfileClick] - Called when avatar/name is clicked
 */

/**
 * @param {AuthButtonProps} props
 */
export function AuthButton({ user, profile, onSignIn, onProfileClick }) {
  if (user) {
    const displayName = profile?.displayName || user.email || "User";

    return (
      <Group
        gap="xs"
        style={{ cursor: "pointer" }}
        onClick={onProfileClick}
      >
        <Avatar
          src={profile?.photoURL}
          alt={displayName}
          size="sm"
          radius="xl"
          color="blue"
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Text size="sm" c="dark">
          {displayName}
        </Text>
      </Group>
    );
  }

  return (
    <Button
      variant="light"
      color="blue"
      size="xs"
      onClick={onSignIn}
    >
      Sign in
    </Button>
  );
}

