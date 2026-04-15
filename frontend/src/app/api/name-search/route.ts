import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { supabase } from '@/lib/supabase'
import { clasificarSemaforo } from '@/lib/scraper'

const Schema = z.object({
  nombre: z.string().min(2).max(200).transform(v => v.trim()),
  ciudad: z.string().min(1).max(50)
    .regex(/^[a-záéíóúüñ\s-]+$/i)
    .transform(v => v.toLowerCase().trim()),
  email: z.string().email(),
})

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip)
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(rl.remaining),
    'Cache-Control': 'no-store',
  }
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })
  }

  const raw = {
    nombre: req.nextUrl.searchParams.get('nombre') ?? '',
    ciudad: req.nextUrl.searchParams.get('ciudad') ?? '',
    email: req.nextUrl.searchParams.get('email') ?? '',
  }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' }, { status: 400, headers })
  }

  const { nombre, ciudad, email } = parsed.data

  // Verify premium
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('premium')
    .eq('email', email)
    .maybeSingle()

  if (!usuario?.premium) {
    return NextResponse.json(
      { error: 'Esta función requiere una suscripción Premium.', premium_required: true },
      { status: 403, headers }
    )
  }

  // Search by partes (name)
  const { data, error } = await supabase
    .from('expedientes')
    .select('id, expediente, partes, juzgado, ciudad, fecha, acuerdo, semaforo')
    .eq('ciudad', ciudad)
    .ilike('partes', `%${nombre}%`)
    .order('fecha', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Error en la búsqueda.' }, { status: 500, headers })
  }

  const results = (data ?? []).map(r => ({ ...r, semaforo: r.semaforo ?? clasificarSemaforo(r.acuerdo) }))

  return NextResponse.json({ results, total: results.length }, { status: 200, headers })
}
