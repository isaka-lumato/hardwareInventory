'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, toCents, fromCents } from '@/lib/currency'
import type { Product, Category } from '@/lib/database.types'

interface ProductFormData {
  id?: string
  name: string
  sku: string
  category_id: string
  cost_price: string
  selling_price: string
  stock_quantity: string
  unit: string
  is_active: boolean
}

const emptyForm: ProductFormData = {
  name: '',
  sku: '',
  category_id: '',
  cost_price: '',
  selling_price: '',
  stock_quantity: '0',
  unit: 'piece',
  is_active: true,
}

const unitSuggestions = ['piece', 'meter', 'kg', 'liter', 'box', 'roll']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function fetchData() {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ])
      setProducts((productsRes.data as Product[]) || [])
      setCategories((categoriesRes.data as Category[]) || [])
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setShowPanel(true)
  }

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      category_id: product.category_id || '',
      cost_price: fromCents(product.cost_price).toString(),
      selling_price: fromCents(product.selling_price).toString(),
      stock_quantity: product.stock_quantity.toString(),
      unit: product.unit,
      is_active: product.is_active,
    })
    setError('')
    setShowPanel(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    const sp = parseFloat(form.selling_price) || 0
    const cp = parseFloat(form.cost_price) || 0
    if (sp <= 0) { setError('Selling price must be greater than 0'); return }
    if (sp < cp && !confirm('Selling price is less than cost price. Continue anyway?')) return
    setSaving(true)
    setError('')

    const data = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category_id: form.category_id || null,
      cost_price: toCents(parseFloat(form.cost_price) || 0),
      selling_price: toCents(parseFloat(form.selling_price) || 0),
      stock_quantity: parseInt(form.stock_quantity) || 0,
      unit: form.unit || 'piece',
      is_active: form.is_active,
    }

    try {
      if (form.id) {
        const { error } = await supabase.from('products').update(data).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(data)
        if (error) throw error
      }
      setShowPanel(false)
      fetchData()
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!form.id) return
    setSaving(true)
    try {
      await supabase.from('products').update({ is_active: false }).eq('id', form.id)
      setShowPanel(false)
      fetchData()
    } catch (err) {
      console.error('Deactivate error:', err)
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter((p) => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categoryMap: Record<string, string> = {}
  for (const c of categories) categoryMap[c.id] = c.name

  function profitMargin(cost: number, selling: number): string {
    if (selling === 0) return '0%'
    return ((((selling - cost) / selling) * 100)).toFixed(1) + '%'
  }

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Products Catalog</h1>
        <button
          onClick={openAdd}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/50 p-4 border border-zinc-800 rounded-2xl">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or SKU..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 pl-11 pr-4 py-3 text-sm text-zinc-100 shadow-sm placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all sm:w-64"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-zinc-900/50 shadow-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Name & SKU</th>
              <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs hidden md:table-cell">Category</th>
              <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs">Cost</th>
              <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs">Selling</th>
              <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs hidden lg:table-cell">Margin</th>
              <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Stock</th>
              <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-medium">
                  No products matched your search.
                </td>
              </tr>
            ) : filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => openEdit(p)}
                className={`cursor-pointer transition-colors group ${p.is_active ? 'hover:bg-zinc-800/40' : 'opacity-60 hover:opacity-100 hover:bg-zinc-800/20'}`}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{p.name}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">SKU: {p.sku || '—'}</div>
                </td>
                <td className="px-6 py-4 text-zinc-400 font-medium hidden md:table-cell">{categoryMap[p.category_id] || '—'}</td>
                <td className="px-6 py-4 text-right text-zinc-500 font-medium">{formatCurrency(p.cost_price)}</td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-white bg-zinc-800 px-2 py-1 rounded inline-block">
                    {formatCurrency(p.selling_price)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-emerald-400 hidden lg:table-cell">{profitMargin(p.cost_price, p.selling_price)}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`font-black text-lg ${p.stock_quantity <= 5 ? 'text-red-500' : 'text-zinc-300'}`}>
                      {p.stock_quantity}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{p.unit}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-over panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity" onClick={() => setShowPanel(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl overflow-y-auto flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-black text-white tracking-tight">{form.id ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowPanel(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-xl">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex-1">
              {error && <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-500">{error}</div>}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Product Name <span className="text-amber-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    placeholder="e.g. Claw Hammer 16oz"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">SKU Code</label>
                    <input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all uppercase"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Category</label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pricing Strategy</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Cost Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={form.cost_price}
                          onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Selling Price <span className="text-amber-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={form.selling_price}
                          onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                          className="w-full rounded-xl border border-amber-500/30 bg-zinc-900 pl-8 pr-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                  {parseFloat(form.selling_price) > 0 && parseFloat(form.cost_price) > 0 && (
                    <div className="text-right text-xs font-medium text-emerald-400">
                      Margin: {profitMargin(toCents(parseFloat(form.cost_price)), toCents(parseFloat(form.selling_price)))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Initial Stock</label>
                    <input
                      type="number"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Measure Unit</label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    >
                      {unitSuggestions.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 rounded-xl border border-zinc-700 bg-zinc-950 cursor-pointer hover:border-zinc-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-5 w-5 rounded border-zinc-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-950 bg-zinc-900"
                  />
                  <div>
                    <div className="text-sm font-bold text-zinc-200">Product is Active</div>
                    <div className="text-xs text-zinc-500">Available for cashiers to sell</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky bottom-0 z-10">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-amber-950 shadow-lg hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950 border-t-transparent"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Product Details'
                  )}
                </button>
                {form.id && (
                  <button
                    onClick={handleDeactivate}
                    disabled={saving || !form.is_active}
                    className="sm:w-32 rounded-xl bg-red-500/10 px-4 py-3.5 text-sm font-bold text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/20 transition-all"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
