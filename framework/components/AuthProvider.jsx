/**
 * Framework Authentication Provider
 * 
 * Handles authentication AND automatic membership management.
 * Every app should wrap their content with this component.
 * 
 * SECURITY: Requires verified identity (email or phone) before granting access.
 * - Email/password users must verify their email
 * - Phone users are verified via SMS code
 * - Google users are pre-verified by Google
 * 
 * Features:
 * - Shows sign-in/sign-up screen when unauthenticated
 * - Enforces email/phone verification before access
 * - Supports custom landing pages for unauthenticated users
 * - Automatically creates/updates app membership records
 * - Blocks access to invite-only apps
 * - Shows loading states properly
 * 
 * @example
 * // Basic usage (shows default sign-in screen)
 * <AuthProvider>
 *   <AppContent />
 * </AuthProvider>
 * 
 * @example
 * // With custom landing page
 * <AuthProvider landingPage={(props) => <MyLandingPage {...props} />}>
 *   <AppContent />
 * </AuthProvider>
 * 
 * // Your landing page receives { onSignIn } prop
 * function MyLandingPage({ onSignIn }) {
 *   return (
 *     <div>
 *       <h1>Welcome to My App</h1>
 *       <Button onClick={onSignIn}>Get Started</Button>
 *     </div>
 *   );
 * }
 */

import React, { useState, useEffect, useCallback } from "react";
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
  Modal,
  PinInput,
  Tabs,
} from "@mantine/core";
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
import { getAppIdFromURL } from "../loader/url-parser.js";

/**
 * Check if user is verified (email verified OR phone auth)
 * @param {import('firebase/auth').User | null} user
 * @returns {boolean}
 */
function isUserVerified(user) {
  if (!user) {
    console.log('🔐 [isUserVerified] No user');
    return false;
  }
  
  const hasPhone = !!user.phoneNumber;
  const hasVerifiedEmail = user.emailVerified === true;
  const isVerified = hasPhone || hasVerifiedEmail;
  
  console.log('🔐 [isUserVerified]', {
    uid: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber,
    emailVerified: user.emailVerified,
    hasPhone,
    hasVerifiedEmail,
    isVerified,
  });
  
  return isVerified;
}

/**
 * Helper: Ensure user profile exists in Firestore
 * Auto-creates profile if it doesn't exist
 * @param {import('firebase/auth').User} user
 */
async function ensureUserProfile(user) {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new user profile
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
    console.log('✅ Created user profile for', user.email || user.phoneNumber);
  }
}

/**
 * @typedef {Object} LandingPageProps
 * @property {() => void} onSignIn - Callback to trigger the sign-in modal
 */

/**
 * @typedef {Object} AuthProviderProps
 * @property {React.ReactNode} children - App content to render when authenticated
 * @property {string} [appId] - Optional app ID (defaults to URL-based detection)
 * @property {(props: LandingPageProps) => React.ReactNode} [landingPage] - Optional custom landing page component
 */

/**
 * @param {AuthProviderProps} props
 */
export function AuthProvider({ children, appId, landingPage }) {
  const { user, loading: authLoading } = useAuth();
  const [profileEnsured, setProfileEnsured] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Get appId from URL if not provided
  const effectiveAppId = appId || getAppIdFromURL();
  
  // Stable callback for prompting sign-in from anywhere in the app
  const promptSignIn = useCallback(() => {
    setShowAuthModal(true);
  }, []);
  
  // Check if user is verified
  const verified = isUserVerified(user);
  
  console.log('🔐 [AuthProvider] State:', { 
    hasUser: !!user, 
    verified, 
    authLoading,
    effectiveAppId,
  });
  
  // Ensure user profile exists once when user is authenticated AND verified
  useEffect(() => {
    if (user && verified && !authLoading && !profileEnsured) {
      setProfileEnsured(true);
      ensureUserProfile(user).catch(err => {
        console.error('Failed to ensure user profile:', err);
      });
    }
  }, [user?.uid, verified, authLoading, profileEnsured]);
  
  // Close auth modal when user signs in and is verified
  useEffect(() => {
    if (user && verified) {
      setShowAuthModal(false);
    }
  }, [user, verified]);
  
  // Use membership hook to manage app access (only when verified)
  const { membership, loading: membershipLoading, error: membershipError, hasAccess } = useAppMembership(
    verified ? effectiveAppId : null
  );

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
    // If a custom landing page is provided, render it with auth modal support
    if (landingPage) {
      return (
        <AuthModalContext.Provider value={{ promptSignIn }}>
          {landingPage({ onSignIn: promptSignIn })}
          <AuthModal 
            opened={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        </AuthModalContext.Provider>
      );
    }
    // Otherwise, show the default full-screen auth screen
    return <AuthScreen />;
  }

  // User is authenticated but NOT verified - show verification screen
  if (!verified) {
    return <VerificationPendingScreen user={user} />;
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

  // User is authenticated, verified, and has access - render the app!
  console.log(`✅ User has access to app "${effectiveAppId}" (role: ${membership?.role}, tier: ${membership?.tier})`);
  return (
    <AuthModalContext.Provider value={{ promptSignIn }}>
      {children}
    </AuthModalContext.Provider>
  );
}

/**
 * Verification Pending Screen - shown when user has signed up but not verified email
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
      console.error('Failed to resend verification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    setChecking(true);
    setError(null);
    try {
      // Reload user data from Firebase to get updated emailVerified status
      await user.reload();
      // Force token refresh to update the auth token claims
      await user.getIdToken(true);
      
      // Check if now verified
      if (user.emailVerified) {
        // Reload the page to proceed with the app
        window.location.reload();
      } else {
        setError('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      console.error('Failed to check verification status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Title order={2} ta="center" mb="md">
          Verify Your Email
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          We sent a verification email to <strong>{user.email}</strong>. 
          Please check your inbox and click the verification link.
        </Text>

        {error && (
          <Alert color="red" mb="md" title="Error">
            {error}
          </Alert>
        )}

        {resent && (
          <Alert color="green" mb="md" title="Email Sent">
            Verification email has been resent. Please check your inbox.
          </Alert>
        )}

        <Stack gap="md">
          <Button 
            onClick={handleRefresh} 
            fullWidth
            loading={checking}
          >
            I've Verified My Email
          </Button>

          <Button 
            variant="light" 
            onClick={handleResendVerification} 
            loading={resending}
            disabled={checking}
            fullWidth
          >
            Resend Verification Email
          </Button>

          <Divider my="sm" />

          <Button 
            variant="subtle" 
            onClick={() => signOut(auth)} 
            fullWidth
            disabled={checking || resending}
          >
            Sign Out
          </Button>
        </Stack>

        <Text size="xs" c="dimmed" ta="center" mt="lg">
          Can't find the email? Check your spam folder.
        </Text>
      </Paper>
    </Container>
  );
}

/**
 * Main Auth Screen with Email, Phone, and Google sign-in options
 */
function AuthScreen() {
  const [activeTab, setActiveTab] = useState(/** @type {string | null} */ ("email"));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      console.log("Starting Google sign-in...");
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful:", result.user);
      
      // Google users are already verified, create profile immediately
      await ensureUserProfile(result.user);
    } catch (err) {
      console.error("Google sign-in error:", err);
      
      let errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === "auth/popup-closed-by-user") {
          errorMessage = "Sign-in popup was closed. Please try again.";
        } else if (code === "auth/unauthorized-domain") {
          errorMessage = "This domain is not authorized for Google Sign-In. Add it in Firebase Console > Authentication > Settings > Authorized domains.";
        } else if (code === "auth/popup-blocked") {
          errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
        }
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
          Welcome
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Sign in or create an account to continue.
        </Text>

        {error && (
          <Alert color="red" mb="md" title="Error" onClose={() => setError(null)} withCloseButton>
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

        <Button
          variant="outline"
          fullWidth
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          Continue with Google
        </Button>
      </Paper>
    </Container>
  );
}

/**
 * Email authentication form
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
      /** @type {import('firebase/auth').UserCredential} */
      let userCredential;
      if (mode === "signup") {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Send verification email for new accounts
        await sendEmailVerification(userCredential.user);
        console.log('📧 Verification email sent to', email);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        console.log('🔐 [EmailAuth] Before reload - emailVerified:', userCredential.user.emailVerified);
        
        // Reload user to get latest data (including emailVerified status)
        // and force token refresh to update the auth token claims
        // This is critical because Firebase caches these values
        await userCredential.user.reload();
        
        console.log('🔐 [EmailAuth] After reload - emailVerified:', userCredential.user.emailVerified);
        
        // Force token refresh
        const token = await userCredential.user.getIdToken(true);
        
        // Decode token to verify claims (for debugging)
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔐 [EmailAuth] Token claims:', {
          email_verified: tokenPayload.email_verified,
          email: tokenPayload.email,
          phone_number: tokenPayload.phone_number,
        });
        
        // If existing user hasn't verified, resend verification email
        if (!userCredential.user.emailVerified) {
          await sendEmailVerification(userCredential.user);
          console.log('📧 Verification email resent to', email);
        }
      }
    } catch (err) {
      console.error('Email auth error:', err);
      let errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password. Please try again.';
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
      console.log('📧 Password reset email sent to', email);
    } catch (err) {
      console.error('Password reset error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email address.';
        } else if (code === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid email address.';
        } else if (code === 'auth/too-many-requests') {
          errorMessage = 'Too many attempts. Please try again later.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password mode
  if (mode === "forgot") {
    if (resetEmailSent) {
      return (
        <Stack gap="md">
          <Alert color="green" title="Check your email">
            We've sent a password reset link to <strong>{email}</strong>. 
            Click the link in the email to reset your password.
          </Alert>
          <Button 
            variant="light" 
            fullWidth 
            onClick={() => {
              setMode("signin");
              setResetEmailSent(false);
            }}
          >
            Back to Sign In
          </Button>
        </Stack>
      );
    }

    return (
      <form onSubmit={handleForgotPassword}>
        <Stack gap="md">
          <Text size="sm" c="dimmed" ta="center">
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <TextInput
            label="Email"
            placeholder="your@email.com"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Button type="submit" fullWidth loading={loading}>
            Send Reset Link
          </Button>

          <Text size="sm" ta="center">
            Remember your password?{" "}
            <Text
              component="button"
              type="button"
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
          </Text>
        </Stack>
      </form>
    );
  }

  return (
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

        {mode === "signin" && (
          <Text size="xs" ta="right" mt={-8}>
            <Text
              component="button"
              type="button"
              onClick={() => setMode("forgot")}
              style={{
                background: "none",
                border: "none",
                color: "var(--mantine-color-dimmed)",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "inherit",
              }}
            >
              Forgot password?
            </Text>
          </Text>
        )}

        <Button type="submit" fullWidth loading={loading}>
          {mode === "signin" ? "Sign In" : "Create Account"}
        </Button>

        <Text size="sm" ta="center">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <Text
                component="button"
                type="button"
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
                type="button"
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
      </Stack>
    </form>
  );
}

/**
 * Phone authentication form with SMS verification
 * @param {{ setError: (err: string | null) => void, setLoading: (loading: boolean) => void, loading: boolean }} props
 */
function PhoneAuthForm({ setError, setLoading, loading }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(/** @type {import('firebase/auth').ConfirmationResult | null} */ (null));
  const [codeSent, setCodeSent] = useState(false);
  const recaptchaContainerRef = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  const recaptchaVerifierRef = React.useRef(/** @type {RecaptchaVerifier | null} */ (null));

  // Setup reCAPTCHA on mount
  useEffect(() => {
    return () => {
      // Cleanup reCAPTCHA on unmount
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
        callback: () => {
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          setError('reCAPTCHA expired. Please try again.');
        }
      });
    }
  }, [setError]);

  const handleSendCode = async (/** @type {React.FormEvent} */ e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Format phone number (ensure it starts with +)
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        // Assume US number if no country code
        formattedPhone = '+1' + formattedPhone.replace(/\D/g, '');
      }

      setupRecaptcha();
      
      if (!recaptchaVerifierRef.current) {
        throw new Error('reCAPTCHA not initialized');
      }

      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setCodeSent(true);
      console.log('📱 SMS code sent to', formattedPhone);
    } catch (err) {
      console.error('Phone auth error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === 'auth/invalid-phone-number') {
          errorMessage = 'Invalid phone number. Please include country code (e.g., +1 for US).';
        } else if (code === 'auth/too-many-requests') {
          errorMessage = 'Too many attempts. Please try again later.';
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
      if (!confirmationResult) {
        throw new Error('No confirmation result. Please request a new code.');
      }

      const result = await confirmationResult.confirm(verificationCode);
      console.log('✅ Phone verified:', result.user.phoneNumber);
      
      // Create user profile
      await ensureUserProfile(result.user);
    } catch (err) {
      console.error('Code verification error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
      
      if (err instanceof Error && 'code' in err) {
        const code = /** @type {string} */ (err.code);
        if (code === 'auth/invalid-verification-code') {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (code === 'auth/code-expired') {
          errorMessage = 'Verification code expired. Please request a new one.';
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
          <Text size="sm" c="dimmed" ta="center">
            Enter the 6-digit code sent to {phoneNumber}
          </Text>

          <Group justify="center">
            <PinInput
              length={6}
              type="number"
              value={verificationCode}
              onChange={setVerificationCode}
              disabled={loading}
              size="lg"
            />
          </Group>

          <Button type="submit" fullWidth loading={loading} disabled={verificationCode.length !== 6}>
            Verify Code
          </Button>

          <Button 
            variant="subtle" 
            fullWidth 
            onClick={() => {
              setCodeSent(false);
              setVerificationCode("");
              setConfirmationResult(null);
            }}
            disabled={loading}
          >
            Use a different number
          </Button>
        </Stack>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode}>
      <Stack gap="md">
        <TextInput
          label="Phone Number"
          placeholder="+1 (555) 123-4567"
          type="tel"
          required
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={loading}
          description="Include country code (e.g., +1 for US)"
        />

        <Button type="submit" fullWidth loading={loading}>
          Send Verification Code
        </Button>

        {/* Invisible reCAPTCHA container */}
        <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
      </Stack>
    </form>
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

/**
 * Auth Modal - Sign in/up dialog for use with custom landing pages
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
          errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!opened) {
      setError(null);
    }
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Welcome"
      centered
      size="sm"
    >
      <Text c="dimmed" size="sm" ta="center" mb="md">
        Sign in or create an account to continue.
      </Text>

      {error && (
        <Alert color="red" mb="md" title="Error" onClose={() => setError(null)} withCloseButton>
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

      <Button
        variant="outline"
        fullWidth
        onClick={handleGoogleAuth}
        disabled={loading}
      >
        Continue with Google
      </Button>
    </Modal>
  );
}
