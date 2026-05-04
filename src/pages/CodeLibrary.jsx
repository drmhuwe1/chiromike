import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trash2, Star, X, Save, Search, Loader2, Lightbulb } from "lucide-react";
import InsurersTab from "../components/codelibrary/InsurersTab";

const procCategories = ["Chiropractic Manipulation", "Office Visit", "Therapy/Modality", "Auto Claim", "Cash Service", "Custom"];
const emptyProc = { code: "", description: "", category: "Chiropractic Manipulation", default_charge: 0, default_units: 1, default_modifier: "", is_timed: false, active: true, is_favorite: false, documentation_reminder: "", warning_notes: "" };
const emptyDx = { code: "", description: "", payer_notes: "", active: true, is_favorite: true };

export default function CodeLibrary() {
  const [tab, setTab] = useState("procedures");
  const [procedures, setProcedures] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [search, setSearch] = useState("");
  const [editingProc, setEditingProc] = useState(null);
  const [editingDx, setEditingDx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [procs, dxs] = await Promise.all([
      base44.entities.ProcedureCode.list("-updated_date", 200),
      base44.entities.DiagnosisCode.list("-updated_date", 200),
    ]);
    setProcedures(procs);
    setDiagnoses(dxs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveProc = async () => {
    if (editingProc.id) await base44.entities.ProcedureCode.update(editingProc.id, editingProc);
    else await base44.entities.ProcedureCode.create(editingProc);
    setEditingProc(null);
    load();
    toast({ title: "Procedure saved" });
  };

  const deleteProc = async (id) => {
    if (!confirm("Delete this procedure?")) return;
    await base44.entities.ProcedureCode.delete(id);
    load();
  };

  const toggleFavProc = async (proc) => {
    await base44.entities.ProcedureCode.update(proc.id, { is_favorite: !proc.is_favorite });
    load();
  };

  const saveDx = async () => {
    if (editingDx.id) await base44.entities.DiagnosisCode.update(editingDx.id, editingDx);
    else await base44.entities.DiagnosisCode.create(editingDx);
    setEditingDx(null);
    load();
    toast({ title: "Diagnosis saved" });
  };

  const deleteDx = async (id) => {
    if (!confirm("Delete this diagnosis?")) return;
    await base44.entities.DiagnosisCode.delete(id);
    load();
  };

  const toggleFavDx = async (dx) => {
    await base44.entities.DiagnosisCode.update(dx.id, { is_favorite: !dx.is_favorite });
    load();
  };

  const setP = (f, v) => setEditingProc(p => ({ ...p, [f]: v }));
  const setD = (f, v) => setEditingDx(d => ({ ...d, [f]: v }));

  const lookupProcDescription = async () => {
    if (!editingProc.code.trim()) {
      toast({ title: "Enter a CPT code first", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Look up the CPT code ${editingProc.code} for chiropractic services. Return ONLY a JSON object with "description" and "modifier" (if applicable for chiropractic). Use common chiropractic modifiers like 25, 59, 76, 77, 91 when relevant, or leave modifier empty if none applies.`,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            modifier: { type: "string" }
          }
        }
      });
      setP("description", result?.description || "");
      if (result?.modifier) setP("default_modifier", result.modifier);
      toast({ title: "Description and modifier found" });
    } catch {
      toast({ title: "Lookup failed", variant: "destructive" });
    }
    setLookingUp(false);
  };

  const lookupDxDescription = async () => {
    if (!editingDx.code.trim()) {
      toast({ title: "Enter an ICD-10 code first", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Look up the medical description for ICD-10 diagnosis code ${editingDx.code}. Return ONLY the description, nothing else.`,
      });
      setD("description", result || "");
      toast({ title: "Description found" });
    } catch {
      toast({ title: "Lookup failed", variant: "destructive" });
    }
    setLookingUp(false);
  };

  const reverseLookupProc = async () => {
    if (!editingProc.description.trim()) {
      toast({ title: "Enter a description first", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the CPT code for this chiropractic procedure: "${editingProc.description}". Return ONLY a JSON object with "code" and "modifier" (if applicable for chiropractic) or leave modifier empty if none applies.`,
        response_json_schema: {
          type: "object",
          properties: {
            code: { type: "string" },
            modifier: { type: "string" }
          }
        }
      });
      setP("code", result?.code?.trim() || "");
      if (result?.modifier) setP("default_modifier", result.modifier);
      toast({ title: "Code and modifier found" });
    } catch {
      toast({ title: "Lookup failed", variant: "destructive" });
    }
    setLookingUp(false);
  };

  const reverseLookupDx = async () => {
    if (!editingDx.description.trim()) {
      toast({ title: "Enter a description first", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the ICD-10 diagnosis code for: "${editingDx.description}". Return ONLY the code, nothing else.`,
      });
      setD("code", result?.trim() || "");
      toast({ title: "Code found" });
    } catch {
      toast({ title: "Lookup failed", variant: "destructive" });
    }
    setLookingUp(false);
  };

  const q = search.toLowerCase();
  const filteredProcs = procedures.filter(p => !q || p.code?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  const filteredDx = diagnoses.filter(d => !q || d.code?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Code Library</h1>
        <p className="text-sm text-muted-foreground">Your office's standard procedures, diagnoses, and insurers used in billing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit flex-wrap">
        {[["procedures", "Procedure Codes"], ["diagnoses", "Diagnosis Codes (ICD-10)"], ["insurers", "Insurers"]].map(([key, label]) => (
          <button key={key}
            onClick={() => { setTab(key); setSearch(""); setEditingProc(null); setEditingDx(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Insurers */}
      {tab === "insurers" && <InsurersTab />}

      {/* Procedures & Diagnoses */}
      {tab !== "insurers" && (
        <div className="space-y-4">
          {/* Search + Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={tab === "procedures" ? "Search procedures..." : "Search diagnoses..."}
                className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === "procedures" && !editingProc && (
              <Button size="sm" onClick={() => setEditingProc({ ...emptyProc })}>
                <Plus className="w-4 h-4 mr-1" /> Add Procedure
              </Button>
            )}
            {tab === "diagnoses" && !editingDx && (
              <Button size="sm" onClick={() => setEditingDx({ ...emptyDx })}>
                <Plus className="w-4 h-4 mr-1" /> Add Diagnosis
              </Button>
            )}
          </div>

          {/* Procedure Edit Form */}
          {tab === "procedures" && editingProc && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{editingProc.id ? "Edit Procedure" : "New Procedure"}</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingProc(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">CPT Code *</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input className="h-8 flex-1" value={editingProc.code} onChange={e => setP("code", e.target.value)} placeholder="e.g. 98941" />
                    <Button size="sm" variant="outline" onClick={lookupProcDescription} disabled={lookingUp} className="px-2 h-8">
                      {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Description *</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input className="h-8 flex-1" value={editingProc.description} onChange={e => setP("description", e.target.value)} />
                    <Button size="sm" variant="outline" onClick={reverseLookupProc} disabled={lookingUp} className="px-2 h-8" title="Reverse lookup code from description">
                      {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={editingProc.category} onValueChange={v => setP("category", v)}>
                    <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{procCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Default Charge ($)</Label>
                  <Input className="h-8 mt-0.5" type="number" step="0.01" value={editingProc.default_charge} onChange={e => setP("default_charge", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs">Default Units</Label>
                  <Input className="h-8 mt-0.5" type="number" value={editingProc.default_units} onChange={e => setP("default_units", parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <Label className="text-xs">Default Modifier</Label>
                  <Input className="h-8 mt-0.5" value={editingProc.default_modifier} onChange={e => setP("default_modifier", e.target.value)} placeholder="e.g. AT" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="fav" checked={editingProc.is_favorite} onChange={e => setP("is_favorite", e.target.checked)} className="w-4 h-4" />
                  <Label htmlFor="fav" className="text-xs cursor-pointer">Show as favorite in billing</Label>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <Label className="text-xs">Documentation Reminder (optional)</Label>
                  <Input className="h-8 mt-0.5" value={editingProc.documentation_reminder} onChange={e => setP("documentation_reminder", e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveProc}><Save className="w-4 h-4 mr-1" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingProc(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Diagnosis Edit Form */}
          {tab === "diagnoses" && editingDx && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{editingDx.id ? "Edit Diagnosis" : "New Diagnosis"}</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingDx(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">ICD-10 Code *</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input className="h-8 flex-1" value={editingDx.code} onChange={e => setD("code", e.target.value)} placeholder="e.g. M54.5" />
                    <Button size="sm" variant="outline" onClick={lookupDxDescription} disabled={lookingUp} className="px-2 h-8">
                      {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Description *</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input className="h-8 flex-1" value={editingDx.description} onChange={e => setD("description", e.target.value)} />
                    <Button size="sm" variant="outline" onClick={reverseLookupDx} disabled={lookingUp} className="px-2 h-8" title="Reverse lookup code from description">
                      {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Payer Notes</Label>
                  <Input className="h-8 mt-0.5" value={editingDx.payer_notes} onChange={e => setD("payer_notes", e.target.value)} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="dxfav" checked={editingDx.is_favorite} onChange={e => setD("is_favorite", e.target.checked)} className="w-4 h-4" />
                  <Label htmlFor="dxfav" className="text-xs cursor-pointer">Show as favorite in billing</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDx}><Save className="w-4 h-4 mr-1" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingDx(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Procedure Table */}
           {tab === "procedures" && (
             <div className="bg-card border border-border rounded-xl overflow-hidden">
               {loading ? (
                 <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
               ) : (
                 <div className="h-96 overflow-y-auto">
                   <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2.5 px-3 font-medium text-xs">⭐</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Code</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Description</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">Category</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">Charge</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">Modifier</th>
                      <th className="py-2.5 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcs.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <button onClick={() => toggleFavProc(p)}>
                            <Star className={`w-4 h-4 ${p.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold">{p.code}</td>
                        <td className="py-2 px-3">{p.description}</td>
                        <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">{p.category}</td>
                        <td className="py-2 px-3 hidden md:table-cell">${p.default_charge?.toFixed(2)}</td>
                        <td className="py-2 px-3 font-mono hidden md:table-cell">{p.default_modifier || "—"}</td>
                        <td className="py-2 px-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingProc(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteProc(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                    {filteredProcs.length === 0 && (
                      <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No procedures found</td></tr>
                    )}
                    </tbody>
                    </table>
                    </div>
                    )}
                    </div>
                    )}

                    {/* Diagnosis Table */}
                    {tab === "diagnoses" && (
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        {loading ? (
                          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
                        ) : (
                          <div className="h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2.5 px-3 font-medium text-xs">⭐</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Code</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Description</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">Payer Notes</th>
                      <th className="py-2.5 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDx.map(d => (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <button onClick={() => toggleFavDx(d)}>
                            <Star className={`w-4 h-4 ${d.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold">{d.code}</td>
                        <td className="py-2 px-3">{d.description}</td>
                        <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">{d.payer_notes || "—"}</td>
                        <td className="py-2 px-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingDx(d)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteDx(d.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                    {filteredDx.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No diagnoses found</td></tr>
                    )}
                    </tbody>
                    </table>
                    </div>
                    )}
                    </div>
                    )}

                    <p className="text-xs text-muted-foreground">⭐ Starred items appear as quick-tap favorites in the claim builder.</p>
        </div>
      )}
    </div>
  );
}