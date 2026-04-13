import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Printer, Copy, Trash2, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const statusColors = {
  Draft: "bg-gray-100 text-gray-700",
  Saved: "bg-blue-100 text-blue-700",
  Printed: "bg-green-100 text-green-700",
  Submitted: "bg-purple-100 text-purple-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Denied: "bg-red-100 text-red-700",
};

export default function SavedClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [emailing, setEmailing] = useState(null);
  const [hcfaFlags, setHcfaFlags] = useState({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Claim.list("-created_date", 500);
    setClaims(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = claims.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.patient_name?.toLowerCase().includes(q) || c.date_of_service?.includes(q);
    const matchType = typeFilter === "All" || c.visit_type === typeFilter;
    return matchSearch && matchType;
  });

  const handleDuplicate = (claim) => {
    navigate(`/claim-builder?duplicate=${claim.id}`);
  };

  const handlePrint = (claim) => {
    const isCash = claim.visit_type?.includes("Cash");
    navigate(isCash ? `/print-receipt?id=${claim.id}` : `/print-claim?id=${claim.id}`);
  };

  const handleEmailSuperbill = async (claim) => {
    setEmailing(claim.id);
    try {
      const res = await base44.functions.invoke('emailSuperbill', { claim_id: claim.id, include_hcfa: !!hcfaFlags[claim.id] });
      toast({ title: `Superbill emailed to ${res.data.sent_to}` });
      load();
    } catch (e) {
      toast({ title: e.message || 'Failed to send email', variant: 'destructive' });
    }
    setEmailing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this claim?")) return;
    await base44.entities.Claim.delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Saved Claims</h1>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by patient or date..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            {["Insurance", "Auto", "Cash", "Cash Office Visit", "Cash Package"].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Patient</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Type</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Payer</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">Total</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4">{c.date_of_service}</td>
                  <td className="py-3 px-4 font-medium">{c.patient_name}</td>
                  <td className="py-3 px-4 hidden md:table-cell">{c.visit_type}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{c.payer_type}</td>
                  <td className="py-3 px-4 text-right hidden md:table-cell">${(c.total_charge || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(c)} title="Print">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        <input type="checkbox" title="Also attach CMS-1500" checked={!!hcfaFlags[c.id]} onChange={e => setHcfaFlags(f => ({ ...f, [c.id]: e.target.checked }))} className="w-3.5 h-3.5 accent-blue-600" />
                        <Button variant="ghost" size="sm" onClick={() => handleEmailSuperbill(c)} title={hcfaFlags[c.id] ? 'Email Superbill + CMS-1500' : 'Email Superbill to Patient'} disabled={emailing === c.id}>
                          {emailing === c.id ? <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDuplicate(c)} title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {search || typeFilter !== "All" ? "No claims match your filters" : "No saved claims yet"}
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