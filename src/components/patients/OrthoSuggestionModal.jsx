import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Stethoscope, RefreshCw, X, FileCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/utils/auditLog";

export default function OrthoSuggestionModal({ patient, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const dxList = patient.diagnoses || [];
  const painAreas = patient.pain_areas || [];
  const contextSummary = `Complaint: ${patient.chief_complaint || "—"} · Pain: ${painAreas.join(", ") || "—"} · Mechanism: ${patient.accident_type || "—"}`;

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("suggestOrthoTests", {
        chief_complaint: patient.chief_complaint,
        pain_areas: painAreas,
        diagnoses: dxList,
        accident_type: patient.accident_type,
        pain_scale: patient.pain_scale,
        pain_description: patient.pain_description,
        pain_frequency: patient.pain_frequency,
        onset: patient.pain_onset,
        additional_context: additionalContext,
        patient_age: patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null,
        patient_sex: patient.sex,
      });
      // Initialize each recommended test with performed/result flags
      if (res.data?.recommended_tests) {
        res.data.recommended_tests = res.data.recommended_tests.map(t => ({
          ...t,
          performed: true, // default: provider performs all suggested tests
          result: "",       // result not yet recorded
        }));
      }
      setResult(res.data);
    } catch (e) {
      toast({ title: e.message || "Failed to generate suggestions", variant: "destructive" });
    }
    setLoading(false);
  };

  const toggleTest = (i, field, value) => {
    setResult(prev => {
      const tests = [...(prev.recommended_tests || [])];
      tests[i] = { ...tests[i], [field]: value };
      // If un-performed, clear the result
      if (field === "performed" && !value) tests[i].result = "";
      return { ...prev, recommended_tests: tests };
    });
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const tests = (result.recommended_tests || []).map(t => ({
        test_name: t.test_name,
        purpose: t.purpose,
        positive_finding: t.positive_finding,
        performed: !!t.performed,
        result: t.result || "",
      }));
      const created = await base44.entities.OrthoSuggestion.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        context_summary: contextSummary,
        chief_complaint: patient.chief_complaint,
        pain_areas: painAreas,
        diagnoses: dxList,
        accident_type: patient.accident_type,
        recommended_tests: tests,
        diagnostic_considerations: result.diagnostic_considerations || "",
        treatment_plan: result.treatment_plan || "",
        visit_frequency: result.visit_frequency || "",
        expected_duration: result.expected_duration || "",
        supporting_summary: result.supporting_summary || "",
        cited_sources: result.cited_sources || [],
      });

      // Add the performed tests to the latest NewPatientExam (auto-documentation)
      const performed = tests.filter(t => t.performed);
      let docNote = "Saved to patient file.";
      if (performed.length > 0) {
        try {
          const exams = await base44.entities.NewPatientExam.filter(
            { patient_id: patient.id },
            "-created_date", 5
          );
          if (exams.length > 0) {
            const latest = exams[0];
            const existingTests = latest.orthopedic_tests || [];
            const newTests = performed.map(t => ({
              test_name: t.test_name,
              result: t.result || "Negative", // default if not picked
              notes: `AI-suggested — ${t.purpose || ""}`.substring(0, 150),
            }));
            await base44.entities.NewPatientExam.update(latest.id, {
              orthopedic_tests: [...existingTests, ...newTests],
            });
            logAudit("Added AI-suggested ortho tests to exam", "NewPatientExam", latest.id, `${patient.first_name} ${patient.last_name}`);
            docNote = `Saved to patient file + ${performed.length} test(s) added to latest exam.`;
          } else {
            docNote = `Saved to patient file. No existing exam found — click "New Patient Exam" to create one, then "Add Tests" within this saved suggestion.`;
          }
        } catch (e) {
          console.error("Failed to add tests to exam:", e);
          docNote = `Saved to patient file. (Failed to add to exam: ${e.message || "error"})`;
        }
      }

      toast({ title: docNote });
      onSaved?.(created);
      onClose();
    } catch (e) {
      toast({ title: e.message || "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl my-6">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card rounded-t-xl z-10">
          <div>
            <h3 className="font-bold flex items-center gap-2 text-base">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              AI Suggested Orthopedic Tests & Treatment Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{patient.first_name} {patient.last_name} — {contextSummary}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {!result && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Additional clinical context (optional)</Label>
                <Textarea
                  rows={3}
                  className="mt-1"
                  placeholder="e.g., 'Patient has radiating pain down left arm after rear-end MVA; prior lumbar fusion; etc.'"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2 border border-border">
                AI will scan current peer-reviewed journals and clinical practice guidelines to recommend orthopedic / neuro tests, imaging considerations, treatment plan, and visit frequency specific to this presentation. All suggested tests are checked by default — uncheck any you will not perform, set Positive/Negative results, and Save & Add to auto-document your findings in the latest exam record.
              </div>
              <Button onClick={generate} disabled={loading} className="w-full gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Researching journals & guidelines...</> : <><Stethoscope className="w-4 h-4" /> Generate Diagnostic & Treatment Recommendations</>}
              </Button>
            </div>
          )}

          {result && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
                <strong>Each test is checked by default.</strong> Uncheck any you did not perform, set the result (Positive/Negative) for tests performed, then click <strong>Save & Add to Documentation</strong> below — performed tests will auto-add to the patient's most recent exam record.
              </div>

              {/* Recommended Orthopedic Tests */}
              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-purple-600" /> Recommended Orthopedic & Neurological Tests ({result.recommended_tests?.length || 0})
                </h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-semibold w-20">Perform?</th>
                        <th className="text-left py-2 px-3 font-semibold w-1/4">Test</th>
                        <th className="text-left py-2 px-3 font-semibold">Purpose / Differentiates</th>
                        <th className="text-left py-2 px-3 font-semibold hidden md:table-cell">Positive Finding</th>
                        <th className="text-left py-2 px-2 font-semibold w-24">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.recommended_tests || []).map((t, i) => (
                        <tr key={i} className="border-b last:border-0 align-top">
                          <td className="py-2 px-2">
                            <input
                              type="checkbox"
                              className="w-4 h-4"
                              checked={!!t.performed}
                              onChange={e => toggleTest(i, "performed", e.target.checked)}
                              title="Mark as performed"
                            />
                          </td>
                          <td className={`py-2 px-3 font-semibold ${t.performed ? "text-purple-700" : "text-muted-foreground line-through"}`}>{t.test_name}</td>
                          <td className="py-2 px-3">{t.purpose}</td>
                          <td className="py-2 px-3 hidden md:table-cell">{t.positive_finding}</td>
                          <td className="py-2 px-2">
                            <select
                              className="h-7 text-xs border border-input rounded px-1 bg-transparent disabled:opacity-50"
                              value={t.result || ""}
                              disabled={!t.performed}
                              onChange={e => toggleTest(i, "result", e.target.value)}
                            >
                              <option value="">—</option>
                              <option value="Positive">Positive</option>
                              <option value="Negative">Negative</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-amber-200 bg-amber-50/40 rounded p-3">
                  <h4 className="font-bold text-xs text-amber-800 mb-1">Diagnostic Considerations</h4>
                  <p className="text-xs whitespace-pre-wrap">{result.diagnostic_considerations}</p>
                </div>
                <div className="border border-blue-200 bg-blue-50/40 rounded p-3">
                  <h4 className="font-bold text-xs text-blue-800 mb-1">Treatment Plan</h4>
                  <p className="text-xs whitespace-pre-wrap">{result.treatment_plan}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded p-3">
                  <h4 className="font-bold text-xs mb-1">Visit Frequency</h4>
                  <p className="text-xs">{result.visit_frequency}</p>
                </div>
                <div className="border border-border rounded p-3">
                  <h4 className="font-bold text-xs mb-1">Expected Duration / Re-Eval</h4>
                  <p className="text-xs">{result.expected_duration}</p>
                </div>
              </div>

              <div className="border border-border rounded p-3 bg-muted/30">
                <h4 className="font-bold text-xs mb-1">Clinical Rationale</h4>
                <p className="text-xs whitespace-pre-wrap">{result.supporting_summary}</p>
              </div>

              {(result.cited_sources || []).length > 0 && (
                <div className="border border-border rounded p-3">
                  <h4 className="font-bold text-xs mb-1">Supporting Sources</h4>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    {result.cited_sources.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <Button variant="outline" onClick={generate} disabled={loading} className="gap-2 text-xs">
                  {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Regenerating...</> : <><RefreshCw className="w-3 h-3" /> Regenerate</>}
                </Button>
                <Button onClick={save} disabled={saving || loading} className="gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><FileCheck className="w-4 h-4" /> Save & Add to Documentation</>}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}