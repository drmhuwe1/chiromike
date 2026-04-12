import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Star, Edit2, X, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const categories = ["Chiropractic Manipulation", "Office Visit", "Therapy/Modality", "Auto Claim", "Cash Service", "Custom"];

const emptyCode = {
  code: "", description: "", category: "Custom",
  default_charge: 0, default_units: 1, default_modifier: "",
  is_timed: false, payer_applicability: [],
  documentation_reminder: "", warning_notes: "",
  active: true, is_favorite: false,
};

export default function ProcedureLibrary() {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ProcedureCode.list("-updated_date", 500);
    setProcedures(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = procedures.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.code?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    const matchCat = catFilter === "All" || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const handleSave = async () => {
    if (editing.id) {
      await base44.entities.ProcedureCode.update(editing.id, editing);
    } else {
      await base44.entities.ProcedureCode.create(editing);
    }
    setEditing(null);
    load();
    toast({ title: "Procedure saved" });
  };

  const toggleFavorite = async (proc) => {
    await base44.entities.ProcedureCode.update(proc.id, { is_favorite: !proc.is_favorite });
    load();
  };

  const set = (field, value) => setEditing(prev => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Procedure Library</h1>
        <Button onClick={() => setEditing({ ...emptyCode })}>
          <Plus className="w-4 h-4 mr-2" /> Add Procedure
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search codes..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="bg-card border border-border rounded-xl p-6 mb-4 space-y-4">
          <div className="flex justify-between">
            <h3 className="text-lg font-semibold">{editing.id ? "Edit" : "New"} Procedure</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Code *</Label>
              <Input value={editing.code} onChange={e => set("code", e.target.value)} placeholder="e.g. 98940" />
            </div>
            <div className="md:col-span-2">
              <Label>Description *</Label>
              <Input value={editing.description} onChange={e => set("description", e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editing.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Charge ($)</Label>
              <Input type="number" step="0.01" value={editing.default_charge} onChange={e => set("default_charge", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Default Units</Label>
              <Input type="number" value={editing.default_units} onChange={e => set("default_units", parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Default Modifier</Label>
              <Input value={editing.default_modifier} onChange={e => set("default_modifier", e.target.value)} placeholder="e.g. AT" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={editing.is_timed} onCheckedChange={v => set("is_timed", v)} />
              <Label>Timed Service</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={editing.is_favorite} onCheckedChange={v => set("is_favorite", v)} />
              <Label>Favorite</Label>
            </div>
            <div className="md:col-span-3">
              <Label>Documentation Reminder</Label>
              <Textarea value={editing.documentation_reminder} onChange={e => set("documentation_reminder", e.target.value)} rows={2} />
            </div>
            <div className="md:col-span-3">
              <Label>Warning Notes</Label>
              <Textarea value={editing.warning_notes} onChange={e => set("warning_notes", e.target.value)} rows={2} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 py-3 px-2"></th>
                <th className="text-left py-3 px-4 font-medium">Code</th>
                <th className="text-left py-3 px-4 font-medium">Description</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Category</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">Charge</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 ${!p.active ? "opacity-50" : ""}`}>
                  <td className="py-3 px-2 text-center">
                    <button onClick={() => toggleFavorite(p)}>
                      <Star className={`w-4 h-4 ${p.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                    </button>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">{p.code}</td>
                  <td className="py-3 px-4">{p.description}</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right hidden md:table-cell">${p.default_charge?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Edit2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No procedures found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}