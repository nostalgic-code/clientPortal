import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthHashHandler } from '@/components/auth-hash-handler'
import { AuthSync } from '@/components/auth-sync'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Professional client portal for project management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthHashHandler />
        <AuthSync />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
