import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Star, Edit2, X, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DiagnosisFavorites() {
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.DiagnosisCode.list("-updated_date", 500);
    setDiagnoses(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = diagnoses.filter(d => {
    const q = search.toLowerCase();
    return d.code?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q);
  });

  const handleSave = async () => {
    if (editing.id) {
      await base44.entities.DiagnosisCode.update(editing.id, editing);
    } else {
      await base44.entities.DiagnosisCode.create(editing);
    }
    setEditing(null);
    load();
    toast({ title: "Diagnosis saved" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this diagnosis?")) return;
    await base44.entities.DiagnosisCode.delete(id);
    load();
  };

  const set = (field, value) => setEditing(prev => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Diagnosis Favorites</h1>
        <Button onClick={() => setEditing({ code: "", description: "", payer_notes: "", active: true, is_favorite: true })}>
          <Plus className="w-4 h-4 mr-2" /> Add Diagnosis
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search ICD-10 codes..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-xl p-6 mb-4 space-y-4">
          <div className="flex justify-between">
            <h3 className="text-lg font-semibold">{editing.id ? "Edit" : "New"} Diagnosis</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>ICD-10 Code *</Label>
              <Input value={editing.code} onChange={e => set("code", e.target.value)} placeholder="e.g. M54.5" />
            </div>
            <div>
              <Label>Description *</Label>
              <Input value={editing.description} onChange={e => set("description", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Payer Notes</Label>
              <Textarea value={editing.payer_notes} onChange={e => set("payer_notes", e.target.value)} rows={2} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Code</th>
                <th className="text-left py-3 px-4 font-medium">Description</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Payer Notes</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono font-medium">{d.code}</td>
                  <td className="py-3 px-4">{d.description}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground truncate max-w-xs">{d.payer_notes || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(d)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No diagnoses found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}