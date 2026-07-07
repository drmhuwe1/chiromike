import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ExternalLink, CheckCircle, Loader2, ClipboardCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ClaimReadinessCheck, { validateClaimReadiness } from "@/components/officeally/ClaimReadinessCheck";

export default function OfficeAllyExportModal({ claim, patient, open, onClose, onStatusUpdate }) {
  const [step, setStep] = useState("check"); // check | download | confirm
  const [loading, setLoading] = useState(false);
  const [fileId, setFileId] = useState("");
  const [batchId, setBatchId] = useState(null);
  const [filename, setFilename] = useState("");
  const { toast } = useToast();

  const errors = validateClaimReadiness(claim, patient);
  const isReady = errors.length === 0;

  useEffect(() => {
    if (open) { setStep("check"); setFileId(""); setBatchId(null); setFilename(""); }
  }, [open]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Call the export function — it returns the EDI content as text
      const res = await base44.functions.invoke('officeAllyExport', {
        claim_ids: [claim.id],
        mode: 'single'
      });

      if (res.data?.error) {
        const errData = res.data;
        if (errData.validation_errors) {
          toast({ title: "Validation failed: " + errData.validation_errors.join("; "), variant: "destructive" });
        } else {
          toast({ title: errData.error || "Export failed", variant: "destructive" });
        }
        setLoading(false);
        return;
      }

      // The function returns text/plain with Content-Disposition — invoke returns raw text in data
      // Build a blob and trigger browser download
      const ediText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const fname = `OA_${claim.patient_name?.replace(/\s+/g, '_')}_${claim.date_of_service || 'export'}.edi`;

      const blob = new Blob([ediText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFilename(fname);
      onStatusUpdate?.('Exported for Office Ally');
      setStep("confirm");

      // Try to get batch ID from a follow-up list call
      const batches = await base44.entities.OfficeAllyBatch.list('-created_date', 1);
      if (batches[0]) setBatchId(batches[0].id);

    } catch (err) {
      toast({ title: err.message || "Download failed", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleConfirmFileId = async () => {
    if (!fileId.trim()) { toast({ title: "Please enter the Office Ally File ID", variant: "destructive" }); return; }
    setLoading(true);
    if (batchId) {
      await base44.functions.invoke('officeAllySftp', {
        action: 'confirm_file_id',
        batch_id: batchId,
        office_ally_file_id: fileId.trim()
      });
    }
    toast({ title: "File ID saved — submission confirmed!" });
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" /> Export for Office Ally
          </DialogTitle>
        </DialogHeader>

        {step === "check" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Patient: <span className="font-semibold text-foreground">{claim?.patient_name}</span> — DOS: <span className="font-semibold text-foreground">{claim?.date_of_service}</span>
            </div>
            <ClaimReadinessCheck claim={claim} patient={patient} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep("download")} disabled={!isReady}>
                <Download className="w-4 h-4 mr-2" /> Proceed to Download
              </Button>
            </div>
          </div>
        )}

        {step === "download" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm text-blue-900">
              <p className="font-semibold">How to submit to Office Ally:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Click "Download 837P File" below — a .edi file will save to your computer.</li>
                <li>Log into <strong>Office Ally Service Center</strong> at officeally.com.</li>
                <li>Go to <strong>Submit Claims → Upload Claims</strong>.</li>
                <li>Choose <strong>Professional CMS-1500 / 837P</strong> file type.</li>
                <li>Select the downloaded .edi file and upload.</li>
                <li>Copy the <strong>File ID confirmation number</strong> shown by Office Ally.</li>
                <li>Return here and enter the File ID to complete the record.</li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownload} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download 837P File
              </Button>
              <a href="https://www.officeally.com" target="_blank" rel="noreferrer">
                <Button variant="outline" type="button">
                  <ExternalLink className="w-4 h-4 mr-2" /> Open Office Ally
                </Button>
              </a>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("check")}>← Back</Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold">File downloaded: {filename}</p>
                <p>Claim status updated to "Exported for Office Ally."</p>
              </div>
            </div>
            <div>
              <Label>Office Ally File ID <span className="text-muted-foreground font-normal text-xs">(optional — enter after uploading)</span></Label>
              <Input
                className="mt-1"
                value={fileId}
                onChange={e => setFileId(e.target.value)}
                placeholder="e.g. OA-20240707-12345"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={handleConfirmFileId} disabled={loading || !fileId.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Save File ID
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}