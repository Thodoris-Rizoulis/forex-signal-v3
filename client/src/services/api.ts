// API service for communicating with the backend
const API_BASE_URL = import.meta.env.DEV ? "http://localhost:3000" : "";

export interface HistoricalOpportunity {
  id: number;
  pair_id: number;
  strategy_id: number;
  consolidation_id: number;
  details: string;
  timestamp: string;
  evaluation?: number; // 1 for win, 0 for loss, null for pending
  evaluation_at?: string;
  entryRate?: number;
  stopLossRate?: number;
  takeProfitRate?: number;
  evaluationPrice?: number;
  pnlAmount?: number;
  pair?: {
    targetCurrency: string;
    currencyCode: string;
  };
  strategy?: {
    name: string;
  };
  consolidation?: {
    resistance: number;
    support: number;
  };
}

export interface Consolidation {
  id: number;
  pairId: number;
  trendDirection: "UP" | "DOWN";
  startTimestamp: string;
  endTimestamp?: string;
  resistanceLevel: number;
  supportLevel: number;
  brokenAt?: string;
  breakoutDirection?: "UP" | "DOWN";
  isTrendDirection?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsolidationsResponse {
  consolidations: Consolidation[];
  total: number;
}

export interface OpportunitiesResponse {
  opportunities: HistoricalOpportunity[];
  total: number;
  page: number;
  limit: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function fetchOpportunities(params: {
  page?: number;
  limit?: number;
  pair_id?: number;
  strategy_id?: number;
  start_date?: string;
  end_date?: string;
  signal_type?: "BUY" | "SELL";
  evaluation_status?: "WIN" | "LOSS" | "PENDING";
}): Promise<OpportunitiesResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.pair_id) searchParams.set("pair_id", params.pair_id.toString());
  if (params.strategy_id)
    searchParams.set("strategy_id", params.strategy_id.toString());
  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);
  if (params.signal_type) searchParams.set("signal_type", params.signal_type);
  if (params.evaluation_status)
    searchParams.set("evaluation_status", params.evaluation_status);

  const response = await fetch(
    `${API_BASE_URL}/api/opportunities?${searchParams}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch opportunities: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchPairs() {
  const response = await fetch(`${API_BASE_URL}/api/pairs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pairs: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchStrategies() {
  const response = await fetch(`${API_BASE_URL}/api/strategies`);
  if (!response.ok) {
    throw new Error(`Failed to fetch strategies: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchConsolidations(params: {
  pair_id?: number;
  start_date?: string;
  end_date?: string;
  status?: "active" | "broken";
}): Promise<ConsolidationsResponse> {
  const searchParams = new URLSearchParams();

  if (params.pair_id) searchParams.set("pair_id", params.pair_id.toString());
  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);
  if (params.status) searchParams.set("status", params.status);

  const response = await fetch(
    `${API_BASE_URL}/api/consolidations?${searchParams}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch consolidations: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchRates(params: {
  page?: number;
  limit?: number;
  pair_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<{ rates: any[]; total: number; pagination: any }> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.pair_id) searchParams.set("pair_id", params.pair_id.toString());
  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);

  const response = await fetch(`${API_BASE_URL}/api/rates?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch rates: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchTimeSeriesRates(
  pairId: number,
  params: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    page?: number;
    interval?: string;
  }
): Promise<{ pairId: number; rates: any[]; count: number; warning?: string }> {
  const searchParams = new URLSearchParams();

  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.interval) searchParams.set("interval", params.interval);

  const response = await fetch(
    `${API_BASE_URL}/api/rates/timeseries/${pairId}?${searchParams}`
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch time series rates: ${response.statusText}`
    );
  }
  return response.json();
}

// Testing API functions
export async function testTrendDetection(
  pairId: number,
  startDate: string,
  endDate: string
) {
  const response = await fetch(`${API_BASE_URL}/api/test/trend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairId, startDate, endDate }),
  });

  if (!response.ok) {
    throw new Error(`Failed to test trend detection: ${response.statusText}`);
  }

  return response.json();
}

export async function testConsolidationDetection(
  pairId: number,
  startDate: string,
  endDate: string
) {
  const response = await fetch(`${API_BASE_URL}/api/test/consolidation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairId, startDate, endDate }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to test consolidation detection: ${response.statusText}`
    );
  }

  return response.json();
}

export async function testConsolidationBreakoutFlow(
  pairId: number,
  startDate: string,
  endDate: string
) {
  const response = await fetch(
    `${API_BASE_URL}/api/test/consolidation-breakout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairId, startDate, endDate }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to test consolidation breakout flow: ${response.statusText}`
    );
  }

  return response.json();
}
