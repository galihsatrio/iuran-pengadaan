export default function EditNotaLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4 animate-pulse">
      <div className="h-4 w-36 bg-slate-200 rounded" />

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-10 bg-slate-100 rounded-lg" />
          <div className="h-10 bg-slate-100 rounded-lg" />
        </div>

        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-12 bg-slate-100 rounded-lg" />
          <div className="h-12 bg-slate-100 rounded-lg" />
        </div>

        <div className="h-10 bg-slate-100 rounded-lg" />

        <div className="flex justify-end">
          <div className="h-10 w-32 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
