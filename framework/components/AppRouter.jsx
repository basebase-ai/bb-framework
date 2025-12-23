/**
 * AppRouter - Unified routing and authentication for Basebase apps
 * 
 * Provides:
 * - Simple declarative routing with path patterns
 * - Integrated authentication (replaces AuthProvider)
 * - Auth-required routes with automatic sign-in prompt
 * - Route parameters and query string access via useRoute()
 * 
 * @example
 * // Basic usage
 * const routes = [
 *   { path: "/", component: Home },
 *   { path: "/post/:slug", component: PostView },
 *   { path: "/edit/:slug?", component: PostEditor, auth: true },
 *   { path: "*", component: NotFound },
 * ];
 * 
 * function App() {
 *   return (
 *     <MantineProvider>
 *       <AppRouter appId="my-app" routes={routes} />
 *     </MantineProvider>
 *   );
 * }
 * 
 * @example
 * // With layout wrapper
 * function App() {
 *   return (
 *     <AppRouter appId="my-app" routes={routes}>
 *       <MyLayout>
 *         <RouteContent />
 *       </MyLayout>
 *     </AppRouter>
 *   );
 * }
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Text, Modal, Tabs, Button, Stack, Alert, Divider, TextInput, PasswordInput, PinInput, Group } from "@mantine/core";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../core/firebase-init.js";
import { useAuth, AuthModalContext } from "../hooks/useAuth.js";
import { useAppMembership } from "../hooks/useAppMembership.js";
import { RouteContext, matchPath, parseQueryString, buildQueryString } from "../hooks/useRoute.js";

/**
 * @typedef {Object} RouteDefinition
 * @property {string} path - URL pattern (e.g., "/post/:slug", "/edit/:id?", "/*")
 * @property {React.ComponentType<any>} component - Component to render
 * @property {boolean} [auth] - Whether route requires authentication (default: false)
 */

/**
 * @typedef {Object} AppRouterProps
 * @property {string} appId - App ID for membership management
 * @property {RouteDefinition[]} routes - Array of route definitions
 * @property {React.ReactNode} [landing] - Full-page component shown when auth required but not logged in
 * @property {React.ReactNode} [notFound] - Component shown when no route matches
 * @property {React.ReactNode} [children] - Optional layout wrapper (should contain <RouteContent />)
 */

/**
 * Check if user is verified (email verified OR phone auth)
 * @param {import('firebase/auth').User | null} user
 * @returns {boolean}
 */
function isUserVerified(user) {
  if (!user) return false;
  return !!user.phoneNumber || user.emailVerified === true;
}

/**
 * Ensure user profile exists in Firestore
 * @param {import('firebase/auth').User} user
 */
async function ensureUserProfile(user) {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    /** @type {Record<string, unknown>} */
    const profile = {
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      displayName: user.displayName || user.email?.split('@')[0] || user.phoneNumber || 'User',
      photoURL: user.photoURL || null,
      bio: null,
      role: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, profile);
  }
}

// Route content context for nested layouts
const RouteContentContext = React.createContext(/** @type {React.ReactNode} */ (null));

/**
 * Renders the matched route content
 * Use inside AppRouter children to place route content within a layout
 */
export function RouteContent() {
  const content = React.useContext(RouteContentContext);
  return /** @type {React.ReactElement} */ (content);
}

/**
 * @param {AppRouterProps} props
 */
export function AppRouter({ appId, routes, landing, notFound, children }) {
  const { user, loading: authLoading } = useAuth();
  const [path, setPath] = useState(window.location.pathname);
  const [query, setQuery] = useState(() => parseQueryString(window.location.search));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profileEnsured, setProfileEnsured] = useState(false);
  
  const verified = isUserVerified(user);
  
  // Ensure user profile exists
  useEffect(() => {
    if (user && verified && !authLoading && !profileEnsured) {
      setProfileEnsured(true);
      ensureUserProfile(user).catch(err => {
        console.error('Failed to ensure user profile:', err);
      });
    }
  }, [user?.uid, verified, authLoading, profileEnsured]);
  
  // Use membership hook (only when verified)
  const { loading: membershipLoading, error: membershipError, hasAccess } = useAppMembership(
    verified ? appId : null
  );
  
  // Listen for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
      setQuery(parseQueryString(window.location.search));
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  
  // Navigation functions
  const navigate = useCallback((/** @type {string} */ newPath, options = {}) => {
    const queryStr = options.query ? buildQueryString(options.query) : "";
    const fullPath = newPath + queryStr;
    
    if (options.replace) {
      window.history.replaceState({}, "", fullPath);
    } else {
      window.history.pushState({}, "", fullPath);
    }
    setPath(newPath);
    setQuery(options.query || {});
  }, []);
  
  const replace = useCallback((/** @type {string} */ newPath, options = {}) => {
    navigate(newPath, { ...options, replace: true });
  }, [navigate]);
  
  const back = useCallback(() => window.history.back(), []);
  const forward = useCallback(() => window.history.forward(), []);
  
  // Match current path to route
  const matchedRoute = useMemo(() => {
    for (const route of routes) {
      const { match, params } = matchPath(route.path, path);
      if (match) {
        return { route, params };
      }
    }
    return null;
  }, [routes, path]);
  
  // Prompt sign-in callback
  const promptSignIn = useCallback(() => {
    setShowAuthModal(true);
  }, []);
  
  // Close modal when user signs in
  useEffect(() => {
    if (user && verified) {
      setShowAuthModal(false);
    }
  }, [user, verified]);
  
  // Build route context value
  const routeContextValue = useMemo(() => ({
    path,
    params: matchedRoute?.params || {},
    query,
    navigate,
    replace,
    back,
    forward,
  }), [path, matchedRoute?.params, query, navigate, replace, back, forward]);
  
  // Determine what to render
  let content;
  
  // Still loading auth
  if (authLoading) {
    content = (
      <Container size="xs" py="xl">
        <Text ta="center">Loading...</Text>
      </Container>
    );
  }
  // User signed in but not verified
  else if (user && !verified) {
    content = <VerificationPendingScreen user={user} />;
  }
  // Check membership (only for verified users)
  else if (user && verified && membershipLoading) {
    content = (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f8f9fa',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e9ecef',
          borderTopColor: '#228be6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
        <Text mt="md">Checking access...</Text>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  // Membership error or no access
  else if (user && verified && (membershipError || !hasAccess)) {
    content = <AccessDeniedScreen error={membershipError} userId={user.uid} />;
  }
  // Route matching and rendering
  else {
    if (!matchedRoute) {
      // No route matched
      content = notFound || <DefaultNotFound />;
    } else {
      const { route, params } = matchedRoute;
      
      // Check if route requires auth
      if (route.auth && !user) {
        // Show landing page if provided, otherwise prompt auth
        if (landing) {
          content = landing;
        } else {
          // Show auth modal and render a placeholder
          if (!showAuthModal) {
            setShowAuthModal(true);
          }
          content = (
            <Container size="sm" py="xl">
              <Text ta="center" c="dimmed">Please sign in to access this page.</Text>
            </Container>
          );
        }
      } else {
        // Render the matched component
        const Component = route.component;
        content = <Component />;
      }
    }
  }
  
  // Wrap content in layout if children provided
  const wrappedContent = children ? (
    <RouteContentContext.Provider value={content}>
      {children}
    </RouteContentContext.Provider>
  ) : content;
  
  return (
    <AuthModalContext.Provider value={{ promptSignIn }}>
      <RouteContext.Provider value={routeContextValue}>
        {wrappedContent}
        <AuthModal 
          opened={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </RouteContext.Provider>
    </AuthModalContext.Provider>
  );
}

// ============================================================================
// Supporting Components
// ============================================================================

function DefaultNotFound() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="md">
        <Text size="xl" fw={700}>404</Text>
        <Text c="dimmed">Page not found</Text>
      </Stack>
    </Container>
  );
}

/**
 * @param {{ error: Error | null, userId: string }} props
 */
function AccessDeniedScreen({ error, userId }) {
  const errorMessage = error?.message || 'Access denied. You do not have permission to access this app.';
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
        <Text size="xl" fw={700} c="red" mb="md">
          {isInviteOnly ? 'Access Restricted' : 'Error Loading App'}
        </Text>
        <Text mb="md">{errorMessage}</Text>
        {isInviteOnly && (
          <Text size="sm" c="dimmed" mb="md">
            Please contact the app owner to request access. Your user ID: <code>{userId}</code>
          </Text>
        )}
        <Button onClick={() => signOut(auth)} variant="subtle">
          Sign Out
        </Button>
      </div>
    </div>
  );
}

/**
 * @param {{ user: import('firebase/auth').User }} props
 */
function VerificationPendingScreen({ user }) {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const handleResendVerification = async () => {
    setResending(true);
    setError(null);
    try {
      await sendEmailVerification(user);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    setChecking(true);
    setError(null);
    try {
      await user.reload();
      await user.getIdToken(true);
      if (user.emailVerified) {
        window.location.reload();
      } else {
        setError('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Stack gap="md" p="xl" style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Text size="xl" fw={700} ta="center">Verify Your Email</Text>
        <Text c="dimmed" ta="center">
          We sent a verification email to <strong>{user.email}</strong>. 
          Please check your inbox and click the verification link.
        </Text>
        
        {error && <Alert color="red">{error}</Alert>}
        {resent && <Alert color="green">Verification email sent!</Alert>}
        
        <Button onClick={handleRefresh} loading={checking}>
          I've Verified My Email
        </Button>
        <Button variant="light" onClick={handleResendVerification} loading={resending}>
          Resend Verification Email
        </Button>
        <Divider />
        <Button variant="subtle" onClick={() => signOut(auth)}>
          Sign Out
        </Button>
      </Stack>
    </Container>
  );
}

/**
 * Auth Modal - Sign in/up dialog
 * @param {{ opened: boolean, onClose: () => void }} props
 */
function AuthModal({ opened, onClose }) {
  const [activeTab, setActiveTab] = useState(/** @type {string | null} */ ("email"));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);
      onClose();
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : "An error occurred";
      if (err instanceof Error && "code" in err) {
        const code = /** @type {string} */ (err.code);
        if (code === "auth/popup-closed-by-user") {
          errorMessage = "Sign-in popup was closed. Please try again.";
        } else if (code === "auth/unauthorized-domain") {
          errorMessage = "This domain is not authorized for Google Sign-In.";
        } else if (code === "auth/popup-blocked") {
          errorMessage = "Popup was blocked by your browser.";
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!opened) setError(null);
  }, [opened]);

  return (
    <Modal opened={opened} onClose={onClose} title="Welcome" centered size="sm">
      <Text c="dimmed" size="sm" ta="center" mb="md">
        Sign in or create an account to continue.
      </Text>

      {error && (
        <Alert color="red" mb="md" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List grow mb="md">
          <Tabs.Tab value="email">Email</Tabs.Tab>
          <Tabs.Tab value="phone">Phone</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="email">
          <EmailAuthForm setError={setError} setLoading={setLoading} loading={loading} />
        </Tabs.Panel>

        <Tabs.Panel value="phone">
          <PhoneAuthForm setError={setError} setLoading={setLoading} loading={loading} />
        </Tabs.Panel>
      </Tabs>

      <Divider label="or" labelPosition="center" my="lg" />

      <Button variant="outline" fullWidth onClick={handleGoogleAuth} disabled={loading}>
        Continue with Google
      </Button>
    </Modal>
  );
}

/**
 * @param {{ setError: (err: string | null) => void, setLoading: (loading: boolean) => void, loading: boolean }} props
 */
function EmailAuthForm({ setError, setLoading, loading }) {
  const [mode, setMode] = useState(/** @type {"signin" | "signup" | "forgot"} */ ("signin"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleEmailAuth = async (/** @type {React.FormEvent} */ e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await userCredential.user.reload();
        await userCredential.user.getIdToken(true);
        if (!userCredential.user.emailVerified) {
          await sendEmailVerification(userCredential.user);
        }
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password.';
        } else if (code === 'auth/email-already-in-use') {
          errorMessage = 'An account with this email already exists.';
        } else if (code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Use at least 6 characters.';
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (/** @type {React.FormEvent} */ e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (mode === "forgot") {
    if (resetEmailSent) {
      return (
        <Stack gap="md">
          <Alert color="green">Password reset link sent to <strong>{email}</strong>.</Alert>
          <Button variant="light" onClick={() => { setMode("signin"); setResetEmailSent(false); }}>
            Back to Sign In
          </Button>
        </Stack>
      );
    }
    return (
      <form onSubmit={handleForgotPassword}>
        <Stack gap="md">
          <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
          <Button type="submit" loading={loading}>Send Reset Link</Button>
          <Text size="sm" ta="center">
            Remember your password?{" "}
            <Text component="button" type="button" onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: "var(--mantine-color-blue-6)", cursor: "pointer", textDecoration: "underline" }}>
              Sign in
            </Text>
          </Text>
        </Stack>
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailAuth}>
      <Stack gap="md">
        <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        <PasswordInput label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        
        {mode === "signin" && (
          <Text size="xs" ta="right" mt={-8}>
            <Text component="button" type="button" onClick={() => setMode("forgot")} style={{ background: "none", border: "none", color: "var(--mantine-color-dimmed)", cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}>
              Forgot password?
            </Text>
          </Text>
        )}
        
        <Button type="submit" loading={loading}>
          {mode === "signin" ? "Sign In" : "Create Account"}
        </Button>
        
        <Text size="sm" ta="center">
          {mode === "signin" ? (
            <>Don't have an account?{" "}<Text component="button" type="button" onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "var(--mantine-color-blue-6)", cursor: "pointer", textDecoration: "underline" }}>Sign up</Text></>
          ) : (
            <>Already have an account?{" "}<Text component="button" type="button" onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: "var(--mantine-color-blue-6)", cursor: "pointer", textDecoration: "underline" }}>Sign in</Text></>
          )}
        </Text>
      </Stack>
    </form>
  );
}

/**
 * @param {{ setError: (err: string | null) => void, setLoading: (loading: boolean) => void, loading: boolean }} props
 */
function PhoneAuthForm({ setError, setLoading, loading }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(/** @type {import('firebase/auth').ConfirmationResult | null} */ (null));
  const [codeSent, setCodeSent] = useState(false);
  const recaptchaContainerRef = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  const recaptchaVerifierRef = React.useRef(/** @type {RecaptchaVerifier | null} */ (null));

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  const setupRecaptcha = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
    }
    if (recaptchaContainerRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => setError('reCAPTCHA expired. Please try again.')
      });
    }
  }, [setError]);

  const handleSendCode = async (/** @type {React.FormEvent} */ e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+1' + formattedPhone.replace(/\D/g, '');
      }
      setupRecaptcha();
      if (!recaptchaVerifierRef.current) throw new Error('reCAPTCHA not initialized');
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setCodeSent(true);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to send code';
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === 'auth/invalid-phone-number') {
          errorMessage = 'Invalid phone number. Include country code (e.g., +1).';
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (/** @type {React.FormEvent} */ e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!confirmationResult) throw new Error('No confirmation result.');
      const result = await confirmationResult.confirm(verificationCode);
      await ensureUserProfile(result.user);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === 'auth/invalid-verification-code') {
          errorMessage = 'Invalid verification code.';
        } else if (code === 'auth/code-expired') {
          errorMessage = 'Code expired. Please request a new one.';
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (codeSent) {
    return (
      <form onSubmit={handleVerifyCode}>
        <Stack gap="md">
          <Text size="sm" c="dimmed" ta="center">Enter the 6-digit code sent to {phoneNumber}</Text>
          <Group justify="center">
            <PinInput length={6} type="number" value={verificationCode} onChange={setVerificationCode} disabled={loading} size="lg" />
          </Group>
          <Button type="submit" loading={loading} disabled={verificationCode.length !== 6}>Verify Code</Button>
          <Button variant="subtle" onClick={() => { setCodeSent(false); setVerificationCode(""); setConfirmationResult(null); }} disabled={loading}>
            Use a different number
          </Button>
        </Stack>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode}>
      <Stack gap="md">
        <TextInput label="Phone Number" placeholder="+1 (555) 123-4567" type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={loading} description="Include country code" />
        <Button type="submit" loading={loading}>Send Verification Code</Button>
        <div ref={recaptchaContainerRef} id="recaptcha-container-router"></div>
      </Stack>
    </form>
  );
}

// Re-export SignOutButton for convenience
export { signOut };
export function SignOutButton(props) {
  const [loading, setLoading] = useState(false);
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };
  return <Button onClick={handleSignOut} loading={loading} variant="subtle" {...props}>Sign Out</Button>;
}

