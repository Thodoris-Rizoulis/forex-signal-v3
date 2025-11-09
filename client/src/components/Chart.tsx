import { useState, useEffect, useRef } from "react";
import { Layout } from "../components/Layout";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type UTCTimestamp,
  type CandlestickData,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { useToast } from "../components/Toast";
import {
  fetchPairs,
  fetchTimeSeriesRates,
  testConsolidationBreakoutFlow,
  fetchConsolidations,
  type Consolidation,
} from "../services/api";

interface Pair {
  id: number;
  currencyCode: string;
  targetCurrency: string;
  active: boolean;
}

interface Rate {
  id: number;
  pair_id: number;
  rate: number;
  timestamp: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

const TIME_RANGES = [
  { label: "1 Hour", value: "1h", hours: 1 },
  { label: "6 Hours", value: "6h", hours: 6 },
  { label: "24 Hours", value: "24h", hours: 24 },
  { label: "7 Days", value: "7d", hours: 168 },
  { label: "30 Days", value: "30d", hours: 720 },
];

export function Chart() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("1h");
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [chartReady, setChartReady] = useState(false);

  // Testing-related state
  const [testingMode, setTestingMode] = useState(false);
  const [testStartDate, setTestStartDate] = useState<string>("");
  const [testEndDate, setTestEndDate] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    time: string;
  }>({ visible: false, x: 0, y: 0, time: "" });

  // Consolidation state
  const [consolidations, setConsolidations] = useState<Consolidation[]>([]);
  const [consolidationsLoading, setConsolidationsLoading] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const consolidationSeriesRef = useRef<ISeriesApi<"Line">[]>([]);

  const { showToast } = useToast();

  // Fetch available pairs on component mount
  useEffect(() => {
    const loadPairs = async () => {
      try {
        const data = await fetchPairs();
        const activePairs = data.filter((pair: Pair) => pair.active);
        setPairs(activePairs);

        // Auto-select first pair and load data
        if (activePairs.length > 0) {
          const firstPairId = activePairs[0].id.toString();
          setSelectedPair(firstPairId);
        }
      } catch (error) {
        console.error("Error fetching pairs:", error);
        showToast("Failed to load currency pairs", "error");
      }
    };

    loadPairs();
  }, []);

  // Auto-refresh effect (every 60 seconds when enabled)
  useEffect(() => {
    if (!autoRefresh || !selectedPair || !chartReady) return;

    const interval = setInterval(() => {
      fetchChartData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedPair, selectedTimeRange, chartReady]);

  // Load data when pair or time range changes (only if chart is ready)
  useEffect(() => {
    if (selectedPair && chartReady) {
      fetchChartData();
    } else {
      // Clear data when no pair is selected
      setConsolidations([]);
    }
  }, [selectedPair, selectedTimeRange, chartReady]);

  // Initialize chart
  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      const timer = setTimeout(async () => {
        const container = chartContainerRef.current;
        if (!container || chartRef.current) return;

        try {
          const chart = createChart(container, {
            layout: {
              background: { color: "#ffffff" },
              textColor: "#333333",
            },
            width: container.clientWidth || 800,
            height: 600,
            handleScroll: {
              mouseWheel: true,
              pressedMouseMove: true,
            },
            handleScale: {
              axisPressedMouseMove: true,
              mouseWheel: true,
            },
            crosshair: {
              vertLine: {
                labelVisible: false,
              },
            },
          });

          const lineSeries = chart.addSeries(CandlestickSeries, {
            wickVisible: true,
            borderVisible: true,
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderUpColor: "#26a69a",
            borderDownColor: "#ef5350",
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            priceFormat: {
              type: "price",
              precision: 5,
              minMove: 0.00001,
            },
          });

          chartRef.current = chart;
          lineSeriesRef.current = lineSeries;
          setChartReady(true); // Mark chart as ready

          // Subscribe to crosshair move for tooltip
          chart.subscribeCrosshairMove((param) => {
            if (param.time && param.point) {
              const date = new Date(Number(param.time) * 1000);
              date.setMinutes(0, 0, 0); // Set to start of hour
              const day = date.toLocaleDateString("en-US", {
                weekday: "short",
              });
              const dayNum = date.getDate();
              const month = date.toLocaleDateString("en-US", {
                month: "short",
              });
              const year = date.getFullYear().toString().slice(-2);
              const time = date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              const formatted = `${day} ${dayNum} ${month} '${year} ${time}`;

              // Check if hovering over a consolidation
              let consolidationInfo = "";
              const hoverTime = Number(param.time);

              const consolidation = consolidations.find((c) => {
                const startTime = new Date(c.startTimestamp).getTime() / 1000;
                const endTime = c.endTimestamp
                  ? new Date(c.endTimestamp).getTime() / 1000
                  : Date.now() / 1000;
                return hoverTime >= startTime && hoverTime <= endTime;
              });

              if (consolidation) {
                const duration = consolidation.endTimestamp
                  ? Math.round(
                      (new Date(consolidation.endTimestamp).getTime() -
                        new Date(consolidation.startTimestamp).getTime()) /
                        (1000 * 60 * 60)
                    )
                  : Math.round(
                      (Date.now() -
                        new Date(consolidation.startTimestamp).getTime()) /
                        (1000 * 60 * 60)
                    );

                consolidationInfo = `\n\nConsolidation (${
                  consolidation.brokenAt ? "BROKEN" : "ACTIVE"
                }):
Duration: ${duration}h
Support: ${consolidation.supportLevel.toFixed(5)}
Resistance: ${consolidation.resistanceLevel.toFixed(5)}
Trend: ${consolidation.trendDirection}`;
              }

              setTooltip({
                visible: true,
                x: param.point.x,
                y: param.point.y,
                time: formatted + consolidationInfo,
              });
            } else {
              setTooltip({ visible: false, x: 0, y: 0, time: "" });
            }
          });

          // Handle resize
          const handleResize = () => {
            if (container && chartRef.current) {
              chartRef.current.applyOptions({
                width: Math.max(container.clientWidth, 400),
              });
            }
          };

          window.addEventListener("resize", handleResize);

          return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) {
              chartRef.current.remove();
              chartRef.current = null;
              lineSeriesRef.current = null;
              consolidationSeriesRef.current.forEach((series) => {
                chart.removeSeries(series);
              });
              consolidationSeriesRef.current = [];
            }
          };
        } catch (error) {
          console.error("Error creating chart:", error);
          showToast("Failed to initialize chart", "error");
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  // Update chart data
  useEffect(() => {
    if (lineSeriesRef.current && chartData.length > 0) {
      try {
        lineSeriesRef.current.setData(chartData);

        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (error) {
        console.error("Failed to update chart:", error);
        showToast("Failed to update chart data", "error");
      }
    }
  }, [chartData]);

  // Update consolidation visualizations when data changes
  useEffect(() => {
    updateConsolidationVisualizations();
  }, [consolidations]);

  const fetchChartData = async () => {
    if (!selectedPair) return;

    setLoading(true);
    try {
      // Get data based on selected time range
      const selectedRange = TIME_RANGES.find(
        (range) => range.value === selectedTimeRange
      );
      const hoursBack = selectedRange ? selectedRange.hours : 1; // Default to 1 hour

      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - hoursBack * 60 * 60 * 1000
      );

      const data = await fetchTimeSeriesRates(parseInt(selectedPair), {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: Math.min(hoursBack * 2, 5000), // Dynamic limit based on hours, max 5000
        interval: "1h", // Request hourly aggregated data
      });

      if (data.warning) {
        showToast(data.warning, "warning");
      }

      // Convert rates to candlestick chart format and sort by time (ascending)
      const candlestickData: CandlestickData[] = data.rates
        .map((rate: Rate) => ({
          time: (new Date(rate.timestamp).getTime() / 1000) as UTCTimestamp,
          open: parseFloat(String(rate.open || rate.rate)),
          high: parseFloat(String(rate.high || rate.rate)),
          low: parseFloat(String(rate.low || rate.rate)),
          close: parseFloat(String(rate.close || rate.rate)),
        }))
        .sort((a, b) => a.time - b.time); // Sort by time ascending

      setChartData(candlestickData);

      // Also fetch consolidations for the same time range
      await fetchConsolidationsData();
    } catch (error) {
      console.error("Error fetching chart data:", error);
      showToast("Failed to load chart data", "error");
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidationsData = async () => {
    if (!selectedPair) return;

    setConsolidationsLoading(true);
    try {
      // Get data based on selected time range
      const selectedRange = TIME_RANGES.find(
        (range) => range.value === selectedTimeRange
      );
      const hoursBack = selectedRange ? selectedRange.hours : 1; // Default to 1 hour

      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - hoursBack * 60 * 60 * 1000
      );

      const data = await fetchConsolidations({
        pair_id: parseInt(selectedPair),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      setConsolidations(data.consolidations);
    } catch (error) {
      console.error("Error fetching consolidations:", error);
      showToast("Failed to load consolidations", "error");
      setConsolidations([]);
    } finally {
      setConsolidationsLoading(false);
    }
  };

  const updateConsolidationVisualizations = () => {
    if (!chartRef.current) return;

    // Clear existing consolidation series
    consolidationSeriesRef.current.forEach((series) => {
      chartRef.current!.removeSeries(series);
    });
    consolidationSeriesRef.current = [];

    if (consolidations.length === 0) return;

    // Create new series for each consolidation
    consolidations.forEach((consolidation) => {
      // Create support line series
      const supportSeries = chartRef.current!.addSeries(LineSeries, {
        color: "#ff6b35",
        lineWidth: 2,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      // Create resistance line series
      const resistanceSeries = chartRef.current!.addSeries(LineSeries, {
        color: "#ff6b35",
        lineWidth: 2,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      // Add to series array
      consolidationSeriesRef.current.push(supportSeries, resistanceSeries);

      const startTime = Math.floor(
        new Date(consolidation.startTimestamp).getTime() / 1000
      ) as UTCTimestamp;
      const endTime = consolidation.endTimestamp
        ? (Math.floor(
            new Date(consolidation.endTimestamp).getTime() / 1000
          ) as UTCTimestamp)
        : (Math.floor(Date.now() / 1000) as UTCTimestamp);

      const supportLevel = consolidation.supportLevel;
      const resistanceLevel = consolidation.resistanceLevel;

      // Set data for support line
      supportSeries.setData([
        { time: startTime, value: supportLevel },
        { time: endTime, value: supportLevel },
      ]);

      // Set data for resistance line
      resistanceSeries.setData([
        { time: startTime, value: resistanceLevel },
        { time: endTime, value: resistanceLevel },
      ]);
    });
  };

  const handlePairChange = (pairId: string) => {
    setSelectedPair(pairId);
  };

  const selectedPairData = pairs.find((p) => p.id.toString() === selectedPair);

  const runTest = async () => {
    if (!selectedPair || !testStartDate || !testEndDate) return;

    setTesting(true);
    try {
      const results = await testConsolidationBreakoutFlow(
        parseInt(selectedPair),
        testStartDate,
        testEndDate
      );
      setTestResults(results);
      showToast("Consolidation breakout flow test completed", "success");
    } catch (error) {
      console.error("Test failed:", error);
      showToast("Test failed to run", "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Forex Chart"
          subtitle={`Real-time forex rates over the last ${
            TIME_RANGES.find(
              (range) => range.value === selectedTimeRange
            )?.label.toLowerCase() || "hour"
          }`}
        />

        {/* Simple Controls */}
        <Card className="forex-card">
          <CardHeader>
            <CardTitle className="text-lg">Chart Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Currency Pair
                </label>
                <Select value={selectedPair} onValueChange={handlePairChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select pair">
                      {selectedPairData
                        ? `${selectedPairData.currencyCode}/${selectedPairData.targetCurrency}`
                        : "Select pair"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-md">
                    {pairs.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id.toString()}>
                        {pair.currencyCode}/{pair.targetCurrency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Time Range
                </label>
                <Select
                  value={selectedTimeRange}
                  onValueChange={setSelectedTimeRange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-md">
                    {TIME_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-refresh Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="autoRefresh"
                  className="text-sm font-medium text-slate-700"
                >
                  Auto-refresh (every 60s)
                </label>
              </div>

              {/* Testing Mode Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="testingMode"
                  checked={testingMode}
                  onChange={(e) => setTestingMode(e.target.checked)}
                  className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <label
                  htmlFor="testingMode"
                  className="text-sm font-medium text-slate-700"
                >
                  Testing Mode
                </label>
              </div>

              {/* Testing Controls */}
              {testingMode && (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="datetime-local"
                        value={testStartDate}
                        onChange={(e) => setTestStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="datetime-local"
                        value={testEndDate}
                        onChange={(e) => setTestEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={runTest}
                    disabled={testing || !testStartDate || !testEndDate}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {testing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Running Test...
                      </>
                    ) : (
                      "Run Test"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="forex-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedPairData
                    ? `${selectedPairData.currencyCode}/${
                        selectedPairData.targetCurrency
                      } - Last ${
                        TIME_RANGES.find(
                          (range) => range.value === selectedTimeRange
                        )?.label || "Hour"
                      }`
                    : "Select a currency pair"}
                </h3>
                {loading ||
                  (consolidationsLoading && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Loading chart data...</span>
                    </div>
                  ))}
              </div>

              {/* Simple Chart Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    if (chartRef.current) {
                      chartRef.current.timeScale().fitContent();
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={!chartData.length}
                >
                  Fit to Screen
                </Button>
                <Button
                  onClick={() => {
                    if (chartRef.current) {
                      chartRef.current.timeScale().scrollToPosition(0, true);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={!chartData.length}
                >
                  Reset View
                </Button>
              </div>

              <div
                ref={chartContainerRef}
                className="w-full border border-slate-200 rounded-lg bg-white"
                style={{
                  height: "600px",
                  minWidth: "400px",
                  position: "relative",
                }}
              >
                {tooltip.visible && (
                  <div
                    style={{
                      position: "absolute",
                      left: tooltip.x + 10,
                      top: tooltip.y - 10,
                      background: "rgba(0,0,0,0.8)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      pointerEvents: "none",
                      zIndex: 1000,
                    }}
                  >
                    {tooltip.time}
                  </div>
                )}
              </div>

              {chartData.length === 0 && !loading && (
                <div className="flex items-center justify-center h-[600px] text-slate-500">
                  <div className="text-center">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <p>No chart data available</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Select a currency pair to view the chart
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults && testingMode && (
          <Card className="forex-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Test Results - Consolidation Breakout Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Trend Analysis */}
                {testResults.trendAnalysis && (
                  <div>
                    <h4 className="text-md font-semibold text-slate-900 mb-2">
                      Trend Analysis
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <div className="text-sm text-slate-600">
                            Trend Status
                          </div>
                          <div
                            className={`text-lg font-semibold ${
                              testResults.trendAnalysis.isTrending
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {testResults.trendAnalysis.isTrending
                              ? `TRENDING ${
                                  testResults.trendAnalysis.direction || ""
                                }`
                              : "NOT TRENDING"}
                          </div>
                          {testResults.trendAnalysis.adx && (
                            <div className="text-sm text-slate-500 mt-1">
                              ADX: {testResults.trendAnalysis.adx.toFixed(2)}
                            </div>
                          )}
                          {testResults.trendAnalysis.error && (
                            <div className="text-sm text-orange-600 mt-1">
                              {testResults.trendAnalysis.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consolidations */}
                {testResults.consolidations &&
                  testResults.consolidations.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 mb-2">
                        Consolidations Found (
                        {testResults.consolidations.length})
                      </h4>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {testResults.consolidations.map(
                          (consolidation: any, index: number) => (
                            <div
                              key={index}
                              className="bg-slate-50 p-3 rounded-lg"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="text-sm font-medium text-slate-900">
                                  Consolidation #{consolidation.id}
                                </div>
                                <div
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    consolidation.brokenAt
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {consolidation.brokenAt ? "BROKEN" : "ACTIVE"}
                                </div>
                              </div>
                              <div className="text-sm text-slate-600 space-y-1">
                                <div>
                                  Duration:{" "}
                                  {new Date(
                                    consolidation.startTimestamp
                                  ).toLocaleDateString()}{" "}
                                  -{" "}
                                  {consolidation.endTimestamp
                                    ? new Date(
                                        consolidation.endTimestamp
                                      ).toLocaleDateString()
                                    : "Ongoing"}
                                </div>
                                <div>
                                  Range:{" "}
                                  {consolidation.supportLevel?.toFixed(5)} -{" "}
                                  {consolidation.resistanceLevel?.toFixed(5)}
                                </div>
                                {consolidation.breakoutDirection && (
                                  <div>
                                    Breakout: {consolidation.breakoutDirection}
                                  </div>
                                )}
                                {consolidation.noOpportunityReason && (
                                  <div className="text-orange-600 font-medium">
                                    ⚠️ {consolidation.noOpportunityReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Opportunities */}
                {testResults.opportunities &&
                  testResults.opportunities.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 mb-2">
                        Opportunities Created (
                        {testResults.opportunities.length})
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {testResults.opportunities.map(
                          (opportunity: any, index: number) => (
                            <div
                              key={index}
                              className="bg-green-50 p-3 rounded-lg border border-green-200"
                            >
                              <div className="text-sm font-medium text-green-900">
                                Opportunity #{opportunity.id} -{" "}
                                {opportunity.signalType}
                              </div>
                              <div className="text-sm text-green-700 mt-1">
                                Entry: {opportunity.entryRate?.toFixed(5)}, SL:{" "}
                                {opportunity.stopLossRate?.toFixed(5)}, TP:{" "}
                                {opportunity.takeProfitRate?.toFixed(5)}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-sm text-slate-600">Consolidations</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {testResults.consolidations?.length || 0}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600">Opportunities</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {testResults.opportunities?.length || 0}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-green-600">Trend Status</div>
                    <div className="text-lg font-bold text-green-700">
                      {testResults.trendAnalysis?.confirmedTrend?.isTrending
                        ? "TRENDING"
                        : "NOT TRENDING"}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm text-purple-600">Test Date</div>
                    <div className="text-sm font-bold text-purple-700">
                      {testResults.analysisTimestamp
                        ? new Date(
                            testResults.analysisTimestamp
                          ).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
