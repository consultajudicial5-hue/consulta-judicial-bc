import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { getExpedientes, upsertExpedientes, hasScrapeLog, recordScrapeLog, ExpedienteRow } from '@/lib/db'
import { scrapeBoletin } from '@/lib/scraper'

// In-memory cache: city+date -> { data, timestamp }
// NOTE: This cache is per-process. It will be cleared on serverless cold starts
// and is not shared across multiple instances. For multi-instance production
// deployments, replace with a shared cache (Redis, etc.).
const cache = new Map<string, { data: ExpedienteRow[]; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

const MAX_LOOKBACK_DAYS = 90
const DEFAULT_PAGE_SIZE = 25

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))
}

const SearchSchema = z.object({
  ciudad: z.string()
    .min(1, 'Ciudad requerida')
    .max(50)
    .regex(/^[a-záéíóúüñ\s-]+$/i, 'Ciudad inválida')
    .transform(v => v.toLowerCase().trim()),
  expediente: z.string().max(100).optional().default(''),
  partes: z.string().max(200).optional().default(''),
  fecha: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(DEFAULT_PAGE_SIZE),
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
    fecha: req.nextUrl.searchParams.get('fecha') ?? undefined,
    page: req.nextUrl.searchParams.get('page') ?? '1',
    pageSize: req.nextUrl.searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE),
  }

  const parsed = SearchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' },
      { status: 400, headers }
    )
  }

  const { ciudad, expediente, partes, page, pageSize } = parsed.data
  const today = getTodayDate()

  // Validate and bound the date parameter
  let fecha = today
  if (parsed.data.fecha) {
    const f = parsed.data.fecha
    if (!isValidDate(f)) {
      return NextResponse.json({ error: 'Fecha inválida. Usa formato YYYY-MM-DD.' }, { status: 400, headers })
    }
    if (f > today) {
      return NextResponse.json({ error: 'La fecha no puede ser futura.' }, { status: 400, headers })
    }
    const diffDays = (Date.now() - Date.parse(f)) / 86_400_000
    if (diffDays > MAX_LOOKBACK_DAYS) {
      return NextResponse.json(
        { error: `No se pueden consultar fechas anteriores a ${MAX_LOOKBACK_DAYS} días.` },
        { status: 400, headers }
      )
    }
    fecha = f
  }

  const cacheKey = `${ciudad}:${fecha}`

  // Check in-memory cache first
  const cached = cache.get(cacheKey)
  let rows = cached && Date.now() - cached.timestamp < CACHE_TTL ? cached.data : null
  let fromCache = !!rows

  if (!rows) {
    // Check if already scraped today (in DB)
    let alreadyScraped = false
    try {
      alreadyScraped = await hasScrapeLog(ciudad, fecha)
    } catch (err) {
      console.error('[api/search] hasScrapeLog error:', err)
    }

    if (!alreadyScraped) {
      // Scrape
      try {
        const scraped = await scrapeBoletin(ciudad, fecha)
        if (scraped.length > 0) {
          await upsertExpedientes(scraped)
        }
        await recordScrapeLog(ciudad, fecha, 'ok', scraped.length)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[api/search] Scrape error:', msg)
        try {
          await recordScrapeLog(ciudad, fecha, 'error', 0, msg)
        } catch {
          // ignore logging failure
        }
      }
    }

    try {
      rows = await getExpedientes(ciudad, fecha)
    } catch (err) {
      console.error('[api/search] getExpedientes error:', err)
      return NextResponse.json({ error: 'Error al consultar la base de datos.' }, { status: 500, headers })
    }
    cache.set(cacheKey, { data: rows, timestamp: Date.now() })
    fromCache = false
  }

  // Apply filters server-side
  let filtered = rows
  if (expediente) {
    const expLower = expediente.toLowerCase()
    filtered = filtered.filter(r => r.expediente.toLowerCase().includes(expLower))
  }
  if (partes) {
    const partesLower = partes.toLowerCase()
    filtered = filtered.filter(r => r.partes.toLowerCase().includes(partesLower))
  }

  // Paginate
  const filteredTotal = filtered.length
  const start = (page - 1) * pageSize
  const pageResults = filtered.slice(start, start + pageSize)
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize))

  return NextResponse.json(
    {
      results: pageResults,
      total: rows.length,
      filteredTotal,
      page,
      pageSize,
      totalPages,
      cached: fromCache,
      fecha,
    },
    { status: 200, headers }
  )
}
