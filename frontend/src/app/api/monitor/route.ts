import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { addMonitoreo, getMonitoreoCount, isPremium, getOrCreateUsuario } from '@/lib/db'

const FREE_MONITOR_LIMIT = 1

const Schema = z.object({
  email: z.string().email(),
  expediente: z.string().min(1).max(100).transform(v => v.trim()),
  ciudad: z.string().min(1).max(50)
    .regex(/^[a-záéíóúüñ\s-]+$/i)
    .transform(v => v.toLowerCase().trim()),
})

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' }, { status: 400 })
  }

  const { email, expediente, ciudad } = parsed.data

  try {
    await getOrCreateUsuario(email)
    const premium = await isPremium(email)

    if (!premium) {
      const count = await getMonitoreoCount(email)
      if (count >= FREE_MONITOR_LIMIT) {
        return NextResponse.json(
          { error: `El plan gratuito permite monitorear hasta ${FREE_MONITOR_LIMIT} expediente(s). Actualiza a Premium para monitoreo ilimitado.`, premium_required: true },
          { status: 403 }
        )
      }
    }

    await addMonitoreo(email, expediente, ciudad)
    return NextResponse.json({ ok: true, message: `Expediente ${expediente} agregado al monitoreo.` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/monitor]', msg)
    return NextResponse.json({ error: 'Error al guardar el monitoreo.' }, { status: 500 })
  }
}
