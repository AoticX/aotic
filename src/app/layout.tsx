import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AOTIC CRM',
  description: 'Automotive Customization Operations & Management System',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AOTIC CRM',
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{if(localStorage.getItem('aotic-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`
        }} />
      </head>
      <body className="min-h-full bg-background text-foreground font-[family-name:var(--font-inter)]">{children}</body>
    </html>
  )
}
