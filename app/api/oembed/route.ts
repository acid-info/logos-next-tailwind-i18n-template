import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_WIDTH = 960
const DEFAULT_HEIGHT = 700
const MAX_WIDTH = 2000
const MAX_HEIGHT = 2000

function parseSize(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

function getBaseUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  return request.nextUrl.origin
}

function isAllowedUrl(url: URL, baseUrl: string): boolean {
  if (url.origin !== baseUrl) return false

  // Allow locale home pages such as /en, /fr, /ko
  const localeRootPattern = /^\/[a-z]{2}(?:-[A-Z]{2})?$/
  return localeRootPattern.test(url.pathname)
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json'
  if (format !== 'json') {
    return NextResponse.json({ error: 'Only json format is supported' }, { status: 400 })
  }

  const baseUrl = getBaseUrl(request)
  const urlParam = request.nextUrl.searchParams.get('url')

  if (!urlParam) {
    return NextResponse.json({ error: 'Missing required parameter: url' }, { status: 400 })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(urlParam)
  } catch {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 })
  }

  if (!isAllowedUrl(targetUrl, baseUrl)) {
    return NextResponse.json({ error: 'URL is not embeddable by this endpoint' }, { status: 400 })
  }

  const maxWidth = parseSize(request.nextUrl.searchParams.get('maxwidth'), DEFAULT_WIDTH, MAX_WIDTH)
  const maxHeight = parseSize(
    request.nextUrl.searchParams.get('maxheight'),
    DEFAULT_HEIGHT,
    MAX_HEIGHT
  )

  const response = {
    version: '1.0',
    type: 'rich',
    provider_name: 'Circles Dashboard',
    provider_url: baseUrl,
    title: 'Circles Dashboard',
    width: maxWidth,
    height: maxHeight,
    html: `<iframe src="${targetUrl.toString()}" width="${maxWidth}" height="${maxHeight}" frameborder="0" scrolling="auto" allowfullscreen></iframe>`,
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 's-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
