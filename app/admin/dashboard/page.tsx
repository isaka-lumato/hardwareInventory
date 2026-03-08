'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/currency'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type DateFilter = 'today' | 'week' | 'month'

interface Metrics {
  revenue: number
  cost: number
  profit: number
  margin: number
  orderCount: number
  avgOrderValue: number
}

interface DailyRevenue {
  date: string
  revenue: number
}

interface TopProduct {
  product_name: string
  total_qty: number
  total_revenue: number
}

function getDateRange(filter: DateFilter): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  let start: string

  if (filter === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  } else if (filter === 'week') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }

  return { start, end }
}

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [metrics, setMetrics] = useState<Metrics>({ revenue: 0, cost: 0, profit: 0, margin: 0, orderCount: 0, avgOrderValue: 0 })
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [topByQty, setTopByQty] = useState<TopProduct[]>([])
  const [topByRevenue, setTopByRevenue] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      try {
        const { start, end } = getDateRange(dateFilter)

        // Fetch fulfilled orders in range
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total')
          .eq('status', 'fulfilled')
          .gte('created_at', start)
          .lt('created_at', end)

        const orderIds = (orders || []).map((o) => o.id)
        const revenue = (orders || []).reduce((sum, o) => sum + o.total, 0)

        let cost = 0
        const productQtyMap: Record<string, { name: string; qty: number; revenue: number }> = {}

        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds)

          for (const item of items || []) {
            cost += item.unit_cost_price * item.quantity
            const key = item.product_name
            if (!productQtyMap[key]) productQtyMap[key] = { name: key, qty: 0, revenue: 0 }
            productQtyMap[key].qty += Number(item.quantity)
            productQtyMap[key].revenue += item.line_total
          }
        }

        const profit = revenue - cost
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0
        const orderCount = orderIds.length
        const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0

        setMetrics({ revenue, cost, profit, margin, orderCount, avgOrderValue })

        const sorted = Object.values(productQtyMap)
        setTopByQty([...sorted].sort((a, b) => b.qty - a.qty).slice(0, 10).map((p) => ({
          product_name: p.name, total_qty: p.qty, total_revenue: p.revenue,
        })))
        setTopByRevenue([...sorted].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((p) => ({
          product_name: p.name, total_qty: p.qty, total_revenue: p.revenue,
        })))

        // Daily revenue for last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('total, created_at')
          .eq('status', 'fulfilled')
          .gte('created_at', thirtyDaysAgo)

        const dailyMap: Record<string, number> = {}
        for (const o of recentOrders || []) {
          const day = new Date(o.created_at).toISOString().split('T')[0]
          dailyMap[day] = (dailyMap[day] || 0) + o.total
        }

        const days: DailyRevenue[] = []
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const key = d.toISOString().split('T')[0]
          days.push({ date: key.slice(5), revenue: dailyMap[key] || 0 })
        }
        setDailyRevenue(days)
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [dateFilter])

  const cards = [
    { label: 'Total Revenue', value: formatCurrency(metrics.revenue) },
    { label: 'Total Cost', value: formatCurrency(metrics.cost) },
    { label: 'Gross Profit', value: formatCurrency(metrics.profit) },
    { label: 'Profit Margin', value: metrics.margin.toFixed(1) + '%' },
    { label: 'Orders', value: metrics.orderCount.toString() },
    { label: 'Avg Order Value', value: formatCurrency(Math.round(metrics.avgOrderValue)) },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-1">
          {(['today', 'week', 'month'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`rounded-md px-3 py-1 text-sm ${
                dateFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-lg border bg-white p-4">
                <div className="text-sm text-gray-500">{card.label}</div>
                <div className="mt-1 text-xl font-bold">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-lg border bg-white p-4">
            <h2 className="mb-3 font-semibold">Daily Revenue (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-3 font-semibold">Top 10 Products by Quantity</h2>
              {topByQty.length === 0 ? (
                <p className="text-sm text-gray-500">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1 text-left">Product</th>
                      <th className="py-1 text-right">Qty Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topByQty.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1">{p.product_name}</td>
                        <td className="py-1 text-right">{p.total_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-3 font-semibold">Top 10 Products by Revenue</h2>
              {topByRevenue.length === 0 ? (
                <p className="text-sm text-gray-500">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1 text-left">Product</th>
                      <th className="py-1 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topByRevenue.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1">{p.product_name}</td>
                        <td className="py-1 text-right">{formatCurrency(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
