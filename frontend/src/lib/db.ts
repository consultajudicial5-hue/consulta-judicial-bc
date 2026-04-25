import { supabase } from './supabase'

export interface ExpedienteRow {
  id: number
  expediente: string
  partes: string
  juzgado: string
  ciudad: string
  fecha: string
  acuerdo: string
}

export interface ScrapeLogRow {
  id: number
  ciudad: string
  fecha: string
  status: string
  count: number
  error: string | null
  scraped_at: string
}

/** Fetch all expedientes for a city+date, ordered by expediente number. */
export async function getExpedientes(ciudad: string, fecha: string): Promise<ExpedienteRow[]> {
  const { data, error } = await supabase
    .from('expedientes')
    .select('id, expediente, partes, juzgado, ciudad, fecha, acuerdo')
    .eq('ciudad', ciudad)
    .eq('fecha', fecha)
    .order('expediente', { ascending: true })

  if (error) throw new Error(`[db] getExpedientes: ${error.message}`)
  return (data ?? []) as ExpedienteRow[]
}

/** Upsert a batch of expedientes (insert or update on conflict). */
export async function upsertExpedientes(rows: Omit<ExpedienteRow, 'id'>[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await supabase
    .from('expedientes')
    .upsert(rows, { onConflict: 'expediente,ciudad,fecha' })

  if (error) throw new Error(`[db] upsertExpedientes: ${error.message}`)
  return rows.length
}

/**
 * Returns true if there is already a successful scrape for this city+date,
 * OR if there was a failed scrape less than 10 minutes ago (to prevent hammering
 * the upstream on transient errors while still allowing automatic retry).
 */
export async function hasScrapeLog(ciudad: string, fecha: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scrape_log')
    .select('status, scraped_at')
    .eq('ciudad', ciudad)
    .eq('fecha', fecha)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`[db] hasScrapeLog: ${error.message}`)
  if (!data) return false

  if (data.status === 'ok') return true

  // Allow retry after 10 minutes for failed scrapes
  const RETRY_INTERVAL_MS = 10 * 60 * 1000
  const lastAt = new Date(data.scraped_at).getTime()
  return Date.now() - lastAt < RETRY_INTERVAL_MS
}

/** Record (or update) a scrape attempt in the log. */
export async function recordScrapeLog(
  ciudad: string,
  fecha: string,
  status: 'ok' | 'error',
  count: number,
  error?: string,
): Promise<void> {
  const { error: dbErr } = await supabase
    .from('scrape_log')
    .upsert(
      { ciudad, fecha, status, count, error: error ?? null },
      { onConflict: 'ciudad,fecha' },
    )

  if (dbErr) throw new Error(`[db] recordScrapeLog: ${dbErr.message}`)
}

/** Fetch recent scrape log entries for the admin panel. */
export async function getScrapeLog(limit = 100): Promise<ScrapeLogRow[]> {
  const { data, error } = await supabase
    .from('scrape_log')
    .select('id, ciudad, fecha, status, count, error, scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`[db] getScrapeLog: ${error.message}`)
  return (data ?? []) as ScrapeLogRow[]
}
