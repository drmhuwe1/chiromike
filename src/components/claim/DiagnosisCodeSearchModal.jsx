import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";

export default function DiagnosisCodeSearchModal({ onSelect, onClose }) {
  const [codes, setCodes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.DiagnosisCode.filter({ active: true }, "-updated_date", 500).then(data => {
      setCodes(data);
      setLoading(false);
    });
  }, []);

  const filtered = codes.filter(c =>
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Select Diagnosis Code</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search code or description..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-3 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filtered.map(code => (
              <button
                key={code.id}
                onClick={() => onSelect(code)}
                className="w-full text-left px-4 py-3 rounded hover:bg-muted transition-colors border border-transparent hover:border-border"
              >
                <div className="font-mono font-semibold text-sm">{code.code}</div>
                <div className="text-sm text-muted-foreground">{code.description}</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">No codes found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}