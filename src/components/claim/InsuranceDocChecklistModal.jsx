import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, AlertTriangle } from "lucide-react";

const CHECKLIST = [
  { id: "rom", label: "Range of Motion (ROM) measurements recorded" },
  { id: "pain", label: "Pain scale (0–10) documented" },
  { id: "functional", label: "Functional limitations / outcomes noted" },
  { id: "necessity", label: "Medical necessity clearly stated in notes" },
  { id: "response", label: "Patient's response to treatment documented" },
];

export default function InsuranceDocChecklistModal({ onConfirm, onCancel }) {
  const [checked, setChecked] = useState({});

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const allChecked = CHECKLIST.every(item => checked[item.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Insurance Documentation Checklist</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Commercial payers audit frequently. Confirm all items are documented before saving.</p>
          </div>
        </div>

        <div className="space-y-3">
          {CHECKLIST.map(item => (
            <label key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked[item.id] ? 'border-green-400 bg-green-50' : 'border-border hover:bg-muted/50'}`}>
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={() => toggle(item.id)}
                className="w-4 h-4 accent-green-600"
              />
              <span className={`text-sm font-medium ${checked[item.id] ? 'text-green-800' : 'text-foreground'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>

        {!allChecked && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Check all items to confirm documentation is complete.
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Go Back</Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={!allChecked}
            onClick={onConfirm}
          >
            Save Claim
          </Button>
        </div>
      </div>
    </div>
  );
}