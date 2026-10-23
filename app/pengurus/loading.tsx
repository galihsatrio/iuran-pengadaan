export default function PengurusLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
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
  );
}
