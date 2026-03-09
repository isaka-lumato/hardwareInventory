'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('')
  const [currencySymbol, setCurrencySymbol] = useState('')
  const [invoiceFooter, setInvoiceFooter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
        if (data) {
          setStoreName(data.store_name)
          setCurrencySymbol(data.currency_symbol)
          setInvoiceFooter(data.invoice_footer)
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          store_name: storeName,
          currency_symbol: currencySymbol,
          invoice_footer: invoiceFooter,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)

      if (error) throw error
      setMessage('Settings saved successfully.')
    } catch (err) {
      console.error('Save error:', err)
      setMessage('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>

      {message && (
        <div className={`rounded-xl p-4 text-sm font-medium flex items-center gap-3 border ${message.includes('success') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {message.includes('success') ? (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          )}
          {message}
        </div>
      )}

      <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800 p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="space-y-6 relative z-10">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Store Display Name</label>
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
              placeholder="Hardware Store Ltd."
            />
            <p className="mt-2 text-xs text-zinc-500">This name appears on the dashboard and login screens.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Currency Symbol</label>
            <input
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-32 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-center font-bold"
              placeholder="e.g. $, €"
            />
            <p className="mt-2 text-xs text-zinc-500">Used for formatting prices across the application.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Receipt Footer Message</label>
            <textarea
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
              placeholder="Thank you for your business!"
            />
            <p className="mt-2 text-xs text-zinc-500">This message will be printed at the bottom of customer receipts.</p>
          </div>

          <div className="pt-6 border-t border-zinc-800/80">
            <button
              onClick={handleSave}
              disabled={saving}
              className="relative overflow-hidden group rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 sm:w-auto w-full"
            >
              {saving ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950 border-t-transparent"></span> Saving...</>
              ) : (
                'Save All Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
