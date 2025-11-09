import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 w-full">
      {/* Professional Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 w-full sticky top-0 z-50 h-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between h-full">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-blue-800 transition-all duration-300">
                    Forex Signals Pro
                  </h1>
                  <p className="text-xs text-slate-500 -mt-1">
                    Trading Intelligence
                  </p>
                </div>
              </Link>
            </div>

            {/* Enhanced Navigation */}
            <div className="flex items-center space-x-1">
              <nav className="flex space-x-1">
                <Link
                  to="/"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[2.5rem] whitespace-nowrap ${
                    isActive("/")
                      ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md"
                      : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="m8 15l4-4 4 4"
                      />
                    </svg>
                    <span>Dashboard</span>
                  </div>
                </Link>

                <Link
                  to="/chart"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[2.5rem] whitespace-nowrap ${
                    isActive("/chart")
                      ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md"
                      : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
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
                    <span>Charts</span>
                  </div>
                </Link>

                <Link
                  to="/history"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[2.5rem] whitespace-nowrap ${
                    isActive("/history")
                      ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md"
                      : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3v18h18M9 9l3 3 3-3M9 15l3 3 3-3"
                      />
                    </svg>
                    <span>History</span>
                  </div>
                </Link>

                {/* Management Section */}
                <div className="h-6 w-px bg-slate-300 mx-2"></div>

                <Link
                  to="/trading-assets"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[2.5rem] whitespace-nowrap ${
                    isActive("/trading-assets")
                      ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md"
                      : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-7 h-7 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                    <span>Trading Assets</span>
                  </div>
                </Link>

                <Link
                  to="/strategies"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[2.5rem] whitespace-nowrap ${
                    isActive("/strategies")
                      ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md"
                      : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
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
                    <span>Strategies</span>
                  </div>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full py-8 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
