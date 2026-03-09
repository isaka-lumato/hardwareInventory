'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderItem } from '@/lib/database.types'

interface QueueOrder extends Order {
  items: OrderItem[]
  cashier_name: string
  isNew?: boolean
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function QueuePage() {
  const [orders, setOrders] = useState<QueueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [fulfilling, setFulfilling] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const supabase = createClient()

  const fetchOrderDetails = useCallback(async (orderId: string): Promise<QueueOrder | null> => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (!orderData) return null

      const [itemsResult, cashierResult] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', orderId),
        supabase.from('profiles').select('name').eq('id', orderData.cashier_id).single(),
      ])

      return {
        ...(orderData as Order),
        items: (itemsResult.data as OrderItem[]) || [],
        cashier_name: cashierResult.data?.name || 'Unknown',
        isNew: true,
      }
    } catch {
      return null
    }
  }, [supabase])

  const fetchOrders = useCallback(async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError
      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        return
      }

      const orderIds = ordersData.map((o) => o.id)
      const cashierIds = Array.from(new Set(ordersData.map((o) => o.cashier_id)))

      const [itemsResult, cashiersResult] = await Promise.all([
        supabase.from('order_items').select('*').in('order_id', orderIds),
        supabase.from('profiles').select('id, name').in('id', cashierIds),
      ])

      const itemsByOrder: Record<string, OrderItem[]> = {}
      for (const item of (itemsResult.data || []) as OrderItem[]) {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
        itemsByOrder[item.order_id].push(item)
      }

      const cashierMap: Record<string, string> = {}
      for (const c of cashiersResult.data || []) {
        cashierMap[c.id] = c.name
      }

      setOrders((ordersData as Order[]).map((o) => ({
        ...o,
        items: itemsByOrder[o.id] || [],
        cashier_name: cashierMap[o.cashier_id] || 'Unknown',
      })))
    } catch (err) {
      console.error('Failed to fetch queue:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('orders-queue')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: 'status=eq.pending' },
        async (payload) => {
          const newOrder = await fetchOrderDetails(payload.new.id as string)
          if (newOrder) {
            setOrders((prev) => [...prev, newOrder])
            // Remove the "new" highlight after 2 seconds
            setTimeout(() => {
              setOrders((prev) =>
                prev.map((o) => (o.id === newOrder.id ? { ...o, isNew: false } : o))
              )
            }, 2000)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order
          if (updated.status === 'fulfilled' || updated.status === 'cancelled') {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id))
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrders, fetchOrderDetails, supabase])

  async function handleFulfill(orderId: string) {
    setFulfilling(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (err) {
      console.error('Failed to fulfill order:', err)
    } finally {
      setFulfilling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black text-white tracking-tight">Order Queue</h1>
        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 px-4 py-2.5 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide">
            <span
              className={`relative flex h-3 w-3`}
            >
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>{connected ? 'SYSTEM LIVE' : 'DISCONNECTED'}</span>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-500 mb-6 shadow-inner">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-zinc-300">All caught up</h3>
          <p className="mt-2 text-zinc-500 font-medium">No pending orders in the queue.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 align-start">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-2xl border bg-zinc-900/80 p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group hover:bg-zinc-900 hover:shadow-xl ${order.isNew ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50' : 'border-zinc-800/80'
                }`}
            >
              {order.isNew && <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />}
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="text-2xl font-black text-white px-1 leading-none">{order.order_number}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-3 flex items-center gap-2">
                      <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">{timeAgo(order.created_at)}</span>
                      <span className="text-zinc-600">&bull;&bull;</span>
                      <span className="truncate max-w-[120px]">{order.cashier_name}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6 flex-grow">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/50">
                      <div className="text-zinc-200 font-medium text-sm pr-4 line-clamp-2">{item.product_name}</div>
                      <div className="text-amber-500 font-bold text-sm bg-amber-500/10 px-2.5 py-1 rounded-lg whitespace-nowrap">{item.quantity}x</div>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="mb-6 rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
                    <div className="text-[10px] font-black uppercase text-amber-500 mb-1.5 tracking-widest opacity-80">Note from cashier</div>
                    <div className="text-sm font-medium text-amber-200/90 leading-relaxed">{order.notes}</div>
                  </div>
                )}

                <button
                  onClick={() => handleFulfill(order.id)}
                  disabled={fulfilling === order.id}
                  className="w-full relative overflow-hidden rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-4 py-3.5 text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {fulfilling === order.id ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950 border-t-transparent"></span>
                        Fulfilling...
                      </>
                    ) : (
                      'Mark as Fulfilled'
                    )}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
