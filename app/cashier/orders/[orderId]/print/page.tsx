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
    return (
      <div className="flex justify-center items-center py-32 bg-zinc-950 min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 px-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6 shadow-inner">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-zinc-300">Invoice Error</h3>
        <p className="mt-2 text-zinc-500 font-medium">{error || 'Order not found'}</p>
        <button
          onClick={() => router.push('/cashier/new-order')}
          className="mt-6 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-400 transition-all"
        >
          Return to POS
        </button>
      </div>
    )
  }

  const paymentMethodLabel: Record<string, string> = {
    cash: 'Cash',
    mobile_money: 'Mobile Money',
    credit: 'Store Credit',
  }

  return (
    <div className="min-h-screen bg-zinc-950 antialiased p-6">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white !important; }
          * { color: black !important; background: transparent !important; border-color: black !important; font-family: monospace !important; }
          .print-border { border: 1px dashed black !important; }
        }
      `}</style>

      <div className="mx-auto max-w-2xl relative">
        <div className="no-print mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/cashier/new-order')}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Sales
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-400 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Receipt
          </button>
        </div>

        {/* Invoice (On-screen design is styled dark, print design is styled above) */}
        <div className="print-border rounded-[2rem] bg-zinc-900/50 p-10 border border-zinc-800 shadow-2xl relative overflow-hidden print:p-4 print:rounded-none print:shadow-none">
          <div className="no-print absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 to-amber-300" />

          <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase print:text-xl">{storeName}</h1>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 print:text-[10px]">Official Sales Receipt</p>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 text-sm bg-zinc-950/50 p-5 rounded-2xl border border-zinc-800/80 print:p-0 print:border-none print:bg-transparent">
            <div>
              <div className="mb-1 text-zinc-500 font-medium print:text-[10px]">Order Number</div>
              <div className="font-bold text-white font-mono print:text-sm">{order.order_number}</div>
              <div className="mt-3 mb-1 text-zinc-500 font-medium print:text-[10px]">Date Issued</div>
              <div className="font-bold text-white print:text-sm">{new Date(order.created_at).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="mb-1 text-zinc-500 font-medium print:text-[10px]">Cashier</div>
              <div className="font-bold text-white print:text-sm">{order.cashier?.name || 'Automated'}</div>
              <div className="mt-3 mb-1 text-zinc-500 font-medium print:text-[10px]">Payment Method</div>
              <div className="font-bold text-white uppercase print:text-sm">{paymentMethodLabel[order.payment_method] || order.payment_method}</div>
            </div>
          </div>

          <table className="mb-8 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-400 print:border-black print:text-black">
                <th className="pb-3 text-left font-bold uppercase tracking-wider text-xs print:text-[10px]">Product / Item</th>
                <th className="pb-3 text-center font-bold uppercase tracking-wider text-xs print:text-[10px]">Qty</th>
                <th className="pb-3 text-right font-bold uppercase tracking-wider text-xs print:text-[10px]">Price</th>
                <th className="pb-3 text-right font-bold uppercase tracking-wider text-xs print:text-[10px]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 print:divide-dashed print:divide-black">
              {order.items.map((item) => (
                <tr key={item.id} className="text-zinc-300 print:text-black">
                  <td className="py-4 font-medium print:py-2 print:text-xs">{item.product_name}</td>
                  <td className="py-4 text-center print:py-2 print:text-xs">
                    <span className="inline-block bg-zinc-800 px-2 py-0.5 rounded font-bold print:bg-transparent print:p-0">{item.quantity}</span>
                  </td>
                  <td className="py-4 text-right text-zinc-500 print:py-2 print:text-xs">{formatCurrency(item.unit_selling_price)}</td>
                  <td className="py-4 text-right font-bold print:py-2 print:text-xs">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-dashed border-zinc-700 pt-6 text-right text-sm print:border-black print:pt-4">
            <div className="flex justify-end items-center gap-12 mb-3">
              <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs print:text-[10px]">Subtotal</span>
              <span className="font-bold text-zinc-300 w-24 print:text-sm">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-end items-center gap-12 mb-3 text-emerald-400">
                <span className="font-medium uppercase tracking-wider text-xs print:text-[10px]">Discount Applied</span>
                <span className="font-bold w-24 print:text-sm">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="mt-4 flex justify-end items-center gap-12 bg-zinc-800/50 p-4 rounded-xl print:bg-transparent print:p-0">
              <span className="font-black text-white uppercase tracking-wider print:text-sm">Total Due</span>
              <span className="text-xl font-black text-white w-24 print:text-lg">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-sm print:bg-transparent print:border-black print:rounded-none">
              <span className="block text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 print:text-black">Order Notes</span>
              <span className="font-medium text-amber-200/80 print:text-black">{order.notes}</span>
            </div>
          )}

          <div className="mt-12 text-center">
            <div className="w-16 h-1 bg-zinc-800 mx-auto rounded-full mb-6 print:bg-black print:h-[1px]" />
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest print:text-[10px]">
              Thank you for your business!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
