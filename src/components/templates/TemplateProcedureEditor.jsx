import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

const emptyProc = { code: "", description: "", charge: 0, units: 1, modifier: "", diagnosis_pointers: "1" };

export default function TemplateProcedureEditor({ procedures, onChange }) {
  const addLine = () => onChange([...procedures, { ...emptyProc }]);
  
  const updateLine = (idx, field, value) => {
    const updated = [...procedures];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeLine = (idx) => onChange(procedures.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Included Procedures</Label>
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="w-3 h-3 mr-1" /> Add Line
        </Button>
      </div>
      {procedures.length === 0 && (
        <p className="text-sm text-muted-foreground py-3">No procedures added yet.</p>
      )}
      <div className="space-y-2">
        {procedures.map((proc, idx) => (
          <div key={idx} className="flex gap-2 items-end flex-wrap bg-muted/30 rounded-lg p-2">
            <div className="w-24">
              <Label className="text-xs">Code</Label>
              <Input className="h-8 text-sm" value={proc.code} onChange={e => updateLine(idx, "code", e.target.value)} />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs">Description</Label>
              <Input className="h-8 text-sm" value={proc.description} onChange={e => updateLine(idx, "description", e.target.value)} />
            </div>
            <div className="w-24">
              <Label className="text-xs">Charge</Label>
              <Input className="h-8 text-sm" type="number" step="0.01" value={proc.charge} onChange={e => updateLine(idx, "charge", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="w-16">
              <Label className="text-xs">Units</Label>
              <Input className="h-8 text-sm" type="number" value={proc.units} onChange={e => updateLine(idx, "units", parseInt(e.target.value) || 1)} />
            </div>
            <div className="w-20">
              <Label className="text-xs">Modifier</Label>
              <Input className="h-8 text-sm" value={proc.modifier} onChange={e => updateLine(idx, "modifier", e.target.value)} />
            </div>
            <div className="w-16">
              <Label className="text-xs">Dx Ptr</Label>
              <Input className="h-8 text-sm" value={proc.diagnosis_pointers} onChange={e => updateLine(idx, "diagnosis_pointers", e.target.value)} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)} className="h-8">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}