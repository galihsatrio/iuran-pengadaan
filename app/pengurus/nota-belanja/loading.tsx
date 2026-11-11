export default function NotaBelanjaLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-16 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-3">
        <div className="h-14 bg-slate-100 rounded-lg" />
        <div className="h-14 bg-slate-100 rounded-lg" />
        <div className="h-14 bg-slate-100 rounded-lg" />
      </div>
    </main>
  );
}
