import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Copy } from "lucide-react";

const statusColors = {
  Draft: "bg-gray-100 text-gray-600",
  Saved: "bg-blue-100 text-blue-700",
  Printed: "bg-green-100 text-green-700",
  Submitted: "bg-purple-100 text-purple-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Denied: "bg-red-100 text-red-700",
};

function daysSince(dos) {
  if (!dos) return null;
  return Math.floor((new Date() - new Date(dos)) / 86400000);
}

export default function OutstandingClaims({ claims }) {
  const navigate = useNavigate();
  const outstanding = claims
    .filter(c => !["Paid"].includes(c.status) && (c.total_charge || 0) - (c.amount_paid || 0) > 0)
    .sort((a, b) => new Date(a.date_of_service) - new Date(b.date_of_service));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left py-2.5 px-4 font-medium">Date of Service</th>
            <th className="text-left py-2.5 px-4 font-medium">Patient</th>
            <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Insurance</th>
            <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Status</th>
            <th className="text-right py-2.5 px-4 font-medium">Billed</th>
            <th className="text-right py-2.5 px-4 font-medium">Balance</th>
            <th className="text-right py-2.5 px-4 font-medium">Age</th>
            <th className="py-2.5 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {outstanding.map(c => {
            const balance = (c.total_charge || 0) - (c.amount_paid || 0);
            const age = daysSince(c.date_of_service);
            return (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="py-2.5 px-4">{c.date_of_service}</td>
                <td className="py-2.5 px-4 font-medium">{c.patient_name}</td>
                <td className="py-2.5 px-4 hidden md:table-cell text-muted-foreground">{c.insurance_company || "—"}</td>
                <td className="py-2.5 px-4 hidden md:table-cell">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ""}`}>{c.status}</span>
                </td>
                <td className="py-2.5 px-4 text-right">${(c.total_charge || 0).toFixed(2)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-red-600">${balance.toFixed(2)}</td>
                <td className={`py-2.5 px-4 text-right text-xs font-medium ${age > 90 ? "text-red-600" : age > 60 ? "text-orange-500" : age > 30 ? "text-yellow-600" : "text-muted-foreground"}`}>
                  {age}d
                </td>
                <td className="py-2.5 px-4">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/claim-builder?duplicate=${c.id}`)} title="Resubmit">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            );
          })}
          {outstanding.length === 0 && (
            <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No outstanding claims!</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}