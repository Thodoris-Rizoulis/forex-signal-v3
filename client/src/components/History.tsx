import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "../components/Layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  fetchOpportunities,
  fetchPairs,
  fetchStrategies,
  type HistoricalOpportunity,
} from "../services/api";
import { PageHeader } from "../components/PageHeader";

interface Pair {
  id: number;
  currencyCode: string;
  targetCurrency: string;
  active: boolean;
}

interface Strategy {
  id: number;
  name: string;
  active: boolean;
}

interface PerformanceStats {
  totalOpportunities: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
}

export function History() {
  const [opportunities, setOpportunities] = useState<HistoricalOpportunity[]>(
    []
  );
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    totalOpportunities: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    totalPnL: 0,
    avgPnL: 0,
  });

  const [filters, setFilters] = useState({
    pair_id: "",
    strategy_id: "",
    start_date: "",
    end_date: "",
    signal_type: "",
    evaluation_status: "",
  });

  const lastFiltersRef = useRef<string>("");

  const limit = pageSize;

  const calculatePerformanceStats = useCallback(
    (opps: HistoricalOpportunity[]) => {
      const stats: PerformanceStats = {
        totalOpportunities: opps.length,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0,
      };

      opps.forEach((opp) => {
        if (opp.evaluation === 1) {
          // Win
          stats.winCount++;
        } else if (opp.evaluation === 0) {
          // Loss
          stats.lossCount++;
        }

        // Add P&L to total (positive for wins, negative for losses)
        if (opp.pnlAmount !== undefined && opp.pnlAmount !== null) {
          stats.totalPnL += opp.pnlAmount;
        }
      });

      stats.winRate =
        stats.totalOpportunities > 0
          ? (stats.winCount / stats.totalOpportunities) * 100
          : 0;
      stats.avgPnL =
        stats.totalOpportunities > 0
          ? stats.totalPnL / stats.totalOpportunities
          : 0;

      setPerformanceStats(stats);
    },
    []
  );

  // Function to load statistics for all filtered data
  const loadStatistics = useCallback(
    async (currentFilters: typeof filters) => {
      try {
        const allFilteredData = await fetchOpportunities({
          page: 1,
          limit: 5000, // Large limit to get most filtered data for statistics
          pair_id: currentFilters.pair_id
            ? parseInt(currentFilters.pair_id)
            : undefined,
          strategy_id: currentFilters.strategy_id
            ? parseInt(currentFilters.strategy_id)
            : undefined,
          start_date: currentFilters.start_date || undefined,
          end_date: currentFilters.end_date || undefined,
          signal_type:
            (currentFilters.signal_type as "BUY" | "SELL") || undefined,
          evaluation_status:
            currentFilters.evaluation_status &&
            currentFilters.evaluation_status !== "all"
              ? (currentFilters.evaluation_status as "WIN" | "LOSS" | "PENDING")
              : undefined,
        });
        calculatePerformanceStats(allFilteredData.opportunities);
      } catch (error) {
        console.error("Error loading statistics:", error);
      }
    },
    [calculatePerformanceStats]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load opportunities with filters - only evaluated opportunities
      const opportunitiesData = await fetchOpportunities({
        page: currentPage,
        limit,
        pair_id: filters.pair_id ? parseInt(filters.pair_id) : undefined,
        strategy_id: filters.strategy_id
          ? parseInt(filters.strategy_id)
          : undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        signal_type: (filters.signal_type as "BUY" | "SELL") || undefined,
        evaluation_status:
          filters.evaluation_status && filters.evaluation_status !== "all"
            ? (filters.evaluation_status as "WIN" | "LOSS" | "PENDING")
            : undefined, // When "all" or empty, don't filter - backend defaults to evaluated only
      });

      // No need to filter on frontend anymore since API handles it
      setOpportunities(opportunitiesData.opportunities);
      setTotalPages(
        opportunitiesData.pagination?.totalPages ||
          Math.ceil(opportunitiesData.total / limit)
      );
      setTotalOpportunities(opportunitiesData.total);

      // Load pairs and strategies for filters (only once)
      if (pairs.length === 0) {
        const [pairsData, strategiesData] = await Promise.all([
          fetchPairs(),
          fetchStrategies(),
        ]);
        setPairs(pairsData);
        setStrategies(strategiesData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, limit, pairs.length]);

  // Initial data load on component mount
  useEffect(() => {
    loadData();
  }, []); // Empty dependency array - runs only on mount

  useEffect(() => {
    loadData();
  }, [currentPage, filters, pageSize, loadData]);

  // Separate effect to load statistics when filters change
  useEffect(() => {
    const currentFiltersKey = JSON.stringify(filters);
    if (currentFiltersKey !== lastFiltersRef.current && pairs.length > 0) {
      lastFiltersRef.current = currentFiltersKey;
      loadStatistics(filters);
    }
  }, [filters, loadStatistics, pairs.length]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (value: number) => {
    return value.toFixed(5);
  };

  const getSignalType = (details: string) => {
    const detailsLower = details.toLowerCase();
    if (detailsLower.includes("buy") || detailsLower.includes("oversold")) {
      return {
        type: "BUY",
        variant: "default" as const,
        bgClass: "bg-green-100 text-green-800 border-green-300",
        icon: "↗",
      };
    }
    if (detailsLower.includes("sell") || detailsLower.includes("overbought")) {
      return {
        type: "SELL",
        variant: "destructive" as const,
        bgClass: "bg-red-100 text-red-800 border-red-300",
        icon: "↘",
      };
    }
    return {
      type: "SIGNAL",
      variant: "secondary" as const,
      bgClass: "bg-amber-100 text-amber-800 border-amber-300",
      icon: "→",
    };
  };

  const getEvaluationDisplay = (opportunity: HistoricalOpportunity) => {
    if (opportunity.evaluation === 1) {
      const profit =
        opportunity.evaluationPrice && opportunity.entryRate
          ? opportunity.evaluationPrice - opportunity.entryRate
          : 0;
      return {
        status: "WIN",
        variant: "default" as const,
        bgClass: "bg-green-100 text-green-800 border-green-300",
        value: profit > 0 ? `+${formatCurrency(profit)}` : "WIN",
      };
    } else if (opportunity.evaluation === 0) {
      const loss =
        opportunity.evaluationPrice && opportunity.entryRate
          ? opportunity.entryRate - opportunity.evaluationPrice
          : 0;
      return {
        status: "LOSS",
        variant: "destructive" as const,
        bgClass: "bg-red-100 text-red-800 border-red-300",
        value: loss > 0 ? `-${formatCurrency(loss)}` : "LOSS",
      };
    }
    return {
      status: "PENDING",
      variant: "secondary" as const,
      bgClass: "bg-amber-100 text-amber-800 border-amber-300",
      value: "PENDING",
    };
  };

  const getPairDisplay = (opportunity: HistoricalOpportunity) => {
    // Use data from the opportunity object if available, otherwise fall back to pairs array
    if (opportunity.pair) {
      return `${opportunity.pair.currencyCode}/${opportunity.pair.targetCurrency}`;
    }
    const pair = pairs.find((p) => p.id === opportunity.pair_id);
    return pair
      ? `${pair.currencyCode}/${pair.targetCurrency}`
      : `Pair ${opportunity.pair_id}`;
  };

  const getStrategyDisplay = (opportunity: HistoricalOpportunity) => {
    // Use data from the opportunity object if available, otherwise fall back to strategies array
    if (opportunity.strategy) {
      return opportunity.strategy.name;
    }
    const strategy = strategies.find((s) => s.id === opportunity.strategy_id);
    return strategy ? strategy.name : `Strategy ${opportunity.strategy_id}`;
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Professional Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            title="Trading History"
            subtitle="Historical trading signals and performance analysis"
          />
        </div>

        {/* P/L Information Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">
                Profit/Loss Calculation
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                All P/L values are calculated for a{" "}
                <strong>standard lot (100,000 units)</strong> and displayed in
                USD. This represents the theoretical profit or loss if you were
                trading one standard lot position.
              </p>
            </div>
          </div>
        </div>

        {/* Performance Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="forex-card-premium group hover:scale-[1.02] transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-blue-600"
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
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total Trades
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900 price-display">
                  {performanceStats.totalOpportunities}
                </div>
              </div>
            </div>
          </div>

          <div className="forex-card-premium group hover:scale-[1.02] transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-green-600"
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
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Win Rate
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900 price-display">
                  {performanceStats.winRate.toFixed(1)}%
                </div>
                <div className="flex items-center text-sm">
                  <span className="profit-text font-medium">
                    {performanceStats.winCount}W / {performanceStats.lossCount}L
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="forex-card-premium group hover:scale-[1.02] transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-blue-600"
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
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Avg P/L
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900 price-display">
                  {performanceStats.avgPnL >= 0 ? "+" : ""}$
                  {performanceStats.avgPnL.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">Standard Lot</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="forex-card">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Filter Trading History
            </h3>
            <p className="text-slate-600">
              Refine your search by currency pair, strategy, signal type, and
              evaluation status
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Pair
                </label>
                <Select
                  value={filters.pair_id || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("pair_id", value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Pairs" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Pairs</SelectItem>
                    {pairs.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id.toString()}>
                        <span className="font-mono">
                          {pair.currencyCode}/{pair.targetCurrency}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strategy
                </label>
                <Select
                  value={filters.strategy_id || "all"}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "strategy_id",
                      value === "all" ? "" : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Strategies" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Strategies</SelectItem>
                    {strategies.map((strategy) => (
                      <SelectItem
                        key={strategy.id}
                        value={strategy.id.toString()}
                      >
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signal Type
                </label>
                <Select
                  value={filters.signal_type || "all"}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "signal_type",
                      value === "all" ? "" : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Signals" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg">
                    <SelectItem value="all">All Signals</SelectItem>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evaluation
                </label>
                <Select
                  value={filters.evaluation_status || "all"}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "evaluation_status",
                      value === "all" ? "" : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Results" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg">
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="WIN">WIN</SelectItem>
                    <SelectItem value="LOSS">LOSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) =>
                    handleFilterChange("start_date", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) =>
                    handleFilterChange("end_date", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Opportunities Table */}
        <div className="forex-card">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Historical Opportunities
                </h3>
                <p className="text-slate-600 mt-1">
                  {opportunities.length} evaluated trading signals
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600">Show:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-lg">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  No Evaluated Signals Found
                </h3>
                <p className="text-slate-600 mb-4 max-w-md mx-auto">
                  No trading signals match your current filters, or signals are
                  still being evaluated.
                </p>
              </div>
            ) : (
              <>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-40">Time</TableHead>
                      <TableHead className="min-w-20">Pair</TableHead>
                      <TableHead className="min-w-28">Strategy</TableHead>
                      <TableHead className="min-w-16">Signal</TableHead>
                      <TableHead className="min-w-24">Entry Rate</TableHead>
                      <TableHead className="min-w-24">TP/SL</TableHead>
                      <TableHead className="min-w-24">Exit Rate</TableHead>
                      <TableHead className="min-w-16">Result</TableHead>
                      <TableHead className="min-w-20">P/L (USD)</TableHead>
                      <TableHead className="min-w-32">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.map((opportunity) => {
                      const signalInfo = getSignalType(opportunity.details);
                      const evaluationInfo = getEvaluationDisplay(opportunity);

                      return (
                        <TableRow
                          key={opportunity.id}
                          className="hover:bg-slate-50"
                        >
                          <TableCell className="text-sm font-mono">
                            {formatDate(opportunity.timestamp)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {getPairDisplay(opportunity)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getStrategyDisplay(opportunity)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`font-bold ${signalInfo.bgClass} border`}
                            >
                              {signalInfo.icon} {signalInfo.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {opportunity.entryRate
                              ? formatCurrency(opportunity.entryRate)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="space-y-1">
                              <div className="text-green-600 font-mono">
                                TP:{" "}
                                {opportunity.takeProfitRate
                                  ? formatCurrency(opportunity.takeProfitRate)
                                  : "-"}
                              </div>
                              <div className="text-red-600 font-mono">
                                SL:{" "}
                                {opportunity.stopLossRate
                                  ? formatCurrency(opportunity.stopLossRate)
                                  : "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {opportunity.evaluationPrice
                              ? formatCurrency(opportunity.evaluationPrice)
                              : opportunity.evaluation === null
                              ? "PENDING"
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={evaluationInfo.variant}
                              className="font-bold"
                            >
                              {evaluationInfo.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span
                                className={`font-bold font-mono ${
                                  opportunity.pnlAmount !== undefined &&
                                  opportunity.pnlAmount !== null
                                    ? opportunity.pnlAmount >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {opportunity.pnlAmount !== undefined &&
                                opportunity.pnlAmount !== null
                                  ? `${
                                      opportunity.pnlAmount >= 0 ? "+" : ""
                                    }$${opportunity.pnlAmount.toFixed(2)}`
                                  : opportunity.evaluation === null
                                  ? "PENDING"
                                  : "N/A"}
                              </span>
                              {opportunity.pnlAmount !== undefined &&
                                opportunity.pnlAmount !== null && (
                                  <span className="text-xs text-slate-500 mt-1">
                                    Standard Lot
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {opportunity.details}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 px-6 pb-6">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <span className="text-sm text-slate-500">
                        ({totalOpportunities} total)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
