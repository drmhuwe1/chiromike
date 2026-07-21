import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trash2, X, Save, Search, Sparkles, Loader2, Phone, Globe } from "lucide-react";

const payerTypes = ["Medicare", "Medicaid", "BCBS", "Auto/PI", "Other Commercial", "Workers Comp"];

const empty = {
  name: "", edi_payer_id: "", payer_type: "Other Commercial",
  claims_address_line1: "", claims_address_line2: "",
  claims_city: "", claims_state: "", claims_zip: "",
  appeals_address_line1: "", appeals_address_line2: "", appeals_city: "", appeals_state: "", appeals_zip: "", appeals_fax: "", appeal_filing_days: "",
  phone: "", fax: "", website: "", provider_portal: "",
  contact_name: "", contact_phone: "", contact_email: "",
  timely_filing_days: "", notes: "", active: true,
};

export default function InsurersTab() {
  const [insurers, setInsurers] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.InsuranceCompany.list("-updated_date", 500);
    setInsurers(data.filter(i => i.active !== false));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (editing.id) await base44.entities.InsuranceCompany.update(editing.id, editing);
    else await base44.entities.InsuranceCompany.create(editing);
    setEditing(null);
    load();
    toast({ title: "Insurer saved" });
  };

  const del = async (id) => {
    if (!confirm("Delete this insurer?")) return;
    await base44.entities.InsuranceCompany.delete(id);
    load();
  };

  const set = (f, v) => setEditing(p => ({ ...p, [f]: v }));

  const handleAiLookup = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Look up the insurance company billing/claims information for: "${aiQuery}".
Return accurate, real-world data for this payer as used by chiropractic and medical providers in the United States.
Include their EDI payer ID (used for electronic claims), primary claims mailing address, provider services phone, fax, website, provider portal URL, typical timely filing limit, appeals mailing address, appeals fax, and appeal filing limit in days.
ALSO identify and list any alternate/regional plan addresses if this carrier has different claims addresses for different plans or regions.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            edi_payer_id: { type: "string" },
            payer_type: { type: "string" },
            claims_address_line1: { type: "string" },
            claims_address_line2: { type: "string" },
            claims_city: { type: "string" },
            claims_state: { type: "string" },
            claims_zip: { type: "string" },
            phone: { type: "string" },
            fax: { type: "string" },
            website: { type: "string" },
            provider_portal: { type: "string" },
            timely_filing_days: { type: "number" },
            appeals_address_line1: { type: "string" },
            appeals_address_line2: { type: "string" },
            appeals_city: { type: "string" },
            appeals_state: { type: "string" },
            appeals_zip: { type: "string" },
            appeals_fax: { type: "string" },
            appeal_filing_days: { type: "number" },
            notes: { type: "string" },
            plan_addresses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  plan_name: { type: "string" },
                  address_line1: { type: "string" },
                  address_line2: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zip: { type: "string" }
                }
              }
            }
          }
        }
      });
      setEditing(prev => ({ ...empty, ...prev, ...result }));
      setAiQuery("");
      toast({ title: "AI lookup complete — review and save!" });
    } catch (e) {
      toast({ title: "AI lookup failed", description: e.message, variant: "destructive" });
    }
    setAiLoading(false);
  };

  const filtered = insurers.filter(i => {
    const q = search.toLowerCase();
    return !q || i.name?.toLowerCase().includes(q) || i.edi_payer_id?.includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search insurers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!editing && (
          <Button size="sm" onClick={() => setEditing({ ...empty })}>
            <Plus className="w-4 h-4 mr-1" /> Add Insurer
          </Button>
        )}
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">{editing.id ? "Edit Insurer" : "New Insurer"}</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>

          {/* AI Lookup */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              AI Auto-Fill — type an insurer name and let AI look up the details
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Blue Cross Blue Shield of Texas, Aetna, Cigna..."
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAiLookup()}
                className="h-8 text-sm"
              />
              <Button size="sm" onClick={handleAiLookup} disabled={aiLoading} className="shrink-0">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> Look Up</>}
              </Button>
            </div>
            {aiLoading && <p className="text-xs text-muted-foreground">Searching for payer information...</p>}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Insurance Company Name *</Label>
              <Input className="h-8 mt-0.5" value={editing.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">EDI Payer ID</Label>
              <Input className="h-8 mt-0.5 font-mono" value={editing.edi_payer_id} onChange={e => set("edi_payer_id", e.target.value)} placeholder="e.g. 00901" />
            </div>
            <div>
              <Label className="text-xs">Payer Type</Label>
              <Select value={editing.payer_type} onValueChange={v => set("payer_type", v)}>
                <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>{payerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Claims Address */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Claims Mailing Address</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Address Line 1</Label>
                <Input className="h-8 mt-0.5" value={editing.claims_address_line1} onChange={e => set("claims_address_line1", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Address Line 2</Label>
                <Input className="h-8 mt-0.5" value={editing.claims_address_line2} onChange={e => set("claims_address_line2", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">City</Label>
                <Input className="h-8 mt-0.5" value={editing.claims_city} onChange={e => set("claims_city", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input className="h-8 mt-0.5" value={editing.claims_state} onChange={e => set("claims_state", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input className="h-8 mt-0.5" value={editing.claims_zip} onChange={e => set("claims_zip", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Appeals / Reconsideration Delivery</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="col-span-2"><Label className="text-xs">Address Line 1</Label><Input className="h-8 mt-0.5" value={editing.appeals_address_line1 || ""} onChange={e => set("appeals_address_line1", e.target.value)} /></div><div className="col-span-2"><Label className="text-xs">Address Line 2</Label><Input className="h-8 mt-0.5" value={editing.appeals_address_line2 || ""} onChange={e => set("appeals_address_line2", e.target.value)} /></div><div><Label className="text-xs">City</Label><Input className="h-8 mt-0.5" value={editing.appeals_city || ""} onChange={e => set("appeals_city", e.target.value)} /></div><div><Label className="text-xs">State</Label><Input className="h-8 mt-0.5" value={editing.appeals_state || ""} onChange={e => set("appeals_state", e.target.value)} /></div><div><Label className="text-xs">ZIP</Label><Input className="h-8 mt-0.5" value={editing.appeals_zip || ""} onChange={e => set("appeals_zip", e.target.value)} /></div><div><Label className="text-xs">Appeals Fax</Label><Input className="h-8 mt-0.5" value={editing.appeals_fax || ""} onChange={e => set("appeals_fax", e.target.value)} /></div><div><Label className="text-xs">Appeal Filing Limit (days)</Label><Input className="h-8 mt-0.5" type="number" value={editing.appeal_filing_days || ""} onChange={e => set("appeal_filing_days", parseInt(e.target.value) || "")} /></div></div>
            <p className="text-xs text-amber-700 mt-2">Always verify AI-filled addresses, fax numbers, and deadlines against the patient’s denial notice or payer portal before sending.</p>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact Information</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Provider Services Phone</Label>
                <Input className="h-8 mt-0.5" value={editing.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fax</Label>
                <Input className="h-8 mt-0.5" value={editing.fax} onChange={e => set("fax", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input className="h-8 mt-0.5" value={editing.website} onChange={e => set("website", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Provider Portal URL</Label>
                <Input className="h-8 mt-0.5" value={editing.provider_portal} onChange={e => set("provider_portal", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Contact Name</Label>
                <Input className="h-8 mt-0.5" value={editing.contact_name} onChange={e => set("contact_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Contact Phone</Label>
                <Input className="h-8 mt-0.5" value={editing.contact_phone} onChange={e => set("contact_phone", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Contact Email</Label>
                <Input className="h-8 mt-0.5" value={editing.contact_email} onChange={e => set("contact_email", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Timely Filing (days)</Label>
                <Input className="h-8 mt-0.5" type="number" value={editing.timely_filing_days} onChange={e => set("timely_filing_days", parseInt(e.target.value) || "")} />
              </div>
              <div className="col-span-2 md:col-span-4">
                <Label className="text-xs">Notes / Special Instructions</Label>
                <Textarea className="mt-0.5 text-sm" rows={2} value={editing.notes} onChange={e => set("notes", e.target.value)} />
              </div>
              </div>
              </div>

              {/* Plan-Specific Addresses */}
              <div>
              <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan-Specific Claims Addresses (Optional)</p>
              <button
                onClick={() => set("plan_addresses", [...(editing.plan_addresses || []), { plan_name: "", address_line1: "", address_line2: "", city: "", state: "", zip: "" }])}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Plan
              </button>
              </div>
              <div className="space-y-3">
              {(editing.plan_addresses || []).map((plan, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 justify-between mb-2">
                    <Input
                      placeholder="Plan name (e.g. BCBS Texas HMO, BCBS PPO)"
                      className="h-7 text-xs flex-1"
                      value={plan.plan_name}
                      onChange={e => {
                        const plans = [...(editing.plan_addresses || [])];
                        plans[idx] = { ...plans[idx], plan_name: e.target.value };
                        set("plan_addresses", plans);
                      }}
                    />
                    <button
                      onClick={() => set("plan_addresses", (editing.plan_addresses || []).filter((_, i) => i !== idx))}
                      className="text-destructive hover:opacity-70 px-2 py-1"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <Input className="h-7 text-xs" placeholder="Address Line 1" value={plan.address_line1}
                        onChange={e => {
                          const plans = [...(editing.plan_addresses || [])];
                          plans[idx] = { ...plans[idx], address_line1: e.target.value };
                          set("plan_addresses", plans);
                        }} />
                    </div>
                    <div className="col-span-2">
                      <Input className="h-7 text-xs" placeholder="Address Line 2" value={plan.address_line2}
                        onChange={e => {
                          const plans = [...(editing.plan_addresses || [])];
                          plans[idx] = { ...plans[idx], address_line2: e.target.value };
                          set("plan_addresses", plans);
                        }} />
                    </div>
                    <div className="col-span-2">
                      <Input className="h-7 text-xs" placeholder="City" value={plan.city}
                        onChange={e => {
                          const plans = [...(editing.plan_addresses || [])];
                          plans[idx] = { ...plans[idx], city: e.target.value };
                          set("plan_addresses", plans);
                        }} />
                    </div>
                    <div>
                      <Input className="h-7 text-xs" placeholder="State" value={plan.state}
                        onChange={e => {
                          const plans = [...(editing.plan_addresses || [])];
                          plans[idx] = { ...plans[idx], state: e.target.value };
                          set("plan_addresses", plans);
                        }} />
                    </div>
                    <div>
                      <Input className="h-7 text-xs" placeholder="ZIP" value={plan.zip}
                        onChange={e => {
                          const plans = [...(editing.plan_addresses || [])];
                          plans[idx] = { ...plans[idx], zip: e.target.value };
                          set("plan_addresses", plans);
                        }} />
                    </div>
                  </div>
                </div>
              ))}
              </div>
              </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="w-4 h-4 mr-1" /> Save Insurer</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-2.5 px-3 font-medium text-xs">Name</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">EDI Payer ID</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">Type</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs hidden lg:table-cell">Phone</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs hidden lg:table-cell">Filing Limit</th>
                <th className="py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ins => (
                <tr key={ins.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2.5 px-3 font-medium">
                    {ins.name}
                    {ins.website && (
                      <a href={ins.website} target="_blank" rel="noreferrer" className="ml-2 inline-flex text-muted-foreground hover:text-primary">
                        <Globe className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono hidden md:table-cell">{ins.edi_payer_id || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell">{ins.payer_type}</td>
                  <td className="py-2.5 px-3 hidden lg:table-cell">
                    {ins.phone ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{ins.phone}</span> : "—"}
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell">{ins.timely_filing_days ? `${ins.timely_filing_days} days` : "—"}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(ins)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => del(ins.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No insurers yet. Add one above.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
