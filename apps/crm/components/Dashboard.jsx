/**
 * Dashboard - CRM overview with key metrics
 */

import React from "react";
import { Stack, SimpleGrid, Paper, Title, Text, Group, Badge, RingProgress } from "@mantine/core";
import { IconUserPlus, IconUsers, IconTarget, IconCurrencyDollar } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} DashboardProps
 * @property {string | null} orgId - Organization ID to scope data
 */

/**
 * @param {DashboardProps} props
 */
export function Dashboard({ orgId }) {
  const { user } = useAuth();

  const { data: leads } = useCollection(collections.leads, {
    where: [["orgId", "==", orgId || ""]],
  });

  const { data: contacts } = useCollection(collections.contacts, {
    where: [["orgId", "==", orgId || ""]],
  });

  const { data: opportunities } = useCollection(collections.opportunities, {
    where: [["orgId", "==", orgId || ""]],
  });

  // Calculate metrics
  const newLeads = leads.filter(l => l.status === "new").length;
  const qualifiedLeads = leads.filter(l => l.status === "qualified").length;

  const openOpportunities = opportunities.filter(
    o => !["closed-won", "closed-lost"].includes(o.stage)
  );

  const wonOpportunities = opportunities.filter(o => o.stage === "closed-won");

  const totalPipelineValue = openOpportunities.reduce(
    (sum, opp) => sum + (opp.amount || 0),
    0
  );

  const totalWonValue = wonOpportunities.reduce(
    (sum, opp) => sum + (opp.amount || 0),
    0
  );

  const winRate = opportunities.length > 0
    ? Math.round((wonOpportunities.length / opportunities.length) * 100)
    : 0;

  const stats = [
    {
      title: "Total Leads",
      value: leads.length,
      icon: IconUserPlus,
      color: "blue",
      subtitle: `${newLeads} new, ${qualifiedLeads} qualified`,
    },
    {
      title: "Contacts",
      value: contacts.length,
      icon: IconUsers,
      color: "green",
      subtitle: "Active contacts",
    },
    {
      title: "Open Opportunities",
      value: openOpportunities.length,
      icon: IconTarget,
      color: "orange",
      subtitle: `$${totalPipelineValue.toLocaleString()} pipeline value`,
    },
    {
      title: "Closed Won",
      value: wonOpportunities.length,
      icon: IconCurrencyDollar,
      color: "teal",
      subtitle: `$${totalWonValue.toLocaleString()} total value`,
    },
  ];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Dashboard</Title>
        <Text size="sm" c="dimmed">
          Overview of your sales pipeline
        </Text>
      </div>

      {/* Key Metrics */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Paper key={stat.title} p="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {stat.title}
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stat.value}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    {stat.subtitle}
                  </Text>
                </div>
                <Icon size={32} color={stat.color} style={{ opacity: 0.6 }} />
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>

      {/* Win Rate & Pipeline Overview */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper p="lg" withBorder>
          <Group justify="space-between" align="flex-start" mb="md">
            <div>
              <Title order={4}>Win Rate</Title>
              <Text size="sm" c="dimmed">
                Closed won vs total opportunities
              </Text>
            </div>
            <RingProgress
              size={120}
              thickness={12}
              sections={[{ value: winRate, color: "teal" }]}
              label={
                <Text size="xl" fw={700} ta="center">
                  {winRate}%
                </Text>
              }
            />
          </Group>
          <Text size="sm" c="dimmed">
            {wonOpportunities.length} won out of {opportunities.length} total
          </Text>
        </Paper>

        <Paper p="lg" withBorder>
          <Title order={4} mb="md">Pipeline by Stage</Title>
          <Stack gap="sm">
            {[
              { stage: "prospecting", label: "Prospecting", color: "gray" },
              { stage: "qualification", label: "Qualification", color: "blue" },
              { stage: "proposal", label: "Proposal", color: "cyan" },
              { stage: "negotiation", label: "Negotiation", color: "orange" },
              { stage: "closed-won", label: "Closed Won", color: "teal" },
              { stage: "closed-lost", label: "Closed Lost", color: "red" },
            ].map(({ stage, label, color }) => {
              const count = opportunities.filter(o => o.stage === stage).length;
              const value = opportunities
                .filter(o => o.stage === stage)
                .reduce((sum, o) => sum + (o.amount || 0), 0);

              return (
                <Group key={stage} justify="space-between">
                  <Group gap="xs">
                    <Badge color={color} variant="light" size="sm">
                      {count}
                    </Badge>
                    <Text size="sm">{label}</Text>
                  </Group>
                  <Text size="sm" fw={500}>
                    ${value.toLocaleString()}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* Recent Activity could go here */}
      {opportunities.length === 0 && leads.length === 0 && contacts.length === 0 && (
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">
            Get started by adding your first lead or contact!
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
