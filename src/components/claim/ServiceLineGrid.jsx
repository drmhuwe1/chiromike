import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy, Star } from "lucide-react";

export default function ServiceLineGrid({ lines, onChange, defaultDate }) {
  const [favCodes, setFavCodes] = useState([]);
  const [showFavCodes, setShowFavCodes] = useState(false);

  useEffect(() => {
    base44.entities.ProcedureCode.filter({ is_favorite: true, active: true }, "-updated_date", 50)
      .then(setFavCodes);
  }, []);

  const lastDate = () => lines.length > 0 ? (lines[lines.length - 1].date_of_service || defaultDate) : defaultDate;

  const addLine = () => {
    onChange([...lines, {
      date_of_service: lastDate(),
      code: "", description: "", modifier: "",
      diagnosis_pointers: "1", charge: 0, units: 1, notes: "",
    }]);
  };

  const updateLine = (idx, field, value) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeLine = (idx) => onChange(lines.filter((_, i) => i !== idx));

  const duplicateLine = (idx) => {
    const dup = { ...lines[idx] };
    onChange([...lines, dup]);
  };

  const addFromFavorite = (proc) => {
    onChange([...lines, {
      date_of_service: lastDate(),
      code: proc.code, description: proc.description,
      modifier: proc.default_modifier || "", diagnosis_pointers: "1",
      charge: proc.default_charge || 0, units: proc.default_units || 1,
      notes: "",
    }]);
    setShowFavCodes(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <Label className="text-sm font-medium">Service Lines</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowFavCodes(!showFavCodes)}>
            <Star className="w-3.5 h-3.5 mr-1" /> Fav Codes
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
          </Button>
        </div>
      </div>

      {showFavCodes && (
        <div className="border border-border rounded-lg p-3 mb-3 bg-muted/30 max-h-48 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">Click to add:</p>
          <div className="flex flex-wrap gap-2">
            {favCodes.map(f => (
              <button 
                key={f.id} 
                onClick={() => addFromFavorite(f)}
                className="text-xs bg-background border border-border rounded-md px-2 py-1 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {f.code} - ${f.default_charge?.toFixed(2)}
              </button>
            ))}
            {favCodes.length === 0 && <span className="text-xs text-muted-foreground">No favorites saved yet</span>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="hidden md:grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-muted-foreground px-1">
        <div className="col-span-2">Date</div>
        <div className="col-span-1">Code</div>
        <div className="col-span-3">Description</div>
        <div className="col-span-1">Mod</div>
        <div className="col-span-1">Dx Ptr</div>
        <div className="col-span-1">Charge</div>
        <div className="col-span-1">Units</div>
        <div className="col-span-1">Notes</div>
        <div className="col-span-1"></div>
      </div>

      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-muted/20 rounded-lg p-2 md:p-1">
            <div className="md:col-span-2">
              <Input className="h-8 text-xs" type="date" value={line.date_of_service} onChange={e => updateLine(idx, "date_of_service", e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Input className="h-8 text-xs font-mono" placeholder="Code" value={line.code} onChange={e => updateLine(idx, "code", e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Input className="h-8 text-xs" placeholder="Description" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Input className="h-8 text-xs" placeholder="Mod" value={line.modifier} onChange={e => updateLine(idx, "modifier", e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Input className="h-8 text-xs" placeholder="1,2" value={line.diagnosis_pointers} onChange={e => updateLine(idx, "diagnosis_pointers", e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Input className="h-8 text-xs" type="number" step="0.01" value={line.charge} onChange={e => updateLine(idx, "charge", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="md:col-span-1">
              <Input className="h-8 text-xs" type="number" value={line.units} onChange={e => updateLine(idx, "units", parseInt(e.target.value) || 1)} />
            </div>
            <div className="md:col-span-1">
              <Input className="h-8 text-xs" placeholder="Notes" value={line.notes || ""} onChange={e => updateLine(idx, "notes", e.target.value)} />
            </div>
            <div className="md:col-span-1 flex gap-1 justify-end">
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicateLine(idx)}>
                <Copy className="w-3 h-3" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeLine(idx)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {lines.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No service lines yet. Add a line or use Quick Panel.</p>
      )}

      {lines.length > 0 && (
        <div className="flex justify-end mt-3 pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground mr-3">Total:</span>
          <span className="text-lg font-bold">
            ${lines.reduce((sum, l) => sum + ((l.charge || 0) * (l.units || 1)), 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}