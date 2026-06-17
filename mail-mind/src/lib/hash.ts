import { createHash } from 'crypto'

export function hashTenantId(tenantId: string) {
  return createHash('sha256')
    .update(tenantId + process.env.BETTER_AUTH_SECRET!)
    .digest('hex')
    .slice(0, 32)
}
