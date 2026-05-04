import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Send, Loader2, CheckCircle, Phone, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function FaxCompilerModal({ patient, onClose }) {
  const [faxNumber, setFaxNumber] = useState(patient?.phone || "");
  const [coverNote, setCoverNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const [soapNotes, newPatientExams, claims] = await Promise.all([
          base44.entities.SoapNote.filter({ patient_id: patient.id }, "-date_of_service", 50),
          base44.entities.NewPatientExam.filter({ patient_id: patient.id }, "-date_of_exam", 50),
          base44.entities.Claim.filter({ patient_id: patient.id }, "-date_of_service", 50),
        ]);

        const docs = [];
        
        soapNotes.forEach(note => {
          docs.push({
            id: `soap_${note.id}`,
            type: 'soap',
            date: note.date_of_service,
            label: `SOAP Note — ${note.date_of_service}`,
            data: note,
          });
        });

        newPatientExams.forEach(exam => {
          docs.push({
            id: `exam_${exam.id}`,
            type: 'exam',
            date: exam.date_of_exam,
            label: `New Patient Exam — ${exam.date_of_exam}`,
            data: exam,
          });
        });

        claims.forEach(claim => {
          docs.push({
            id: `claim_${claim.id}`,
            type: 'claim',
            date: claim.date_of_service,
            label: `CMS-1500 Claim — ${claim.date_of_service}`,
            data: claim,
          });
        });

        // Sort by date descending
        docs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setDocuments(docs);

        // Auto-select most recent of each type
        const autoSelect = {};
        const types = ['soap', 'exam', 'claim'];
        types.forEach(type => {
          const first = docs.find(d => d.type === type);
          if (first) autoSelect[first.id] = true;
        });
        setSelected(autoSelect);
      } catch {
        toast({ title: 'Failed to load documents', variant: 'destructive' });
      }
      setLoading(false);
    };

    loadDocs();
  }, [patient.id, toast]);

  const toggleSelect = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = async () => {
    const cleanNumber = faxNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      toast({ title: "Enter a valid 10-digit fax number", variant: "destructive" });
      return;
    }

    const selectedIds = Object.keys(selected).filter(k => selected[k]);
    if (selectedIds.length === 0) {
      toast({ title: "Select at least one document to send", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const selectedDocs = selectedIds.map(id => {
        const doc = documents.find(d => d.id === id);
        return { type: doc.type, id: doc.data.id };
      });

      const res = await base44.functions.invoke("sendCompileFax", {
        fax_number: cleanNumber,
        patient_name: patient.first_name + ' ' + patient.last_name,
        documents: selectedDocs,
        cover_note: coverNote,
      });
      setJobId(res.data.job_id);
      setDone(true);
      toast({ title: `Fax queued! Job ID: ${res.data.job_id}` });
    } catch (e) {
      toast({ title: e.message || "Failed to send fax", variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-6">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Compile & Send Patient File</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold text-lg">Fax Sent Successfully!</p>
            {jobId && <p className="text-sm text-muted-foreground">Job ID: <span className="font-mono font-medium">{jobId}</span></p>}
            <p className="text-sm text-muted-foreground">All selected documents compiled and transmitted.</p>
            <Button onClick={onClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
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
                  <p className="text-xs text-muted-foreground mt-1">10-digit US number.</p>
                </div>

                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Available Documents
                  </p>
                  {documents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No documents available for this patient yet.</p>
                  ) : (
                    documents.map(doc => (
                      <label key={doc.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted/50 rounded">
                        <Checkbox
                          checked={!!selected[doc.id]}
                          onCheckedChange={() => toggleSelect(doc.id)}
                        />
                        <span className="text-sm">{doc.label}</span>
                      </label>
                    ))
                  )}
                </div>

                <div>
                  <Label className="text-sm">Cover Page Note (optional)</Label>
                  <Textarea
                    className="mt-1 text-sm"
                    rows={2}
                    placeholder="e.g. Please see attached patient file and claims for processing."
                    value={coverNote}
                    onChange={e => setCoverNote(e.target.value)}
                  />
                </div>

                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  A HIPAA-compliant cover page will be prepended. All selected documents will be compiled into a single fax transmission.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSend}
                    disabled={sending || Object.values(selected).every(v => !v)}
                    className="flex-1"
                  >
                    {sending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compiling & Sending...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Send Compiled Fax</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}