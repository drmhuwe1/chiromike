import { useEffect, useState } from "react";
import { BrainCircuit, Copy, Printer, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function DenialAnalyzerModal({ claim, open, onOpenChange, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appeal, setAppeal] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) setAppeal(null);
  }, [open, claim?.id]);

  const analyze = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("analyzeDenial", { claim_id: claim.id });
      setAppeal(response.data.appeal);
      toast({ title: "Denial analysis and rebuttal draft created." });
      await onSaved?.();
    } catch (error) {
      toast({ title: error.message || "Unable to analyze denial", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!appeal?.id) return;
    setSaving(true);
    try {
      await base44.entities.DenialAppeal.update(appeal.id, {
        appeal_letter: appeal.appeal_letter,
        status: "Ready for Review",
      });
      toast({ title: "Rebuttal draft saved." });
      await onSaved?.();
    } catch (error) {
      toast({ title: error.message || "Unable to save draft", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyLetter = async () => {
    await navigator.clipboard.writeText(appeal.appeal_letter || "");
    toast({ title: "Letter copied." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>AI Denial Analyzer · {claim?.patient_name}</DialogTitle></DialogHeader>
        {!appeal ? (
          <div className="py-10 text-center space-y-4">
            <BrainCircuit className="w-12 h-12 text-primary mx-auto" />
            <div><p className="font-semibold">Analyze the claim, denial, SOAP note, and payer record</p><p className="text-sm text-muted-foreground">The result is a draft and must be reviewed before sending.</p></div>
            <Button onClick={analyze} disabled={loading}>{loading ? "Analyzing..." : "Analyze Denial & Draft Rebuttal"}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border p-3"><h3 className="text-sm font-semibold mb-1">Analysis</h3><p className="text-sm whitespace-pre-wrap">{appeal.analysis_summary}</p></section>
            <section className="rounded-lg border p-3"><h3 className="text-sm font-semibold mb-1">Recommended Action</h3><p className="text-sm whitespace-pre-wrap">{appeal.recommended_action}</p></section>
            <div className="grid md:grid-cols-2 gap-3">
              <ListBox title="Verify Before Sending" items={appeal.missing_information} />
              <ListBox title="Suggested Attachments" items={appeal.supporting_documents} />
            </div>
            <section className="rounded-lg border p-3 space-y-2">
              <h3 className="text-sm font-semibold">Delivery Information from Payer Knowledge Base</h3>
              <p className="text-sm whitespace-pre-wrap">{appeal.delivery_address || "Appeals address not stored — verify with the payer."}</p>
              <p className="text-sm">Fax: {appeal.delivery_fax || "Not stored — verify with the payer."}</p>
            </section>
            <div>
              <label htmlFor="appeal-letter" className="text-sm font-semibold">Editable Appeal / Rebuttal Letter</label>
              <Textarea id="appeal-letter" className="mt-2 min-h-[360px] font-mono text-xs" value={appeal.appeal_letter || ""} onChange={(event) => setAppeal((current) => ({ ...current, appeal_letter: event.target.value }))} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">Provider review is required. Verify every bracketed item, payer address, fax number, deadline, and clinical statement before submission.</div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={copyLetter} className="gap-2"><Copy className="w-4 h-4" />Copy</Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" />Print</Button>
              <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save Draft"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListBox({ title, items = [] }) {
  return <section className="rounded-lg border p-3"><h3 className="text-sm font-semibold mb-1">{title}</h3>{items.length ? <ul className="text-sm list-disc pl-5 space-y-1">{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">None identified.</p>}</section>;
}
