'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/currency'
import type { Product } from '@/lib/database.types'

interface ProductSearchProps {
  onSelect: (product: Product) => void
}

export default function ProductSearch({ onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const searchTerm = `%${query.trim()}%`
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm}`)
          .limit(10)

        if (error) {
          console.error('Search error:', error)
          setResults([])
        } else {
          setResults((data as Product[]) || [])
        }
        setShowDropdown(true)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(product: Product) {
    onSelect(product)
    setQuery('')
    setResults([])
    setShowDropdown(false)
  }

  return (
    <div ref={containerRef} className="relative z-40">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name or SKU..."
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/80 pl-11 pr-4 py-4 text-base text-zinc-100 shadow-sm placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-zinc-900 transition-all duration-300"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-900/90">
          {loading && (
            <div className="p-4 text-center text-sm font-medium text-amber-500 animate-pulse">Searching inventory...</div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="p-4 text-center text-sm font-medium text-zinc-500">No matching products found.</div>
          )}

          {!loading && results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="group flex w-full items-center justify-between px-5 py-3.5 text-left transition-all duration-200 hover:bg-zinc-800/80 border-b border-zinc-800/50 last:border-0"
            >
              <div>
                <div className="text-sm font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{product.name}</div>
                {product.sku && (
                  <div className="text-xs font-mono text-zinc-500 mt-1 uppercase tracking-wider">SKU: {product.sku}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-white bg-zinc-800 px-2 py-1 rounded-md mb-1 inline-block">
                  {formatCurrency(product.selling_price)}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">per {product.unit}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
