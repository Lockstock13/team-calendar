import { getServiceClient } from "@/lib/api-auth";

export async function writeAuditLog({
  action,
  actorId = null,
  targetId = null,
  route = null,
  status = "ok",
  details = {},
}) {
  try {
    const service = getServiceClient();
    if (!service) return false;

    const payload = {
      action,
      actor_id: actorId,
      target_id: targetId,
      route,
      status,
      details,
    };

    const { error } = await service.from("audit_logs").insert(payload);
    if (error) {
      console.warn("[audit-log] insert skipped:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[audit-log] write failed:", err.message);
    return false;
  }
}

