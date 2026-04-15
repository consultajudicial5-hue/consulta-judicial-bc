import { supabase } from './supabase'

export interface ExpedienteRow {
  id: number
  expediente: string
  partes: string
  juzgado: string
  ciudad: string
  fecha: string
  acuerdo: string
  semaforo: 'rojo' | 'amarillo' | 'verde'
}

export async function getExpedientes(ciudad: string, fecha: string): Promise<ExpedienteRow[]> {
  const { data, error } = await supabase
    .from('expedientes')
    .select('id, expediente, partes, juzgado, ciudad, fecha, acuerdo, semaforo')
    .eq('ciudad', ciudad)
    .eq('fecha', fecha)
    .order('expediente', { ascending: true })

  if (error) throw new Error(`getExpedientes: ${error.message}`)
  return (data ?? []) as ExpedienteRow[]
}

export async function upsertExpedientes(rows: Omit<ExpedienteRow, 'id'>[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await supabase
    .from('expedientes')
    .upsert(rows, { onConflict: 'expediente,ciudad,fecha', ignoreDuplicates: false })

  if (error) throw new Error(`upsertExpedientes: ${error.message}`)
  return rows.length
}

export async function hasScrapeLog(ciudad: string, fecha: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scrape_log')
    .select('id')
    .eq('ciudad', ciudad)
    .eq('fecha', fecha)
    .eq('status', 'ok')
    .maybeSingle()

  if (error) return false
  return !!data
}

export async function recordScrapeLog(
  ciudad: string,
  fecha: string,
  status: 'ok' | 'error',
  count: number,
  error?: string
): Promise<void> {
  await supabase
    .from('scrape_log')
    .upsert(
      { ciudad, fecha, status, count, error: error ?? null },
      { onConflict: 'ciudad,fecha' }
    )
}

export async function getOrCreateUsuario(email: string): Promise<{ id: string; email: string; premium: boolean }> {
  const { data: existing } = await supabase
    .from('usuarios')
    .select('id, email, premium')
    .eq('email', email)
    .maybeSingle()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('usuarios')
    .insert({ email })
    .select('id, email, premium')
    .single()

  if (error) throw new Error(`getOrCreateUsuario: ${error.message}`)
  return created
}

export async function isPremium(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('usuarios')
    .select('premium')
    .eq('email', email)
    .maybeSingle()
  return data?.premium === true
}

export async function markPremium(email: string, stripeCustomerId?: string): Promise<void> {
  await supabase
    .from('usuarios')
    .upsert(
      { email, premium: true, stripe_customer_id: stripeCustomerId ?? null },
      { onConflict: 'email' }
    )
}

export async function addMonitoreo(userEmail: string, expediente: string, ciudad: string): Promise<void> {
  const { error } = await supabase
    .from('monitoreo')
    .upsert({ user_email: userEmail, expediente, ciudad }, { onConflict: 'user_email,expediente,ciudad', ignoreDuplicates: true })
  if (error) throw new Error(`addMonitoreo: ${error.message}`)
}

export async function getMonitoreoCount(userEmail: string): Promise<number> {
  const { count } = await supabase
    .from('monitoreo')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', userEmail)
  return count ?? 0
}

export async function getAlertas(userEmail: string): Promise<Array<{ id: number; expediente: string; tipo: string; mensaje: string; leida: boolean; created_at: string }>> {
  const { data, error } = await supabase
    .from('alertas')
    .select('id, expediente, tipo, mensaje, leida, created_at')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`getAlertas: ${error.message}`)
  return data ?? []
}

export async function createAlerta(userEmail: string, expediente: string, tipo: string, mensaje: string): Promise<void> {
  await supabase.from('alertas').insert({ user_email: userEmail, expediente, tipo, mensaje })
}

export async function getMonitoredExpedientes(): Promise<Array<{ user_email: string; expediente: string; ciudad: string }>> {
  const { data } = await supabase
    .from('monitoreo')
    .select('user_email, expediente, ciudad')
  return data ?? []
}
