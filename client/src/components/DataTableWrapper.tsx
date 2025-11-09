import { type ReactNode } from "react";

interface DataTableWrapperProps {
  data: any[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}

export function DataTableWrapper({
  data,
  loading,
  emptyTitle,
  emptyDescription,
  children,
}: DataTableWrapperProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full max-w-xs mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 max-w-sm mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 max-w-xs mx-auto"></div>
        </div>
        <p className="text-sm text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyTitle}</h3>
        <p className="text-gray-500 mb-6">{emptyDescription}</p>
      </div>
    );
  }

  return <div className="overflow-x-auto">{children}</div>;
}
