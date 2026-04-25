import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertExpedientes, recordScrapeLog } from '@/lib/db'
import { scrapeBoletin } from '@/lib/scraper'

const VALID_CITIES = ['mexicali', 'tijuana', 'ensenada', 'tecate', 'rosarito']

const ScrapeSchema = z.object({
  ciudad: z.string().min(1).max(50).transform(v => v.toLowerCase().trim()),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
})

function getTodayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.API_SECRET_KEY
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ScrapeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' }, { status: 400 })
  }

  const { ciudad, fecha: rawFecha } = parsed.data
  const fecha = rawFecha ?? getTodayDate()

  if (!VALID_CITIES.includes(ciudad)) {
    return NextResponse.json({ error: `Ciudad inválida. Válidas: ${VALID_CITIES.join(', ')}` }, { status: 400 })
  }

  try {
    const scraped = await scrapeBoletin(ciudad, fecha)
    if (scraped.length > 0) {
      await upsertExpedientes(scraped)
    }
    await recordScrapeLog(ciudad, fecha, 'ok', scraped.length)
    return NextResponse.json({ ok: true, ciudad, fecha, count: scraped.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/scrape] Error:', msg)
    try {
      await recordScrapeLog(ciudad, fecha, 'error', 0, msg)
    } catch {
      // ignore
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
