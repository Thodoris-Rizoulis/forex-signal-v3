interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-slate-700 bg-clip-text text-transparent tracking-tight">
            {title}
          </h1>
          <p className="text-lg text-slate-600 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
