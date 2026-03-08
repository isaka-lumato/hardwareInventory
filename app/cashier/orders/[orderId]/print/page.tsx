'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/currency'
import type { Order, OrderItem, Profile } from '@/lib/database.types'

interface OrderWithDetails extends Order {
  items: OrderItem[]
  cashier: Profile | null
}

export default function PrintPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Hardware Store'

  useEffect(() => {
    async function fetchOrder() {
      try {
        const supabase = createClient()

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', params.orderId)
          .single()

        if (orderError) throw orderError

        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', params.orderId)

        if (itemsError) throw itemsError

        const { data: cashier } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', orderData.cashier_id)
          .single()

        setOrder({
          ...(orderData as Order),
          items: (items as OrderItem[]) || [],
          cashier: (cashier as Profile) || null,
        })
      } catch (err) {
        console.error('Failed to fetch order:', err)
        setError('Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [params.orderId])

  useEffect(() => {
    if (order && !loading) {
      const timer = setTimeout(() => window.print(), 500)
      return () => clearTimeout(timer)
    }
  }, [order, loading])

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading invoice...</div>
  }

  if (error || !order) {
    return <div className="p-8 text-center text-red-600">{error || 'Order not found'}</div>
  }

  const paymentMethodLabel: Record<string, string> = {
    cash: 'Cash',
    mobile_money: 'Mobile Money',
    credit: 'Credit',
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          * { color: black !important; background: white !important; }
        }
      `}</style>

      <div className="mx-auto max-w-2xl p-6">
        <div className="no-print mb-4 flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Print
          </button>
          <button
            onClick={() => router.push('/cashier/new-order')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            New Order
          </button>
        </div>

        {/* Invoice */}
        <div className="border p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">{storeName}</h1>
            <p className="text-sm text-gray-500">Sales Invoice</p>
          </div>

          <div className="mb-4 flex justify-between text-sm">
            <div>
              <div><span className="font-medium">Order:</span> {order.order_number}</div>
              <div><span className="font-medium">Date:</span> {new Date(order.created_at).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div><span className="font-medium">Cashier:</span> {order.cashier?.name || 'N/A'}</div>
              <div><span className="font-medium">Payment:</span> {paymentMethodLabel[order.payment_method] || order.payment_method}</div>
            </div>
          </div>

          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-1 text-left">Product</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Unit Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-1">{item.product_name}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{formatCurrency(item.unit_selling_price)}</td>
                  <td className="py-1 text-right">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-black pt-2 text-right text-sm">
            <div className="flex justify-end gap-8">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-end gap-8">
                <span>Discount:</span>
                <span className="font-medium">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-end gap-8 text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 text-sm">
              <span className="font-medium">Notes:</span> {order.notes}
            </div>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            Thank you for your business!
          </div>
        </div>
      </div>
    </>
  )
}
