/**
 * Format an integer (cents) as a currency string.
 * All money in the system is stored as integers in cents.
 */
export function formatCurrency(amountInCents: number): string {
  const currencyCode = process.env.NEXT_PUBLIC_CURRENCY || 'TZS'
  const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'TSh'

  const amount = amountInCents / 100

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${symbol} ${formatted}`
}

/**
 * Parse a display amount (e.g. 1500) to cents (e.g. 150000).
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert cents to display amount.
 */
export function fromCents(cents: number): number {
  return cents / 100
}
