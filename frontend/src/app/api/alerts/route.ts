import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { getAlertas } from '@/lib/db'

const Schema = z.object({
  email: z.string().email(),
})

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  }

  const raw = { email: req.nextUrl.searchParams.get('email') ?? '' }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  try {
    const alertas = await getAlertas(parsed.data.email)
    return NextResponse.json({ alertas, total: alertas.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/alerts]', msg)
    return NextResponse.json({ error: 'Error al obtener alertas.' }, { status: 500 })
  }
}
