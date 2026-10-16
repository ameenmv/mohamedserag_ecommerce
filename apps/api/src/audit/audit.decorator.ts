import { SetMetadata } from '@nestjs/common'

export const AUDIT_ENTITY_KEY = 'audit:entity'

/**
 * Marks an admin mutation handler so `AuditInterceptor` records an `AuditLog` row on success.
 */
export const Audit = (entity: string) => SetMetadata(AUDIT_ENTITY_KEY, entity)
