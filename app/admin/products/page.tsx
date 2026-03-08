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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={openAdd}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Product
        </button>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Category</th>
              <th className="px-3 py-2 text-right font-medium text-gray-700">Cost</th>
              <th className="px-3 py-2 text-right font-medium text-gray-700">Selling</th>
              <th className="px-3 py-2 text-right font-medium text-gray-700">Margin</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Stock</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Unit</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => openEdit(p)}
                className="cursor-pointer hover:bg-blue-50"
              >
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-gray-500">{p.sku || '—'}</td>
                <td className="px-3 py-2 text-gray-600">{categoryMap[p.category_id] || '—'}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(p.cost_price)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(p.selling_price)}</td>
                <td className="px-3 py-2 text-right text-green-600">{profitMargin(p.cost_price, p.selling_price)}</td>
                <td className="px-3 py-2 text-center">{p.stock_quantity}</td>
                <td className="px-3 py-2 text-center">{p.unit}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
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
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowPanel(false)} />
          <div className="relative w-full max-w-md bg-white p-6 shadow-xl overflow-y-auto">
            <h2 className="mb-4 text-lg font-bold">{form.id ? 'Edit Product' : 'Add Product'}</h2>

            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {unitSuggestions.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  id="is_active"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {form.id && (
                <button
                  onClick={handleDeactivate}
                  disabled={saving}
                  className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Deactivate
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
