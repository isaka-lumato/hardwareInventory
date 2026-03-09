export default function InventoryPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-white tracking-tight">Inventory Management</h1>
      <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center px-4">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-500 shadow-inner">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-zinc-300">Coming Soon</h3>
        <p className="mt-2 text-zinc-500 font-medium max-w-sm">Detailed inventory tracking and receiving features are currently under development. Stock levels can still be managed directly from the Products catalog.</p>
      </div>
    </div>
  )
}
