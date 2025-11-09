import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
// import { OpportunitiesList } from "./components/OpportunitiesList";
import { History } from "./components/History";
import { TradingAssetsManagement } from "./components/TradingAssetsManagement";
import { StrategiesManagement } from "./components/StrategiesManagement";
import { Chart } from "./components/Chart";
import { ToastProvider } from "./components/Toast";
import { PageHeader } from "./components/PageHeader";

function Dashboard() {
  return (
    <Layout>
      <div className="space-y-8">
        {/* Professional Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            title="Trading Dashboard"
            subtitle="Real-time forex signals and market intelligence"
          />
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-green-200 px-4 py-2 rounded-lg shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">
                Live Market Data
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Active Pairs
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900 price-display">
                  12
                </div>
                <div className="flex items-center text-sm">
                  <svg
                    className="w-4 h-4 text-green-500 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="profit-text font-medium">
                    +2 from last week
                  </span>
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Today's Signals
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900 price-display">
                  8
                </div>
                <div className="flex items-center text-sm">
                  <svg
                    className="w-4 h-4 text-green-500 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="profit-text font-medium">
                    +3 from yesterday
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="forex-card-premium group hover:scale-[1.02] transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-amber-600"
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
                  Success Rate
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900 price-display">
                  67%
                </div>
                <div className="flex items-center text-sm">
                  <svg
                    className="w-4 h-4 text-green-500 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="profit-text font-medium">
                    +5% from last month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Opportunities Section */}
        {/* <OpportunitiesList /> */}
      </div>
    </Layout>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chart" element={<Chart />} />
          <Route path="/history" element={<History />} />
          <Route path="/trading-assets" element={<TradingAssetsManagement />} />
          <Route path="/strategies" element={<StrategiesManagement />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
