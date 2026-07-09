import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, ChevronRight, Link2, Send, Trash2, Wallet, CreditCard, Stethoscope, RefreshCw } from "lucide-react";
import PatientForm from "../components/patients/PatientForm";
import PatientCases from "../components/patients/PatientCases";
import IntakeAlertBanner from "../components/patients/IntakeAlertBanner";
import PatientBalanceWidget from "../components/patients/PatientBalanceWidget";
import FaxCompilerModal from "../components/claim/FaxCompilerModal";
import { logAudit } from "../utils/auditLog";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [faxTarget, setFaxTarget] = useState(null);
  const navigate = useNavigate();
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const loadPatients = async () => {
    setLoading(true);
    const [patientData, claimData, paymentData] = await Promise.all([
      base44.entities.Patient.list("-updated_date", 2000),
      base44.entities.Claim.list("-created_date", 2000),
      base44.entities.Payment.list("-created_date", 2000)
    ]);
    setPatients(patientData);
    setClaims(claimData);
    setPayments(paymentData);
    setLoading(false);
    logAudit("Viewed patient list", "Patient");
  };

  useEffect(() => { loadPatients(); }, []);

  const filtered = patients
    .filter(p => {
      const q = search.toLowerCase();
      const matchesSearch = !q || (
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.insurance_id?.includes(q)
      );
      const matchesLetter = !letterFilter || (
        p.first_name?.toUpperCase().startsWith(letterFilter) ||
        p.last_name?.toUpperCase().startsWith(letterFilter)
      );
      return matchesSearch && matchesLetter;
    })
    .sort((a, b) => {
      const la = (a.last_name || "").toLowerCase();
      const lb = (b.last_name || "").toLowerCase();
      if (la !== lb) return la.localeCompare(lb);
      return (a.first_name || "").toLowerCase().localeCompare((b.first_name || "").toLowerCase());
    });

  const handleSave = async (data) => {
    let savedPatient;
    if (editPatient) {
      await base44.entities.Patient.update(editPatient.id, data);
      savedPatient = editPatient;
      logAudit("Updated patient record", "Patient", editPatient.id, `${editPatient.first_name} ${editPatient.last_name}`);
    } else {
      savedPatient = await base44.entities.Patient.create(data);
      logAudit("Created patient record", "Patient", savedPatient.id, `${data.first_name} ${data.last_name}`);
    }
    setEditPatient(savedPatient);
    loadPatients();
  };

  const handleDelete = async (patient) => {
    if (!window.confirm(`Are you sure you want to delete ${patient.first_name} ${patient.last_name}? This cannot be undone.`)) return;
    await base44.entities.Patient.delete(patient.id);
    logAudit("Deleted patient record", "Patient", patient.id, `${patient.first_name} ${patient.last_name}`);
    loadPatients();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => {
            const url = window.location.origin + "/intake";
            navigator.clipboard.writeText(url);
            alert("Intake form link copied!\n\n" + url + "\n\nSend this link to new patients via text or email.");
          }}>
            <Link2 className="w-4 h-4 mr-2" /> Copy Intake Link
          </Button>
          <Button onClick={() => { setEditPatient(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Patient
          </Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by name, phone, or insurance ID..."
          className="pl-10"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setLetterFilter(""); }}
        />
      </div>

      {/* Letter filter bar */}
      <div className="flex flex-wrap gap-1 mb-4">
        <button
          onClick={() => setLetterFilter("")}
          className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors ${!letterFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
        >
          All
        </button>
        {LETTERS.map(l => (
          <button
            key={l}
            onClick={() => { setLetterFilter(letterFilter === l ? "" : l); setSearch(""); }}
            className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors ${letterFilter === l ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {showForm && (
        <PatientForm
          patient={editPatient}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditPatient(null); }}
        />
      )}

      {faxTarget && (
        <FaxCompilerModal
          patient={faxTarget}
          onClose={() => setFaxTarget(null)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : !showForm && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">DOB</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Phone</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Insurance</th>
                <th className="text-left py-3 px-4 font-medium">Balance</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <>
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedPatient(expandedPatient === p.id ? null : p.id)}>
                    <td className="py-3 px-4 font-medium text-primary">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{p.dob || "—"}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{p.phone || "—"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{p.insurance_company || "—"}</td>
                    <td className="py-3 px-4">
                      <PatientBalanceWidget patientId={p.id} claims={claims} payments={payments} />
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setFaxTarget(p)}
                          title="Compile &amp; Fax Patient File"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => navigate(`/claim-builder?patient=${p.id}`)}
                          title="New Claim"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setEditPatient(p); setShowForm(true); }}
                          title="Edit"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => navigate(`/patient-account?patient=${p.id}`)}
                          title="Account &amp; Payments"
                          className="text-green-600 hover:text-green-700"
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDelete(p)}
                          title="Delete Patient"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedPatient === p.id && (
                    <tr key={p.id + "-cases"}>
                      <td colSpan={6} className="px-4 pb-4 bg-muted/10">
                        <IntakeAlertBanner patient={p} />
                        <PatientCases patientId={p.id} />
                        {/* Quick action buttons */}
                        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/claim-builder?patient=${p.id}`)}
                            className="gap-1.5"
                          >
                            <FileText className="w-4 h-4" /> New Claim
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/new-patient-exam?patient=${p.id}`)}
                            className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
                          >
                            <Stethoscope className="w-4 h-4" /> New Patient Exam
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/re-examination?patient=${p.id}`)}
                            className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
                          >
                            <RefreshCw className="w-4 h-4" /> Re-Evaluation
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/patient-account?patient=${p.id}`)}
                            className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                          >
                            <Wallet className="w-4 h-4" /> Account &amp; Payments
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {search ? "No patients match your search" : "No patients yet. Add your first patient."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}