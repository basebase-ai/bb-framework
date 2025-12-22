import React, { useState } from "react";
import {
  Stack,
  Paper,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Select,
  JsonInput,
  Code,
  Box,
  Divider,
} from "@mantine/core";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

export function DebugPanel({ onClose }) {
  const { user } = useAuth();
  const [collectionName, setCollectionName] = useState(collections.posts);
  const [whereField, setWhereField] = useState("authorId");
  const [whereOp, setWhereOp] = useState("==");
  const [whereValue, setWhereValue] = useState(user?.uid || "");
  const [orderByField, setOrderByField] = useState("updatedAt");
  const [orderByDir, setOrderByDir] = useState("desc");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log("🔍 Running query with:", {
        collection: collectionName,
        where: whereField ? [whereField, whereOp, whereValue] : null,
        orderBy: orderByField ? [orderByField, orderByDir] : null,
      });

      let q = collection(db, collectionName);

      // Add where clause if specified
      if (whereField && whereValue) {
        q = query(q, where(whereField, whereOp, whereValue));
      }

      // Add orderBy if specified
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderByDir));
      }

      const snapshot = await getDocs(q);
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log("✅ Query results:", docs);
      setResults(docs);
    } catch (err) {
      console.error("❌ Query error:", err);
      setError({
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const quickTests = [
    {
      name: "My Posts (authorId + updatedAt)",
      collection: collections.posts,
      whereField: "authorId",
      whereValue: user?.uid,
      orderByField: "updatedAt",
    },
    {
      name: "All Posts (blog_posts, no filter)",
      collection: collections.posts,
      whereField: "",
      whereValue: "",
      orderByField: "",
    },
    {
      name: "Public Posts (updatedAt)",
      collection: collections.postsPublic,
      whereField: "",
      whereValue: "",
      orderByField: "updatedAt",
    },
    {
      name: "Public Posts (no filter)",
      collection: collections.postsPublic,
      whereField: "",
      whereValue: "",
      orderByField: "",
    },
  ];

  const runQuickTest = async (test) => {
    setLoading(true);
    setError(null);
    setResults(null);

    // Update form fields for display
    setCollectionName(test.collection);
    setWhereField(test.whereField || "");
    setWhereValue(test.whereValue || "");
    setOrderByField(test.orderByField || "");

    try {
      console.log("🔍 Running quick test:", test.name);

      let q = collection(db, test.collection);

      // Add where clause if specified
      if (test.whereField && test.whereValue) {
        q = query(q, where(test.whereField, whereOp, test.whereValue));
      }

      // Add orderBy if specified
      if (test.orderByField) {
        q = query(q, orderBy(test.orderByField, orderByDir));
      }

      const snapshot = await getDocs(q);
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log("✅ Quick test results:", docs);
      setResults(docs);
    } catch (err) {
      console.error("❌ Quick test error:", err);
      setError({
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 10000,
        overflow: "auto",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <Paper
        p="xl"
        style={{ maxWidth: 1200, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={2}>Firestore Query Debugger</Title>
            <Button onClick={onClose} variant="subtle">
              Close
            </Button>
          </Group>

          <Text size="sm" c="dimmed">
            Current User ID: <Code>{user?.uid || "Not logged in"}</Code>
          </Text>

          <Divider label="Quick Tests" />

          <Group>
            {quickTests.map((test, i) => (
              <Button
                key={i}
                onClick={() => runQuickTest(test)}
                size="sm"
                variant="light"
              >
                {test.name}
              </Button>
            ))}
          </Group>

          <Divider label="Custom Query" />

          <TextInput
            label="Collection Name"
            value={collectionName}
            onChange={(e) => setCollectionName(e.currentTarget.value)}
            placeholder="e.g., blog_posts"
          />

          <Group grow>
            <TextInput
              label="Where Field"
              value={whereField}
              onChange={(e) => setWhereField(e.currentTarget.value)}
              placeholder="e.g., authorId (leave empty for no where)"
            />
            <Select
              label="Operator"
              value={whereOp}
              onChange={setWhereOp}
              data={[
                { value: "==", label: "==" },
                { value: "!=", label: "!=" },
                { value: ">", label: ">" },
                { value: ">=", label: ">=" },
                { value: "<", label: "<" },
                { value: "<=", label: "<=" },
              ]}
            />
            <TextInput
              label="Where Value"
              value={whereValue}
              onChange={(e) => setWhereValue(e.currentTarget.value)}
              placeholder="e.g., user123"
            />
          </Group>

          <Group grow>
            <TextInput
              label="Order By Field"
              value={orderByField}
              onChange={(e) => setOrderByField(e.currentTarget.value)}
              placeholder="e.g., updatedAt (leave empty for no ordering)"
            />
            <Select
              label="Direction"
              value={orderByDir}
              onChange={setOrderByDir}
              data={[
                { value: "asc", label: "Ascending" },
                { value: "desc", label: "Descending" },
              ]}
            />
          </Group>

          <Button onClick={runQuery} loading={loading} fullWidth>
            Run Query
          </Button>

          {error && (
            <Paper p="md" withBorder style={{ background: "#ffe0e0" }}>
              <Title order={4} c="red" mb="sm">
                Error
              </Title>
              <Text size="sm" mb="xs">
                <strong>Message:</strong> {error.message}
              </Text>
              {error.code && (
                <Text size="sm" mb="xs">
                  <strong>Code:</strong> {error.code}
                </Text>
              )}
              <Code block style={{ fontSize: 11 }}>
                {error.stack}
              </Code>
            </Paper>
          )}

          {results && (
            <Paper p="md" withBorder style={{ background: "#e0ffe0" }}>
              <Title order={4} mb="sm">
                Results ({results.length} documents)
              </Title>
              <Box style={{ maxHeight: "60vh", overflow: "auto" }}>
                <JsonInput
                  value={JSON.stringify(results, null, 2)}
                  readOnly
                  autosize
                  minRows={25}
                  styles={{
                    input: {
                      fontFamily: "monospace",
                      fontSize: 11,
                    },
                  }}
                />
              </Box>
            </Paper>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
