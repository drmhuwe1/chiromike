import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NotePolishModal({ rawNotes, onClose, onPolished }) {
  const [context, setContext] = useState("general");
  const [loading, setLoading] = useState(false);
  const [polished, setPolished] = useState(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handlePolish = async () => {
    if (!rawNotes?.trim()) {
      toast({ title: "Enter notes to polish", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("polishDictatedNotes", {
        raw_notes: rawNotes,
        context_type: context,
      });
      setPolished(res.data.polished_notes);
    } catch (e) {
      toast({ title: e.message || "Failed to polish notes", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(polished);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleUse = () => {
    if (onPolished) onPolished(polished);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Polish Dictated Notes with AI</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {!polished ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Note Type / Context</Label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Clinical Notes</SelectItem>
                  <SelectItem value="functional_limitations">Functional Limitations</SelectItem>
                  <SelectItem value="additional_notes">Test Results & Observations</SelectItem>
                  <SelectItem value="clinical_impression">Clinical Impression</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Raw Notes (dictated or typed)</Label>
              <Textarea
                className="mt-1 text-sm font-mono"
                rows={8}
                placeholder="Paste your raw dictation or notes here..."
                defaultValue={rawNotes}
                onChange={_e => {
                  // Update parent if needed
                }}
              />
            </div>

            <Button onClick={handlePolish} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Polishing (10-20 sec)...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Polish & Restructure</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 font-medium">✓ Polished Notes Ready</p>
            </div>

            <div>
              <Label className="text-sm">Polished Output</Label>
              <Textarea
                className="mt-1 text-sm"
                rows={10}
                value={polished}
                readOnly
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy to Clipboard</>
                )}
              </Button>
              {onPolished && (
                <Button onClick={handleUse} className="flex-1">
                  Use Polished Notes
                </Button>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setPolished(null)}>
              Polish Different Notes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}