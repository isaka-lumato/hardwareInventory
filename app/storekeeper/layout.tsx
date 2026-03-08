import Navbar from '@/components/ui/Navbar'

export default function StorekeeperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
