import { base44 } from "@/api/base44Client";

export async function logAudit(action, resourceType, resourceId = "", resourceLabel = "") {
  try {
    const user = await base44.auth.me();
    await base44.entities.AuditLog.create({
      user_email: user?.email || "unknown",
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_label: resourceLabel,
    });
  } catch (_) {
    // never block UI for audit failures
  }
}