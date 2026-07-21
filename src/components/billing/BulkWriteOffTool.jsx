import { useMemo, useState } from "react";
import { ArchiveX, CheckSquare2, Square } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { claimBalance } from "@/utils/claimBalance";
import { logAudit } from "@/utils/auditLog";
import { useToast } from "@/components/ui/use-toast";

const currency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function BulkWriteOffTool({ claims, onComplete }) {
  const eligible = useMemo(() => claims.filter((claim) => claimBalance(claim) > 0), [claims]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const selectedClaims = eligible.filter((claim) => selected.has(claim.id));
  const selectedTotal = selectedClaims.reduce((sum, claim) => sum + claimBalance(claim), 0);
  const allSelected = eligible.length > 0 && selected.size === eligible.length;

  const toggle = (id) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(eligible.map((claim) => claim.id)));

  const writeOff = async () => {
    if (!selectedClaims.length || !reason.trim()) return;
    const confirmed = window.confirm(
      `Write off ${currency(selectedTotal)} across ${selectedClaims.length} claim(s)? Original claims and billed amounts will remain in the record.`,
    );
    if (!confirmed) return;

    setSaving(true);
    const batchId = `WO-${Date.now()}`;
    const writeOffDate = format(new Date(), "yyyy-MM-dd");
    const results = await Promise.allSettled(selectedClaims.map(async (claim) => {
      const amount = claimBalance(claim);
      await base44.entities.Claim.update(claim.id, {
        written_off_amount: (claim.written_off_amount || 0) + amount,
        write_off_date: writeOffDate,
        write_off_reason: reason.trim(),
        write_off_batch_id: batchId,
        balance_status: "Written Off",
        follow_up_status: "Resolved",
      });
      await logAudit(
        "BULK_BALANCE_WRITE_OFF",
        "Claim",
        claim.id,
        `${claim.patient_name || "Unknown patient"} | DOS ${claim.date_of_service || "Unknown"} | ${currency(amount)} | ${batchId}`,
      );
      return claim.id;
    }));

    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - succeeded;
    toast({
      title: failed
        ? `${succeeded} claim(s) written off; ${failed} failed and remain open.`
        : `${succeeded} claim(s) written off successfully.`,
      variant: failed ? "destructive" : "default",
    });
    setSaving(false);
    setSelected(new Set());
    setReason("");
    if (!failed) setOpen(false);
    await onComplete?.();
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 text-orange-700 border-orange-300 hover:bg-orange-50">
        <ArchiveX className="w-4 h-4" />Receivables Cleanup
      </Button>
    );
  }

  return (
    <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Bulk Balance Write-Off & Receivables Cleanup</h2>
          <p className="text-xs text-muted-foreground">Removes selected balances from active A/R without deleting or changing original claim charges.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>Close</Button>
      </div>

      <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2">
        {allSelected ? <CheckSquare2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        {allSelected ? "Clear Selection" : `Select All ${eligible.length} Open Claims`}
      </Button>

      <div className="max-h-64 overflow-y-auto border rounded-lg bg-card divide-y">
        {eligible.map((claim) => (
          <button key={claim.id} type="button" onClick={() => toggle(claim.id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40">
            {selected.has(claim.id) ? <CheckSquare2 className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className="flex-1 text-sm"><strong>{claim.patient_name || "Unknown patient"}</strong> · DOS {claim.date_of_service || "Unknown"} · {claim.insurance_company || "No payer"}</span>
            <span className="font-semibold text-sm">{currency(claimBalance(claim))}</span>
          </button>
        ))}
        {!eligible.length && <p className="text-sm text-muted-foreground text-center py-8">No open balances are eligible.</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label htmlFor="write-off-reason" className="text-xs font-medium">Required reason</label>
          <Input id="write-off-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Legacy uncollectible balances approved for cleanup" />
        </div>
        <Button onClick={writeOff} disabled={saving || !selectedClaims.length || !reason.trim()} className="gap-2">
          <ArchiveX className="w-4 h-4" />{saving ? "Writing Off..." : `Write Off ${currency(selectedTotal)}`}
        </Button>
      </div>
    </div>
  );
}
