/**
 * Session analysis utilities for Forex trading
 * Different trading sessions have different volatility and reliability characteristics
 */

export type TradingSession = "london" | "new_york" | "asian" | "overnight";

export function getCurrentSession(): TradingSession {
  const hour = new Date().getUTCHours();

  if (hour >= 8 && hour < 16) return "london"; // 8:00-15:59 UTC (London session)
  if (hour >= 13 && hour < 21) return "new_york"; // 13:00-20:59 UTC (New York session)
  if (hour >= 0 && hour < 8) return "asian"; // 00:00-07:59 UTC (Asian session)
  return "overnight"; // 21:00-23:59 UTC (Overnight/quiet hours)
}

export function getSessionAtTime(timestamp: Date): TradingSession {
  const hour = timestamp.getUTCHours();

  if (hour >= 8 && hour < 16) return "london"; // 8:00-15:59 UTC (London session)
  if (hour >= 13 && hour < 21) return "new_york"; // 13:00-20:59 UTC (New York session)
  if (hour >= 0 && hour < 8) return "asian"; // 00:00-07:59 UTC (Asian session)
  return "overnight"; // 21:00-23:59 UTC (Overnight/quiet hours)
}

export function getSessionWeight(session: TradingSession): number {
  switch (session) {
    case "london":
      return 1.0; // Highest weight - most active and reliable
    case "new_york":
      return 0.9; // High weight - strong liquidity
    case "asian":
      return 0.6; // Medium weight - moderate activity
    case "overnight":
      return 0.3; // Low weight - thin liquidity, filter out
    default:
      return 0.5;
  }
}

export function isHighQualitySession(session: TradingSession): boolean {
  return session === "london" || session === "new_york";
}

export function getSessionDisplayName(session: TradingSession): string {
  switch (session) {
    case "london":
      return "London";
    case "new_york":
      return "New York";
    case "asian":
      return "Asian";
    case "overnight":
      return "Overnight";
    default:
      return "Unknown";
  }
}
