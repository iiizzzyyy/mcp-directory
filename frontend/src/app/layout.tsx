import './globals.css'
import type { Metadata } from 'next'
import { Inter, Open_Sans } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthProvider'
import LayoutShell from '@/components/layout/LayoutShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MCP Directory',
  description: 'A comprehensive directory of Model Context Protocol servers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <LayoutShell>
            {children}
          </LayoutShell>
        </AuthProvider>
      </body>
    </html>
  )
}
