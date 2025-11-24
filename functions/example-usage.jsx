/**
 * Example: Using Server Functions in Your App
 * 
 * This file shows how to call server functions from your React components.
 * Copy these patterns into your own components.
 */

import React, { useState } from "react";
import { Button, Stack, Text, Textarea, Alert } from "@mantine/core";
import { useFunction } from "../../framework/hooks/useFunction.js";

// Example 1: Simple function call with button
export function AskAIExample() {
  const { call, loading, result, error } = useFunction("askLLM");
  const [message, setMessage] = useState("");

  const handleAsk = async () => {
    if (!message.trim()) return;

    await call({
      provider: "openai",
      model: "gpt-4",
      systemPrompt: "You are a helpful assistant. Be brief and clear.",
      message: message,
      temperature: 0.7,
    });
  };

  return (
    <Stack>
      <Text size="lg" fw={500}>
        Ask AI
      </Text>

      <Textarea
        placeholder="Ask me anything..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        minRows={3}
      />

      <Button onClick={handleAsk} loading={loading}>
        Ask AI
      </Button>

      {error && (
        <Alert color="red" title="Error">
          {error.message}
        </Alert>
      )}

      {result && (
        <Alert color="blue" title="Response">
          {result.response}
        </Alert>
      )}
    </Stack>
  );
}

// Example 2: Background task (fire and forget)
export function EnrichDataExample() {
  const { call, loading } = useFunction("enrichData");

  const handleEnrich = async () => {
    // Fire and forget - don't wait for result
    await call(
      {
        collection: "crm_leads",
        query: { field: "status", operator: "==", value: "new" },
        inputFields: ["name", "company", "notes"],
        outputFields: ["aiSummary", "aiScore"],
        systemPrompt:
          "Analyze this lead and return JSON with aiSummary (string) and aiScore (0-100)",
        maxDocs: 10,
      },
      {
        waitForResult: false, // Don't wait for completion
      }
    );

    alert("Enrichment started! Check back in a few minutes.");
  };

  return (
    <Button onClick={handleEnrich} loading={loading}>
      Enrich All New Leads
    </Button>
  );
}

// Example 3: Send email
export function SendEmailExample() {
  const { call, loading, result, error } = useFunction("sendEmail");

  const handleSendWelcome = async () => {
    await call({
      to: "user@example.com",
      subject: "Welcome!",
      template: "welcome",
      data: {
        userName: "John Doe",
        appName: "My App",
      },
    });
  };

  return (
    <Stack>
      <Button onClick={handleSendWelcome} loading={loading}>
        Send Welcome Email
      </Button>

      {error && <Text c="red">{error.message}</Text>}
      {result && <Text c="green">Email sent successfully!</Text>}
    </Stack>
  );
}

// Example 4: Error handling
export function RobustFunctionCall() {
  const { call, loading } = useFunction("myFunction");
  const [status, setStatus] = useState("");

  const handleCall = async () => {
    try {
      setStatus("Calling function...");

      const result = await call({
        param1: "value1",
        param2: "value2",
      });

      if (result.success) {
        setStatus("Success! " + JSON.stringify(result.data));
      } else {
        setStatus("Function returned an error");
      }
    } catch (error) {
      setStatus("Error: " + error.message);
    }
  };

  return (
    <Stack>
      <Button onClick={handleCall} loading={loading}>
        Call Function
      </Button>
      {status && <Text>{status}</Text>}
    </Stack>
  );
}

