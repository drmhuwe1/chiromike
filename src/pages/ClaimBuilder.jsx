import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Save, Printer, Copy, CalendarDays, Zap } from "lucide-react";
import PatientSelector from "../components/claim/PatientSelector";
import DiagnosisPanel from "../components/claim/DiagnosisPanel";
import ServiceLineGrid from "../components/claim/ServiceLineGrid";
import QuickPanel from "../components/claim/QuickPanel";

const visitTypes = ["Insurance", "Auto", "Cash", "Cash Office Visit", "Cash Package"];
const payerTypes = ["Medicare", "BCBS", "Auto/PI", "Cash", "Other Commercial"];

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

  const [officeSettings, setOfficeSettings] = useState(null);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const settings = await base44.entities.OfficeSettings.list("-updated_date", 1);
      if (settings[0]) {
        setOfficeSettings(settings[0]);
        setClaim(prev => ({
          ...prev,
          place_of_service: settings[0].default_place_of_service || "11",
          claim_notes: settings[0].default_claim_notes || "",
        }));
      }

      if (presetPatientId) {
        const patients = await base44.entities.Patient.filter({ id: presetPatientId });
        if (patients[0]) selectPatient(patients[0]);
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

  const selectPatient = (patient) => {
    setClaim(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      insurance_company: patient.insurance_company || "",
      insurance_id: patient.insurance_id || "",
      insurance_group: patient.insurance_group || "",
      insured_name: patient.insured_name || `${patient.first_name} ${patient.last_name}`,
      insured_dob: patient.insured_dob || patient.dob || "",
      accident_related: patient.is_accident_related || false,
      accident_date: patient.accident_date || "",
      accident_type: patient.accident_type || "",
    }));
  };

  const set = (field, value) => setClaim(prev => ({ ...prev, [field]: value }));

  const totalCharge = useMemo(() => {
    return claim.service_lines.reduce((sum, l) => sum + ((l.charge || 0) * (l.units || 1)), 0);
  }, [claim.service_lines]);

  const handleApplyTemplate = (template) => {
    const newLines = (template.procedures || []).map(p => ({
      date_of_service: claim.date_of_service,
      code: p.code, description: p.description,
      charge: p.charge, units: p.units || 1,
      modifier: p.modifier || "", diagnosis_pointers: p.diagnosis_pointers || "1",
      notes: "",
    }));
    const newDx = (template.default_diagnoses || []).map(d => ({
      code: d.code, description: d.description, pointer: "",
    }));
    setClaim(prev => ({
      ...prev,
      service_lines: [...prev.service_lines, ...newLines],
      diagnoses: prev.diagnoses.length > 0 ? prev.diagnoses : newDx,
      template_used: template.title,
    }));
    setShowQuickPanel(false);
  };

  const handleSameDateAll = () => {
    setClaim(prev => ({
      ...prev,
      service_lines: prev.service_lines.map(l => ({ ...l, date_of_service: prev.date_of_service })),
    }));
    toast({ title: "Date applied to all lines" });
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
      toast({ title: "Previous visit duplicated" });
    } else {
      toast({ title: "No previous visit found", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!claim.patient_id) { toast({ title: "Select a patient", variant: "destructive" }); return; }
    setLoading(true);
    const data = { ...claim, total_charge: totalCharge, status: "Saved" };
    const saved = await base44.entities.Claim.create(data);
    setLoading(false);
    toast({ title: "Claim saved" });
    navigate(`/saved-claims`);
  };

  const handleSaveAndPrint = async () => {
    if (!claim.patient_id) { toast({ title: "Select a patient", variant: "destructive" }); return; }
    setLoading(true);
    const data = { ...claim, total_charge: totalCharge, status: "Saved" };
    const saved = await base44.entities.Claim.create(data);
    setLoading(false);
    const isCash = claim.visit_type?.includes("Cash");
    navigate(isCash ? `/print-receipt?id=${saved.id}` : `/print-claim?id=${saved.id}`);
  };

  const isCash = claim.visit_type?.includes("Cash");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {isCash ? "Cash Visit" : claim.visit_type === "Auto" ? "Auto Claim" : "Insurance Claim"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowQuickPanel(!showQuickPanel)}>
            <Zap className="w-4 h-4 mr-1" /> Quick Panel
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicateLastVisit}>
            <Copy className="w-4 h-4 mr-1" /> Dup Last Visit
          </Button>
          <Button variant="outline" size="sm" onClick={handleSameDateAll}>
            <CalendarDays className="w-4 h-4 mr-1" /> Same Date All
          </Button>
        </div>
      </div>

      {showQuickPanel && (
        <QuickPanel 
          onApply={handleApplyTemplate} 
          onClose={() => setShowQuickPanel(false)}
          payerType={claim.payer_type}
        />
      )}

      {/* Patient & Visit Type Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PatientSelector selected={claim.patient_name} onSelect={selectPatient} />
        <div className="bg-card border border-border rounded-xl p-4">
          <Label>Visit Type</Label>
          <Select value={claim.visit_type} onValueChange={v => { set("visit_type", v); if (v.includes("Cash")) set("payer_type", "Cash"); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {visitTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Label className="mt-3 block">Payer Type</Label>
          <Select value={claim.payer_type} onValueChange={v => set("payer_type", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {payerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <Label>Date of Service</Label>
          <Input type="date" className="mt-1" value={claim.date_of_service} onChange={e => set("date_of_service", e.target.value)} />
          <Label className="mt-3 block">Place of Service</Label>
          <Input className="mt-1" value={claim.place_of_service} onChange={e => set("place_of_service", e.target.value)} />
        </div>
      </div>

      {/* Insurance Details (non-cash only) */}
      {!isCash && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Insurance Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Insurance Company</Label>
              <Input className="h-8 text-sm" value={claim.insurance_company} onChange={e => set("insurance_company", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Insurance ID</Label>
              <Input className="h-8 text-sm" value={claim.insurance_id} onChange={e => set("insurance_id", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Group #</Label>
              <Input className="h-8 text-sm" value={claim.insurance_group} onChange={e => set("insurance_group", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Insured Name</Label>
              <Input className="h-8 text-sm" value={claim.insured_name} onChange={e => set("insured_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Authorization #</Label>
              <Input className="h-8 text-sm" value={claim.authorization_number} onChange={e => set("authorization_number", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Referring Provider</Label>
              <Input className="h-8 text-sm" value={claim.referring_provider} onChange={e => set("referring_provider", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Referring NPI</Label>
              <Input className="h-8 text-sm" value={claim.referring_npi} onChange={e => set("referring_npi", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Diagnoses */}
      <DiagnosisPanel 
        diagnoses={claim.diagnoses} 
        onChange={dx => set("diagnoses", dx)} 
      />

      {/* Service Lines */}
      <ServiceLineGrid
        lines={claim.service_lines}
        onChange={lines => set("service_lines", lines)}
        defaultDate={claim.date_of_service}
      />

      {/* Notes & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <Label>Claim Notes</Label>
          <Textarea value={claim.claim_notes} onChange={e => set("claim_notes", e.target.value)} rows={3} className="mt-1" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Total Charges</span>
              <span className="text-2xl font-bold">${totalCharge.toFixed(2)}</span>
            </div>
            {!isCash && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Amount Paid</Label>
                <Input className="h-8 text-sm w-32" type="number" step="0.01" value={claim.amount_paid} onChange={e => set("amount_paid", parseFloat(e.target.value) || 0)} />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
            <Button onClick={handleSaveAndPrint} disabled={loading} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" /> {isCash ? "Save & Receipt" : "Save & Print"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}