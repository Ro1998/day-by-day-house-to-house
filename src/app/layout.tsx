import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { DataProvider } from '@/components/DataProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Day by Day, House to House',
  description: 'Meal Planner Website',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
