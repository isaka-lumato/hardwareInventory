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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">Store Settings</h1>

      {message && (
        <div className={`mb-4 rounded-md p-3 text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Store Name</label>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency Symbol</label>
          <input
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g. TSh, $, KSh"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Invoice Footer</label>
          <textarea
            value={invoiceFooter}
            onChange={(e) => setInvoiceFooter(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
