import "server-only";

import { auditLogRepository } from "@/repositories/audit-log.repository";

function extractRequestMeta(request?: Request) {
  if (!request) return { ipAddress: null, userAgent: null };
  return {
    ipAddress: request.headers.get("x-forwarded-for") ?? null,
    userAgent: request.headers.get("user-agent") ?? null,
  };
}

export const auditLogService = {
  log(
    action: string,
    options: {
      userId?: string | null;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
      request?: Request;
    } = {}
  ) {
    const { ipAddress, userAgent } = extractRequestMeta(options.request);
    return auditLogRepository.create({
      action,
      userId: options.userId,
      entityType: options.entityType,
      entityId: options.entityId,
      metadata: options.metadata,
      ipAddress,
      userAgent,
    });
  },
};
