/**
 * Framework Authentication Provider
 * 
 * Handles authentication AND automatic membership management.
 * Every app should wrap their content with this component.
 * 
 * Features:
 * - Shows sign-in/sign-up screen when unauthenticated
 * - Automatically creates/updates app membership records
 * - Blocks access to invite-only apps
 * - Shows loading states properly
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
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../core/firebase-init.js";
import { useAuth } from "../hooks/useAuth.js";
import { useAppMembership } from "../hooks/useAppMembership.js";
import { getAppIdFromURL } from "../loader/url-parser.js";

/**
 * Helper: Ensure user profile exists in Firestore
 * Auto-creates profile if it doesn't exist
 */
async function ensureUserProfile(user) {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new user profile
    const profile = {
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      bio: null,
      role: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);
    console.log('✅ Created user profile for', user.email);
  }
}

export function AuthProvider({ children, appId }) {
  const { user, loading: authLoading } = useAuth();
  
  // Get appId from URL if not provided
  const effectiveAppId = appId || getAppIdFromURL();
  
  // Ensure user profile exists whenever user is authenticated
  React.useEffect(() => {
    if (user && !authLoading) {
      ensureUserProfile(user).catch(err => {
        console.error('Failed to ensure user profile:', err);
      });
    }
  }, [user, authLoading]);
  
  // Use membership hook to manage app access
  const { membership, loading: membershipLoading, error: membershipError, hasAccess } = useAppMembership(effectiveAppId);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Container size="xs" py="xl">
        <Text ta="center">Loading...</Text>
      </Container>
    );
  }

  // Show sign-in screen if not authenticated
  if (!user) {
    return <AuthScreen />;
  }

  // Show loading while checking membership
  if (membershipLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f8f9fa',
        color: '#495057',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e9ecef',
          borderTopColor: '#228be6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem',
        }}></div>
        <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>
          Checking access...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show error if membership check failed or access denied
  if (membershipError || !hasAccess) {
    const errorMessage = membershipError?.message || 'Access denied. You do not have permission to access this app.';
    const isInviteOnly = errorMessage.includes('invitation') || errorMessage.includes('invite');
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f8f9fa',
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: '600px',
          padding: '2rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{
            color: '#fa5252',
            margin: '0 0 1rem',
            fontSize: '1.5rem',
          }}>
            {isInviteOnly ? 'Access Restricted' : 'Error Loading App'}
          </h1>
          <p style={{
            color: '#495057',
            margin: '0 0 1rem',
            lineHeight: '1.6',
          }}>
            {errorMessage}
          </p>
          {isInviteOnly && (
            <p style={{
              color: '#868e96',
              margin: '0 0 1rem',
              fontSize: '0.875rem',
              lineHeight: '1.6',
            }}>
              Please contact the app owner to request access. Your user ID: <code>{user?.uid}</code>
            </p>
          )}
          <Button onClick={() => signOut(auth)} variant="subtle">
            Sign Out
          </Button>
          {membershipError && (
            <details style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '4px',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                Technical Details
              </summary>
              <pre style={{
                margin: '1rem 0 0',
                padding: '0',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                color: '#212529',
              }}>
                {membershipError.stack || membershipError.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // User is authenticated and has access - render the app!
  console.log(`✅ User has access to app "${effectiveAppId}" (role: ${membership?.role}, tier: ${membership?.tier})`);
  return <>{children}</>;
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
      let userCredential;
      if (mode === "signup") {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      
      // Ensure user profile exists in Firestore
      await ensureUserProfile(userCredential.user);
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
      
      // Ensure user profile exists in Firestore
      await ensureUserProfile(result.user);
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

