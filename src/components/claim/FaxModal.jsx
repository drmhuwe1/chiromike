import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Loader2, CheckCircle, Phone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function FaxModal({ soapNote, claim, onClose }) {
  const [faxNumber, setFaxNumber] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [includeSoap, setIncludeSoap] = useState(!!soapNote);
  const [includeClaim, setIncludeClaim] = useState(!!claim);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [jobId, setJobId] = useState(null);
  const { toast } = useToast();

  const handleSend = async () => {
    const cleanNumber = faxNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      toast({ title: "Enter a valid 10-digit fax number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke("sendFax", {
        fax_number: cleanNumber,
        patient_name: soapNote?.patient_name || claim?.patient_name || "",
        soap_note_id: includeSoap && soapNote ? soapNote.id : null,
        claim_id: includeClaim && claim ? claim.id : null,
        cover_note: coverNote,
      });
      setJobId(res.data.job_id);
      setDone(true);
      toast({ title: `Fax queued! Job ID: ${res.data.job_id}` });
    } catch (e) {
      toast({ title: e.message || "Failed to send fax", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Send Patient File via Fax</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold text-lg">Fax Queued Successfully!</p>
            {jobId && <p className="text-sm text-muted-foreground">Faxage Job ID: <span className="font-mono font-medium">{jobId}</span></p>}
            <p className="text-sm text-muted-foreground">The patient file will be transmitted to {faxNumber}. Delivery typically takes 1–5 minutes.</p>
            <Button onClick={onClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div>
              <Label className="text-sm">Recipient Fax Number</Label>
              <Input
                className="mt-1"
                placeholder="e.g. 555-867-5309"
                value={faxNumber}
                onChange={e => setFaxNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">10-digit US number. Dashes and spaces OK.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Include in fax package:</Label>
              {soapNote && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeSoap} onChange={e => setIncludeSoap(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm">SOAP Note — {soapNote.patient_name} ({soapNote.date_of_service})</span>
                </label>
              )}
              {claim && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeClaim} onChange={e => setIncludeClaim(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm">CMS-1500 Claim Summary — {claim.patient_name} ({claim.date_of_service})</span>
                </label>
              )}
            </div>

            <div>
              <Label className="text-sm">Cover Page Note (optional)</Label>
              <Textarea
                className="mt-1 text-sm"
                rows={2}
                placeholder="e.g. Please process this claim at your earliest convenience. All documentation enclosed."
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
              />
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              A HIPAA-compliant cover page will be prepended automatically with practice info and confidentiality notice.
            </p>

            <div className="flex gap-3 pt-1">
              <Button onClick={handleSend} disabled={loading || (!includeSoap && !includeClaim)} className="flex-1">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send Fax</>
                )}
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}