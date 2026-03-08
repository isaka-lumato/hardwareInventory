'use client'

import ProductSearch from '@/components/ProductSearch'
import type { Product } from '@/lib/database.types'

export default function NewOrderPage() {
  function handleSelect(product: Product) {
    console.log('Selected product:', product)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold">New Order</h1>
      <ProductSearch onSelect={handleSelect} />
    </div>
  )
}
