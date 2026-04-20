import '@/css/tailwind.css'

import Header from '@/components/site-headaer'
import Footer from '@/components/site-footer'
import { themeInitScript } from '@/utils/theme'

import { NextIntlClientProvider } from 'next-intl'
import LocaleSwitcher from '@/components/locale/locale-switcher'

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://logos-next-tailwind-i18n-template-git-circles-api-test-acidinfo.vercel.app'
  ).replace(/\/$/, '')
  const pageUrl = `${siteUrl}/${locale}`
  const oembedHref = `${siteUrl}/api/oembed?url=${encodeURIComponent(pageUrl)}&format=json`

  return (
    <NextIntlClientProvider>
      <html lang={locale} className={`scroll-smooth`} suppressHydrationWarning>
        <head>
          <link rel="apple-touch-icon" sizes="76x76" href="/favicon.png" />
          <link rel="icon" href="/favicon.png" type="image/png" />
          <meta name="msapplication-TileColor" content="#000000" />
          <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fff" />
          <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000" />
          <link rel="alternate" type="application/json+oembed" href={oembedHref} />
          {/* <script
            dangerouslySetInnerHTML={{
              __html: themeInitScript,
            }}
          /> */}
        </head>
        <body>
          {/* <Header /> */}
          <main>{children}</main>
          {/* <LocaleSwitcher />
          <Footer /> */}
        </body>
      </html>
    </NextIntlClientProvider>
  )
}
