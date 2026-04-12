import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Copy, ChevronRight } from "lucide-react";
import PatientForm from "../components/patients/PatientForm";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const navigate = useNavigate();

  const loadPatients = async () => {
    setLoading(true);
    const data = await base44.entities.Patient.list("-updated_date", 200);
    setPatients(data);
    setLoading(false);
  };

  useEffect(() => { loadPatients(); }, []);

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.insurance_id?.includes(q)
    );
  });

  const handleSave = async (data) => {
    if (editPatient) {
      await base44.entities.Patient.update(editPatient.id, data);
    } else {
      await base44.entities.Patient.create(data);
    }
    setShowForm(false);
    setEditPatient(null);
    loadPatients();
  };

  const handleDuplicate = async (patient) => {
    const { id, created_date, updated_date, created_by, ...rest } = patient;
    rest.first_name = rest.first_name + " (Copy)";
    await base44.entities.Patient.create(rest);
    loadPatients();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <Button onClick={() => { setEditPatient(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Patient
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search patients by name, phone, or insurance ID..." 
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <PatientForm
          patient={editPatient}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditPatient(null); }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">DOB</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Phone</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Insurance</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium">{p.first_name} {p.last_name}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{p.dob || "—"}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{p.phone || "—"}</td>
                  <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{p.insurance_company || "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" size="sm"
                        onClick={() => navigate(`/claim-builder?patient=${p.id}`)}
                        title="New Claim"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" size="sm"
                        onClick={() => handleDuplicate(p)}
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" size="sm"
                        onClick={() => { setEditPatient(p); setShowForm(true); }}
                        title="Edit"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    {search ? "No patients match your search" : "No patients yet. Add your first patient."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}