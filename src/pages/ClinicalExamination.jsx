import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Search, Save, ChevronDown, ChevronUp } from "lucide-react";
import { logAudit } from "../utils/auditLog";
import NotePolishModal from "../components/claim/NotePolishModal";
import VoiceDictation from "../components/VoiceDictation";
import OrthoTestsSection from "../components/exam/OrthoTestsSection";
import NeurologicalSection from "../components/exam/NeurologicalSection";
import PainAssessmentSection from "../components/exam/PainAssessmentSection";

export default function ClinicalExamination() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [polishTarget, setPolishTarget] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState({
    patient_id: "", patient_name: "", date_of_exam: new Date().toISOString().split('T')[0],
    examiner_name: "", vital_signs: {}, posture_gait: "",
    cervical_rom: {}, lumbar_rom: {}, orthopedic_tests: [],
    neurological_findings: {}, palpation_findings: {},
    imaging_findings: "", imaging_photos: [], pain_scale: "", pain_areas: "",
    clinical_impression: "", treatment_plan: "", notes: ""
  });
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [generatingPlans, setGeneratingPlans] = useState(false);

  useEffect(() => {
    const presetId = new URLSearchParams(window.location.search).get("patient");
    Promise.all([
      base44.entities.Patient.list("-updated_date", 200),
      base44.entities.OfficeSettings.list("-updated_date", 1)
    ]).then(([patientData, settingsData]) => {
      setPatients(patientData);
      if (settingsData[0]?.rendering_provider) {
        setExam(prev => ({ ...prev, examiner_name: settingsData[0].rendering_provider }));
      }
      if (presetId) {
        const match = patientData.find(p => p.id === presetId);
        if (match) selectPatient(match);
      }
    });
  }, []);

  const selectPatient = (patient) => {
    setExam(prev => ({
      ...prev, patient_id: patient.id, patient_name: patient.first_name + ' ' + patient.last_name
    }));
    setSelectedPatient(patient);
    setShowSearch(false);
  };

  const set = (path, value) => {
    setExam(prev => {
      let obj = prev;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return { ...prev };
    });
  };

  const updateOrthoTest = (idx, field, value) => {
    setExam(prev => {
      const tests = [...prev.orthopedic_tests];
      tests[idx] = { ...tests[idx], [field]: value };
      return { ...prev, orthopedic_tests: tests };
    });
  };

  const removeOrthoTest = (idx) => {
    setExam(prev => ({
      ...prev,
      orthopedic_tests: prev.orthopedic_tests.filter((_, i) => i !== idx)
    }));
  };

  const generateTreatmentPlans = async () => {
    setGeneratingPlans(true);
    try {
      const res = await base44.functions.invoke("generateTreatmentPlans", {
        diagnosis: exam.clinical_impression || "",
        pain_findings: exam.palpation_findings || {},
        ortho_results: exam.orthopedic_tests || [],
        vital_signs: exam.vital_signs || {},
      });
      setTreatmentPlans(res.data.plans || []);
    } catch {
      toast({ title: "Failed to generate treatment plans", variant: "destructive" });
    }
    setGeneratingPlans(false);
  };

  const handleSave = async () => {
    if (!exam.patient_id) {
      toast({ title: "Select a patient", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.NewPatientExam.create(exam);
      logAudit("Created New Patient Exam", "NewPatientExam", exam.patient_id, exam.patient_name);
      toast({ title: "New Patient Exam saved successfully" });
      navigate("/patients");
    } catch (e) {
      toast({ title: e.message || "Failed to save exam", variant: "destructive" });
    }
    setSaving(false);
  };

  const filteredPatients = search.length >= 3
    ? patients.filter(p => {
        const q = search.toLowerCase();
        return p.first_name?.toLowerCase().startsWith(q) || p.last_name?.toLowerCase().startsWith(q);
      }).slice(0, 12)
    : [];

  const [expandSections, setExpandSections] = useState({});
  const toggleSection = (key) => setExpandSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Patient Examination</h1>
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          <Save className="w-4 h-4" /> Save Exam
        </Button>
      </div>

      {/* Patient Selection */}
      {showSearch || !selectedPatient ? (
        <div className="bg-card border border-border rounded-xl p-4">
          <Label className="text-sm mb-2 block">Select Patient</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Type 3+ letters of first or last name..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {search.length >= 3 ? (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {filteredPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm"
                >
                  <span className="font-medium">{p.first_name} {p.last_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.phone}</span>
                </button>
              ))}
              {filteredPatients.length === 0 && <p className="text-xs text-muted-foreground p-2">No patients found</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">Type at least 3 letters to search</p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Patient:</p>
            <p className="text-lg font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setShowSearch(true); setExam(prev => ({ ...prev, patient_id: "", patient_name: "" })); }}>
            Change
          </Button>
        </div>
      )}

      {selectedPatient && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 bg-card border border-border rounded-xl p-4">
            <div>
              <Label className="text-xs">Date of Exam</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-sm"
                value={exam.date_of_exam}
                onChange={e => set("date_of_exam", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Examiner Name</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={exam.examiner_name}
                onChange={e => set("examiner_name", e.target.value)}
              />
            </div>
          </div>

          {/* Vital Signs */}
          <Section
            title="Vital Signs"
            expanded={expandSections.vitals}
            onToggle={() => toggleSection("vitals")}
          >
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Height</Label>
                <Input
                  placeholder="Height (e.g. 5'10)"
                  className="mt-1 h-8 text-sm"
                  value={exam.vital_signs?.height || ""}
                  onChange={e => set("vital_signs.height", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Weight (lbs)</Label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-sm"
                  value={exam.vital_signs?.weight || ""}
                  onChange={e => set("vital_signs.weight", parseFloat(e.target.value) || "")}
                />
              </div>
              <div>
                <Label className="text-xs">BMI</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="mt-1 h-8 text-sm"
                  value={exam.vital_signs?.bmi || ""}
                  onChange={e => set("vital_signs.bmi", parseFloat(e.target.value) || "")}
                />
              </div>
              <div>
                <Label className="text-xs">BP</Label>
                <Input
                  placeholder="e.g. 120/80"
                  className="mt-1 h-8 text-sm"
                  value={exam.vital_signs?.bp || ""}
                  onChange={e => set("vital_signs.bp", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">HR (bpm)</Label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-sm"
                  value={exam.vital_signs?.hr || ""}
                  onChange={e => set("vital_signs.hr", parseInt(e.target.value) || "")}
                />
              </div>
              <div>
                <Label className="text-xs">Temp (°F)</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="mt-1 h-8 text-sm"
                  value={exam.vital_signs?.temp || ""}
                  onChange={e => set("vital_signs.temp", parseFloat(e.target.value) || "")}
                />
              </div>
            </div>
          </Section>

          {/* Posture & Gait */}
          <Section title="Posture & Gait" expanded={expandSections.posture} onToggle={() => toggleSection("posture")}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button onClick={() => set("posture_gait", "Normal posture, smooth gait bilaterally")} className="px-2 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button>
              <button onClick={() => set("posture_gait", "Forward head posture noted, antalgic gait")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Forward Head</button>
              <button onClick={() => set("posture_gait", "Kyphosis noted, guarded gait with loss of lumbar lordosis")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Kyphosis</button>
              <button onClick={() => set("posture_gait", "Scoliotic curve noted, limping gait")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Scoliosis</button>
              <button onClick={() => set("posture_gait", "Pelvic tilt noted, uneven shoulder height")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Pelvic Tilt</button>
              <button onClick={() => set("posture_gait", "Lordosis noted, excessive lumbar curve")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Lordosis</button>
              <button onClick={() => set("posture_gait", "Antalgic gait, weight shifting to unaffected side")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Antalgic</button>
              <button onClick={() => set("posture_gait", "Muscle asymmetry noted, uneven shoulder/hip height")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Asymmetry</button>
              <button onClick={() => set("posture_gait", "Stooped posture, shuffling gait")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Stooped</button>
            </div>
            <Textarea placeholder="Or type custom notes..." rows={2} className="text-sm" value={exam.posture_gait} onChange={e => set("posture_gait", e.target.value)} />
          </Section>

          {/* Cervical ROM */}
          <Section title="Cervical ROM (Degrees)" expanded={expandSections.cervical} onToggle={() => toggleSection("cervical")}>
            <div className="grid grid-cols-3 gap-2">
              {["flexion", "extension", "left_lateral", "right_lateral", "left_rotation", "right_rotation"].map(field => (
                <div key={field}>
                  <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                  <div className="flex gap-1 mb-1 flex-wrap">
                    {field.includes("flexion") && <><button onClick={() => set(`cervical_rom.${field}`, "45°/50°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`cervical_rom.${field}`, "30°/35°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`cervical_rom.${field}`, "15°/20°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                    {field.includes("extension") && <><button onClick={() => set(`cervical_rom.${field}`, "55°/60°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`cervical_rom.${field}`, "35°/40°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`cervical_rom.${field}`, "15°/20°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                    {field.includes("lateral") && <><button onClick={() => set(`cervical_rom.${field}`, "40°/45°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`cervical_rom.${field}`, "25°/30°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`cervical_rom.${field}`, "10°/15°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                    {field.includes("rotation") && <><button onClick={() => set(`cervical_rom.${field}`, "70°/80°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`cervical_rom.${field}`, "45°/55°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`cervical_rom.${field}`, "20°/30°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                  </div>
                  <Input placeholder="e.g. 45°/50°" className="h-8 text-xs" value={exam.cervical_rom?.[field] || ""} onChange={e => set(`cervical_rom.${field}`, e.target.value)} />
                </div>
              ))}
            </div>
          </Section>

          {/* Lumbar ROM */}
          <Section title="Lumbar ROM (Degrees)" expanded={expandSections.lumbar} onToggle={() => toggleSection("lumbar")}>
            <div className="grid grid-cols-3 gap-2">
              {["flexion", "extension", "left_lateral", "right_lateral", "left_rotation", "right_rotation"].map(field => (
                <div key={field}>
                  <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                  <div className="flex gap-1 mb-1 flex-wrap">
                    {field.includes("flexion") && <><button onClick={() => set(`lumbar_rom.${field}`, "75°/90°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`lumbar_rom.${field}`, "50°/60°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`lumbar_rom.${field}`, "20°/30°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                    {field.includes("extension") && <><button onClick={() => set(`lumbar_rom.${field}`, "25°/30°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`lumbar_rom.${field}`, "15°/20°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`lumbar_rom.${field}`, "5°/10°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                    {field.includes("lateral") && <><button onClick={() => set(`lumbar_rom.${field}`, "25°/30°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`lumbar_rom.${field}`, "15°/20°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`lumbar_rom.${field}`, "5°/10°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                    {field.includes("rotation") && <><button onClick={() => set(`lumbar_rom.${field}`, "30°/45°")} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button><button onClick={() => set(`lumbar_rom.${field}`, "15°/25°")} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Diminished</button><button onClick={() => set(`lumbar_rom.${field}`, "5°/10°")} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">Severe</button></> }
                  </div>
                  <Input placeholder="e.g. 60°/80°" className="h-8 text-xs" value={exam.lumbar_rom?.[field] || ""} onChange={e => set(`lumbar_rom.${field}`, e.target.value)} />
                </div>
              ))}
            </div>
          </Section>

          {/* Orthopedic Tests */}
          <Section
            title={`Orthopedic Tests (${exam.orthopedic_tests?.length || 0})`}
            expanded={expandSections.ortho}
            onToggle={() => toggleSection("ortho")}
          >
            <OrthoTestsSection
              tests={exam.orthopedic_tests || []}
              onAdd={(name) => setExam(prev => ({ ...prev, orthopedic_tests: [...(prev.orthopedic_tests || []), { test_name: name, result: "", notes: "" }] }))}
              onUpdate={updateOrthoTest}
              onRemove={removeOrthoTest}
            />
          </Section>

          {/* Neurological Findings */}
          <Section
            title="Neurological Exam"
            expanded={expandSections.neuro}
            onToggle={() => toggleSection("neuro")}
          >
            <NeurologicalSection findings={exam.neurological_findings} onSet={set} />
          </Section>

          {/* Palpation Findings */}
          <Section
            title="Palpation & Muscle Testing"
            expanded={expandSections.palp}
            onToggle={() => toggleSection("palp")}
          >
            <div className="space-y-4">
              {/* Cervical */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Cervical Palpation:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button onClick={() => set("palpation_findings.cervical_palpation", "No tenderness, normal tone")} className="px-2 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">C-Normal</button>
                  <button onClick={() => set("palpation_findings.cervical_palpation", "Mild muscle tension, mild tenderness at C4-C5")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">C-Mild</button>
                  <button onClick={() => set("palpation_findings.cervical_palpation", "Grade 2 spasm, significant tenderness, trigger points")} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200">C-Moderate</button>
                  <button onClick={() => set("palpation_findings.cervical_palpation", "Grade 3 spasm, severe tenderness, guarding present")} className="px-2 py-1 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">C-Severe</button>
                  <VoiceDictation label="🎤" onTranscript={t => set("palpation_findings.cervical_palpation", exam.palpation_findings?.cervical_palpation ? exam.palpation_findings.cervical_palpation + ' ' + t : t)} />
                </div>
                <Textarea className="h-12 text-xs" value={exam.palpation_findings?.cervical_palpation || ""} onChange={e => set("palpation_findings.cervical_palpation", e.target.value)} />
              </div>

              {/* Thoracic */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Thoracic Palpation:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button onClick={() => set("palpation_findings.thoracic_palpation", "No tenderness, normal tone")} className="px-2 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">T-Normal</button>
                  <button onClick={() => set("palpation_findings.thoracic_palpation", "Mild restriction, tenderness at mid-thoracic")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">T-Mild</button>
                  <button onClick={() => set("palpation_findings.thoracic_palpation", "Grade 2 spasm, significant tenderness")} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200">T-Moderate</button>
                  <VoiceDictation label="🎤" onTranscript={t => set("palpation_findings.thoracic_palpation", exam.palpation_findings?.thoracic_palpation ? exam.palpation_findings.thoracic_palpation + ' ' + t : t)} />
                </div>
                <Textarea className="h-12 text-xs" value={exam.palpation_findings?.thoracic_palpation || ""} onChange={e => set("palpation_findings.thoracic_palpation", e.target.value)} />
              </div>

              {/* Lumbar */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Lumbar Palpation:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button onClick={() => set("palpation_findings.lumbar_palpation", "No tenderness, normal tone")} className="px-2 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">L-Normal</button>
                  <button onClick={() => set("palpation_findings.lumbar_palpation", "Mild muscle tension, mild tenderness at L4-L5")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">L-Mild</button>
                  <button onClick={() => set("palpation_findings.lumbar_palpation", "Grade 2 spasm, significant tenderness, trigger points")} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200">L-Moderate</button>
                  <button onClick={() => set("palpation_findings.lumbar_palpation", "Grade 3 spasm, severe tenderness, guarding present")} className="px-2 py-1 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200">L-Severe</button>
                  <VoiceDictation label="🎤" onTranscript={t => set("palpation_findings.lumbar_palpation", exam.palpation_findings?.lumbar_palpation ? exam.palpation_findings.lumbar_palpation + ' ' + t : t)} />
                </div>
                <Textarea className="h-12 text-xs" value={exam.palpation_findings?.lumbar_palpation || ""} onChange={e => set("palpation_findings.lumbar_palpation", e.target.value)} />
              </div>

              {/* Sacroiliac */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Sacroiliac:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button onClick={() => set("palpation_findings.sacroiliac", "No tenderness, normal mobility")} className="px-2 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200">Normal</button>
                  <button onClick={() => set("palpation_findings.sacroiliac", "Mild tenderness, slight restriction")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200">Mild</button>
                  <button onClick={() => set("palpation_findings.sacroiliac", "Significant restriction and tenderness")} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200">Moderate</button>
                  <VoiceDictation label="🎤" onTranscript={t => set("palpation_findings.sacroiliac", exam.palpation_findings?.sacroiliac ? exam.palpation_findings.sacroiliac + ' ' + t : t)} />
                </div>
                <Textarea className="h-12 text-xs" value={exam.palpation_findings?.sacroiliac || ""} onChange={e => set("palpation_findings.sacroiliac", e.target.value)} />
              </div>
            </div>
          </Section>

          {/* Pain Assessment */}
          <Section title="Pain Assessment" expanded={expandSections.pain} onToggle={() => toggleSection("pain")}>
            <PainAssessmentSection exam={exam} onSet={set} />
          </Section>

          {/* Imaging Findings */}
          <Section title="Imaging Findings" expanded={expandSections.imaging} onToggle={() => toggleSection("imaging")}>
            <div className="space-y-3">
              <Textarea rows={2} className="text-sm" placeholder="X-rays, MRI, CT results..." value={exam.imaging_findings} onChange={e => set("imaging_findings", e.target.value)} />
              <div>
                <Label className="text-sm mb-2 block">Photo Upload</Label>
                <input type="file" multiple accept="image/*" onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const urls = [];
                  for (const file of files) {
                    try {
                      const res = await base44.integrations.Core.UploadFile({ file });
                      urls.push(res.file_url);
                    } catch {
                      toast({ title: "Upload failed", variant: "destructive" });
                    }
                  }
                  set("imaging_photos", [...(exam.imaging_photos || []), ...urls]);
                }} className="block w-full text-sm border border-gray-300 rounded px-3 py-2" />
                {exam.imaging_photos?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold">{exam.imaging_photos.length} photos uploaded</p>
                    <div className="flex gap-2 flex-wrap">
                      {exam.imaging_photos.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt={`Photo ${idx + 1}`} className="h-16 w-16 object-cover rounded border" />
                          <button onClick={() => set("imaging_photos", exam.imaging_photos.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Clinical Impression" expanded={expandSections.impression} onToggle={() => toggleSection("impression")}>
            <div className="flex gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={() => setPolishTarget({ field: "clinical_impression", value: exam.clinical_impression })}>✨ Polish with AI</Button>
              <VoiceDictation label="🎤 Dictate" onTranscript={t => set("clinical_impression", exam.clinical_impression ? exam.clinical_impression + ' ' + t : t)} />
            </div>
            <Textarea rows={3} className="text-sm" placeholder="Clinical impression and diagnoses..." value={exam.clinical_impression} onChange={e => set("clinical_impression", e.target.value)} />
          </Section>

          <Section title="Treatment Plan & Prognosis" expanded={expandSections.plan} onToggle={() => toggleSection("plan")}>
            <div className="flex gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={() => setPolishTarget({ field: "treatment_plan", value: exam.treatment_plan })}>✨ Polish with AI</Button>
              <Button size="sm" variant="outline" onClick={generateTreatmentPlans} disabled={generatingPlans}>
                {generatingPlans ? "Generating..." : "🤖 Generate Plans"}
              </Button>
              <VoiceDictation label="🎤 Dictate" onTranscript={t => set("treatment_plan", exam.treatment_plan ? exam.treatment_plan + ' ' + t : t)} />
            </div>
            {treatmentPlans.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">Suggested Plans:</p>
                <select className="w-full border rounded px-2 py-2 text-sm" onChange={e => set("treatment_plan", e.target.value)} defaultValue="">
                  <option value="">Select a plan...</option>
                  {treatmentPlans.map((plan, idx) => (
                    <option key={idx} value={plan}>{plan.substring(0, 80)}...</option>
                  ))}
                </select>
              </div>
            )}
            <Textarea rows={3} className="text-sm" placeholder="Treatment frequency, duration, prognosis..." value={exam.treatment_plan} onChange={e => set("treatment_plan", e.target.value)} />
          </Section>

          <Section title="Additional Notes" expanded={expandSections.notes} onToggle={() => toggleSection("notes")}>
            <div className="mb-2">
              <VoiceDictation label="🎤 Dictate" onTranscript={t => set("notes", exam.notes ? exam.notes + ' ' + t : t)} />
            </div>
            <Textarea rows={2} className="text-sm" value={exam.notes} onChange={e => set("notes", e.target.value)} />
          </Section>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-1">
            <Save className="w-4 h-4" /> Save New Patient Exam
          </Button>
        </div>
      )}

      {polishTarget && (
        <NotePolishModal
          rawNotes={polishTarget.value}
          onClose={() => setPolishTarget(null)}
          onPolished={(polished) => {
            set(polishTarget.field, polished);
            setPolishTarget(null);
          }}
        />
      )}
    </div>
  );
}

function Section({ title, expanded, onToggle, children }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}