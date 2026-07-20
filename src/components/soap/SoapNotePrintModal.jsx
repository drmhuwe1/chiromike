import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";

export default function SoapNotePrintModal({ note, onClose }) {
  if (!note) return null;

  const handlePrint = () => {
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white text-black border border-border rounded-xl shadow-2xl w-full max-w-3xl my-6">
        <div className="p-4 border-b border-border flex justify-between items-center print:hidden">
          <h2 className="text-lg font-bold">SOAP Note — {note.patient_name}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
              <X className="w-4 h-4" /> Close
            </Button>
          </div>
        </div>

        <div className="soap-print-area p-8 space-y-4 text-sm leading-relaxed text-black">
          <header className="border-b-2 border-black pb-2 mb-2">
            <h1 className="text-2xl font-bold">Chiropractic SOAP Note</h1>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <p><strong>Patient:</strong> {note.patient_name}</p>
              <p><strong>Date of Service:</strong> {note.date_of_service}</p>
              <p><strong>Visit Type:</strong> {note.visit_type}</p>
              <p><strong>Provider:</strong> {note.provider_name}</p>
              {note.accident_related && (
                <p className="col-span-2"><strong>Accident:</strong> {note.accident_type || "Yes"} {note.accident_date ? ` — ${note.accident_date}` : ""}</p>
              )}
            </div>
          </header>

          <section>
            <h3 className="font-bold uppercase underline mb-1">Subjective</h3>
            <p className="whitespace-pre-wrap text-sm">{note.subjective || "Not recorded."}</p>
          </section>

          <section>
            <h3 className="font-bold uppercase underline mb-1">Objective</h3>
            <p className="whitespace-pre-wrap text-sm">{note.objective || "Not recorded."}</p>
          </section>

          <section>
            <h3 className="font-bold uppercase underline mb-1">Assessment</h3>
            <p className="whitespace-pre-wrap text-sm">{note.assessment || "Not recorded."}</p>
          </section>

          <section>
            <h3 className="font-bold uppercase underline mb-1">Plan</h3>
            <p className="whitespace-pre-wrap text-sm">{note.plan || "Not recorded."}</p>
          </section>

          {(note.diagnoses || []).length > 0 && (
            <section>
              <h3 className="font-bold uppercase underline mb-1">Diagnoses</h3>
              <ul className="list-disc list-inside text-sm">
                {note.diagnoses.map((d, i) => (
                  <li key={i}>
                    <span className="font-mono font-semibold">{d.code}</span>
                    {d.description ? ` — ${d.description}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(note.procedures || []).length > 0 && (
            <section>
              <h3 className="font-bold uppercase underline mb-1">Procedures</h3>
              <ul className="list-disc list-inside text-sm">
                {note.procedures.map((p, i) => (
                  <li key={i}>
                    <span className="font-mono font-semibold">{p.code}</span>
                    {p.description ? ` — ${p.description}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {note.functional_limitations && (
            <section>
              <h3 className="font-bold uppercase underline mb-1">Functional Limitations</h3>
              <p className="text-sm">{note.functional_limitations}</p>
            </section>
          )}

          <footer className="border-t border-black pt-4 mt-6 text-sm">
            <div className="flex justify-between items-end">
              <div>
                <p><strong>Provider Signature:</strong></p>
                <p className="mt-6">{note.doctor_signature || ""}</p>
                <div className="border-t border-black w-64"></div>
              </div>
              <div className="text-right">
                <p>Pain Scale: {note.pain_scale_current ?? "—"}/10</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}