import { NextRequest, NextResponse } from 'next/server'
import { upsertExpedientes, recordScrapeLog } from '@/lib/db'
import { scrapeBoletin } from '@/lib/scraper'

const CITIES = ['mexicali', 'tijuana', 'ensenada', 'tecate', 'rosarito']

function getTodayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Vercel Cron job — runs daily at 15:00 UTC (08:00 Baja California time).
 * Scrapes the judicial bulletin for all cities and stores the results.
 *
 * Vercel validates requests from its cron scheduler using the CRON_SECRET env var.
 * See: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fecha = getTodayDate()
  const results: Record<string, { count: number; error?: string }> = {}

  for (const ciudad of CITIES) {
    try {
      const scraped = await scrapeBoletin(ciudad, fecha)
      if (scraped.length > 0) {
        await upsertExpedientes(scraped)
      }
      await recordScrapeLog(ciudad, fecha, 'ok', scraped.length)
      results[ciudad] = { count: scraped.length }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[cron/scrape] Error for ${ciudad}:`, msg)
      try {
        await recordScrapeLog(ciudad, fecha, 'error', 0, msg)
      } catch {
        // ignore
      }
      results[ciudad] = { count: 0, error: msg }
    }
  }

  return NextResponse.json({ ok: true, fecha, results })
}
