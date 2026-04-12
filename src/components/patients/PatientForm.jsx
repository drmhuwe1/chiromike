import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

const initialState = {
  first_name: "", last_name: "", dob: "", sex: "Male",
  address_line1: "", address_line2: "", city: "", state: "", zip: "",
  phone: "", email: "", relationship_to_insured: "Self",
  is_accident_related: false, accident_date: "", accident_type: "None",
  insurance_company: "", insurance_plan: "", insurance_id: "", insurance_group: "",
  insured_name: "", insured_dob: "", insured_id: "", insured_employer: "",
  attorney_name: "", attorney_phone: "", notes: "", active: true,
};

export default function PatientForm({ patient, onSave, onCancel }) {
  const [form, setForm] = useState(patient || initialState);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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
            <div>
              <Label>Insurance Company</Label>
              <Input value={form.insurance_company} onChange={e => set("insurance_company", e.target.value)} />
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
              </>
            )}
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
    </div>
  );
}