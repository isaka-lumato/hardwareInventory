'use client'

import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  )
}
