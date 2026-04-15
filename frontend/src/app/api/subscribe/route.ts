import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { getOrCreateUsuario } from '@/lib/db'

const PRICE_ID = process.env.STRIPE_PRICE_ID

const Schema = z.object({
  email: z.string().email(),
})

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' })
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
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY || !PRICE_ID) {
    return NextResponse.json({ error: 'Pagos no configurados en este entorno.' }, { status: 503 })
  }

  const { email } = parsed.data

  try {
    await getOrCreateUsuario(email)

    const stripe = getStripe()
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://monitojudicial.bc'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${origin}/?subscribed=1`,
      cancel_url: `${origin}/?cancelled=1`,
      metadata: { email },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/subscribe]', msg)
    return NextResponse.json({ error: 'Error al crear sesión de pago.' }, { status: 500 })
  }
}
