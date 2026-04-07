import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MVIT Admin Dashboard',
  description: 'HOD Analytics for Coding Tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 flex min-h-screen`}>
        <Navbar />
        <main className="ml-64 flex-1 p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
