/**
 * Playground App - Redirect Notice
 * This app has moved to www.basebase.com
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, Box, Text, Button, Stack } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

const APP_ID = "playground";

function RedirectNotice() {
  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf9f7",
        fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      <Stack align="center" gap="lg" style={{ textAlign: "center", padding: 32 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#1D1D1F",
            letterSpacing: "-0.02em",
          }}
        >
          We've moved!
        </Text>
        <Text size="lg" style={{ color: "#86868b", maxWidth: 400 }}>
          The Basebase Playground is now available at our new home.
        </Text>
        <Button
          component="a"
          href="https://www.basebase.com"
          size="lg"
          variant="filled"
          color="dark"
          rightSection={<IconArrowRight size={18} />}
          style={{ marginTop: 8 }}
        >
          Go to www.basebase.com
        </Button>
      </Stack>
    </Box>
  );
}

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <RedirectNotice />
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);

export { APP_ID };

