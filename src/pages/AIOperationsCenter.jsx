import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, BrainCircuit, FileWarning, Send, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { claimBalance } from "@/utils/claimBalance";

export default function AIOperationsCenter() {
  const [data, setData] = useState({ claims: [], appeals: [], reports: [], rates: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Claim.list("-date_of_service", 2000),
      base44.entities.DenialAppeal.list("-created_date", 1000),
      base44.entities.OfficeAllyReport.list("-retrieved_at", 100),
      base44.entities.PayerReimbursementRate.list("-updated_date", 2000),
    ]).then(([claims, appeals, reports, rates]) => setData({ claims, appeals, reports, rates })).finally(() => setLoading(false));
  }, []);

  const unpaid = data.claims.filter(claim => claim.status === "Submitted" && claimBalance(claim) > 0).length;
  const denials = data.claims.filter(claim => claim.status === "Denied" && claimBalance(claim) > 0).length;
  const openAppeals = data.appeals.filter(appeal => !["Approved", "Closed"].includes(appeal.status)).length;
  const unposted835 = data.reports.filter(report => report.report_type === "835" && !report.posting_confirmed).length;
  const learnedRates = data.rates.filter(rate => rate.rate_method === "835 Learned").length;

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return <div className="space-y-5"><div><h1 className="text-xl font-bold flex items-center gap-2"><BrainCircuit className="w-5 h-5" />AI Operations Center</h1><p className="text-sm text-muted-foreground">One place to see what needs attention across billing and revenue recovery.</p></div><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"><ActionCard to="/task-center" icon={BellRing} title="Follow-Up Tasks" value={unpaid} detail="Submitted claims awaiting payment" tone="text-orange-600" /><ActionCard to="/billing" icon={FileWarning} title="Denied Claims" value={denials} detail="Use Why Wasn't I Paid? to analyze" tone="text-red-600" /><ActionCard to="/revenue-recovery" icon={TrendingUp} title="Open Appeals" value={openAppeals} detail="Drafted, submitted, or awaiting response" tone="text-purple-600" /><ActionCard to="/office-ally" icon={Send} title="835 Files to Review" value={unposted835} detail="Preview and post matched remittances" tone="text-blue-600" /><ActionCard to="/revenue-recovery" icon={BrainCircuit} title="Rates Learned Automatically" value={learnedRates} detail="Payer/CPT averages learned from 835s" tone="text-emerald-600" /><ActionCard to="/code-library" icon={AlertTriangle} title="Payer Knowledge" value="Open" detail="Review policies, appeal delivery, and coverage" tone="text-amber-600" /></div></div>;
}

function ActionCard({ to, icon: Icon, title, value, detail, tone }) {
  return <Link to={to}><Card className="h-full hover:border-primary/50 hover:shadow-sm transition-all"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground mt-1">{detail}</p></div><Icon className={`w-5 h-5 ${tone}`} /></div><p className={`text-3xl font-bold mt-4 ${tone}`}>{value}</p></CardContent></Card></Link>;
}
