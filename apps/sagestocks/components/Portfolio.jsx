/**
 * Portfolio - Track and visualize your investment portfolio
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Container,
  Title,
  Button,
  Group,
  Stack,
  Paper,
  Text,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  NumberInput,
  Loader,
  Center,
  Badge,
  SimpleGrid,
  SegmentedControl,
  Tooltip,
  Menu,
  Alert,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconChartLine,
  IconCurrencyDollar,
  IconCalendar,
  IconDotsVertical,
  IconRefresh,
  IconGripVertical,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, APP_ID } from "../schema.js";

import "@mantine/dates/styles.css";

/** @typedef {{ id: string; ticker: string; units: number; purchaseDate: Date; purchasePrice: number; owner: string }} Holding */

/**
 * Simple SVG line chart for portfolio performance
 */
function PerformanceChart({ data, width = 600, height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <Paper withBorder p="lg" h={height}>
        <Center h="100%">
          <Text c="dimmed" size="sm">No performance data yet</Text>
        </Center>
      </Paper>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values) * 0.95;
  const maxValue = Math.max(...values) * 1.05;
  const valueRange = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const strokeColor = isPositive ? "#40c057" : "#fa5252";
  const fillColor = isPositive ? "rgba(64, 192, 87, 0.1)" : "rgba(250, 82, 82, 0.1)";

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const value = minValue + fraction * valueRange;
    const y = padding.top + chartHeight - fraction * chartHeight;
    return { value, y };
  });

  // X-axis labels (first, middle, last)
  const xLabels = [];
  if (data.length > 0) {
    xLabels.push({ label: data[0].label, x: points[0].x });
    if (data.length > 2) {
      const midIndex = Math.floor(data.length / 2);
      xLabels.push({ label: data[midIndex].label, x: points[midIndex].x });
    }
    if (data.length > 1) {
      xLabels.push({ label: data[data.length - 1].label, x: points[points.length - 1].x });
    }
  }

  return (
    <Paper withBorder p="md" style={{ overflow: "hidden" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yLabels.map((l, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={l.y}
            x2={width - padding.right}
            y2={l.y}
            stroke="var(--mantine-color-gray-3)"
            strokeDasharray="4,4"
            strokeWidth={0.5}
          />
        ))}

        {/* Area fill */}
        <path d={areaD} fill={fillColor} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={strokeColor} />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((l, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={l.y}
            textAnchor="end"
            alignmentBaseline="middle"
            fill="var(--mantine-color-dimmed)"
            fontSize={11}
          >
            ${l.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={height - 8}
            textAnchor="middle"
            fill="var(--mantine-color-dimmed)"
            fontSize={11}
          >
            {l.label}
          </text>
        ))}
      </svg>
    </Paper>
  );
}

/**
 * Stat card for summary metrics
 */
function StatCard({ title, value, change, icon: Icon, color = "blue" }) {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = change === undefined ? "gray" : isPositive ? "green" : "red";
  const ChangeIcon = change === undefined ? IconMinus : isPositive ? IconTrendingUp : IconTrendingDown;

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {title}
        </Text>
        <Icon size={20} color={`var(--mantine-color-${color}-6)`} />
      </Group>
      <Text size="xl" fw={700}>
        {value}
      </Text>
      {change !== undefined && (
        <Group gap={4} mt={4}>
          <ChangeIcon size={14} color={`var(--mantine-color-${changeColor}-6)`} />
          <Text size="sm" c={changeColor} fw={500}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </Text>
        </Group>
      )}
    </Paper>
  );
}

export function Portfolio() {
  const { user } = useAuth();
  
  // Track if we've fetched quotes for current holdings
  const fetchedTickersRef = useRef(/** @type {Set<string>} */ (new Set()));
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);

  // Memoize where conditions to prevent re-renders
  const holdingsWhere = useMemo(
    () => (user?.uid ? [["owner", "==", user.uid]] : []),
    [user?.uid]
  );

  // Holdings from Firestore - only query when user is available
  const {
    data: holdings,
    loading: holdingsLoading,
    add: addHolding,
    update: updateHolding,
    remove: removeHolding,
  } = useCollection(collections.holdings, {
    where: holdingsWhere,
    realtime: !!user?.uid,
  });

  // Quotes collection for real-time prices (e.g., sagestocks_quotes/AAPL)
  const { data: quotes, loading: quotesLoading } = useCollection(collections.quotes, {
    realtime: !!user?.uid,
  });

  // Historical collection for chart data (e.g., sagestocks_historical/AAPL)
  const { data: historicalDocs, loading: historicalLoading } = useCollection(collections.historical, {
    realtime: !!user?.uid,
  });

  // Function to fetch quotes and historical data from FMP API
  const { call: fetchQuotes, loading: fetchingQuotes } = useFunction("queryFMP");
  const { call: fetchHistorical, loading: fetchingHistorical } = useFunction("queryFMP");

  // Track which tickers we've fetched historical data for
  const fetchedHistoricalRef = useRef(/** @type {Set<string>} */ (new Set()));

  // Get unique tickers from holdings
  const holdingTickers = useMemo(() => {
    if (!holdings) return [];
    return [...new Set(holdings.map((h) => h.ticker).filter(Boolean))];
  }, [holdings]);

  // Fetch quotes for holdings on initial load and when holdings change
  useEffect(() => {
    if (!user || !holdingTickers.length) return;

    // Find tickers we haven't fetched yet
    const newTickers = holdingTickers.filter(
      (ticker) => !fetchedTickersRef.current.has(ticker)
    );

    if (newTickers.length === 0) return;

    // Mark tickers as pending immediately to prevent duplicate fetches
    newTickers.forEach((ticker) => fetchedTickersRef.current.add(ticker));

    const fetchNewQuotes = async () => {
      try {
        console.log("📈 Fetching quotes for:", newTickers);
        
        await fetchQuotes(
          {
            operation: "quote",
            symbols: newTickers,
            collectionName: "quotes", // Will be namespaced to sagestocks_quotes
          },
          { appId: APP_ID }
        );

        console.log("✅ Quotes fetched successfully");
      } catch (error) {
        console.error("Failed to fetch quotes:", error);
        // Remove from fetched set so it can be retried
        newTickers.forEach((ticker) => fetchedTickersRef.current.delete(ticker));
      }
    };

    fetchNewQuotes();
  }, [user, holdingTickers, fetchQuotes]);

  // Build a map of historical data by ticker
  const historicalMap = useMemo(() => {
    /** @type {Map<string, Array<{ date: string; close: number }>>} */
    const map = new Map();
    if (!historicalDocs) return map;

    historicalDocs.forEach((doc) => {
      const ticker = doc.symbol || doc.id;
      if (ticker && doc.data && Array.isArray(doc.data)) {
        // FMP historical data has { date, open, high, low, close, volume, ... }
        map.set(ticker, doc.data);
      }
    });
    return map;
  }, [historicalDocs]);

  // Fetch historical data for holdings
  // Strategy: Fetch full 2-year history if missing or stale (>24h old)
  useEffect(() => {
    if (!user || !holdingTickers.length) return;

    const fetchHistoricalForTickers = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const twoYearsAgo = new Date(today);
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const fromDate = twoYearsAgo.toISOString().split("T")[0];

      for (const ticker of holdingTickers) {
        // Skip if we've already initiated a fetch for this ticker in this session
        if (fetchedHistoricalRef.current.has(ticker)) continue;

        // Check if we already have recent historical data for this ticker
        const existingDoc = historicalDocs?.find(
          (d) => (d.symbol || d.id) === ticker
        );

        // Check if data is fresh (fetched within last 24 hours)
        const fetchedAt = existingDoc?.fetchedAt?.toDate?.() || null;
        const isStale = !fetchedAt || (today.getTime() - fetchedAt.getTime()) > 24 * 60 * 60 * 1000;
        const hasData = existingDoc?.data && existingDoc.data.length > 0;

        if (hasData && !isStale) {
          console.log(`📊 [${ticker}] Historical data is fresh (fetched ${fetchedAt?.toLocaleDateString()})`);
          fetchedHistoricalRef.current.add(ticker);
          continue;
        }

        // Mark as fetching to prevent duplicate requests
        fetchedHistoricalRef.current.add(ticker);

        console.log(`📊 [${ticker}] Fetching historical data (${isStale ? 'stale' : 'missing'})`);

        try {
          const result = await fetchHistorical(
            {
              operation: "historical",
              symbol: ticker,
              from: fromDate,
              to: todayStr,
              collectionName: "historical",
              documentId: ticker, // Use ticker as doc ID for easy lookup
            },
            { appId: APP_ID }
          );

          console.log(`✅ [${ticker}] Historical data fetched: ${result?.recordCount || 0} records`);
        } catch (error) {
          console.error(`❌ [${ticker}] Failed to fetch historical:`, error);
          // Remove from set so it can be retried
          fetchedHistoricalRef.current.delete(ticker);
        }
      }
    };

    fetchHistoricalForTickers();
  }, [user, holdingTickers, historicalDocs, fetchHistorical]);

  // Manual refresh quotes
  const handleRefreshQuotes = async () => {
    if (!holdingTickers.length) return;

    setRefreshingQuotes(true);
    try {
      await fetchQuotes(
        {
          operation: "quote",
          symbols: holdingTickers,
          collectionName: "quotes",
        },
        { appId: APP_ID }
      );

      notifications.show({
        title: "Quotes Updated",
        message: `Refreshed prices for ${holdingTickers.length} stocks`,
        color: "green",
      });
    } catch (error) {
      console.error("Failed to refresh quotes:", error);
      notifications.show({
        title: "Refresh Failed",
        message: error instanceof Error ? error.message : "Failed to refresh quotes",
        color: "red",
      });
    } finally {
      setRefreshingQuotes(false);
    }
  };

  // Modal state
  const [modalOpened, setModalOpened] = useState(false);
  const [editingHolding, setEditingHolding] = useState(/** @type {Holding | null} */ (null));
  const [formData, setFormData] = useState({
    ticker: "",
    units: 1,
    purchaseDate: /** @type {Date | null} */ (new Date()),
    purchasePrice: 0,
  });
  const [saving, setSaving] = useState(false);

  // Time range for chart
  const [timeRange, setTimeRange] = useState("1M");

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(/** @type {any | null} */ (null));

  // Build price lookup from quotes collection
  const priceMap = useMemo(() => {
    /** @type {Map<string, { currentPrice: number; previousClose: number; change: number; changesPercentage: number; dayHigh: number; dayLow: number }>} */
    const map = new Map();
    
    if (!quotes) return map;
    
    // Quotes are stored with ticker as document ID (e.g., sagestocks_quotes/AAPL)
    quotes.forEach((quote) => {
      // The document ID is the ticker symbol
      const ticker = quote.symbol || quote.id;
      if (!ticker) return;

      map.set(ticker, {
        currentPrice: quote.price ?? 0,
        previousClose: quote.previousClose ?? quote.price ?? 0,
        change: quote.change ?? 0,
        changesPercentage: quote.changesPercentage ?? 0,
        dayHigh: quote.dayHigh ?? quote.price ?? 0,
        dayLow: quote.dayLow ?? quote.price ?? 0,
      });
    });

    return map;
  }, [quotes]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!holdings || holdings.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        weekChange: 0,
        weekChangePercent: 0,
        monthChange: 0,
        monthChangePercent: 0,
      };
    }

    let totalValue = 0;
    let totalCost = 0;
    let totalDayChange = 0;
    let previousDayValue = 0;

    holdings.forEach((h) => {
      const priceData = priceMap.get(h.ticker);
      const currentPrice = priceData?.currentPrice || h.purchasePrice || 0;
      const previousClose = priceData?.previousClose || currentPrice;
      const dayChangePerShare = priceData?.change || 0;

      const value = h.units * currentPrice;
      const cost = h.units * (h.purchasePrice || currentPrice);

      totalValue += value;
      totalCost += cost;
      totalDayChange += h.units * dayChangePerShare;
      previousDayValue += h.units * previousClose;
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    const dayChangePercent = previousDayValue > 0 ? (totalDayChange / previousDayValue) * 100 : 0;

    // Week and month changes are estimated (FMP quote doesn't include these)
    // In a real app, you'd fetch historical data or track this separately
    const weekChange = totalDayChange * 5; // Rough estimate
    const weekChangePercent = dayChangePercent * 5;
    const monthChange = totalDayChange * 20; // Rough estimate
    const monthChangePercent = dayChangePercent * 20;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      dayChange: totalDayChange,
      dayChangePercent,
      weekChange,
      weekChangePercent,
      monthChange,
      monthChangePercent,
    };
  }, [holdings, priceMap]);

  // Generate chart data based on time range using real historical data
  const chartData = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    const now = new Date();
    let daysBack = 30;
    let labelFormat = "short";

    switch (timeRange) {
      case "1W":
        daysBack = 7;
        labelFormat = "weekday";
        break;
      case "1M":
        daysBack = 30;
        labelFormat = "short";
        break;
      case "3M":
        daysBack = 90;
        labelFormat = "month";
        break;
      case "1Y":
        daysBack = 365;
        labelFormat = "month";
        break;
      case "ALL":
        daysBack = 365 * 2;
        labelFormat = "year";
        break;
      default:
        daysBack = 30;
    }

    // Check if we have historical data for all tickers
    const hasAllHistorical = holdingTickers.every((ticker) => {
      const data = historicalMap.get(ticker);
      return data && data.length > 0;
    });

    if (!hasAllHistorical) {
      // Return empty while loading historical data
      return [];
    }

    // Build a map of date -> closing price for each ticker
    /** @type {Map<string, Map<string, number>>} */
    const priceByDateByTicker = new Map();

    holdingTickers.forEach((ticker) => {
      const historicalData = historicalMap.get(ticker) || [];
      const dateMap = new Map();
      historicalData.forEach((day) => {
        dateMap.set(day.date, day.close);
      });
      priceByDateByTicker.set(ticker, dateMap);
    });

    // Generate date range
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Collect all unique dates in the range across all tickers
    const allDates = new Set();
    holdingTickers.forEach((ticker) => {
      const historicalData = historicalMap.get(ticker) || [];
      historicalData.forEach((day) => {
        if (day.date >= startDateStr) {
          allDates.add(day.date);
        }
      });
    });

    // Sort dates chronologically
    const sortedDates = [...allDates].sort();

    // Sample dates if too many (cap at 50 points for performance)
    let datesToUse = sortedDates;
    if (sortedDates.length > 50) {
      const interval = Math.floor(sortedDates.length / 50);
      datesToUse = sortedDates.filter((_, i) => i % interval === 0 || i === sortedDates.length - 1);
    }

    // Calculate portfolio value for each date
    const points = datesToUse.map((dateStr) => {
      let portfolioValue = 0;

      holdings.forEach((holding) => {
        const priceMap = priceByDateByTicker.get(holding.ticker);
        // Find the closest available price on or before this date
        let price = priceMap?.get(dateStr);
        
        if (price === undefined) {
          // Try to find the most recent price before this date
          const tickerData = historicalMap.get(holding.ticker) || [];
          for (const day of tickerData) {
            if (day.date <= dateStr) {
              price = day.close;
              break;
            }
          }
        }

        if (price !== undefined) {
          portfolioValue += holding.units * price;
        }
      });

      const date = new Date(dateStr);
      let label = "";
      switch (labelFormat) {
        case "weekday":
          label = date.toLocaleDateString("en-US", { weekday: "short" });
          break;
        case "short":
          label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          break;
        case "month":
          label = date.toLocaleDateString("en-US", { month: "short" });
          break;
        case "year":
          label = date.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
          break;
        default:
          label = date.toLocaleDateString();
      }

      return { date, value: portfolioValue, label };
    });

    return points;
  }, [holdings, holdingTickers, historicalMap, timeRange]);

  // Holdings with enriched data, sorted by order
  const enrichedHoldings = useMemo(() => {
    if (!holdings) return [];

    return holdings
      .map((h) => {
        const priceData = priceMap.get(h.ticker);
        const currentPrice = priceData?.currentPrice || h.purchasePrice || 100;
        const totalValue = h.units * currentPrice;
        const costBasis = h.units * (h.purchasePrice || currentPrice);
        const gainLoss = totalValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

        return {
          ...h,
          currentPrice,
          totalValue,
          costBasis,
          gainLoss,
          gainLossPercent,
        };
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [holdings, priceMap]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingHolding(null);
    setFormData({
      ticker: "",
      units: 1,
      purchaseDate: new Date(),
      purchasePrice: 0,
    });
    setModalOpened(true);
  };

  const handleOpenEditModal = (holding) => {
    setEditingHolding(holding);
    setFormData({
      ticker: holding.ticker,
      units: holding.units,
      purchaseDate: holding.purchaseDate?.toDate?.() || new Date(holding.purchaseDate),
      purchasePrice: holding.purchasePrice || 0,
    });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!formData.ticker.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Ticker symbol is required",
        color: "red",
      });
      return;
    }

    setSaving(true);
    try {
      const holdingData = {
        ticker: formData.ticker.toUpperCase().trim(),
        units: formData.units,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
      };

      if (editingHolding) {
        await updateHolding(editingHolding.id, holdingData);
        notifications.show({
          title: "Updated",
          message: `${holdingData.ticker} holding updated`,
          color: "green",
        });
      } else {
        // Set order to be last in the list
        const maxOrder = holdings.length > 0
          ? Math.max(...holdings.map((h) => h.order ?? 0))
          : 0;
        await addHolding({ ...holdingData, order: maxOrder + 1 });
        notifications.show({
          title: "Added",
          message: `${holdingData.ticker} added to portfolio`,
          color: "green",
        });
      }

      setModalOpened(false);
    } catch (error) {
      console.error("Error saving holding:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save holding",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (holdingId, ticker) => {
    try {
      await removeHolding(holdingId);
      notifications.show({
        title: "Deleted",
        message: `${ticker} removed from portfolio`,
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting holding:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete holding",
        color: "red",
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = enrichedHoldings.findIndex((h) => h.id === draggedItem.id);
    const targetIndex = enrichedHoldings.findIndex((h) => h.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Reorder items
    const reorderedItems = [...enrichedHoldings];
    const [removed] = reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, removed);

    // Update order values for all items
    try {
      await Promise.all(
        reorderedItems.map((item, index) =>
          updateHolding(item.id, { order: index })
        )
      );
    } catch (error) {
      console.error("Error reordering holdings:", error);
      notifications.show({
        title: "Error",
        message: "Failed to reorder holdings",
        color: "red",
      });
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Don't render until user is available
  if (!user) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Show loading only on initial load, not during re-fetches
  if (holdingsLoading && holdings.length === 0) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl" fluid>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Portfolio</Title>
            <Text size="sm" c="dimmed">
              Track your investment performance
            </Text>
          </div>

          <Group>
            <Tooltip label="Refresh stock prices from FMP API">
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleRefreshQuotes}
                loading={refreshingQuotes || fetchingQuotes}
                variant="light"
                disabled={holdingTickers.length === 0}
              >
                Refresh Quotes
              </Button>
            </Tooltip>
            <Button leftSection={<IconPlus size={16} />} onClick={handleOpenAddModal}>
              Add Holding
            </Button>
          </Group>
        </Group>

        {/* Summary Stats */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
          <StatCard
            title="Total Value"
            value={`$${portfolioMetrics.totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            change={portfolioMetrics.totalGainLossPercent}
            icon={IconCurrencyDollar}
            color="blue"
          />
          <StatCard
            title="1 Day"
            value={`$${Math.abs(portfolioMetrics.dayChange).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            change={portfolioMetrics.dayChangePercent}
            icon={IconTrendingUp}
            color="teal"
          />
          <StatCard
            title="1 Week"
            value={`$${Math.abs(portfolioMetrics.weekChange).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            change={portfolioMetrics.weekChangePercent}
            icon={IconChartLine}
            color="cyan"
          />
          <StatCard
            title="1 Month"
            value={`$${Math.abs(portfolioMetrics.monthChange).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            change={portfolioMetrics.monthChangePercent}
            icon={IconChartLine}
            color="grape"
          />
          <StatCard
            title="Total Cost"
            value={`$${portfolioMetrics.totalCost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={IconCalendar}
            color="gray"
          />
        </SimpleGrid>

        {/* Chart */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="md">
            <Text fw={600}>Portfolio Performance</Text>
            <SegmentedControl
              size="xs"
              value={timeRange}
              onChange={setTimeRange}
              data={[
                { label: "1W", value: "1W" },
                { label: "1M", value: "1M" },
                { label: "3M", value: "3M" },
                { label: "1Y", value: "1Y" },
                { label: "All", value: "ALL" },
              ]}
            />
          </Group>
          {fetchingHistorical || (holdingTickers.length > 0 && chartData.length === 0) ? (
            <Paper withBorder p="lg" h={250}>
              <Center h="100%">
                <Stack align="center" gap="sm">
                  <Loader size="sm" />
                  <Text c="dimmed" size="sm">Loading historical data...</Text>
                </Stack>
              </Center>
            </Paper>
          ) : (
            <PerformanceChart data={chartData} width={800} height={250} />
          )}
        </Paper>

        {/* Holdings Table */}
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }}></Table.Th>
                <Table.Th>Ticker</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Units</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Avg Cost</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Current Price</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Total Value</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Gain/Loss</Table.Th>
                <Table.Th>Purchase Date</Table.Th>
                <Table.Th style={{ width: 40 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {enrichedHoldings.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Center py="xl">
                      <Stack align="center" gap="sm">
                        <Text c="dimmed">No holdings yet</Text>
                        <Button
                          size="sm"
                          variant="light"
                          leftSection={<IconPlus size={14} />}
                          onClick={handleOpenAddModal}
                        >
                          Add your first holding
                        </Button>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                enrichedHoldings.map((holding) => (
                  <Table.Tr
                    key={holding.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, holding)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, holding)}
                    onDragEnd={handleDragEnd}
                    style={{
                      opacity: draggedItem?.id === holding.id ? 0.5 : 1,
                      cursor: "grab",
                    }}
                  >
                    <Table.Td style={{ cursor: "grab" }}>
                      <ActionIcon variant="subtle" size="sm" style={{ cursor: "grab" }}>
                        <IconGripVertical size={16} />
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>{holding.ticker}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      {holding.units.toLocaleString()}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      ${holding.purchasePrice?.toFixed(2) || "—"}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      ${holding.currentPrice.toFixed(2)}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Text fw={500}>
                        ${holding.totalValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Group gap={4} justify="flex-end">
                        <Badge
                          color={holding.gainLoss >= 0 ? "green" : "red"}
                          variant="light"
                          size="sm"
                        >
                          {holding.gainLoss >= 0 ? "+" : ""}
                          {holding.gainLossPercent.toFixed(2)}%
                        </Badge>
                        <Text size="sm" c={holding.gainLoss >= 0 ? "green" : "red"}>
                          {holding.gainLoss >= 0 ? "+" : ""}$
                          {holding.gainLoss.toFixed(2)}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {holding.purchaseDate?.toDate?.()?.toLocaleDateString() ||
                          new Date(holding.purchaseDate).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" size="sm">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={() => handleOpenEditModal(holding)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleDelete(holding.id, holding.ticker)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        {enrichedHoldings.length > 0 && (
          <Text size="sm" c="dimmed">
            {enrichedHoldings.length} {enrichedHoldings.length === 1 ? "holding" : "holdings"}
          </Text>
        )}
      </Stack>

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => !saving && setModalOpened(false)}
        title={editingHolding ? "Edit Holding" : "Add Holding"}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Ticker Symbol"
            placeholder="e.g., AAPL, GOOGL"
            value={formData.ticker}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, ticker: e.currentTarget.value.toUpperCase() }))
            }
            required
            disabled={saving}
          />
          <NumberInput
            label="Number of Units"
            placeholder="10"
            value={formData.units}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, units: typeof value === "number" ? value : 1 }))
            }
            min={0.0001}
            step={1}
            decimalScale={4}
            required
            disabled={saving}
          />
          <NumberInput
            label="Purchase Price (per unit)"
            placeholder="150.00"
            value={formData.purchasePrice}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                purchasePrice: typeof value === "number" ? value : 0,
              }))
            }
            min={0}
            decimalScale={2}
            prefix="$"
            disabled={saving}
          />
          <DatePickerInput
            label="Purchase Date"
            placeholder="Pick date"
            value={formData.purchaseDate}
            onChange={(date) => setFormData((prev) => ({ ...prev, purchaseDate: date }))}
            maxDate={new Date()}
            disabled={saving}
          />

          <Alert color="blue" variant="light" title="Price Data">
            Prices are fetched from FMP API in real-time. Use the "Refresh Quotes" button to update.
          </Alert>

          <Button onClick={handleSave} loading={saving} fullWidth>
            {editingHolding ? "Update Holding" : "Add Holding"}
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}

