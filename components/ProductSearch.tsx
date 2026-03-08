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
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products by name or SKU..."
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />

      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
          {loading && (
            <div className="p-3 text-center text-sm text-gray-500">Searching...</div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="p-3 text-center text-sm text-gray-500">No products found</div>
          )}

          {!loading && results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                {product.sku && (
                  <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(product.selling_price)}
                </div>
                <div className="text-xs text-gray-500">per {product.unit}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
