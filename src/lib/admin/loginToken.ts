import { jwtVerify, type JWTPayload } from 'jose'

export const MERCHANT_JWT_ISSUER = 'pro-merchant'
export const ADMIN_LOGIN_PURPOSE = 'admin_login'

export type AdminLoginTokenPayload = JWTPayload & {
  purpose?: string
  site_id?: string
  aud?: string | string[]
}

export function getAdminCredentials(): { user: string; pass: string } {
  return {
    user: process.env.AUTH_USER || 'admin',
    pass: process.env.AUTH_PASS || '123456',
  }
}

export function isLegacyUrlPasswordDisabled(): boolean {
  const raw = process.env.DISABLE_LEGACY_URL_PASSWORD?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

export function normalizeRequestHost(host: string): string {
  return host.trim().toLowerCase()
}

function tokenAudienceMatchesHost(
  aud: string | string[] | undefined,
  requestHost: string
): boolean {
  if (!aud) return false
  const normalizedHost = normalizeRequestHost(requestHost)
  const values = Array.isArray(aud) ? aud : [aud]
  return values.some(
    (value) => normalizeRequestHost(String(value)) === normalizedHost
  )
}

export function encodeAdminAuthCookie(user: string, pass: string): string {
  return btoa(`${user}:${pass}`)
}

export async function verifyAdminLoginToken(
  token: string,
  requestHost: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = process.env.BLOG_LOGIN_JWT_SECRET?.trim()
  if (!secret) {
    return { ok: false, reason: 'BLOG_LOGIN_JWT_SECRET not configured' }
  }

  const { user: expectedUser } = getAdminCredentials()

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ['HS256'],
        issuer: MERCHANT_JWT_ISSUER,
      }
    )

    const claims = payload as AdminLoginTokenPayload

    if (claims.purpose !== ADMIN_LOGIN_PURPOSE) {
      return { ok: false, reason: 'invalid purpose' }
    }

    if (claims.sub !== expectedUser) {
      return { ok: false, reason: 'invalid sub' }
    }

    if (!tokenAudienceMatchesHost(claims.aud, requestHost)) {
      return { ok: false, reason: 'invalid aud' }
    }

    const expectedSiteId = process.env.BLOG_SITE_ID?.trim()
    const tokenSiteId = String(claims.site_id || '').trim()
    if (expectedSiteId) {
      if (!tokenSiteId || tokenSiteId !== expectedSiteId) {
        return { ok: false, reason: 'invalid site_id' }
      }
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, reason: message }
  }
}
