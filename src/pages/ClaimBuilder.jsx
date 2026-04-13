import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Save, Printer, Copy, CalendarDays, Search, User, Plus, Trash2, Star, Zap, Mail, Sparkles, ChevronDown, CreditCard } from "lucide-react";
import PayerAlertBanner from "../components/claim/PayerAlertBanner";
import SoapNoteModal from "../components/claim/SoapNoteModal";
import VoiceDictation from "../components/VoiceDictation";
import PaymentModal from "../components/payment/PaymentModal";

const CANNED_NOTES = [
  "Patient presents for follow-up chiropractic care. Responding well to treatment with gradual improvement in pain and function. Continue current treatment plan.",
  "Patient presents with acute symptoms. Treatment plan: 3x/week for 4 weeks, then reassess. Goals: reduce pain, restore ROM, return to normal ADLs.",
  "Patient presents for maintenance care. Condition stable. Treatment rendered to maintain functional status and prevent exacerbation.",
  "Auto accident patient presents for continued care. Symptoms causally related to MVA. Treatment medically necessary to address accident-related injuries. Treatment plan: 2–3x/week for 6–8 weeks.",
  "Work injury patient presents for continued care. Symptoms causally related to work incident. Modified duty restrictions in place. Treatment plan ongoing per clinical progress.",
  "Patient reports significant improvement. Pain reduced by 50%. Continue care 1–2x/week for 4 more weeks then discharge evaluation.",
];

const visitTypes = ["Insurance", "Auto", "Cash", "Cash Office Visit", "Cash Package"];
const today = new Date().toISOString().split("T")[0];

export default function ClaimBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const presetPatientId = urlParams.get("patient");
  const presetType = urlParams.get("type");
  const duplicateId = urlParams.get("duplicate");

  const [claim, setClaim] = useState({
    patient_id: "", patient_name: "",
    visit_type: presetType || "Insurance",
    payer_type: presetType === "Cash" ? "Cash" : presetType === "Auto" ? "Auto/PI" : "Other Commercial",
    // payer_type options: Medicare, BCBS, Auto/PI, Cash, Other Commercial, Patient
    status: "Draft", date_of_service: today,
    diagnoses: [], service_lines: [],
    total_charge: 0, amount_paid: 0,
    insurance_company: "", insurance_id: "", insurance_group: "",
    insured_name: "", insured_dob: "",
    referring_provider: "", referring_npi: "",
    authorization_number: "", place_of_service: "11",
    claim_notes: "", accident_related: false,
    accident_date: "", accident_type: "",
  });

  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientDrop, setShowPatientDrop] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [favCodes, setFavCodes] = useState([]);
  const [favDx, setFavDx] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [includeHcfa, setIncludeHcfa] = useState(false);
  const [savedClaim, setSavedClaim] = useState(null);
  const [showSoapModal, setShowSoapModal] = useState(false);
  const [showCannedNotes, setShowCannedNotes] = useState(false);
  const [paymentQuick, setPaymentQuick] = useState(null); // "cash" or "cc"
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const [settings, pts, tmpl, codes, dx] = await Promise.all([
        base44.entities.OfficeSettings.list("-updated_date", 1),
        base44.entities.Patient.list("-updated_date", 300),
        base44.entities.QuickTemplate.filter({ active: true }, "-updated_date", 100),
        base44.entities.ProcedureCode.filter({ is_favorite: true, active: true }, "-updated_date", 50),
        base44.entities.DiagnosisCode.filter({ is_favorite: true, active: true }, "-updated_date", 50),
      ]);

      setPatients(pts);
      setTemplates(tmpl);
      setFavCodes(codes);
      setFavDx(dx);

      if (settings[0]) {
        setClaim(prev => ({
          ...prev,
          place_of_service: settings[0].default_place_of_service || "11",
          claim_notes: settings[0].default_claim_notes || "",
        }));
      }

      if (presetPatientId) {
        const p = pts.find(p => p.id === presetPatientId);
        if (p) {
          applyPatient(p);
          setSelectedPatient(p);
        }
      }

      if (duplicateId) {
        const claims = await base44.entities.Claim.filter({ id: duplicateId });
        if (claims[0]) {
          const { id, created_date, updated_date, created_by, status, ...rest } = claims[0];
          setClaim(prev => ({ ...prev, ...rest, date_of_service: today, status: "Draft" }));
        }
      }
    };
    init();
  }, []);

  const applyPatient = async (patient) => {
    // Load default case if exists
    const patientCases = await base44.entities.PatientCase.filter({ patient_id: patient.id }, "-created_date", 50);
    const defaultCase = patientCases.find(c => c.is_default) || patientCases[0];
    setClaim(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      insurance_company: defaultCase?.insurance_company || patient.insurance_company || "",
      insurance_id: defaultCase?.insurance_id || patient.insurance_id || "",
      insurance_group: defaultCase?.insurance_group || patient.insurance_group || "",
      insured_name: defaultCase?.insured_name || patient.insured_name || `${patient.first_name} ${patient.last_name}`,
      insured_dob: defaultCase?.insured_dob || patient.insured_dob || patient.dob || "",
      accident_related: defaultCase?.is_accident_related || patient.is_accident_related || false,
      accident_date: defaultCase?.accident_date || patient.accident_date || "",
      accident_type: defaultCase?.accident_type || patient.accident_type || "",
      diagnoses: defaultCase?.diagnoses?.length ? defaultCase.diagnoses.map((d, i) => ({ ...d, pointer: String(i + 1) })) : [],
    }));
    setPatientSearch("");
    setShowPatientDrop(false);
    setSelectedPatient(patient);
  };

  const set = (field, value) => setClaim(prev => ({ ...prev, [field]: value }));

  // Auto-save to localStorage every time claim changes
  useEffect(() => {
    localStorage.setItem('claimDraft', JSON.stringify(claim));
  }, [claim]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('claimDraft');
    if (draft) {
      try {
        setClaim(JSON.parse(draft));
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }
  }, []);

  const totalCharge = useMemo(() =>
    claim.service_lines.reduce((sum, l) => sum + ((l.charge || 0) * (l.units || 1)), 0),
    [claim.service_lines]
  );

  const handleApplyTemplate = (template) => {
    const newLines = (template.procedures || []).map(p => ({
      date_of_service: claim.date_of_service,
      code: p.code, description: p.description,
      charge: p.charge, units: p.units || 1,
      modifier: p.modifier || "", diagnosis_pointers: p.diagnosis_pointers || "1", notes: "",
    }));
    const newDx = (template.default_diagnoses || []).map((d, i) => ({
      code: d.code, description: d.description, pointer: String(i + 1),
    }));
    setClaim(prev => ({
      ...prev,
      service_lines: [...prev.service_lines, ...newLines],
      diagnoses: prev.diagnoses.length > 0 ? prev.diagnoses : newDx,
      template_used: template.title,
    }));
  };

  const addFavCode = (proc) => {
    setClaim(prev => ({
      ...prev,
      service_lines: [...prev.service_lines, {
        date_of_service: prev.date_of_service,
        code: proc.code, description: proc.description,
        modifier: proc.default_modifier || "", diagnosis_pointers: "1",
        charge: proc.default_charge || 0, units: proc.default_units || 1, notes: "",
      }],
    }));
  };

  const addFavDx = (dx) => {
    setClaim(prev => {
      if (prev.diagnoses.find(d => d.code === dx.code)) return prev;
      return {
        ...prev,
        diagnoses: [...prev.diagnoses, { code: dx.code, description: dx.description, pointer: String(prev.diagnoses.length + 1) }],
      };
    });
  };

  const addBlankLine = () => {
    setClaim(prev => ({
      ...prev,
      service_lines: [...prev.service_lines, {
        date_of_service: prev.date_of_service,
        code: "", description: "", modifier: "", diagnosis_pointers: "1", charge: 0, units: 1, notes: "",
      }],
    }));
  };

  const updateLine = (idx, field, value) => {
    setClaim(prev => {
      const lines = [...prev.service_lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...prev, service_lines: lines };
    });
  };

  const removeLine = (idx) => setClaim(prev => ({ ...prev, service_lines: prev.service_lines.filter((_, i) => i !== idx) }));

  const updateDx = (idx, field, value) => {
    setClaim(prev => {
      const dx = [...prev.diagnoses];
      dx[idx] = { ...dx[idx], [field]: value };
      return { ...prev, diagnoses: dx };
    });
  };

  const removeDx = (idx) => setClaim(prev => ({
    ...prev,
    diagnoses: prev.diagnoses.filter((_, i) => i !== idx).map((d, i) => ({ ...d, pointer: String(i + 1) })),
  }));

  const handleSameDateAll = () => {
    setClaim(prev => ({
      ...prev,
      service_lines: prev.service_lines.map(l => ({ ...l, date_of_service: prev.date_of_service })),
    }));
  };

  const handleDuplicateLastVisit = async () => {
    if (!claim.patient_id) { toast({ title: "Select a patient first", variant: "destructive" }); return; }
    const prevClaims = await base44.entities.Claim.filter({ patient_id: claim.patient_id }, "-created_date", 1);
    if (prevClaims[0]) {
      const prev = prevClaims[0];
      setClaim(c => ({
        ...c,
        diagnoses: prev.diagnoses || [],
        service_lines: (prev.service_lines || []).map(l => ({ ...l, date_of_service: c.date_of_service })),
        payer_type: prev.payer_type || c.payer_type,
        visit_type: prev.visit_type || c.visit_type,
      }));
      toast({ title: "Last visit loaded" });
    } else {
      toast({ title: "No previous visit found", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!claim.patient_id) { toast({ title: "Select a patient", variant: "destructive" }); return; }
    setLoading(true);
    const saved = await base44.entities.Claim.create({ ...claim, total_charge: totalCharge, status: "Saved" });
    setLoading(false);
    setSavedClaim(saved);
    localStorage.removeItem('claimDraft'); // Clear draft after saving
    toast({ title: "Claim saved!" });
    navigate("/saved-claims");
  };

  const handleSaveAndEmail = async () => {
    if (!claim.patient_id) { toast({ title: 'Select a patient', variant: 'destructive' }); return; }
    setEmailing(true);
    const saved = await base44.entities.Claim.create({ ...claim, total_charge: totalCharge, status: 'Saved' });
    try {
      const res = await base44.functions.invoke('emailSuperbill', { claim_id: saved.id, include_hcfa: includeHcfa });
      toast({ title: `Superbill emailed to ${res.data.sent_to}` });
      navigate('/saved-claims');
    } catch (e) {
      toast({ title: e.message || 'Could not email — check patient has email on file', variant: 'destructive' });
    }
    setEmailing(false);
  };

  const handleSaveAndPrint = async () => {
    if (!claim.patient_id) { toast({ title: "Select a patient", variant: "destructive" }); return; }
    setLoading(true);
    const saved = await base44.entities.Claim.create({ ...claim, total_charge: totalCharge, status: "Saved" });
    setLoading(false);
    const isCash = claim.visit_type?.includes("Cash");
    navigate(isCash ? `/print-receipt?id=${saved.id}` : `/print-claim?id=${saved.id}`);
  };

  const isCash = claim.visit_type?.includes("Cash");

  const filteredPatients = patientSearch && patientSearch.length >= 3
    ? patients.filter(p => {
        const q = patientSearch.toLowerCase();
        return p.first_name?.toLowerCase().startsWith(q) || p.last_name?.toLowerCase().startsWith(q) || p.phone?.includes(q);
      }).slice(0, 12)
    : [];

  const groupedTemplates = templates.reduce((acc, t) => {
    const cat = t.category || "Custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">New Visit</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDuplicateLastVisit}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Last Visit
          </Button>
          <Button variant="outline" size="sm" onClick={handleSameDateAll}>
            <CalendarDays className="w-3.5 h-3.5 mr-1" /> Same Date All
          </Button>
        </div>
      </div>

      {/* Row 1: Patient + Date + Visit Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Patient */}
        <div className="bg-card border border-border rounded-xl p-3 relative">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Patient</Label>
          {claim.patient_name ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-semibold flex-1">{claim.patient_name}</span>
              <button className="text-xs text-primary hover:underline" onClick={() => set("patient_name", "")}>Change</button>
            </div>
          ) : (
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Type first 3 letters of first or last name..."
                className="pl-8 h-9"
                value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); if (e.target.value.length >= 3) setShowPatientDrop(true); else setShowPatientDrop(false); }}
                onFocus={() => { if (patientSearch.length >= 3) setShowPatientDrop(true); }}
                onBlur={() => setTimeout(() => setShowPatientDrop(false), 150)}
                autoFocus
              />
              {showPatientDrop && patientSearch.length >= 3 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  {filteredPatients.map(p => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
                      onMouseDown={() => applyPatient(p)}>
                      <span className="font-medium">{p.first_name} {p.last_name}</span>
                      <span className="text-xs text-muted-foreground">{p.phone || ""}</span>
                    </button>
                  ))}
                  {filteredPatients.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">No patients found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="bg-card border border-border rounded-xl p-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date of Service</Label>
          <Input type="date" className="mt-1 text-base font-semibold h-9" value={claim.date_of_service}
            onChange={e => set("date_of_service", e.target.value)} />
        </div>

        {/* Place of Service (small) + Amount Paid */}
        <div className="bg-card border border-border rounded-xl p-3 flex gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Place of Service</Label>
            <Input className="mt-1 h-9" value={claim.place_of_service} onChange={e => set("place_of_service", e.target.value)} />
          </div>
          {!isCash && (
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amt Paid</Label>
              <Input className="mt-1 h-9" type="number" step="0.01" value={claim.amount_paid}
                onChange={e => set("amount_paid", parseFloat(e.target.value) || 0)} />
            </div>
          )}
        </div>
      </div>

      {/* Visit Type Buttons */}
      <div className="flex flex-wrap gap-2">
        {visitTypes.map(t => (
          <button key={t} onClick={() => { set("visit_type", t); if (t.includes("Cash")) set("payer_type", "Cash"); if (t === "Auto") set("payer_type", "Auto/PI"); }}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              claim.visit_type === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Insurance strip (non-cash) */}
      {!isCash && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Insurance Co.</Label>
              <Input className="h-8 text-sm mt-0.5" value={claim.insurance_company} onChange={e => set("insurance_company", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Member ID</Label>
              <Input className="h-8 text-sm mt-0.5" value={claim.insurance_id} onChange={e => set("insurance_id", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Group #</Label>
              <Input className="h-8 text-sm mt-0.5" value={claim.insurance_group} onChange={e => set("insurance_group", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Auth #</Label>
              <Input className="h-8 text-sm mt-0.5" value={claim.authorization_number} onChange={e => set("authorization_number", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Cash/CC Payment Quick Toggle (shows total due) */}
      {isCash && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Payment Due Today</Label>
              <p className="text-3xl font-bold text-amber-900 mt-1">${totalCharge.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentQuick("cash")}
                className={`px-5 py-2 rounded-lg font-semibold transition-colors ${
                  paymentQuick === "cash"
                    ? "bg-green-600 text-white"
                    : "bg-white border border-amber-300 text-amber-900 hover:bg-green-50"
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setPaymentQuick("cc")}
                className={`px-5 py-2 rounded-lg font-semibold transition-colors ${
                  paymentQuick === "cc"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-amber-300 text-amber-900 hover:bg-blue-50"
                }`}
              >
                💳 Credit Card
              </button>
            </div>
          </div>
          {paymentQuick && (
            <div className="mt-3 p-2 bg-white rounded-lg text-sm text-center font-semibold">
              ✓ Received {paymentQuick === "cash" ? "Cash" : "Credit Card"} Payment: ${totalCharge.toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Payer Alert Banner */}
      <PayerAlertBanner payerType={claim.payer_type} />

      {/* Quick Panel - always visible */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Quick Panel</span>
        </div>
        <div className="space-y-2">
          {Object.entries(groupedTemplates).map(([cat, tmpls]) => (
            <div key={cat} className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground w-full">{cat}</span>
              {tmpls.map(t => (
                <button key={t.id} onClick={() => handleApplyTemplate(t)}
                  className="px-3 py-1.5 bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded-md text-xs font-medium transition-colors">
                  {t.title}
                </button>
              ))}
            </div>
          ))}
          {templates.length === 0 && <p className="text-xs text-muted-foreground">No templates yet. Add them in Quick Templates.</p>}
        </div>
      </div>

      {/* Diagnoses */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Diagnoses (ICD-10)</span>
        </div>
        {/* Fav Dx chips */}
        {favDx.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {favDx.map(d => (
              <button key={d.id} onClick={() => addFavDx(d)}
                className="px-2 py-1 text-xs bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded-md transition-colors">
                <Star className="inline w-3 h-3 mr-0.5 opacity-60" />{d.code}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          {claim.diagnoses.map((dx, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <span className="text-xs font-mono text-muted-foreground w-4">{idx + 1}.</span>
              <Input className="h-8 text-sm w-28 font-mono" placeholder="Code" value={dx.code} onChange={e => updateDx(idx, "code", e.target.value)} />
              <Input className="h-8 text-sm flex-1" placeholder="Description" value={dx.description} onChange={e => updateDx(idx, "description", e.target.value)} />
              <button onClick={() => removeDx(idx)} className="text-destructive hover:opacity-70">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setClaim(prev => ({ ...prev, diagnoses: [...prev.diagnoses, { code: "", description: "", pointer: String(prev.diagnoses.length + 1) }] }))}
          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add diagnosis
        </button>
      </div>

      {/* Service Lines */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Service Lines</span>
          <span className="text-lg font-bold">${totalCharge.toFixed(2)}</span>
        </div>
        {/* Fav codes */}
        {favCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {favCodes.map(c => (
              <button key={c.id} onClick={() => addFavCode(c)}
                className="px-2 py-1 text-xs bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded-md transition-colors">
                <Star className="inline w-3 h-3 mr-0.5 opacity-60" />{c.code} ${c.default_charge?.toFixed(0)}
              </button>
            ))}
          </div>
        )}
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-12 gap-1.5 mb-1 text-xs font-medium text-muted-foreground px-1">
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Code</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-1">Mod</div>
          <div className="col-span-1">Dx</div>
          <div className="col-span-2">Charge</div>
          <div className="col-span-1">Units</div>
          <div className="col-span-1"></div>
        </div>
        <div className="space-y-1.5">
          {claim.service_lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-6 md:grid-cols-12 gap-1.5 items-center">
              <div className="col-span-2 hidden md:block">
                <Input className="h-8 text-xs" type="date" value={line.date_of_service} onChange={e => updateLine(idx, "date_of_service", e.target.value)} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Input className="h-8 text-xs font-mono" placeholder="Code" value={line.code} onChange={e => updateLine(idx, "code", e.target.value)} />
              </div>
              <div className="col-span-4 md:col-span-3">
                <Input className="h-8 text-xs" placeholder="Description" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} />
              </div>
              <div className="hidden md:block md:col-span-1">
                <Input className="h-8 text-xs" placeholder="Mod" value={line.modifier} onChange={e => updateLine(idx, "modifier", e.target.value)} />
              </div>
              <div className="hidden md:block md:col-span-1">
                <Input className="h-8 text-xs" placeholder="1,2" value={line.diagnosis_pointers} onChange={e => updateLine(idx, "diagnosis_pointers", e.target.value)} />
              </div>
              <div className="col-span-2 md:col-span-2">
                <Input className="h-8 text-xs" type="number" step="0.01" value={line.charge} onChange={e => updateLine(idx, "charge", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="col-span-1">
                <Input className="h-8 text-xs" type="number" value={line.units} onChange={e => updateLine(idx, "units", parseInt(e.target.value) || 1)} />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeLine(idx)} className="text-destructive hover:opacity-70">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addBlankLine} className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add line
        </button>
      </div>

      {/* Notes + Save */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">Claim Notes</Label>
            <div className="flex items-center gap-2">
              <VoiceDictation label="Dictate" onTranscript={t => set("claim_notes", claim.claim_notes ? claim.claim_notes + ' ' + t : t)} />
              <button
                className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={() => setShowCannedNotes(v => !v)}
              >
                Quick Notes <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
          {showCannedNotes && (
            <div className="mb-2 space-y-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-muted/30">
              {CANNED_NOTES.map((note, i) => (
                <button key={i}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-primary hover:text-primary-foreground transition-colors border border-transparent hover:border-primary"
                  onClick={() => { set("claim_notes", note); setShowCannedNotes(false); }}>
                  {note.substring(0, 80)}...
                </button>
              ))}
            </div>
          )}
          <Textarea value={claim.claim_notes} onChange={e => set("claim_notes", e.target.value)} rows={2} className="mt-1 text-sm" placeholder="Select a quick note above or type your own..." />
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-3xl font-bold">${totalCharge.toFixed(2)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading} className="flex-1 h-11 text-base">
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
              <Button onClick={handleSaveAndPrint} disabled={loading} variant="outline" className="flex-1 h-11 text-base">
                <Printer className="w-4 h-4 mr-2" /> {isCash ? 'Receipt' : 'Print'}
              </Button>
            </div>
            {isCash && (
              <Button onClick={() => setShowPaymentModal(true)} className="w-full h-10 bg-green-600 hover:bg-green-700 text-white">
                <CreditCard className="w-4 h-4 mr-2" /> Collect Payment (Stripe)
              </Button>
            )}
            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" id="hcfa-toggle" checked={includeHcfa} onChange={e => setIncludeHcfa(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="hcfa-toggle" className="text-xs text-muted-foreground cursor-pointer">Also attach CMS-1500 form</label>
            </div>
            <Button onClick={handleSaveAndEmail} disabled={emailing || loading} variant="outline" className="w-full h-10 text-sm text-blue-600 border-blue-200 hover:bg-blue-50">
              {emailing ? <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              {includeHcfa ? 'Email Superbill + CMS-1500' : 'Email Superbill to Patient'}
            </Button>
            {savedClaim && (
              <Button variant="outline" className="w-full h-10 text-sm text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => setShowSoapModal(true)}>
                <Sparkles className="w-4 h-4 mr-2" /> Generate SOAP Note
              </Button>
            )}
          </div>
        </div>
      </div>

      {showSoapModal && savedClaim && (
        <SoapNoteModal
          claim={savedClaim}
          onClose={() => setShowSoapModal(false)}
          onGenerated={() => setShowSoapModal(false)}
        />
      )}

      {showPaymentModal && selectedPatient && savedClaim && (
        <PaymentModal
          claim={savedClaim}
          patient={selectedPatient}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}