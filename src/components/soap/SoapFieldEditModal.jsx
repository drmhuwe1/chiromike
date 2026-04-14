import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const FIELD_LABELS = {
  subjective: "S — Subjective",
  objective: "O — Objective",
  assessment: "A — Assessment",
  plan: "P — Plan",
};

const FIELD_PLACEHOLDERS = {
  subjective: "Patient's reported complaints, history, symptom progression...",
  objective: "Physical examination findings, vital signs, ROM, orthopedic tests, neurological screening...",
  assessment: "Clinical impression, diagnoses, response to treatment, prognosis...",
  plan: "Treatment rendered, home care instructions, next appointment frequency, expected treatment course...",
};

export default function SoapFieldEditModal({ note, field, onSave, onClose }) {
  const [text, setText] = useState(note[field] || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(field, text);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center sticky top-0 bg-card pb-2 border-b">
          <h2 className="text-lg font-bold">{FIELD_LABELS[field]}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Edit {FIELD_LABELS[field]}</Label>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            placeholder={FIELD_PLACEHOLDERS[field]}
            className="text-sm"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}