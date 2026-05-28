import { prisma } from './prisma.js';

export async function audit(userId: string | undefined, action: string, entity: string, entityId?: string, metadata?: unknown) {
  try {
    await prisma.auditLog.create({ data: { userId, action, entity, entityId, metadata: metadata as object } });
  } catch (error) {
    console.info('audit_log_failed', { action, entity, entityId, error });
  }
}
