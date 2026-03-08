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
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold">New Order</h1>

      <ProductSearch onSelect={handleSelect} />

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {cart.length > 0 && (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Product</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Qty</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Unit Price</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Line Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((item) => (
                  <tr key={item.product_id}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{item.product_name}</div>
                      {item.sku && <div className="text-xs text-gray-500">{item.sku}</div>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{item.unit}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.product_id, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 rounded border px-2 py-1 text-center"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(item.unit_selling_price)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatCurrency(Math.round(item.quantity * item.unit_selling_price))}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mt-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Any special instructions..."
                />
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Subtotal</div>
              <div className="text-xl font-bold">{formatCurrency(subtotal)}</div>
              <div className="mt-1 text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(subtotal)}</div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={clearCart}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Clear Cart
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || cart.length === 0}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cart.length === 0 && mounted && (
        <div className="mt-8 text-center text-gray-500">
          Search for products above to start building an order.
        </div>
      )}
    </div>
  )
}
