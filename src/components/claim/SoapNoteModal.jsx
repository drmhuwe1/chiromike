import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import VoiceDictation from "@/components/VoiceDictation";
import NotePolishModal from "./NotePolishModal";

export default function SoapNoteModal({ claim, onClose, onGenerated }) {
  const [painScale, setPainScale] = useState("");
  const [functionalLimitations, setFunctionalLimitations] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [polishTarget, setPolishTarget] = useState(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke("generateSoapNote", {
        claim_id: claim.id,
        pain_scale: parseFloat(painScale) || null,
        functional_limitations: functionalLimitations,
        doctor_notes: doctorNotes,
      });
      setDone(true);
      toast({ title: "SOAP note generated and saved to patient profile!" });
      if (onGenerated) onGenerated();
    } catch (e) {
      toast({ title: e.message || "Failed to generate SOAP note", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Generate SOAP Note</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {done ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold text-lg">SOAP Note Saved!</p>
            <p className="text-sm text-muted-foreground">It's stored under SOAP Notes in the sidebar, searchable by patient and date, and printable as a PDF.</p>
            <Button onClick={onClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              AI will generate a professional SOAP note based on the claim's diagnoses and procedures.
              {(claim.accident_related || claim.visit_type === "Auto") && (
                <span className="font-medium text-amber-700"> Auto/PI causation language will be included.</span>
              )}
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Current Pain Scale (0–10)</Label>
                <Input
                  type="number" min="0" max="10" step="0.5"
                  placeholder="e.g. 6"
                  className="mt-1"
                  value={painScale}
                  onChange={e => setPainScale(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm">Functional Limitations</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setPolishTarget({ field: "functional_limitations", value: functionalLimitations })}
                    >
                      ✨ Polish
                    </Button>
                    <VoiceDictation label="Dictate" onTranscript={t => setFunctionalLimitations(prev => (prev ? prev + ' ' + t : t))} />
                  </div>
                </div>
                <Textarea
                  placeholder="e.g. Difficulty sitting more than 20 min, limited ability to lift over 10 lbs, unable to turn head fully..."
                  rows={2}
                  className="mt-1 text-sm"
                  value={functionalLimitations}
                  onChange={e => setFunctionalLimitations(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm">Additional Doctor Notes (optional)</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setPolishTarget({ field: "doctor_notes", value: doctorNotes })}
                    >
                      ✨ Polish
                    </Button>
                    <VoiceDictation label="Dictate" onTranscript={t => setDoctorNotes(prev => (prev ? prev + ' ' + t : t))} />
                  </div>
                </div>
                <Textarea
                  placeholder="Any extra findings, patient progress, or notes to include..."
                  rows={2}
                  className="mt-1 text-sm"
                  value={doctorNotes}
                  onChange={e => setDoctorNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleGenerate} disabled={loading} className="flex-1">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating (15–30 sec)...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate SOAP Note</>
                )}
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </>
        )}

        {polishTarget && (
          <NotePolishModal
            rawNotes={polishTarget.value}
            onClose={() => setPolishTarget(null)}
            onPolished={(polished) => {
              if (polishTarget.field === "functional_limitations") {
                setFunctionalLimitations(polished);
              } else if (polishTarget.field === "doctor_notes") {
                setDoctorNotes(polished);
              }
              setPolishTarget(null);
            }}
          />
        )}
      </div>
    </div>
  );
}