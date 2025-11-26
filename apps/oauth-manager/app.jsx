/**
 * OAuth Manager App
 * 
 * Handles OAuth flows for all Basebase apps in a dedicated popup window.
 * This app is opened by other apps via window.open() and handles the
 * OAuth redirect, token exchange, and provides feedback to the user.
 */

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { 
  MantineProvider, 
  Container, 
  Stack, 
  Title, 
  Text, 
  Loader,
  Alert,
  Button,
  ThemeIcon,
  Center
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { 
  IconCheck, 
  IconX, 
  IconBrandGoogle, 
  IconBrandGithub 
} from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useFunction } from "../../framework/hooks/useFunction.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const providerConfig = {
  google: {
    name: "Google",
    icon: IconBrandGoogle,
    color: "blue",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  },
  microsoft: {
    name: "Microsoft",
    icon: IconBrandGoogle, // Using Google icon as placeholder
    color: "cyan",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  },
  github: {
    name: "GitHub",
    icon: IconBrandGithub,
    color: "dark",
    authUrl: "https://github.com/login/oauth/authorize",
  },
};

function AppContent() {
  const { user } = useAuth();
  const [status, setStatus] = useState('initializing');
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);
  
  const { call: exchangeCode } = useFunction("oauthExchange");

  useEffect(() => {
    if (!user) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const errorParam = urlParams.get("error");

    // Handle OAuth error
    if (errorParam) {
      setStatus('error');
      setError(`OAuth error: ${errorParam}`);
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'oauth-error', 
          error: errorParam 
        }, '*'); // Allow any origin for error messages
      }
      return;
    }

    // Handle OAuth callback (we have a code)
    if (code && state) {
      handleOAuthCallback(code, state);
      return;
    }

    // Initial state - check if we're initiating OAuth
    const initProvider = urlParams.get("provider");
    const scopes = urlParams.get("scopes");
    
    if (initProvider) {
      setProvider(initProvider);
      initiateOAuth(initProvider, scopes ? scopes.split(',') : []);
    } else {
      setStatus('error');
      setError('No provider specified');
    }
  }, [user]);

  const initiateOAuth = (providerName, scopes) => {
    const config = providerConfig[providerName];
    if (!config) {
      setStatus('error');
      setError(`Unsupported provider: ${providerName}`);
      return;
    }

    setStatus('authenticating');

    // Build state parameter
    const state = btoa(JSON.stringify({
      provider: providerName,
      userId: user.uid,
      redirectUri: window.location.origin,
      // Don't try to read opener.location.origin - causes cross-origin error
      // We'll use wildcard '*' for postMessage since we can't determine it
      timestamp: Date.now(),
    }));

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: import.meta.env[`VITE_${providerName === 'google' ? 'GMAIL' : providerName.toUpperCase()}_CLIENT_ID`] || `YOUR_${providerName.toUpperCase()}_CLIENT_ID`,
      redirect_uri: `${window.location.origin}/?app=oauth-manager`,
      response_type: "code",
      scope: scopes.join(" "),
      state,
    });

    // Provider-specific parameters
    if (providerName === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    } else if (providerName === 'microsoft') {
      params.set('response_mode', 'query');
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;
    window.location.href = authUrl;
  };

  const handleOAuthCallback = async (code, state) => {
    setStatus('exchanging');

    try {
      // Parse state
      const stateData = JSON.parse(atob(state));
      setProvider(stateData.provider);

      // Exchange code for tokens
      const result = await exchangeCode(
        {
          provider: stateData.provider,
          code,
          redirectUri: `${window.location.origin}/?app=oauth-manager`,
        },
        {
          appId: APP_ID, // Pass oauth-manager appId
        }
      );

      if (result.success) {
        setStatus('success');
        
        // Notify parent window
        if (window.opener) {
          // Use wildcard since we can't access opener.location.origin cross-origin
          window.opener.postMessage({ 
            type: 'oauth-success', 
            provider: stateData.provider 
          }, '*');
        }
      } else {
        throw new Error(result.error || 'Token exchange failed');
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setError(err.message);
      
      // Notify parent window
      if (window.opener) {
        // Use wildcard since we can't access opener.location.origin cross-origin
        window.opener.postMessage({ 
          type: 'oauth-error', 
          error: err.message 
        }, '*');
      }
    }
  };

  const config = provider ? providerConfig[provider] : null;
  const ProviderIcon = config?.icon || IconCheck;

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="xl">
        {/* Logo/Icon */}
        {config && (
          <ThemeIcon size={80} radius="xl" color={config.color} variant="light">
            <ProviderIcon size={48} />
          </ThemeIcon>
        )}

        {/* Title */}
        <Stack align="center" gap="xs">
          <Title order={2}>
            {config ? `Connect ${config.name}` : 'OAuth Manager'}
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            Basebase OAuth Authentication
          </Text>
        </Stack>

        {/* Status Display */}
        {status === 'initializing' && (
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Initializing...</Text>
          </Stack>
        )}

        {status === 'authenticating' && (
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Redirecting to {config?.name}...</Text>
          </Stack>
        )}

        {status === 'exchanging' && (
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Completing authentication...</Text>
          </Stack>
        )}

        {status === 'success' && (
          <Alert 
            icon={<IconCheck size={24} />} 
            title="Success!" 
            color="green"
            variant="filled"
            style={{ width: '100%' }}
          >
            <Stack gap="sm">
              <Text>
                {config?.name} has been connected to your Basebase account.
              </Text>
              <Text size="sm">
                You can now close this window and return to your app.
              </Text>
            </Stack>
          </Alert>
        )}

        {status === 'error' && (
          <Alert 
            icon={<IconX size={24} />} 
            title="Authentication Failed" 
            color="red"
            style={{ width: '100%' }}
          >
            <Stack gap="sm">
              <Text size="sm">{error}</Text>
              <Text size="sm">
                You can close this window and try again.
              </Text>
            </Stack>
          </Alert>
        )}

        {/* Close button */}
        {(status === 'success' || status === 'error') && (
          <Button 
            onClick={() => window.close()} 
            variant="light"
            fullWidth
          >
            Close Window
          </Button>
        )}
      </Stack>
    </Container>
  );
}

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider appId={APP_ID}>
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app
const container = document.getElementById("app");
let root;

function render() {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<App />);
}

render();

// Enable hot reload in development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;

