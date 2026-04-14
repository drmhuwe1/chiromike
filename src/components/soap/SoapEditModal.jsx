import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export default function SoapEditModal({ note, onSave, onClose }) {
  const [data, setData] = useState({
    subjective: note.subjective || "",
    objective: note.objective || "",
    assessment: note.assessment || "",
    plan: note.plan || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center sticky top-0 bg-card pb-2 border-b">
          <h2 className="text-lg font-bold">Edit SOAP Note</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">S — Subjective</Label>
            <Textarea
              value={data.subjective}
              onChange={e => setData(prev => ({ ...prev, subjective: e.target.value }))}
              rows={5}
              placeholder="Patient's reported complaints, history, symptom progression..."
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">O — Objective</Label>
            <Textarea
              value={data.objective}
              onChange={e => setData(prev => ({ ...prev, objective: e.target.value }))}
              rows={5}
              placeholder="Physical examination findings, vital signs, ROM, orthopedic tests, neurological screening..."
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">A — Assessment</Label>
            <Textarea
              value={data.assessment}
              onChange={e => setData(prev => ({ ...prev, assessment: e.target.value }))}
              rows={5}
              placeholder="Clinical impression, diagnoses, response to treatment, prognosis..."
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">P — Plan</Label>
            <Textarea
              value={data.plan}
              onChange={e => setData(prev => ({ ...prev, plan: e.target.value }))}
              rows={5}
              placeholder="Treatment rendered, home care instructions, next appointment frequency, expected treatment course..."
              className="text-sm"
            />
          </div>
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