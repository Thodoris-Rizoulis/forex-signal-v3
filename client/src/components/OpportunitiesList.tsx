import { useWebSocket } from "../hooks/useWebSocket";
import { Badge } from "../components/ui/badge";

export function OpportunitiesList() {
  const { opportunities, isConnected } = useWebSocket();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  const getSignalType = (signalType: "BUY" | "SELL") => {
    if (signalType === "BUY") {
      return {
        type: "BUY",
        variant: "default" as const,
        bgClass: "signal-buy",
        iconColor: "text-green-600",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11l5-5m0 0l5 5m-5-5v12"
            />
          </svg>
        ),
      };
    }
    if (signalType === "SELL") {
      return {
        type: "SELL",
        variant: "destructive" as const,
        bgClass: "signal-sell",
        iconColor: "text-red-600",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 13l-5 5m0 0l-5-5m5 5V6"
            />
          </svg>
        ),
      };
    }
    return {
      type: "SIGNAL",
      variant: "secondary" as const,
      bgClass: "signal-neutral",
      iconColor: "text-amber-600",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };
  };

  if (!isConnected) {
    return (
      <div className="forex-card-premium">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-slate-900">
                Live Trading Signals
              </h2>
            </div>
            <div className="px-3 py-1 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm font-medium text-red-700">
                Disconnected
              </span>
            </div>
          </div>
          <p className="text-slate-600 mt-2">
            Real-time trading opportunities from active strategies
          </p>
        </div>
        <div className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Connecting to Signal Server
            </h3>
            <p className="text-slate-600 mb-4">
              Establishing secure connection to receive live trading signals
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse"></div>
              <span>Please wait while we connect...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forex-card-premium">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-2xl font-bold text-slate-900">
              Live Trading Signals
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-slate-600 mt-2">
          Real-time trading opportunities from active strategies
        </p>
      </div>

      <div className="p-6">
        {opportunities.length === 0 ? (
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
              No Active Signals
            </h3>
            <p className="text-slate-600 mb-4 max-w-md mx-auto">
              Trading signals will appear here as they are generated by your
              active strategies
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span>Monitoring markets</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                <span>Strategies active</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opportunity) => {
              const signalInfo = getSignalType(opportunity.signalType);

              return (
                <div
                  key={opportunity.id}
                  className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-300 hover:shadow-lg ${signalInfo.bgClass} hover:scale-[1.01]`}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-3 rounded-lg bg-white/80 ${signalInfo.iconColor} group-hover:bg-white transition-colors`}
                        >
                          {signalInfo.icon}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant={signalInfo.variant}
                              className={`font-bold px-3 py-1 text-xs uppercase tracking-wide ${
                                signalInfo.variant === "default"
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : signalInfo.variant === "destructive"
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-amber-600 text-white hover:bg-amber-700"
                              }`}
                            >
                              {signalInfo.type}
                            </Badge>
                            <span className="font-bold text-slate-900 text-lg price-display">
                              Pair #{opportunity.pairId}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed font-medium">
                            {opportunity.details}
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <p className="text-sm font-bold text-slate-900">
                          {formatTime(opportunity.timestamp)}
                        </p>
                        <div className="px-2 py-1 bg-white/80 rounded border border-slate-200">
                          <span className="text-xs font-medium text-slate-600">
                            Strategy #{opportunity.strategyId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
