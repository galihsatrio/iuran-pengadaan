export default function PengurusLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header Bar Skeleton */}
      <div className="h-[61px] bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 bg-slate-100 rounded-lg" />
          <div className="h-8 w-20 bg-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Skeleton (desktop) */}
        <div className="hidden lg:block w-64 border-r border-slate-200 bg-white p-4 space-y-3 min-h-[calc(100vh-61px)] animate-pulse shrink-0">
          <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
          <div className="h-10 w-full bg-slate-200 rounded-lg" />
          <div className="h-10 w-full bg-slate-100 rounded-lg" />
          <div className="h-10 w-full bg-slate-100 rounded-lg" />
          <div className="h-10 w-full bg-slate-100 rounded-lg" />
          <div className="h-10 w-full bg-slate-100 rounded-lg" />
        </div>

        {/* Content Skeleton */}
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
          <div className="h-32 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-2/3 bg-slate-100 rounded" />
          </div>
          <div className="h-64 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="h-6 w-56 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
