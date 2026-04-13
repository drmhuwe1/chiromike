import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PatientAccountView from "@/components/patients/PatientAccountView";

export default function PatientAccount() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Patient.list("-updated_date", 300).then(data => {
      setPatients(data);
      setLoading(false);
    });
  }, []);

  const filteredPatients = search.length >= 3
    ? patients.filter(p => {
        const q = search.toLowerCase();
        return p.first_name?.toLowerCase().startsWith(q) || p.last_name?.toLowerCase().startsWith(q);
      }).slice(0, 12)
    : [];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {!selectedPatient ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Patient Account</h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <Label className="text-sm mb-2 block">Select Patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Type 3+ letters of first or last name..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {search.length >= 3 ? (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {filteredPatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm"
                  >
                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.phone}</span>
                  </button>
                ))}
                {filteredPatients.length === 0 && <p className="text-xs text-muted-foreground p-2">No patients found</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Type at least 3 letters to search</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Search
          </Button>
          <PatientAccountView patient={selectedPatient} />
        </div>
      )}
    </div>
  );
}