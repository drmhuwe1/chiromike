import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Office Ally SFTP + claim status management.
// Direct SFTP upload is not available in this Deno runtime (native SSH binaries required).
// This function handles: File ID confirmation, claim status updates, and reports a clear
// error when SFTP is attempted so the admin uses Manual Upload instead.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // Confirm Office Ally File ID after manual upload
    if (action === 'confirm_file_id') {
      const { batch_id, office_ally_file_id } = body;
      if (!batch_id || !office_ally_file_id) {
        return Response.json({ error: 'batch_id and office_ally_file_id required' }, { status: 400 });
      }
      await base44.asServiceRole.entities.OfficeAllyBatch.update(batch_id, { office_ally_file_id });
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'Confirmed Office Ally File ID after manual upload',
        resource_type: 'OfficeAllyBatch',
        resource_id: batch_id,
        resource_label: `File ID: ${office_ally_file_id}`
      });
      return Response.json({ success: true });
    }

    // Update claim status (admin review after receiving report files)
    if (action === 'update_claim_status') {
      const { claim_id, new_status } = body;
      if (!claim_id || !new_status) {
        return Response.json({ error: 'claim_id and new_status required' }, { status: 400 });
      }
      const validStatuses = [
        'Draft', 'Ready to Submit', 'Exported for Office Ally',
        'Submitted to Office Ally', 'Accepted', 'Rejected', 'Paid', 'Needs Review'
      ];
      if (!validStatuses.includes(new_status)) {
        return Response.json({ error: 'Invalid status value' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Claim.update(claim_id, { status: new_status });
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: `Updated claim status to: ${new_status}`,
        resource_type: 'Claim',
        resource_id: claim_id,
        resource_label: `Status: ${new_status}`
      });
      return Response.json({ success: true });
    }

    // Direct SFTP submission — not available in this runtime environment
    if (action === 'sftp_submit') {
      return Response.json({
        error: 'Direct SFTP upload is not available in this server environment. ' +
          'Please use Manual Upload: download the 837P file and upload it at ' +
          'https://www.officeally.com (Submit Claims → Upload Claims → Professional 837P).'
      }, { status: 501 });
    }

    // SFTP report check — not available in this runtime environment
    if (action === 'check_reports') {
      return Response.json({
        error: 'Automated SFTP report retrieval is not available in this environment. ' +
          'Please log into Office Ally Service Center to download response files (999, 277, 835) manually.'
      }, { status: 501 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('officeAllySftp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});