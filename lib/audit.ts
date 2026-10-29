import getSupabaseAdmin from './supabaseAdmin';

export async function logAudit(params: {
  adminId?: string | null;
  adminEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return;

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: params.adminId || null,
    admin_email: params.adminEmail || null,
    action: params.action,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    details: params.details || {},
  });
}
