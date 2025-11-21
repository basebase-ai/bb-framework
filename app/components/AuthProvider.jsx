/**
 * Authentication UI components
 */

import React, { useState } from "react";
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Group,
  Divider,
  Alert,
} from "@mantine/core";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../framework/core/firebase-init.js";
import { useAuth } from "../../framework/hooks/useAuth.js";

export function AuthProvider({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Container size="xs" py="xl">
        <Text ta="center">Loading...</Text>
      </Container>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return children;
}

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      console.log("Starting Google sign-in...");
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful:", result.user);
    } catch (err) {
      console.error("Google sign-in error:", err);
      
      // Provide more user-friendly error messages
      let errorMessage = err.message;
      
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed. Please try again.";
      } else if (err.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized for Google Sign-In. Add it in Firebase Console > Authentication > Settings > Authorized domains.";
      } else if (err.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Title order={2} ta="center" mb="md">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          {mode === "signin"
            ? "Welcome back! Sign in to access your apps."
            : "Create an account to start building apps."}
        </Text>

        {error && (
          <Alert color="red" mb="md" title="Error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleEmailAuth}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <Button type="submit" fullWidth loading={loading}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </Stack>
        </form>

        <Divider label="or" labelPosition="center" my="lg" />

        <Button
          variant="outline"
          fullWidth
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          Continue with Google
        </Button>

        <Text size="sm" ta="center" mt="lg">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <Text
                component="button"
                onClick={() => setMode("signup")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--mantine-color-blue-6)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Sign up
              </Text>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Text
                component="button"
                onClick={() => setMode("signin")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--mantine-color-blue-6)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Sign in
              </Text>
            </>
          )}
        </Text>
      </Paper>
    </Container>
  );
}

// Sign out button component
export function SignOutButton({ ...props }) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSignOut} loading={loading} variant="subtle" {...props}>
      Sign Out
    </Button>
  );
}

