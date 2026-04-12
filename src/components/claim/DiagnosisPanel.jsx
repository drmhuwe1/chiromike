import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Star } from "lucide-react";

export default function DiagnosisPanel({ diagnoses, onChange }) {
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    base44.entities.DiagnosisCode.filter({ is_favorite: true, active: true }, "-updated_date", 50)
      .then(setFavorites);
  }, []);

  const addDiagnosis = () => {
    onChange([...diagnoses, { code: "", description: "", pointer: String(diagnoses.length + 1) }]);
  };

  const updateDx = (idx, field, value) => {
    const updated = [...diagnoses];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeDx = (idx) => {
    const updated = diagnoses.filter((_, i) => i !== idx);
    // Re-assign pointers
    onChange(updated.map((d, i) => ({ ...d, pointer: String(i + 1) })));
  };

  const addFromFavorite = (fav) => {
    onChange([...diagnoses, { code: fav.code, description: fav.description, pointer: String(diagnoses.length + 1) }]);
    setShowFavorites(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <Label className="text-sm font-medium">Diagnoses (ICD-10)</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowFavorites(!showFavorites)}>
            <Star className="w-3.5 h-3.5 mr-1" /> Favorites
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addDiagnosis}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {showFavorites && (
        <div className="border border-border rounded-lg p-3 mb-3 bg-muted/30 max-h-48 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">Click to add:</p>
          <div className="flex flex-wrap gap-2">
            {favorites.map(f => (
              <button 
                key={f.id} 
                onClick={() => addFromFavorite(f)}
                className="text-xs bg-background border border-border rounded-md px-2 py-1 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {f.code} - {f.description}
              </button>
            ))}
            {favorites.length === 0 && <span className="text-xs text-muted-foreground">No favorites saved yet</span>}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {diagnoses.map((dx, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <span className="text-xs font-mono w-6 text-muted-foreground">{idx + 1}.</span>
            <Input className="h-8 text-sm w-28" placeholder="Code" value={dx.code} onChange={e => updateDx(idx, "code", e.target.value)} />
            <Input className="h-8 text-sm flex-1" placeholder="Description" value={dx.description} onChange={e => updateDx(idx, "description", e.target.value)} />
            <Button type="button" variant="ghost" size="sm" onClick={() => removeDx(idx)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        {diagnoses.length === 0 && <p className="text-sm text-muted-foreground py-2">No diagnoses added</p>}
      </div>
    </div>
  );
}