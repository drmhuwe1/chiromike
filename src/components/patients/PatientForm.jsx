import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, X, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import DiagnosisCodeSearchModal from "@/components/claim/DiagnosisCodeSearchModal";

const initialState = {
  first_name: "", last_name: "", dob: "", sex: "Male",
  address_line1: "", address_line2: "", city: "", state: "", zip: "",
  phone: "", email: "", relationship_to_insured: "Self",
  is_accident_related: false, accident_date: "", accident_state: "", accident_type: "None", date_of_first_visit: "",
  insurance_company: "", insurance_plan: "", insurance_id: "", insurance_group: "",
  insured_name: "", insured_dob: "", insured_id: "", insured_employer: "",
  attorney_name: "", attorney_phone: "", notes: "", active: true, diagnoses: [],
  cases: [{ name: "Default", diagnoses: [] }],
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
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type or select..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(i => (
            <button
              key={i.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
              onMouseDown={() => { onChange(i.name); setOpen(false); }}
            >
              <span className="font-medium">{i.name}</span>
              {i.edi_payer_id && <span className="text-xs text-muted-foreground">{i.edi_payer_id}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientForm({ patient, onSave, onCancel }) {
  const [form, setForm] = useState(patient || initialState);
  const [patients, setPatients] = useState([]);
  const [guarantorSearch, setGuarantorSearch] = useState("");
  const [showGuarantorDrop, setShowGuarantorDrop] = useState(false);
  const [showDxModal, setShowDxModal] = useState(null);
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  useEffect(() => {
    base44.entities.Patient.list("-updated_date", 300).then(setPatients);
  }, []);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const copyFromGuarantor = (guarantor) => {
    set("address_line1", guarantor.address_line1 || form.address_line1);
    set("address_line2", guarantor.address_line2 || form.address_line2);
    set("city", guarantor.city || form.city);
    set("state", guarantor.state || form.state);
    set("zip", guarantor.zip || form.zip);
    set("phone", guarantor.phone || form.phone);
    set("email", guarantor.email || form.email);
    set("insurance_company", guarantor.insurance_company || form.insurance_company);
    set("insurance_plan", guarantor.insurance_plan || form.insurance_plan);
    set("insurance_id", guarantor.insurance_id || form.insurance_id);
    set("insurance_group", guarantor.insurance_group || form.insurance_group);
    set("insured_name", guarantor.insured_name || guarantor.first_name + " " + guarantor.last_name || form.insured_name);
    set("insured_dob", guarantor.insured_dob || guarantor.dob || form.insured_dob);
    setGuarantorSearch("");
    setShowGuarantorDrop(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{patient ? "Edit Patient" : "New Patient"}</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => set("first_name", e.target.value)} required />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={e => set("last_name", e.target.value)} required />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
            </div>
            <div>
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={v => set("sex", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Guarantor Lookup (for Child patients) */}
        {form.relationship_to_insured === "Child" && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Copy from Guarantor/Parent</h3>
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-2">Find a parent/guardian to auto-fill address and insurance info:</div>
              <div className="relative">
                <Input
                  placeholder="Type first 3 letters of parent name..."
                  value={guarantorSearch}
                  onChange={e => { setGuarantorSearch(e.target.value); if (e.target.value.length >= 3) setShowGuarantorDrop(true); else setShowGuarantorDrop(false); }}
                  onFocus={() => { if (guarantorSearch.length >= 3) setShowGuarantorDrop(true); }}
                  onBlur={() => setTimeout(() => setShowGuarantorDrop(false), 150)}
                />
                {showGuarantorDrop && guarantorSearch.length >= 3 && (
                  <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {patients
                      .filter(p => (p.first_name?.toLowerCase().startsWith(guarantorSearch.toLowerCase()) || p.last_name?.toLowerCase().startsWith(guarantorSearch.toLowerCase())) && p.id !== patient?.id)
                      .slice(0, 8)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center border-b border-border last:border-b-0"
                          onMouseDown={() => copyFromGuarantor(p)}
                        >
                          <div>
                            <div className="font-medium">{p.first_name} {p.last_name}</div>
                            {p.insurance_company && <div className="text-xs text-muted-foreground">{p.insurance_company}</div>}
                          </div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Copy</span>
                        </button>
                      ))}
                    {patients.filter(p => (p.first_name?.toLowerCase().startsWith(guarantorSearch.toLowerCase()) || p.last_name?.toLowerCase().startsWith(guarantorSearch.toLowerCase())) && p.id !== patient?.id).length === 0 && (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">No parents found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Address Line 1</Label>
              <Input value={form.address_line1} onChange={e => set("address_line1", e.target.value)} />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <Input value={form.address_line2} onChange={e => set("address_line2", e.target.value)} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={e => set("city", e.target.value)} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={e => set("state", e.target.value)} />
            </div>
            <div>
              <Label>ZIP</Label>
              <Input value={form.zip} onChange={e => set("zip", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Insurance */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Insurance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Label>Insurance Company</Label>
              <InsuranceComboInput
                value={form.insurance_company}
                onChange={v => set("insurance_company", v)}
              />
            </div>
            <div>
              <Label>Plan Name</Label>
              <Input value={form.insurance_plan} onChange={e => set("insurance_plan", e.target.value)} />
            </div>
            <div>
              <Label>Insurance ID</Label>
              <Input value={form.insurance_id} onChange={e => set("insurance_id", e.target.value)} />
            </div>
            <div>
              <Label>Group Number</Label>
              <Input value={form.insurance_group} onChange={e => set("insurance_group", e.target.value)} />
            </div>
            <div>
              <Label>Relationship to Insured</Label>
              <Select value={form.relationship_to_insured} onValueChange={v => set("relationship_to_insured", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Self">Self</SelectItem>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Insured Name (if different)</Label>
              <Input value={form.insured_name} onChange={e => set("insured_name", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Accident Info */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Accident Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                checked={form.is_accident_related}
                onCheckedChange={v => set("is_accident_related", v)}
              />
              <Label>Accident Related</Label>
            </div>
            {form.is_accident_related && (
              <>
                <div>
                  <Label>Accident Date</Label>
                  <Input type="date" value={form.accident_date} onChange={e => set("accident_date", e.target.value)} />
                </div>
                <div>
                  <Label>State of Accident</Label>
                  <Input value={form.accident_state} onChange={e => set("accident_state", e.target.value)} placeholder="e.g. TX" />
                </div>
                <div>
                  <Label>Accident Type</Label>
                  <Select value={form.accident_type} onValueChange={v => set("accident_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Auto</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of First Visit</Label>
                  <Input type="date" value={form.date_of_first_visit} onChange={e => set("date_of_first_visit", e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cases & Diagnosis Codes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Cases & Diagnoses (ICD-10)</h3>
          </div>
          
          {/* Case Tabs */}
          <div className="flex flex-wrap gap-2 mb-3 border-b border-border pb-2">
            {(form.cases || [{ name: "Default", diagnoses: [] }]).map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedCaseIdx(idx)}
                className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
                  selectedCaseIdx === idx
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {c.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const newCases = [...(form.cases || [])];
                newCases.push({ name: `Case ${newCases.length + 1}`, diagnoses: [] });
                set("cases", newCases);
                setSelectedCaseIdx(newCases.length - 1);
              }}
              className="px-3 py-1.5 text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> New Case
            </button>
          </div>

          {/* Diagnoses for Selected Case */}
          <div className="space-y-2">
            {((form.cases || [{ diagnoses: [] }])[selectedCaseIdx]?.diagnoses || []).map((dx, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setShowDxModal(`${selectedCaseIdx}-${idx}`)}
                  className="h-8 w-28 font-mono text-sm px-2 rounded border border-input hover:bg-muted bg-white text-left truncate"
                  title="Click to search diagnosis codes"
                >
                  {dx.code || '⊕ Search'}
                </button>
                <Input
                  className="h-8 flex-1 text-sm"
                  placeholder="Description"
                  value={dx.description}
                  onChange={e => {
                    const newCases = [...form.cases];
                    newCases[selectedCaseIdx].diagnoses[idx] = {
                      ...newCases[selectedCaseIdx].diagnoses[idx],
                      description: e.target.value
                    };
                    set("cases", newCases);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newCases = [...form.cases];
                    newCases[selectedCaseIdx].diagnoses = newCases[selectedCaseIdx].diagnoses.filter((_, i) => i !== idx);
                    set("cases", newCases);
                  }}
                  className="text-destructive hover:opacity-70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newCases = [...form.cases];
                newCases[selectedCaseIdx].diagnoses.push({ code: "", description: "" });
                set("cases", newCases);
                setShowDxModal(`${selectedCaseIdx}-${newCases[selectedCaseIdx].diagnoses.length - 1}`);
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
            >
              <Plus className="w-3 h-3" /> Add diagnosis to this case
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
        </div>

        <div className="flex gap-3">
          <Button type="submit">{patient ? "Update Patient" : "Save Patient"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>

      {showDxModal !== null && (
        <DiagnosisCodeSearchModal
          onSelect={(code) => {
            const [caseIdx, dxIdx] = showDxModal.split('-').map(Number);
            const newCases = [...form.cases];
            newCases[caseIdx].diagnoses[dxIdx] = { code: code.code, description: code.description };
            set("cases", newCases);
            setShowDxModal(null);
          }}
          onClose={() => setShowDxModal(null)}
        />
      )}
    </div>
  );
}