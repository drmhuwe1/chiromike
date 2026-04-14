import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown } from "lucide-react";

const emptyProc = { code: "", description: "", charge: 0, units: 1, modifier: "", diagnosis_pointers: "1" };

function CodePicker({ value, onSelect }) {
  const [codes, setCodes] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.ProcedureCode.list("-code", 500).then(data => {
      setCodes(data.filter(c => c.active !== false));
    });
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.length > 0
    ? codes.filter(c =>
        c.code?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 20)
    : codes.slice(0, 20);

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center">
        <Input
          className="h-8 text-sm pr-6"
          value={search}
          placeholder="Search..."
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-muted-foreground pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No codes found</p>
          ) : filtered.map(c => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex gap-2"
              onMouseDown={() => {
                onSelect(c);
                setSearch(c.code);
                setOpen(false);
              }}
            >
              <span className="font-mono font-semibold text-primary w-16 shrink-0">{c.code}</span>
              <span className="text-muted-foreground truncate">{c.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TemplateProcedureEditor({ procedures, onChange }) {
  const addLine = () => onChange([...procedures, { ...emptyProc }]);

  const updateLine = (idx, field, value) => {
    const updated = [...procedures];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const selectCode = (idx, codeObj) => {
    const updated = [...procedures];
    updated[idx] = {
      ...updated[idx],
      code: codeObj.code,
      description: codeObj.description || "",
      charge: codeObj.default_charge || updated[idx].charge,
      units: codeObj.default_units || updated[idx].units,
      modifier: codeObj.default_modifier || updated[idx].modifier,
    };
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
        <p className="text-sm text-muted-foreground py-3">Click <strong>+ Add Line</strong> to add a procedure with Code, Description, Charge, Units, and Modifier.</p>
      )}
      <div className="space-y-2">
        {procedures.map((proc, idx) => (
          <div key={idx} className="flex gap-2 items-end flex-wrap bg-muted/30 rounded-lg p-2">
            <div className="w-36">
              <Label className="text-xs">Code</Label>
              <CodePicker
                value={proc.code}
                onSelect={(c) => selectCode(idx, c)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs">Description</Label>
              <Input className="h-8 text-sm" value={proc.description} onChange={e => updateLine(idx, "description", e.target.value)} />
            </div>
            <div className="w-24">
              <Label className="text-xs">Charge ($)</Label>
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