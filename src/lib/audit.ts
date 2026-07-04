import prisma from "@/lib/prisma"

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "REGISTER"
  | "LOGOUT"
  | "PLAN_CHANGED"
  | "ROLE_CHANGED"
  | "WATCH_CREATED"
  | "WATCH_DELETED"
  | "RATE_LIMIT_HIT"
  | "PASSWORD_CHANGED"
  | "SUPERADMIN_ACTION"

export async function writeAuditLog({
  userId,
  userEmail,
  action,
  detail,
  ipAddress,
}: {
  userId?: string
  userEmail: string
  action: AuditAction
  detail?: string
  ipAddress?: string
}) {
  try {
    await prisma.auditLog.create({
      data: { userId, userEmail, action, detail, ipAddress },
    })
  } catch (e) {
    console.error("[AuditLog] Failed to write:", e)
  }
}
