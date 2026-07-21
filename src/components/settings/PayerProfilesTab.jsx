import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const emptyPayer = {
  name: "", payer_type: "Other Commercial",
  enabled_codes: [], disabled_codes: [],
  covered_treatment_alternatives: [],
  default_modifiers: "", warning_notes: "",
  billing_notes: "", documentation_reminders: "",
  plan_comments: "", claim_type_default: "", active: true,
};

export default function PayerProfilesTab() {
  const [payers, setPayers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const data = await base44.entities.PayerProfile.list("-updated_date", 100);
    setPayers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing.id) {
      await base44.entities.PayerProfile.update(editing.id, editing);
    } else {
      await base44.entities.PayerProfile.create(editing);
    }
    setEditing(null);
    load();
    toast({ title: "Payer profile saved" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this payer profile?")) return;
    await base44.entities.PayerProfile.delete(id);
    load();
  };

  const set = (field, value) => setEditing(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-3 border-muted border-t-primary rounded-full animate-spin" /></div>;

  if (editing) return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{editing.id ? "Edit" : "New"} Payer Profile</h3>
        <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Payer Name *</Label>
          <Input value={editing.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div>
          <Label>Payer Type *</Label>
          <Select value={editing.payer_type} onValueChange={v => set("payer_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Medicare", "BCBS", "Auto/PI", "Cash", "Other Commercial"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Default Modifiers</Label>
          <Input value={editing.default_modifiers} onChange={e => set("default_modifiers", e.target.value)} placeholder="e.g. AT, GP" />
        </div>
        <div>
          <Label>Default Claim Type</Label>
          <Input value={editing.claim_type_default} onChange={e => set("claim_type_default", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Warning Notes</Label>
          <Textarea value={editing.warning_notes} onChange={e => set("warning_notes", e.target.value)} rows={2} />
        </div>
        <div className="md:col-span-2">
          <Label>Billing Notes</Label>
          <Textarea value={editing.billing_notes} onChange={e => set("billing_notes", e.target.value)} rows={2} />
        </div>
        <div className="md:col-span-2">
          <Label>Documentation Reminders</Label>
          <Textarea value={editing.documentation_reminders} onChange={e => set("documentation_reminders", e.target.value)} rows={2} />
        </div>
        <div className="md:col-span-2">
          <Label>Plan-Specific Comments</Label>
          <Textarea value={editing.plan_comments} onChange={e => set("plan_comments", e.target.value)} rows={2} />
        </div>
        <div className="md:col-span-2 border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between"><div><Label>Covered Treatment Alternatives</Label><p className="text-xs text-muted-foreground">Decision support only. Never substitutes codes automatically.</p></div><Button type="button" size="sm" variant="outline" onClick={() => set("covered_treatment_alternatives", [...(editing.covered_treatment_alternatives || []), { excluded_code: "", alternative_code: "", alternative_description: "", coverage_note: "", verification_source: "" }])}><Plus className="w-4 h-4 mr-1" />Add</Button></div>
          {(editing.covered_treatment_alternatives || []).map((item, index) => {
            const updateAlternative = (field, value) => {
              const next = [...(editing.covered_treatment_alternatives || [])];
              next[index] = { ...next[index], [field]: value };
              set("covered_treatment_alternatives", next);
            };
            return <div key={index} className="grid md:grid-cols-6 gap-2 border-t pt-3"><Input value={item.excluded_code || ""} onChange={e => updateAlternative("excluded_code", e.target.value.toUpperCase())} placeholder="Non-covered CPT" /><Input value={item.alternative_code || ""} onChange={e => updateAlternative("alternative_code", e.target.value.toUpperCase())} placeholder="Potential CPT" /><Input className="md:col-span-2" value={item.alternative_description || ""} onChange={e => updateAlternative("alternative_description", e.target.value)} placeholder="Alternative treatment" /><Input value={item.coverage_note || ""} onChange={e => updateAlternative("coverage_note", e.target.value)} placeholder="Coverage note" /><Button type="button" variant="ghost" size="sm" onClick={() => set("covered_treatment_alternatives", editing.covered_treatment_alternatives.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button><Input className="md:col-span-6" value={item.verification_source || ""} onChange={e => updateAlternative("verification_source", e.target.value)} placeholder="Required verification source (payer policy, portal, call reference)" /></div>;
          })}
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save</Button>
        <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Payer Profiles</h3>
        <Button size="sm" onClick={() => setEditing({ ...emptyPayer })}>
          <Plus className="w-4 h-4 mr-2" /> Add Payer
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-3 px-4 font-medium">Name</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Notes</th>
              <th className="text-right py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payers.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-3 px-4 font-medium">{p.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{p.payer_type}</td>
                <td className="py-3 px-4 text-muted-foreground hidden md:table-cell truncate max-w-xs">{p.warning_notes || "—"}</td>
                <td className="py-3 px-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {payers.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No payer profiles yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
