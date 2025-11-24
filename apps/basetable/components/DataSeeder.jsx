/**
 * DataSeeder - Quick utility to populate sample stock analysis data
 * 
 * Usage: Add <DataSeeder /> temporarily to your app to seed data, then remove it
 */

import React, { useState } from "react";
import { Button, Paper, Stack, Text, Alert, Group } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { getCollection } from "../schema.js";

const SAMPLE_DATA = [
  {
    ticker: "ASML",
    analysis: "Daily",
    analysisCadence: "Daily",
    status: "Complete",
    currentPrice: 981.04,
    recommendation: "Buy",
    compositeScore: 3.68,
    patternSignal: "Bearish",
    patternScore: 2.08,
    dataQuality: "Excellent",
    dataCompleteness: 100,
    detectedPatterns: ["Strong Uptrend", "MACD Bearish"],
    technicalScore: 3.8,
    fundamentalScore: 4.2,
  },
  {
    ticker: "NVDA",
    analysis: "Daily",
    analysisCadence: "Daily",
    status: "Complete",
    currentPrice: 180.64,
    recommendation: "Moderate Buy",
    compositeScore: 3.32,
    patternSignal: "Extremely Bullish",
    patternScore: 4.83,
    dataQuality: "Excellent",
    dataCompleteness: 100,
    detectedPatterns: ["Strong Uptrend", "MACD Bullish"],
    technicalScore: 3.0,
    fundamentalScore: 3.8,
  },
  {
    ticker: "QBTS",
    analysis: "Daily",
    analysisCadence: "Daily",
    status: "Complete",
    currentPrice: 20.51,
    recommendation: "Moderate Sell",
    compositeScore: 2.24,
    patternSignal: "Bearish",
    patternScore: 2.08,
    dataQuality: "Excellent",
    dataCompleteness: 100,
    detectedPatterns: ["Strong Uptrend", "MACD Bearish"],
    technicalScore: 2.2,
    fundamentalScore: 2.0,
  },
  {
    ticker: "AAPL",
    analysis: "Daily",
    analysisCadence: "Daily",
    status: "Complete",
    currentPrice: 266.25,
    recommendation: "Buy",
    compositeScore: 3.82,
    patternSignal: "Neutral",
    patternScore: 3.4,
    dataQuality: "Excellent",
    dataCompleteness: 100,
    detectedPatterns: ["Strong Uptrend", "MACD Bullish"],
    technicalScore: 4.2,
    fundamentalScore: 3.8,
  },
  {
    ticker: "AMZN",
    analysis: "Daily",
    analysisCadence: "Daily",
    status: "Complete",
    currentPrice: 217.14,
    recommendation: "Moderate Buy",
    compositeScore: 3.35,
    patternSignal: "Extremely Bullish",
    patternScore: 4.83,
    dataQuality: "Excellent",
    dataCompleteness: 100,
    detectedPatterns: ["Strong Uptrend", "MACD Bullish"],
    technicalScore: 2.6,
    fundamentalScore: 4.2,
  },
  {
    ticker: "ARQQ",
    analysis: "Daily",
    analysisCadence: "Daily",
    status: "Complete",
    currentPrice: 24.27,
    recommendation: "Moderate Sell",
    compositeScore: 2.02,
    patternSignal: "Neutral",
    patternScore: 3.2,
    dataQuality: "Excellent",
    dataCompleteness: 100,
    detectedPatterns: ["Strong Uptrend", "MACD Bearish"],
    technicalScore: 1.4,
    fundamentalScore: 2.0,
  },
];

export function DataSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);

    try {
      const collectionName = getCollection("stock-analyses");
      const collectionRef = collection(db, collectionName);

      // Check if data already exists
      const existingDocs = await getDocs(collectionRef);
      if (!existingDocs.empty) {
        notifications.show({
          title: "Data already exists",
          message: "Sample data has already been seeded",
          color: "yellow",
        });
        setSeeded(true);
        setSeeding(false);
        return;
      }

      // Add sample data
      for (const data of SAMPLE_DATA) {
        await addDoc(collectionRef, {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      notifications.show({
        title: "Success",
        message: `Added ${SAMPLE_DATA.length} sample stock analyses`,
        color: "green",
      });

      setSeeded(true);
    } catch (error) {
      console.error("Error seeding data:", error);
      notifications.show({
        title: "Error",
        message: "Failed to seed data: " + error.message,
        color: "red",
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <IconDatabase size={20} />
          <Text fw={500}>Data Seeder</Text>
        </Group>
        <Text size="sm" c="dimmed">
          Populate the database with sample stock analysis data for testing.
        </Text>
        {seeded ? (
          <Alert color="green" title="Data Seeded">
            Sample data has been added to the database.
          </Alert>
        ) : (
          <Button
            onClick={handleSeed}
            loading={seeding}
            leftSection={<IconDatabase size={16} />}
          >
            Seed Sample Data
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

