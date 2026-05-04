import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Printer, FileText, ChevronDown, ChevronUp, Send, Plus, X, Trash2 } from "lucide-react";
import FaxModal from "../components/claim/FaxModal";
import SoapFieldEditModal from "../components/soap/SoapFieldEditModal";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "../utils/auditLog";

export default function SoapNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [faxTarget, setFaxTarget] = useState(null); // { soapNote, claim }
  const [generating, setGenerating] = useState(null); // { patientId, dateFrom, dateTo, formType }
  const [editingNote, setEditingNote] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.SoapNote.list("-date_of_service", 500),
      base44.entities.Patient.list("-updated_date", 500),
    ]).then(([notesData, patientsData]) => {
      setNotes(notesData);
      setPatients(patientsData);
      setLoading(false);
      logAudit("Viewed SOAP notes", "SoapNote");
    });
  }, []);

  const refreshNotes = async () => {
    const updated = await base44.entities.SoapNote.list("-date_of_service", 500);
    setNotes(updated);
  };

  const handleDeleteNote = async (note) => {
    if (!window.confirm(`Delete SOAP note for ${note.patient_name} (${note.date_of_service})? This cannot be undone.`)) {
      return;
    }
    await base44.entities.SoapNote.delete(note.id);
    await refreshNotes();
    setExpanded(null);
    toast({ title: "SOAP note deleted" });
  };

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return !q || n.patient_name?.toLowerCase().includes(q) || n.date_of_service?.includes(q);
  });

  const handlePrint = (note) => {
    setPrinting(note);
    setTimeout(() => window.print(), 300);
  };

  const handleFax = async (note) => {
    // Try to find the associated claim to include CMS-1500 data
    let claim = null;
    if (note.claim_id) {
      const claims = await base44.entities.Claim.filter({ id: note.claim_id });
      claim = claims[0] || null;
    }
    setFaxTarget({ soapNote: note, claim });
  };

  const handleGenerateSoapNote = async (patientId, dateFrom, dateTo, formType) => {
    setGenerating(null);
    try {
      const res = await base44.functions.invoke("generateSoapNote", {
        patient_id: patientId,
        date_from: dateFrom,
        date_to: dateTo,
        form_type: formType,
      });
      if (res.data) {
        setNotes([res.data, ...notes]);
        setExpanded(res.data.id); // Auto-expand the new note
        toast({ title: "SOAP note generated successfully" });
      }
    } catch (e) {
      console.error('Generation error:', e);
      toast({ title: e.response?.data?.error || e.message || "Failed to generate SOAP note", variant: "destructive" });
    }
  };

  const filteredPatients = patientSearch.length >= 2
    ? patients.filter(p => {
        const q = patientSearch.toLowerCase();
        return p.first_name?.toLowerCase().includes(q) || p.last_name?.toLowerCase().includes(q);
      }).slice(0, 15)
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SOAP Notes</h1>
          <p className="text-sm text-muted-foreground">AI-generated clinical notes stored by patient and date</p>
        </div>
        <Button onClick={() => setGenerating({ patientId: "", dateFrom: new Date().toISOString().split("T")[0], dateTo: new Date().toISOString().split("T")[0], formType: "claim" })}>
          <Plus className="w-4 h-4 mr-2" /> Generate SOAP Note
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by patient name or date..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(note => (
            <div key={note.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20"
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}
              >
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold">{note.patient_name}</span>
                  <span className="text-muted-foreground text-sm ml-3">{note.date_of_service}</span>
                  {note.visit_type && <span className="ml-3 text-xs bg-muted px-2 py-0.5 rounded-full">{note.visit_type}</span>}
                  {note.accident_related && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Accident</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFax(note)} title="Send via Fax">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handlePrint(note)} title="Print PDF">
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteNote(note)} title="Delete SOAP Note">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                {expanded === note.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>

              {expanded === note.id && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3 text-sm">
                  <Section label="S — Subjective" text={note.subjective} color="blue" fieldKey="subjective" onEdit={(field) => { setEditingNote(note); setEditingField(field); }} />
                  <Section label="O — Objective" text={note.objective} color="green" fieldKey="objective" onEdit={(field) => { setEditingNote(note); setEditingField(field); }} />
                  <Section label="A — Assessment" text={note.assessment} color="amber" fieldKey="assessment" onEdit={(field) => { setEditingNote(note); setEditingField(field); }} />
                  <Section label="P — Plan" text={note.plan} color="purple" fieldKey="plan" onEdit={(field) => { setEditingNote(note); setEditingField(field); }} />
                  {note.diagnoses?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Diagnoses:</strong> {note.diagnoses.map(d => d.code).join(", ")}
                    </div>
                  )}
                  {note.doctor_signature && (
                    <div className="pt-3 border-t border-border text-xs text-muted-foreground italic">
                      Signed: {note.doctor_signature} — {note.date_of_service}
                    </div>
                  )}
                  <div className="pt-2 flex gap-2">
                    <Button 
                      size="sm" 
                      className="text-blue-600 border-blue-200 hover:bg-blue-50" 
                      variant="outline"
                      onClick={() => { setEditingNote(note); setEditingField("subjective"); }}
                    >
                      Edit Fields
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-blue-600 border-blue-200 hover:bg-blue-50" 
                      onClick={() => handleFax(note)}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Fax Patient File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No SOAP notes yet. Click <strong>+ Generate SOAP Note</strong> to create one.
            </div>
          )}
        </div>
      )}

      {/* Print area */}
      {printing && (
        <div className="print-area" style={{ display: "none" }}>
          <SoapPrintView note={printing} />
        </div>
      )}

      {/* Fax modal */}
      {faxTarget && (
        <FaxModal
          soapNote={faxTarget.soapNote}
          claim={faxTarget.claim}
          onClose={() => setFaxTarget(null)}
        />
      )}

      {/* Edit SOAP Field modal */}
      {editingNote && editingField && (
        <SoapFieldEditModal
          note={editingNote}
          field={editingField}
          onSave={async (field, value) => {
            await base44.entities.SoapNote.update(editingNote.id, { [field]: value });
            await refreshNotes();
            toast({ title: "Field updated" });
          }}
          onClose={() => { setEditingNote(null); setEditingField(null); }}
        />
      )}

      {/* Generate SOAP Note modal */}
      {generating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md space-y-4 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Generate SOAP Note</h2>
              <Button variant="ghost" size="sm" onClick={() => setGenerating(null)}><X className="w-4 h-4" /></Button>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Patient *</Label>
              <div className="relative">
                <Input
                  placeholder="Search patient..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="text-sm"
                />
                {patientSearch.length >= 2 && filteredPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                    {filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          setGenerating(prev => ({ ...prev, patientId: p.id }));
                          setPatientSearch(`${p.first_name} ${p.last_name}`);
                        }}
                      >
                        {p.first_name} {p.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-2 block">Date From *</Label>
                <Input
                  type="date"
                  value={generating.dateFrom || new Date().toISOString().split("T")[0]}
                  onChange={e => setGenerating(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-sm mb-2 block">Date To *</Label>
                <Input
                  type="date"
                  value={generating.dateTo || new Date().toISOString().split("T")[0]}
                  onChange={e => setGenerating(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Form Type *</Label>
              <div className="space-y-2">
                {[
                  { value: "new_patient", label: "New Patient Exam" },
                  { value: "re_exam", label: "Re-Examination" },
                  { value: "claim", label: "New Claim/Visit" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm rounded border transition-colors ${
                      generating.formType === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setGenerating(prev => ({ ...prev, formType: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                disabled={!generating.patientId}
                onClick={() => handleGenerateSoapNote(generating.patientId, generating.dateFrom, generating.dateTo, generating.formType)}
              >
                Generate
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setGenerating(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
      </div>
      );
      }

function Section({ label, text, color, fieldKey, onEdit }) {
  const colors = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    purple: "border-purple-200 bg-purple-50",
  };
  return (
    <div 
      className={`border rounded-lg p-3 ${colors[color]} cursor-pointer hover:shadow-md transition-shadow`} 
      onClick={() => onEdit(fieldKey)}
      role="button"
      tabIndex={0}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="whitespace-pre-line leading-relaxed text-sm">{text || "(empty - click to edit)"}</p>
    </div>
  );
}

function SoapPrintView({ note }) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#000", margin: "1in", lineHeight: "1.5" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "16pt", fontWeight: "bold", margin: 0 }}>CHIROPRACTIC SOAP NOTE</h1>
        <p style={{ margin: "4px 0", fontSize: "10pt" }}>CONFIDENTIAL MEDICAL RECORD</p>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "10pt" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", padding: "3px 0" }}><strong>Patient:</strong> {note.patient_name}</td>
            <td style={{ padding: "3px 0" }}><strong>Date of Service:</strong> {note.date_of_service}</td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0" }}><strong>Visit Type:</strong> {note.visit_type}</td>
            <td style={{ padding: "3px 0" }}><strong>Provider:</strong> {note.doctor_signature}</td>
          </tr>
          {note.accident_related && (
            <tr>
              <td style={{ padding: "3px 0" }}><strong>Accident Date:</strong> {note.accident_date}</td>
              <td style={{ padding: "3px 0" }}><strong>Accident Type:</strong> {note.accident_type}</td>
            </tr>
          )}
          {note.pain_scale_current != null && (
            <tr>
              <td colSpan={2} style={{ padding: "3px 0" }}><strong>Pain Scale:</strong> {note.pain_scale_current}/10</td>
            </tr>
          )}
        </tbody>
      </table>
      {note.diagnoses?.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <strong>DIAGNOSIS CODES:</strong>
          <div style={{ marginTop: "4px" }}>
            {note.diagnoses.map((d, i) => (
              <div key={i}>{String.fromCharCode(65 + i)}. {d.code} — {d.description}</div>
            ))}
          </div>
        </div>
      )}
      <PrintSection label="S — SUBJECTIVE" text={note.subjective} />
      <PrintSection label="O — OBJECTIVE" text={note.objective} />
      <PrintSection label="A — ASSESSMENT" text={note.assessment} />
      <PrintSection label="P — PLAN" text={note.plan} />
      {note.procedures?.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <strong>PROCEDURES PERFORMED:</strong>
          <div style={{ marginTop: "4px" }}>
            {note.procedures.map((p, i) => (
              <div key={i}>{p.code} — {p.description} (Units: {p.units})</div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: "48px", borderTop: "1px solid #000", paddingTop: "12px" }}>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ width: "50%" }}>
                <div style={{ borderBottom: "1px solid #000", marginBottom: "4px", height: "32px" }}></div>
                <div style={{ fontSize: "9pt" }}>Physician Signature</div>
              </td>
              <td style={{ width: "10%" }}></td>
              <td style={{ width: "40%" }}>
                <div style={{ borderBottom: "1px solid #000", marginBottom: "4px", height: "32px", paddingTop: "8px", fontSize: "10pt" }}>{note.date_of_service}</div>
                <div style={{ fontSize: "9pt" }}>Date</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: "8px", fontSize: "10pt" }}><strong>{note.doctor_signature}</strong></div>
      </div>
      <div style={{ marginTop: "24px", fontSize: "8pt", color: "#666", textAlign: "center", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
        This document is a confidential medical record. Unauthorized disclosure is prohibited by law.
      </div>
    </div>
  );
}

function PrintSection({ label, text }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: "4px" }}>{label}</div>
      <div style={{ whiteSpace: "pre-line", paddingLeft: "8px" }}>{text}</div>
    </div>
  );
}