import { NextRequest, NextResponse } from 'next/server'
import { markPremium } from '@/lib/db'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' })
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Pagos no configurados.' }, { status: 503 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    const stripe = getStripe()
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Signature verification failed:', msg)
    return NextResponse.json({ error: 'Webhook signature invalid.' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const email = session.metadata?.email ?? session.customer_email
      if (email) {
        await markPremium(email, session.customer as string | undefined)
        console.info(`[webhook] Marked ${email} as premium`)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const stripe = getStripe()
      const customer = await stripe.customers.retrieve(sub.customer as string)
      if (!customer.deleted && customer.email) {
        const { supabase } = await import('@/lib/supabase')
        await supabase
          .from('usuarios')
          .update({ premium: false })
          .eq('email', customer.email)
        console.info(`[webhook] Downgraded ${customer.email} from premium`)
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Handler error:', msg)
    return NextResponse.json({ error: 'Handler error.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
