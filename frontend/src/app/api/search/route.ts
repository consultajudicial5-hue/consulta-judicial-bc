import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { getExpedientes, upsertExpedientes, hasScrapeLog, recordScrapeLog } from '@/lib/db'
import { scrapeBoletin } from '@/lib/scraper'

// In-memory cache: city+date -> { data, timestamp }
const cache = new Map<string, { data: ReturnType<typeof getExpedientes>; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

const SearchSchema = z.object({
  ciudad: z.string()
    .min(1, 'Ciudad requerida')
    .max(50)
    .regex(/^[a-záéíóúüñ\s-]+$/i, 'Ciudad inválida')
    .transform(v => v.toLowerCase().trim()),
  expediente: z.string().max(100).optional().default(''),
  partes: z.string().max(200).optional().default(''),
})

function getTodayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip)
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(parseInt(process.env.RATE_LIMIT_RPM ?? '30', 10)),
    'X-RateLimit-Remaining': String(rl.remaining),
    'Cache-Control': 'no-store',
  }

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en un momento.' },
      { status: 429, headers }
    )
  }

  // Parse & validate query params
  const raw = {
    ciudad: req.nextUrl.searchParams.get('ciudad') ?? '',
    expediente: req.nextUrl.searchParams.get('expediente') ?? '',
    partes: req.nextUrl.searchParams.get('partes') ?? '',
  }

  const parsed = SearchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' },
      { status: 400, headers }
    )
  }

  const { ciudad, expediente, partes } = parsed.data
  const fecha = getTodayDate()
  const cacheKey = `${ciudad}:${fecha}`

  // Check in-memory cache first
  const cached = cache.get(cacheKey)
  let rows = cached && Date.now() - cached.timestamp < CACHE_TTL ? cached.data : null
  let fromCache = !!rows

  if (!rows) {
    // Check if already scraped today (in DB)
    const alreadyScraped = hasScrapeLog(ciudad, fecha)

    if (!alreadyScraped) {
      // Scrape
      try {
        const scraped = await scrapeBoletin(ciudad)
        if (scraped.length > 0) {
          upsertExpedientes(scraped)
        }
        recordScrapeLog(ciudad, fecha, 'ok', scraped.length)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[api/search] Scrape error:', msg)
        recordScrapeLog(ciudad, fecha, 'error', 0, msg)
      }
    }

    rows = getExpedientes(ciudad, fecha)
    cache.set(cacheKey, { data: rows, timestamp: Date.now() })
    fromCache = false
  }

  // Apply filters server-side too (for deep filtering)
  let filtered = rows
  if (expediente) {
    const expLower = expediente.toLowerCase()
    filtered = filtered.filter(r => r.expediente.toLowerCase().includes(expLower))
  }
  if (partes) {
    const partesLower = partes.toLowerCase()
    filtered = filtered.filter(r => r.partes.toLowerCase().includes(partesLower))
  }

  return NextResponse.json(
    { results: filtered, total: rows.length, cached: fromCache, fecha },
    { status: 200, headers }
  )
}
