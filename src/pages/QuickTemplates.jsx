import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, X, Save, Trash2, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TemplateProcedureEditor from "../components/templates/TemplateProcedureEditor";

const templateCategories = ["Office Visit", "Insurance Treatment", "Cash Treatment", "Auto Claim", "Custom"];
const payerTypes = ["Medicare", "BCBS", "Auto/PI", "Cash", "Other Commercial", "Any"];

export default function QuickTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.QuickTemplate.list("-updated_date", 200);
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = t.title?.toLowerCase().includes(q);
    const matchCat = catFilter === "All" || t.category === catFilter;
    return matchSearch && matchCat;
  });

  const handleSave = async () => {
    if (editing.id) {
      await base44.entities.QuickTemplate.update(editing.id, editing);
    } else {
      await base44.entities.QuickTemplate.create(editing);
    }
    setEditing(null);
    load();
    toast({ title: "Template saved" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    await base44.entities.QuickTemplate.delete(id);
    load();
  };

  const handleDuplicate = async (tmpl) => {
    const { id, created_date, updated_date, created_by, ...rest } = tmpl;
    rest.title = rest.title + " (Copy)";
    await base44.entities.QuickTemplate.create(rest);
    load();
  };

  const set = (field, value) => setEditing(prev => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Quick Templates</h1>
        <Button onClick={() => setEditing({
          title: "", category: "Custom", payer_type: "Any",
          procedures: [], default_diagnoses: [], notes: "", active: true,
        })}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search templates..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {templateCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-xl p-6 mb-4 space-y-4">
          <div className="flex justify-between">
            <h3 className="text-lg font-semibold">{editing.id ? "Edit" : "New"} Template</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Template Name *</Label>
              <Input value={editing.title} onChange={e => set("title", e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editing.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templateCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payer Type</Label>
              <Select value={editing.payer_type} onValueChange={v => set("payer_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {payerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <TemplateProcedureEditor 
            procedures={editing.procedures || []} 
            onChange={procs => set("procedures", procs)} 
          />

          <div>
            <Label>Notes</Label>
            <Textarea value={editing.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Template</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{t.title}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)}><Copy className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(t)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                <Badge variant="outline" className="text-xs">{t.payer_type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.procedures?.length || 0} procedure{(t.procedures?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No templates yet. Create your first one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}