import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Star, X, Save, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const emptyCase = {
  name: "", is_default: false,
  is_accident_related: false, accident_date: "", accident_state: "", accident_type: "None", date_of_first_visit: "",
  insurance_company: "", insurance_plan: "", insurance_id: "", insurance_group: "",
  insured_name: "", insured_dob: "", attorney_name: "", attorney_phone: "",
  diagnoses: [], notes: "", active: true,
};

function InsuranceComboInput({ value, onChange }) {
  const [insurers, setInsurers] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.InsuranceCompany.list("-name", 200).then(setInsurers);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = value
    ? insurers.filter(i => i.name?.toLowerCase().includes(value.toLowerCase()))
    : insurers;

  return (
    <div ref={ref} className="relative">
      <input
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type or select..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(i => (
            <button key={i.id} type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
              onMouseDown={() => { onChange(i.name); setOpen(false); }}>
              <span className="font-medium">{i.name}</span>
              {i.edi_payer_id && <span className="text-xs text-muted-foreground">{i.edi_payer_id}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseForm({ patientId, caseData, onSave, onCancel }) {
  const [form, setForm] = useState(caseData || { ...emptyCase, patient_id: patientId });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label className="text-xs">Case Name *</Label>
          <Input className="h-8 mt-0.5" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Auto Accident 2024, General Insurance, Work Comp" required />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Checkbox checked={form.is_default} onCheckedChange={v => set("is_default", v)} />
          <Label className="text-xs cursor-pointer">Set as Default Case</Label>
        </div>
      </div>

      {/* Insurance */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Insurance</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Insurance Company</Label>
            <InsuranceComboInput value={form.insurance_company} onChange={v => set("insurance_company", v)} />
          </div>
          <div>
            <Label className="text-xs">Plan Name</Label>
            <Input className="h-8 mt-0.5" value={form.insurance_plan} onChange={e => set("insurance_plan", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Insurance ID</Label>
            <Input className="h-8 mt-0.5" value={form.insurance_id} onChange={e => set("insurance_id", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Group Number</Label>
            <Input className="h-8 mt-0.5" value={form.insurance_group} onChange={e => set("insurance_group", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Insured Name (if different)</Label>
            <Input className="h-8 mt-0.5" value={form.insured_name} onChange={e => set("insured_name", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Insured DOB</Label>
            <Input className="h-8 mt-0.5" type="date" value={form.insured_dob} onChange={e => set("insured_dob", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Accident */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Accident Info</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 pt-5">
            <Checkbox checked={form.is_accident_related} onCheckedChange={v => set("is_accident_related", v)} />
            <Label className="text-xs">Accident Related</Label>
          </div>
          {form.is_accident_related && (
            <>
              <div>
                <Label className="text-xs">Date of Accident</Label>
                <Input className="h-8 mt-0.5" type="date" value={form.accident_date} onChange={e => set("accident_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">State of Accident</Label>
                <Input className="h-8 mt-0.5" value={form.accident_state} onChange={e => set("accident_state", e.target.value)} placeholder="e.g. TX" />
              </div>
              <div>
                <Label className="text-xs">Accident Type</Label>
                <Select value={form.accident_type} onValueChange={v => set("accident_type", v)}>
                  <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto">Auto</SelectItem>
                    <SelectItem value="Work">Work</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date of First Visit</Label>
                <Input className="h-8 mt-0.5" type="date" value={form.date_of_first_visit} onChange={e => set("date_of_first_visit", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Attorney Name</Label>
                <Input className="h-8 mt-0.5" value={form.attorney_name} onChange={e => set("attorney_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Attorney Phone</Label>
                <Input className="h-8 mt-0.5" value={form.attorney_phone} onChange={e => set("attorney_phone", e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Diagnoses */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Diagnosis Codes (ICD-10)</p>
        <div className="space-y-2">
          {(form.diagnoses || []).map((dx, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input className="h-8 w-28 font-mono text-xs" placeholder="Code" value={dx.code}
                onChange={e => { const u = [...form.diagnoses]; u[idx] = { ...u[idx], code: e.target.value }; set("diagnoses", u); }} />
              <Input className="h-8 flex-1 text-xs" placeholder="Description" value={dx.description}
                onChange={e => { const u = [...form.diagnoses]; u[idx] = { ...u[idx], description: e.target.value }; set("diagnoses", u); }} />
              <button type="button" onClick={() => set("diagnoses", form.diagnoses.filter((_, i) => i !== idx))} className="text-destructive hover:opacity-70">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button"
            onClick={() => set("diagnoses", [...(form.diagnoses || []), { code: "", description: "" }])}
            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
            <Plus className="w-3 h-3" /> Add diagnosis
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-xs">Case Notes</Label>
        <Textarea className="mt-0.5 text-sm" rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm"><Save className="w-4 h-4 mr-1" /> Save Case</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function PatientCases({ patientId }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, case obj = edit
  const [expanded, setExpanded] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PatientCase.filter({ patient_id: patientId }, "-created_date", 50);
    
    // If no cases exist, auto-create first case from patient data
    if (data.length === 0) {
      const patient = await base44.entities.Patient.list("", 1)
        .then(pts => pts.find(p => p.id === patientId));
      
      if (patient) {
        const firstCase = {
          patient_id: patientId,
          name: "Initial Intake",
          is_default: true,
          is_accident_related: patient.is_accident_related || false,
          accident_date: patient.accident_date || "",
          accident_state: patient.accident_state || "",
          accident_type: patient.accident_type || "None",
          date_of_first_visit: patient.date_of_first_visit || "",
          insurance_company: patient.insurance_company || "",
          insurance_plan: patient.insurance_plan || "",
          insurance_id: patient.insurance_id || "",
          insurance_group: patient.insurance_group || "",
          insured_name: patient.insured_name || "",
          insured_dob: patient.insured_dob || "",
          attorney_name: patient.attorney_name || "",
          attorney_phone: patient.attorney_phone || "",
          diagnoses: patient.diagnoses || [],
          notes: "",
          active: true
        };
        await base44.entities.PatientCase.create(firstCase);
        data.push(firstCase);
      }
    }
    
    setCases(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patientId]);

  const handleSave = async (form) => {
    // If setting as default, clear other defaults first
    if (form.is_default) {
      for (const c of cases) {
        if (c.is_default && c.id !== form.id) {
          await base44.entities.PatientCase.update(c.id, { is_default: false });
        }
      }
    }
    if (form.id) {
      await base44.entities.PatientCase.update(form.id, form);
    } else {
      await base44.entities.PatientCase.create({ ...form, patient_id: patientId });
    }
    setEditing(null);
    load();
    toast({ title: "Case saved" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this case?")) return;
    await base44.entities.PatientCase.delete(id);
    load();
  };

  const setDefault = async (c) => {
    for (const other of cases) {
      if (other.is_default && other.id !== c.id) {
        await base44.entities.PatientCase.update(other.id, { is_default: false });
      }
    }
    await base44.entities.PatientCase.update(c.id, { is_default: true });
    load();
    toast({ title: `"${c.name}" set as default` });
  };

  if (loading) return <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Cases</span>
          <span className="text-xs text-muted-foreground">({cases.length})</span>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing({})}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Case
          </Button>
        )}
      </div>

      {editing && (
        <CaseForm
          patientId={patientId}
          caseData={editing.id ? editing : null}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {cases.map(c => (
        <div key={c.id} className="border border-border rounded-lg overflow-hidden">
          <div
            className="flex items-center gap-2 px-3 py-2.5 bg-card hover:bg-muted/30 cursor-pointer"
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
          >
            <button
              type="button"
              className="shrink-0"
              title={c.is_default ? "Default case" : "Set as default"}
              onClick={e => { e.stopPropagation(); if (!c.is_default) setDefault(c); }}
            >
              <Star className={`w-4 h-4 ${c.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            </button>
            <span className="flex-1 text-sm font-medium">{c.name}</span>
            {c.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Default</span>}
            {c.is_accident_related && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Accident</span>}
            {c.insurance_company && <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[150px]">{c.insurance_company}</span>}
            <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
            {expanded === c.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>

          {expanded === c.id && (
            <div className="px-4 pb-3 pt-2 bg-muted/10 border-t border-border text-sm grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
              {c.insurance_company && <div><span className="text-muted-foreground text-xs">Insurance: </span>{c.insurance_company}</div>}
              {c.insurance_id && <div><span className="text-muted-foreground text-xs">ID: </span>{c.insurance_id}</div>}
              {c.insurance_group && <div><span className="text-muted-foreground text-xs">Group: </span>{c.insurance_group}</div>}
              {c.accident_date && <div><span className="text-muted-foreground text-xs">Accident Date: </span>{c.accident_date}</div>}
              {c.accident_state && <div><span className="text-muted-foreground text-xs">Accident State: </span>{c.accident_state}</div>}
              {c.date_of_first_visit && <div><span className="text-muted-foreground text-xs">First Visit: </span>{c.date_of_first_visit}</div>}
              {c.diagnoses?.length > 0 && (
                <div className="col-span-2 md:col-span-3">
                  <span className="text-muted-foreground text-xs">Diagnoses: </span>
                  {c.diagnoses.map(d => d.code).join(", ")}
                </div>
              )}
              {c.notes && <div className="col-span-2 md:col-span-3 text-muted-foreground text-xs italic">{c.notes}</div>}
            </div>
          )}
        </div>
      ))}

      {cases.length === 0 && !editing && (
        <p className="text-sm text-muted-foreground text-center py-3">No cases yet. Create one to store billing & diagnosis info per episode of care.</p>
      )}
    </div>
  );
}