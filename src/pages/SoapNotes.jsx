import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function SoapNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    base44.entities.SoapNote.list("-date_of_service", 500).then(data => {
      setNotes(data);
      setLoading(false);
    });
  }, []);

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return !q || n.patient_name?.toLowerCase().includes(q) || n.date_of_service?.includes(q);
  });

  const handlePrint = (note) => {
    setPrinting(note);
    setTimeout(() => window.print(), 300);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SOAP Notes</h1>
          <p className="text-sm text-muted-foreground">AI-generated clinical notes stored by patient and date</p>
        </div>
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
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={e => { e.stopPropagation(); handlePrint(note); }} title="Print PDF">
                  <Printer className="w-3.5 h-3.5" />
                </Button>
                {expanded === note.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>

              {expanded === note.id && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3 text-sm">
                  <Section label="S — Subjective" text={note.subjective} color="blue" />
                  <Section label="O — Objective" text={note.objective} color="green" />
                  <Section label="A — Assessment" text={note.assessment} color="amber" />
                  <Section label="P — Plan" text={note.plan} color="purple" />
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
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No SOAP notes yet. Generate one from the New Claim page.
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
    </div>
  );
}

function Section({ label, text, color }) {
  const colors = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    purple: "border-purple-200 bg-purple-50",
  };
  return (
    <div className={`border rounded-lg p-3 ${colors[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="whitespace-pre-line leading-relaxed">{text}</p>
    </div>
  );
}

function SoapPrintView({ note }) {
  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      fontSize: "11pt",
      color: "#000",
      margin: "1in",
      lineHeight: "1.5",
    }}>
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
                <div style={{ borderBottom: "1px solid #000", marginBottom: "4px", height: "32px", paddingTop: "8px", fontSize: "10pt" }}>
                  {note.date_of_service}
                </div>
                <div style={{ fontSize: "9pt" }}>Date</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: "8px", fontSize: "10pt" }}>
          <strong>{note.doctor_signature}</strong>
        </div>
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