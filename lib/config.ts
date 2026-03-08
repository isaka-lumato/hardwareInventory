export const STORE_CONFIG = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'Hardware Store',
  currency: process.env.NEXT_PUBLIC_CURRENCY || 'TZS',
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'TSh',
  lowStockThreshold: 5,
  invoiceFooter: 'Thank you for your business!',
}
