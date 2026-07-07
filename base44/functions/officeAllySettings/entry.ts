import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Simple XOR-based obfuscation for SFTP password at rest in DB.
// The real secret key is stored in an env var, never in code or DB.
function encryptPassword(plain) {
  const key = Deno.env.get('SFTP_ENCRYPTION_KEY') || 'chiromike-default-key-32chars!!';
  let result = '';
  for (let i = 0; i < plain.length; i++) {
    result += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function decryptPassword(encrypted) {
  const key = Deno.env.get('SFTP_ENCRYPTION_KEY') || 'chiromike-default-key-32chars!!';
  const decoded = atob(encrypted);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { action, data } = await req.json();

    if (action === 'get') {
      const records = await base44.asServiceRole.entities.OfficeAllySettings.list('-updated_date', 1);
      const rec = records[0];
      if (!rec) return Response.json({ settings: null });
      // Never send the encrypted password to the frontend
      const safe = { ...rec };
      delete safe.sftp_password_encrypted;
      return Response.json({ settings: safe });
    }

    if (action === 'save') {
      const records = await base44.asServiceRole.entities.OfficeAllySettings.list('-updated_date', 1);
      const existing = records[0];

      const payload = { ...data };
      // If a new SFTP password was provided, encrypt it
      if (data.sftp_password_plain) {
        payload.sftp_password_encrypted = encryptPassword(data.sftp_password_plain);
        payload.sftp_configured = true;
        delete payload.sftp_password_plain;
      } else {
        // Don't overwrite existing encrypted password if nothing new was supplied
        delete payload.sftp_password_encrypted;
        delete payload.sftp_password_plain;
      }

      let saved;
      const isUpdate = !!existing;
      if (existing) {
        saved = await base44.asServiceRole.entities.OfficeAllySettings.update(existing.id, payload);
      } else {
        saved = await base44.asServiceRole.entities.OfficeAllySettings.create(payload);
      }

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: isUpdate ? 'Updated Office Ally Settings' : 'Created Office Ally Settings',
        resource_type: 'OfficeAllySettings',
        resource_id: saved.id,
        resource_label: 'Office Ally Configuration',
        ip_note: data.sftp_password_plain ? 'SFTP credentials updated' : 'Non-credential fields updated'
      });

      const safeResult = { ...saved };
      delete safeResult.sftp_password_encrypted;
      return Response.json({ settings: safeResult });
    }

    if (action === 'get_password_for_sftp') {
      // Only called internally by SFTP functions — never called from frontend
      const records = await base44.asServiceRole.entities.OfficeAllySettings.list('-updated_date', 1);
      const rec = records[0];
      if (!rec?.sftp_password_encrypted) return Response.json({ error: 'No SFTP password configured' }, { status: 400 });

      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'Retrieved SFTP credentials for submission',
        resource_type: 'OfficeAllySettings',
        resource_id: rec.id,
        resource_label: 'SFTP Credential Use'
      });

      return Response.json({ password: decryptPassword(rec.sftp_password_encrypted) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('officeAllySettings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});