import { prisma } from './prisma'

interface LogApiOptions {
  type: 'API' | 'WEBHOOK'
  source?: string       // "STRIPE" | "CJ" | "INTERNAL"
  method?: string       // GET | POST | PUT | DELETE
  path: string
  statusCode?: number
  userId?: string
  eventType?: string    // webhook: "payment_intent.succeeded"
  eventId?: string      // webhook: Stripe event ID
  request?: unknown
  response?: unknown
  duration?: number     // ms
  success: boolean
  error?: string
  ip?: string
}

export async function logApi(opts: LogApiOptions) {
  try {
    await prisma.apiLog.create({
      data: {
        type: opts.type,
        source: opts.source,
        method: opts.method,
        path: opts.path,
        statusCode: opts.statusCode,
        userId: opts.userId,
        eventType: opts.eventType,
        eventId: opts.eventId,
        request: opts.request !== undefined ? (opts.request as object) : undefined,
        response: opts.response !== undefined ? (opts.response as object) : undefined,
        duration: opts.duration,
        success: opts.success,
        error: opts.error,
        ip: opts.ip,
      },
    })
  } catch (e) {
    // ไม่ให้ log error crash main flow
    console.error('[ApiLogger] Failed to write log:', e)
  }
}

// Helper: วัดเวลาและ log API route อัตโนมัติ
export function withApiLog(
  handler: (req: Request) => Promise<Response>,
  opts: Pick<LogApiOptions, 'path' | 'source'>
) {
  return async (req: Request): Promise<Response> => {
    const start = Date.now()
    let res: Response
    let body: unknown
    try {
      body = await req.clone().json().catch(() => undefined)
    } catch {
      body = undefined
    }

    try {
      res = await handler(req)
      const duration = Date.now() - start
      let resBody: unknown
      try {
        resBody = await res.clone().json()
      } catch {
        resBody = undefined
      }
      await logApi({
        ...opts,
        type: 'API',
        method: req.method,
        statusCode: res.status,
        request: body,
        response: resBody,
        duration,
        success: res.ok,
        ip: req.headers.get('x-forwarded-for') ?? undefined,
      })
      return res
    } catch (err) {
      const duration = Date.now() - start
      await logApi({
        ...opts,
        type: 'API',
        method: req.method,
        statusCode: 500,
        request: body,
        duration,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        ip: req.headers.get('x-forwarded-for') ?? undefined,
      })
      throw err
    }
  }
}
