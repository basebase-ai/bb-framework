/**
 * AnalysisDetails - Detailed view of a stock analysis
 */

import React, { useMemo } from "react";
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  SimpleGrid,
  Progress,
  RingProgress,
  Loader,
  Center,
  Button,
  Divider,
  ThemeIcon,
  Card,
  Grid,
  Code,
  TypographyStylesProvider,
  Spoiler,
} from "@mantine/core";
import { marked } from "marked";
import {
  IconArrowLeft,
  IconTrendingUp,
  IconTrendingDown,
  IconChartBar,
  IconBulb,
  IconChartLine,
  IconCalculator,
  IconWorld,
  IconAlertTriangle,
  IconMoodSmile,
  IconCertificate,
  IconChartDonut,
  IconClock,
  IconCheck,
  IconX,
  IconFileText,
} from "@tabler/icons-react";

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { getCollection } from "../schema.js";

/** @typedef {{ ticker: string; onBack: () => void }} AnalysisDetailsProps */

/**
 * Score display component
 */
function ScoreCard({ label, value, max = 5, icon: Icon, description }) {
  if (value === undefined || value === null) {
    return null;
  }

  const percentage = (value / max) * 100;
  const color =
    percentage >= 80
      ? "green"
      : percentage >= 60
      ? "teal"
      : percentage >= 40
      ? "yellow"
      : percentage >= 20
      ? "orange"
      : "red";

  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          {Icon && (
            <ThemeIcon size="sm" variant="light" color={color}>
              <Icon size={14} />
            </ThemeIcon>
          )}
          <Text size="sm" fw={600}>
            {label}
          </Text>
        </Group>
        <Text size="lg" fw={700} c={color}>
          {typeof value === "number" ? value.toFixed(2) : value}
        </Text>
      </Group>
      <Progress value={percentage} color={color} size="sm" radius="xl" />
      {description && (
        <Text size="xs" c="dimmed" mt="xs">
          {description}
        </Text>
      )}
    </Card>
  );
}

/**
 * Data quality display
 */
function DataQualityCard({ dataQuality }) {
  if (!dataQuality) return null;

  const { grade, completeness, confidence } = dataQuality;

  const gradeColor =
    grade?.startsWith("A")
      ? "teal"
      : grade?.startsWith("B")
      ? "green"
      : grade?.startsWith("C")
      ? "yellow"
      : "red";

  return (
    <Card withBorder padding="md" radius="md">
      <Text size="sm" fw={600} mb="md">
        Data Quality
      </Text>
      <Group justify="space-between">
        <Stack gap="xs">
          <Group gap="xs">
            <IconCertificate size={16} />
            <Text size="sm">Grade</Text>
          </Group>
          <Badge color={gradeColor} size="lg" variant="filled">
            {grade || "N/A"}
          </Badge>
        </Stack>

        <Stack gap="xs" align="center">
          <Group gap="xs">
            <IconChartDonut size={16} />
            <Text size="sm">Completeness</Text>
          </Group>
          <RingProgress
            size={60}
            thickness={6}
            sections={[
              {
                value: (completeness || 0) * 100,
                color:
                  (completeness || 0) >= 0.8
                    ? "green"
                    : (completeness || 0) >= 0.6
                    ? "yellow"
                    : "red",
              },
            ]}
            label={
              <Text size="xs" ta="center" fw={700}>
                {Math.round((completeness || 0) * 100)}%
              </Text>
            }
          />
        </Stack>

        {confidence && (
          <Stack gap="xs">
            <Text size="sm">Confidence</Text>
            <Text size="sm" fw={500}>
              {confidence}
            </Text>
          </Stack>
        )}
      </Group>
    </Card>
  );
}

/**
 * @param {AnalysisDetailsProps} props
 */
export function AnalysisDetails({ ticker, onBack }) {
  const { user } = useAuth();

  // Fetch all analyses for this ticker
  const { data: analyses, loading } = useCollection(
    getCollection("stock-analyses"),
    { realtime: !!user?.uid }
  );

  // Find the most recent analysis for this ticker
  const analysis = useMemo(() => {
    if (!analyses || !ticker) return null;

    const tickerAnalyses = analyses
      .filter((a) => a.ticker?.toUpperCase() === ticker.toUpperCase() && a.success)
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

    return tickerAnalyses[0] || null;
  }, [analyses, ticker]);

  if (loading) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!analysis) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <Text size="lg" c="dimmed">
            No analysis found for {ticker}
          </Text>
          <Button leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
            Back to Analyses
          </Button>
        </Stack>
      </Container>
    );
  }

  const { scores, dataQuality, performance, llmMetadata, workflow } = analysis;

  const recommendationColor =
    scores?.recommendation === "Buy"
      ? "teal"
      : scores?.recommendation === "Moderate Buy"
      ? "cyan"
      : scores?.recommendation === "Hold"
      ? "yellow"
      : scores?.recommendation === "Moderate Sell"
      ? "orange"
      : "red";

  const analysisDate = analysis.createdAt?.toDate?.() || new Date(analysis.createdAt);

  return (
    <Container size="xl" fluid>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="md">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={onBack}
            >
              Back
            </Button>
            <div>
              <Group gap="sm">
                <Title order={2}>{ticker}</Title>
                {analysis.success ? (
                  <Badge color="green" leftSection={<IconCheck size={12} />}>
                    Success
                  </Badge>
                ) : (
                  <Badge color="red" leftSection={<IconX size={12} />}>
                    Failed
                  </Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed">
                Analysis from {analysisDate.toLocaleDateString()} at{" "}
                {analysisDate.toLocaleTimeString()}
              </Text>
            </div>
          </Group>

          {scores?.recommendation && (
            <Badge
              size="xl"
              variant="filled"
              color={recommendationColor}
              style={{ fontSize: 16, padding: "12px 20px" }}
            >
              {scores.recommendation}
            </Badge>
          )}
        </Group>

        {/* Composite Score */}
        {scores?.composite !== undefined && (
          <Paper withBorder p="lg" radius="md">
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                  Composite Score
                </Text>
                <Text size="xs" c="dimmed">
                  Overall analysis score from 0 to 5
                </Text>
              </div>
              <Group gap="md">
                <Progress
                  value={(scores.composite / 5) * 100}
                  size="xl"
                  radius="xl"
                  color={
                    scores.composite >= 4
                      ? "green"
                      : scores.composite >= 3
                      ? "teal"
                      : scores.composite >= 2
                      ? "yellow"
                      : "red"
                  }
                  style={{ width: 200 }}
                />
                <Text size="2rem" fw={700}>
                  {scores.composite.toFixed(2)}
                </Text>
              </Group>
            </Group>
          </Paper>
        )}

        {/* Score Breakdown */}
        <div>
          <Text size="lg" fw={600} mb="md">
            Score Breakdown
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
            <ScoreCard
              label="Technical"
              value={scores?.technical}
              icon={IconChartLine}
              description="Technical analysis signals"
            />
            <ScoreCard
              label="Fundamental"
              value={scores?.fundamental}
              icon={IconCalculator}
              description="Financial health metrics"
            />
            <ScoreCard
              label="Macro"
              value={scores?.macro}
              icon={IconWorld}
              description="Macroeconomic factors"
            />
            <ScoreCard
              label="Risk"
              value={scores?.risk}
              icon={IconAlertTriangle}
              description="Risk assessment"
            />
            <ScoreCard
              label="Sentiment"
              value={scores?.sentiment}
              icon={IconMoodSmile}
              description="Market sentiment"
            />
            <ScoreCard
              label="Market Alignment"
              value={scores?.marketAlignment}
              icon={IconTrendingUp}
              description="Alignment with market trends"
            />
          </SimpleGrid>
        </div>

        <Divider />

        {/* Data Quality & Performance */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <DataQualityCard dataQuality={dataQuality} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="md" radius="md">
              <Text size="sm" fw={600} mb="md">
                Performance Metrics
              </Text>
              <SimpleGrid cols={2} spacing="sm">
                {performance?.duration && (
                  <Group gap="xs">
                    <IconClock size={16} />
                    <Text size="sm">
                      Duration: {(performance.duration / 1000).toFixed(1)}s
                    </Text>
                  </Group>
                )}
                {performance?.fmpCalls !== undefined && (
                  <Text size="sm">FMP API Calls: {performance.fmpCalls}</Text>
                )}
                {performance?.fredCalls !== undefined && (
                  <Text size="sm">FRED API Calls: {performance.fredCalls}</Text>
                )}
                {performance?.notionCalls !== undefined && (
                  <Text size="sm">Notion API Calls: {performance.notionCalls}</Text>
                )}
              </SimpleGrid>
            </Card>
          </Grid.Col>
        </Grid>

        {/* LLM Metadata */}
        {llmMetadata && (
          <Card withBorder padding="md" radius="md">
            <Text size="sm" fw={600} mb="md">
              LLM Analysis Details
            </Text>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              {llmMetadata.provider && (
                <div>
                  <Text size="xs" c="dimmed">
                    Provider
                  </Text>
                  <Text size="sm" fw={500}>
                    {llmMetadata.provider}
                  </Text>
                </div>
              )}
              {llmMetadata.model && (
                <div>
                  <Text size="xs" c="dimmed">
                    Model
                  </Text>
                  <Text size="sm" fw={500}>
                    {llmMetadata.model}
                  </Text>
                </div>
              )}
              {llmMetadata.cost !== undefined && (
                <div>
                  <Text size="xs" c="dimmed">
                    Cost
                  </Text>
                  <Text size="sm" fw={500}>
                    ${llmMetadata.cost.toFixed(4)}
                  </Text>
                </div>
              )}
              {llmMetadata.tokensUsed?.total !== undefined && (
                <div>
                  <Text size="xs" c="dimmed">
                    Tokens Used
                  </Text>
                  <Text size="sm" fw={500}>
                    {llmMetadata.tokensUsed.total.toLocaleString()}
                  </Text>
                </div>
              )}
            </SimpleGrid>
          </Card>
        )}

        {/* Workflow Status */}
        {workflow && (
          <Card withBorder padding="md" radius="md">
            <Text size="sm" fw={600} mb="md">
              Workflow
            </Text>
            <Group gap="md">
              {workflow.status && (
                <Badge
                  color={
                    workflow.status === "Completed"
                      ? "green"
                      : workflow.status === "In Progress"
                      ? "blue"
                      : "red"
                  }
                >
                  {workflow.status}
                </Badge>
              )}
            </Group>
          </Card>
        )}

        {/* Analysis Content (Markdown Report) */}
        {analysis.analysisContent && (
          <>
            <Divider />
            <Card withBorder padding="lg" radius="md">
              <Group gap="xs" mb="md">
                <ThemeIcon size="md" variant="light" color="blue">
                  <IconFileText size={16} />
                </ThemeIcon>
                <Text size="lg" fw={600}>
                  Full Analysis Report
                </Text>
              </Group>
              <Spoiler maxHeight={400} showLabel="Show full report" hideLabel="Hide">
                <TypographyStylesProvider>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: marked(analysis.analysisContent),
                    }}
                  />
                </TypographyStylesProvider>
              </Spoiler>
            </Card>
          </>
        )}

        {/* Raw Data (collapsible) */}
        <Card withBorder padding="md" radius="md">
          <Text size="sm" fw={600} mb="md">
            Raw Analysis Data
          </Text>
          <Code block style={{ maxHeight: 300, overflow: "auto" }}>
            {JSON.stringify(analysis, null, 2)}
          </Code>
        </Card>
      </Stack>
    </Container>
  );
}

