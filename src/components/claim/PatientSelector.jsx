import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, User } from "lucide-react";

export default function PatientSelector({ selected, onSelect }) {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.Patient.list("-updated_date", 200);
      setPatients(data);
    };
    load();
  }, []);

  const filtered = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.first_name?.toLowerCase().includes(q) || 
           p.last_name?.toLowerCase().includes(q) ||
           p.phone?.includes(q);
  }).slice(0, 10);

  const handleSelect = (patient) => {
    onSelect(patient);
    setSearch("");
    setShowDropdown(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 relative">
      <Label>Patient</Label>
      {selected ? (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{selected}</span>
          <button 
            className="text-xs text-primary ml-auto hover:underline"
            onClick={() => { onSelect({ id: "", first_name: "", last_name: "" }); }}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search patients..." 
            className="pl-10"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filtered.map(p => (
                <button
                  key={p.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between"
                  onClick={() => handleSelect(p)}
                >
                  <span className="font-medium">{p.first_name} {p.last_name}</span>
                  <span className="text-muted-foreground text-xs">{p.phone || ""}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">No patients found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}