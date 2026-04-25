import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getScrapeLog } from '@/lib/db'

const LogsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
})

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.API_SECRET_KEY
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = { limit: req.nextUrl.searchParams.get('limit') ?? '100' }
  const parsed = LogsSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' }, { status: 400 })
  }

  try {
    const logs = await getScrapeLog(parsed.data.limit)
    return NextResponse.json({ logs, count: logs.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/logs] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
