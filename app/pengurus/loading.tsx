export default function PengurusLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 animate-pulse">
      {/* Pengurus Navbar Skeleton */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-200 shrink-0" />
            <div className="min-w-0 space-y-1.5">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-36 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="h-4 w-24 bg-slate-100 rounded hidden xs:block" />
            <div className="h-8 w-16 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Navigation Subheader / Breadcrumb Tabs Skeleton */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-6 py-3">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-36 bg-slate-100 rounded" />
          <div className="h-4 w-28 bg-slate-100 rounded" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
          <div className="h-4 w-20 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
  );
}
