import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Star, Save, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const emptyCase = {
  name: "", is_default: false, active: true,
  place_of_service: "11", rendering_provider: "", referring_provider: "", referring_npi: "",
  supervising_physician: "", employer: "", attorney_name: "", attorney_phone: "",
  insurance_company: "", insurance_plan: "", insurance_id: "", insurance_group: "",
  insured_name: "", insured_dob: "", insured_sex: "", insured_employer: "",
  relationship_to_insured: "Self", authorization_number: "",
  date_of_first_visit: "", onset_date: "", date_unable_to_work_from: "",
  date_unable_to_work_to: "", last_xray_date: "", last_seen_date: "",
  accident_employment: false, accident_auto: false, accident_auto_state: "",
  accident_other: false, accident_date: "",
  diagnoses: [], notes: "",
};

function SectionHeader({ title }) {
  return (
    <div className="col-span-full bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded mt-2">
      {title}
    </div>
  );
}

function Field({ label, children, span = 1 }) {
  const spanClass = span === 2 ? "md:col-span-2" : span === 3 ? "md:col-span-3" : "";
  return (
    <div className={spanClass}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

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
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
  const [form, setForm] = useState({ ...emptyCase, patient_id: patientId, ...(caseData || {}) });
  const [dxLibrary, setDxLibrary] = useState([]);
  const [providerOptions, setProviderOptions] = useState([]);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    base44.entities.DiagnosisCode.filter({ active: true }, "-updated_date", 500).then(setDxLibrary);
    base44.entities.OfficeSettings.list("-updated_date", 1).then(all => {
      const s = all[0];
      if (!s) return;
      const opts = [];
      if (s.rendering_provider) opts.push({ name: s.rendering_provider, npi: s.rendering_npi || "" });
      (s.additional_providers || []).forEach(p => {
        if (p.provider_name) opts.push({ name: p.provider_name, npi: p.npi || "" });
      });
      setProviderOptions(opts);
    });
  }, []);

  const handleProviderSelect = (name) => {
    const match = providerOptions.find(p => p.name === name);
    set("rendering_provider", name);
    if (match) set("rendering_npi", match.npi);
  };

  const handleDxCodeChange = (idx, code) => {
    const u = [...form.diagnoses];
    u[idx] = { ...u[idx], code };
    const match = dxLibrary.find(d => d.code?.toLowerCase() === code.toLowerCase());
    if (match) u[idx].description = match.description;
    set("diagnoses", u);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">

      {/* Case Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Case Name *" span={2}>
          <Input className="h-8" value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Auto Accident 2024, General Insurance" required />
        </Field>
        <div className="flex items-center gap-2 pt-5">
          <Checkbox checked={form.is_default} onCheckedChange={v => set("is_default", v)} />
          <Label className="text-xs cursor-pointer">Set as Default Case</Label>
        </div>
      </div>

      {/* ASSOCIATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SectionHeader title="ASSOCIATION" />
        <Field label="Place of Service (POS)">
          <Select value={form.place_of_service} onValueChange={v => set("place_of_service", v)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="11">11 – Office</SelectItem>
              <SelectItem value="12">12 – Home</SelectItem>
              <SelectItem value="21">21 – Inpatient Hospital</SelectItem>
              <SelectItem value="22">22 – Outpatient Hospital</SelectItem>
              <SelectItem value="23">23 – Emergency Room</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rendering Provider">
          {providerOptions.length > 0 ? (
            <Select value={form.rendering_provider || ""} onValueChange={handleProviderSelect}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Select provider..." /></SelectTrigger>
              <SelectContent>
                {providerOptions.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input className="h-8" value={form.rendering_provider || ""} onChange={e => set("rendering_provider", e.target.value)} placeholder="Name" />
          )}
        </Field>
        <Field label="Rendering NPI (auto-filled)">
          <Input className="h-8" value={form.rendering_npi || ""} onChange={e => set("rendering_npi", e.target.value)} placeholder="NPI" />
        </Field>
        <Field label="Supervising Physician">
          <Input className="h-8" value={form.supervising_physician} onChange={e => set("supervising_physician", e.target.value)} />
        </Field>
        <Field label="Referring Provider">
          <Input className="h-8" value={form.referring_provider} onChange={e => set("referring_provider", e.target.value)} />
        </Field>
        <Field label="Referring NPI">
          <Input className="h-8" value={form.referring_npi} onChange={e => set("referring_npi", e.target.value)} />
        </Field>
        <Field label="Employer">
          <Input className="h-8" value={form.employer} onChange={e => set("employer", e.target.value)} />
        </Field>
        <Field label="Attorney Name">
          <Input className="h-8" value={form.attorney_name} onChange={e => set("attorney_name", e.target.value)} />
        </Field>
        <Field label="Attorney Phone">
          <Input className="h-8" value={form.attorney_phone} onChange={e => set("attorney_phone", e.target.value)} />
        </Field>
      </div>

      {/* INSURANCE (HCFA Boxes 1, 1a, 4, 6, 7, 9, 11, 11a-c) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SectionHeader title="INSURANCE (HCFA Boxes 1, 4, 6, 9, 11)" />
        <Field label="Insurance Company" span={2}>
          <InsuranceComboInput value={form.insurance_company} onChange={v => set("insurance_company", v)} />
        </Field>
        <Field label="Plan / Program Name">
          <Input className="h-8" value={form.insurance_plan} onChange={e => set("insurance_plan", e.target.value)} />
        </Field>
        <Field label="Insurance ID (Box 1a)">
          <Input className="h-8" value={form.insurance_id} onChange={e => set("insurance_id", e.target.value)} />
        </Field>
        <Field label="Group Number (Box 11)">
          <Input className="h-8" value={form.insurance_group} onChange={e => set("insurance_group", e.target.value)} />
        </Field>
        <Field label="Authorization # (Box 23)">
          <Input className="h-8" value={form.authorization_number} onChange={e => set("authorization_number", e.target.value)} />
        </Field>
        <Field label="Relationship to Insured (Box 6)">
          <Select value={form.relationship_to_insured} onValueChange={v => set("relationship_to_insured", v)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Self">Self</SelectItem>
              <SelectItem value="Spouse">Spouse</SelectItem>
              <SelectItem value="Child">Child</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Insured Name (Box 4 – if different)">
          <Input className="h-8" value={form.insured_name} onChange={e => set("insured_name", e.target.value)} />
        </Field>
        <Field label="Insured DOB (Box 11a)">
          <Input className="h-8" type="date" value={form.insured_dob} onChange={e => set("insured_dob", e.target.value)} />
        </Field>
        <Field label="Insured Sex (Box 11a)">
          <Select value={form.insured_sex || ""} onValueChange={v => set("insured_sex", v)}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Insured Employer / Group Name (Box 11b)">
          <Input className="h-8" value={form.insured_employer} onChange={e => set("insured_employer", e.target.value)} />
        </Field>
      </div>

      {/* CONDITION (HCFA Boxes 10, 14, 15, 16, 19) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SectionHeader title="CONDITION (HCFA Boxes 3, 10, 14, 15, 16)" />
        <Field label="Patient DOB (Box 3)">
          <Input className="h-8" type="date" value={form.patient_dob || ""} onChange={e => set("patient_dob", e.target.value)} />
        </Field>
        <Field label="Onset Date of Current Illness (Box 14)">
          <Input className="h-8" type="date" value={form.onset_date} onChange={e => set("onset_date", e.target.value)} />
        </Field>
        <Field label="Initial Treatment Date (Box 14)">
          <Input className="h-8" type="date" value={form.date_of_first_visit} onChange={e => set("date_of_first_visit", e.target.value)} />
        </Field>
        <Field label="Last Seen Date (Box 15)">
          <Input className="h-8" type="date" value={form.last_seen_date} onChange={e => set("last_seen_date", e.target.value)} />
        </Field>
        <Field label="Date Unable to Work – From (Box 16)">
          <Input className="h-8" type="date" value={form.date_unable_to_work_from} onChange={e => set("date_unable_to_work_from", e.target.value)} />
        </Field>
        <Field label="Date Unable to Work – To (Box 16)">
          <Input className="h-8" type="date" value={form.date_unable_to_work_to} onChange={e => set("date_unable_to_work_to", e.target.value)} />
        </Field>
        <Field label="Last X-Ray Date">
          <Input className="h-8" type="date" value={form.last_xray_date} onChange={e => set("last_xray_date", e.target.value)} />
        </Field>
      </div>

      {/* ACCIDENT (HCFA Box 10a-c) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SectionHeader title="ACCIDENT (HCFA Box 10)" />
        <div className="flex items-center gap-3 pt-2">
          <Checkbox checked={form.accident_employment} onCheckedChange={v => set("accident_employment", v)} />
          <Label className="text-xs">Employment Accident (10a)</Label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Checkbox checked={form.accident_auto} onCheckedChange={v => set("accident_auto", v)} />
          <Label className="text-xs">Auto Accident (10b)</Label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Checkbox checked={form.accident_other} onCheckedChange={v => set("accident_other", v)} />
          <Label className="text-xs">Other Accident (10c)</Label>
        </div>
        {form.accident_auto && (
          <Field label="Auto Accident State">
            <Select value={form.accident_auto_state || ""} onValueChange={v => set("accident_auto_state", v)}>
              <SelectTrigger className="h-8"><SelectValue placeholder="State..." /></SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        )}
        {(form.accident_employment || form.accident_auto || form.accident_other) && (
          <Field label="Date of Accident">
            <Input className="h-8" type="date" value={form.accident_date} onChange={e => set("accident_date", e.target.value)} />
          </Field>
        )}
      </div>

      {/* DIAGNOSIS (HCFA Box 21 – D1-D12) */}
      <div>
        <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded mt-2 mb-3">
          DIAGNOSIS (HCFA Box 21 – ICD-10, up to 12 codes)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, idx) => {
            const dx = form.diagnoses?.[idx] || { code: "", description: "" };
            return (
              <div key={idx} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">D{idx + 1}</Label>
                <Input className="h-7 font-mono text-xs text-green-700 font-semibold" placeholder="Code"
                  value={dx.code}
                  onChange={e => {
                    const u = [...(form.diagnoses || [])];
                    while (u.length <= idx) u.push({ code: "", description: "" });
                    u[idx] = { ...u[idx], code: e.target.value };
                    const match = dxLibrary.find(d => d.code?.toLowerCase() === e.target.value.toLowerCase());
                    if (match) u[idx].description = match.description;
                    set("diagnoses", u);
                  }}
                />
                <Input className="h-7 text-xs" placeholder="Description"
                  value={dx.description}
                  onChange={e => {
                    const u = [...(form.diagnoses || [])];
                    while (u.length <= idx) u.push({ code: "", description: "" });
                    u[idx] = { ...u[idx], description: e.target.value };
                    set("diagnoses", u);
                  }}
                />
              </div>
            );
          })}
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
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [patient, setPatient] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [data, allPts] = await Promise.all([
      base44.entities.PatientCase.filter({ patient_id: patientId }, "-created_date", 50),
      base44.entities.Patient.filter({ id: patientId }, "", 1),
    ]);
    const pt = allPts[0] || null;
    setPatient(pt);

    if (data.length === 0 && pt) {
      const firstCase = {
        patient_id: patientId,
        name: "Initial Intake",
        is_default: true,
        place_of_service: "11",
        relationship_to_insured: pt.relationship_to_insured || "Self",
        insurance_company: pt.insurance_company || "",
        insurance_plan: pt.insurance_plan || "",
        insurance_id: pt.insurance_id || "",
        insurance_group: pt.insurance_group || "",
        insured_name: pt.insured_name || `${pt.first_name || ""} ${pt.last_name || ""}`.trim(),
        insured_dob: pt.insured_dob || "",
        insured_employer: pt.insured_employer || "",
        accident_employment: false,
        accident_auto: pt.accident_type === "Auto",
        accident_other: pt.accident_type === "Other",
        accident_date: pt.accident_date || "",
        accident_auto_state: pt.accident_state || "",
        date_of_first_visit: pt.date_of_first_visit || "",
        attorney_name: pt.attorney_name || "",
        attorney_phone: pt.attorney_phone || "",
        patient_dob: pt.dob || "",
        diagnoses: pt.diagnoses || [],
        notes: "",
        active: true,
      };
      const created = await base44.entities.PatientCase.create(firstCase);
      data.push(created);
    }

    setCases(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patientId]);

  const handleSave = async (form) => {
    // Clean up empty diagnosis slots
    const cleanDx = (form.diagnoses || []).filter(d => d.code?.trim());
    const toSave = { ...form, diagnoses: cleanDx };

    if (toSave.is_default) {
      for (const c of cases) {
        if (c.is_default && c.id !== toSave.id) {
          await base44.entities.PatientCase.update(c.id, { is_default: false });
        }
      }
    }
    if (toSave.id) {
      await base44.entities.PatientCase.update(toSave.id, toSave);
    } else {
      await base44.entities.PatientCase.create({ ...toSave, patient_id: patientId });
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

  const newCaseDefaults = () => ({
    insurance_company: patient?.insurance_company || "",
    insurance_plan: patient?.insurance_plan || "",
    insurance_id: patient?.insurance_id || "",
    insurance_group: patient?.insurance_group || "",
    insured_name: patient?.insured_name || "",
    insured_dob: patient?.insured_dob || "",
    insured_employer: patient?.insured_employer || "",
    relationship_to_insured: patient?.relationship_to_insured || "Self",
    accident_auto: patient?.accident_type === "Auto",
    accident_other: patient?.accident_type === "Other",
    accident_date: patient?.accident_date || "",
    accident_auto_state: patient?.accident_state || "",
    date_of_first_visit: patient?.date_of_first_visit || "",
    attorney_name: patient?.attorney_name || "",
    attorney_phone: patient?.attorney_phone || "",
    patient_dob: patient?.dob || "",
    diagnoses: patient?.diagnoses || [],
    place_of_service: "11",
  });

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
          <Button size="sm" variant="outline" onClick={() => setEditing(newCaseDefaults())}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Case
          </Button>
        )}
      </div>

      {editing && (
        <CaseForm
          patientId={patientId}
          caseData={editing}
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
            <button type="button" className="shrink-0" title={c.is_default ? "Default case" : "Set as default"}
              onClick={e => { e.stopPropagation(); if (!c.is_default) setDefault(c); }}>
              <Star className={`w-4 h-4 ${c.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            </button>
            <span className="flex-1 text-sm font-medium">{c.name}</span>
            {c.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Default</span>}
            {(c.accident_auto || c.accident_employment || c.accident_other) && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Accident</span>}
            {c.insurance_company && <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[150px]">{c.insurance_company}</span>}
            <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing({ ...c, patient_dob: c.patient_dob || patient?.dob || "" })}><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
            {expanded === c.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>

          {expanded === c.id && (
            <div className="px-4 pb-3 pt-2 bg-muted/10 border-t border-border text-sm grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
              {c.insurance_company && <div><span className="text-muted-foreground text-xs">Insurance: </span>{c.insurance_company}</div>}
              {c.insurance_id && <div><span className="text-muted-foreground text-xs">ID: </span>{c.insurance_id}</div>}
              {c.insurance_group && <div><span className="text-muted-foreground text-xs">Group: </span>{c.insurance_group}</div>}
              {c.authorization_number && <div><span className="text-muted-foreground text-xs">Auth #: </span>{c.authorization_number}</div>}
              {c.relationship_to_insured && <div><span className="text-muted-foreground text-xs">Relationship: </span>{c.relationship_to_insured}</div>}
              {c.onset_date && <div><span className="text-muted-foreground text-xs">Onset: </span>{c.onset_date}</div>}
              {c.date_of_first_visit && <div><span className="text-muted-foreground text-xs">1st Visit: </span>{c.date_of_first_visit}</div>}
              {c.accident_date && <div><span className="text-muted-foreground text-xs">Accident: </span>{c.accident_date}</div>}
              {c.referring_provider && <div><span className="text-muted-foreground text-xs">Referring: </span>{c.referring_provider}</div>}
              {c.place_of_service && <div><span className="text-muted-foreground text-xs">POS: </span>{c.place_of_service}</div>}
              {c.diagnoses?.length > 0 && (
                <div className="col-span-2 md:col-span-4">
                  <span className="text-muted-foreground text-xs">Dx: </span>
                  <span className="text-green-700 font-semibold font-mono">{c.diagnoses.filter(d => d.code).map(d => d.code).join(", ")}</span>
                </div>
              )}
              {c.notes && <div className="col-span-2 md:col-span-4 text-muted-foreground text-xs italic">{c.notes}</div>}
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