'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProductSearch from '@/components/ProductSearch'
import { formatCurrency } from '@/lib/currency'
import { formatError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import type { Product, PaymentMethod } from '@/lib/database.types'

interface CartItem {
  product_id: string
  product_name: string
  sku: string | null
  unit: string
  quantity: number
  unit_cost_price: number
  unit_selling_price: number
}

const CART_STORAGE_KEY = 'hms-cart'

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage might be full or unavailable
  }
}

export default function NewOrderPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    setCart(loadCart())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      saveCart(cart)
    }
  }, [cart, mounted])

  const handleSelect = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: 1,
          unit_cost_price: product.cost_price,
          unit_selling_price: product.selling_price,
        },
      ]
    })
  }, [])

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product_id !== productId))
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product_id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.product_id !== productId))
  }

  function clearCart() {
    if (confirm('Are you sure you want to clear the cart?')) {
      setCart([])
    }
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_selling_price),
    0
  )

  async function handleSubmit() {
    if (cart.length === 0) {
      setError('Please add at least one item to the cart.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const supabase = createClient()

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to submit an order.')
        setSubmitting(false)
        return
      }

      // Get next order number
      const { data: orderNumData, error: orderNumError } = await supabase
        .rpc('next_order_number')

      if (orderNumError) throw orderNumError

      const orderNumber = orderNumData as string

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          cashier_id: session.user.id,
          status: 'pending',
          payment_method: paymentMethod,
          subtotal,
          discount: 0,
          total: subtotal,
          notes: notes.trim() || null,
        })
        .select('id')
        .single()

      if (orderError) throw orderError

      // Insert order items
      const items = cart.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost_price: item.unit_cost_price,
        unit_selling_price: item.unit_selling_price,
        line_total: Math.round(item.quantity * item.unit_selling_price),
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items)

      if (itemsError) throw itemsError

      // Clear cart and redirect to print
      localStorage.removeItem(CART_STORAGE_KEY)
      router.push(`/cashier/orders/${order.id}/print`)
    } catch (err) {
      setError(formatError(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black text-white tracking-tight">New Order</h1>
      </div>

      <div className="mb-8 relative z-40">
        <ProductSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-8 rounded-xl bg-red-500/10 p-4 text-sm font-medium text-red-500 border border-red-500/20 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {cart.length > 0 && (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-2xl bg-zinc-900/50 shadow-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Product</th>
                  <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs hidden sm:table-cell">Unit</th>
                  <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Qty</th>
                  <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs">Unit Price</th>
                  <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs">Total</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {cart.map((item) => (
                  <tr key={item.product_id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{item.product_name}</div>
                      {item.sku && <div className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">SKU: {item.sku}</div>}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-500 hidden sm:table-cell">{item.unit}</td>
                    <td className="px-6 py-4 text-center w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.product_id, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-center text-white font-bold tracking-wider shadow-inner focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-400 font-medium whitespace-nowrap">
                      {formatCurrency(item.unit_selling_price)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="font-black text-emerald-400 bg-emerald-400/10 inline-block px-3 py-1 rounded-lg">
                        {formatCurrency(Math.round(item.quantity * item.unit_selling_price))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove Item"
                      >
                        <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-6">
              <div className="rounded-2xl bg-zinc-900/50 p-6 border border-zinc-800">
                <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['cash', 'mobile_money', 'credit'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method as PaymentMethod)}
                      className={`px-4 py-3 rounded-xl border transition-all duration-200 font-bold ${paymentMethod === method
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                        }`}
                    >
                      {method === 'cash' ? 'Cash' : method === 'mobile_money' ? 'Mobile Money' : 'Store Credit'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-900/50 p-6 border border-zinc-800">
                <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Order Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 shadow-sm placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                  placeholder="Optional delivery instructions or customer details..."
                />
              </div>
            </div>

            <div className="lg:w-[380px] rounded-2xl bg-zinc-900/80 p-8 shadow-2xl border border-zinc-800 backdrop-blur-xl relative overflow-hidden shrink-0">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end">
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Subtotal</div>
                  <div className="text-xl font-bold text-zinc-300">{formatCurrency(subtotal)}</div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-6"></div>

                <div className="flex justify-between items-end">
                  <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Total Pay</div>
                  <div className="text-5xl font-black text-amber-500 tracking-tight">{formatCurrency(subtotal)}</div>
                </div>

                <div className="mt-8 flex flex-col gap-3 pt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || cart.length === 0}
                    className="w-full relative overflow-hidden rounded-xl bg-amber-500 px-6 py-4 text-base font-black text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none transition-all duration-300 group"
                  >
                    <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {submitting ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-950 border-t-transparent"></span>
                          Processing...
                        </>
                      ) : (
                        'Submit Print & Queue'
                      )}
                    </span>
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all duration-200"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cart.length === 0 && mounted && (
        <div className="mt-16 flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/20 px-4 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900 shadow-inner border border-zinc-800">
            <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-zinc-200 mb-3 tracking-tight">Cart is empty</h3>
          <p className="text-base font-medium text-zinc-500 max-w-sm leading-relaxed">Use the search bar above to look up products by name or SKU and add them to this order.</p>
        </div>
      )}
    </div>
  )
}
