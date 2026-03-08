'use client'

import { useState, useEffect, useCallback } from 'react'
import ProductSearch from '@/components/ProductSearch'
import { formatCurrency } from '@/lib/currency'
import type { Product } from '@/lib/database.types'

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

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold">New Order</h1>

      <ProductSearch onSelect={handleSelect} />

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

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={clearCart}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Clear Cart
            </button>

            <div className="text-right">
              <div className="text-sm text-gray-600">Subtotal</div>
              <div className="text-xl font-bold">{formatCurrency(subtotal)}</div>
              <div className="mt-1 text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(subtotal)}</div>
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
