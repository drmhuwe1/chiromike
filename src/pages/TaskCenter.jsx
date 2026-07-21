import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { claimBalance } from "@/utils/claimBalance";

const todayText = () => format(new Date(), "yyyy-MM-dd");
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

function buildTasks(claims, payments) {
  const denialByClaim = new Map();
  payments.forEach((payment) => {
    if (payment.claim_id && (payment.payment_type === "Denial" || payment.denial_code)) {
      denialByClaim.set(payment.claim_id, payment);
    }
  });

  const now = new Date();
  const tasks = [];

  claims.forEach((claim) => {
    if (["Paid", "Draft", "Saved", "Printed"].includes(claim.status) || claim.follow_up_status === "Resolved" || claimBalance(claim) <= 0) return;

    const serviceAge = claim.date_of_service ? differenceInCalendarDays(now, parseISO(claim.date_of_service)) : 0;
    const followUpDue = claim.next_follow_up_date
      ? differenceInCalendarDays(now, parseISO(claim.next_follow_up_date)) >= 0
      : serviceAge >= 30;
    const denial = denialByClaim.get(claim.id);

    if (claim.status === "Denied" || denial) {
      const responseAge = claim.denial_response_date
        ? differenceInCalendarDays(now, parseISO(claim.denial_response_date))
        : null;
      const awaitingResponse = claim.denial_response_status === "Submitted" && responseAge >= 30;
      const needsResponse = !["Submitted", "Response Received", "Resolved"].includes(claim.denial_response_status);

      if (needsResponse || awaitingResponse || followUpDue) {
        tasks.push({
          id: `denial-${claim.id}`,
          claim,
          type: awaitingResponse ? "Appeal Awaiting Response" : "Denial Requires Action",
          priority: "high",
          age: responseAge ?? serviceAge,
          detail: denial?.denial_code
            ? `${denial.denial_code}: ${denial.denial_reason || "Review denial and prepare response"}`
            : "Review denial and prepare or follow up on the response.",
        });
      }
      return;
    }

    if (claim.status === "Submitted" && followUpDue) {
      tasks.push({
        id: `unpaid-${claim.id}`,
        claim,
        type: "Unpaid Claim Follow-Up",
        priority: serviceAge >= 60 ? "high" : "medium",
        age: serviceAge,
        detail: claim.next_follow_up_date
          ? `Scheduled follow-up was due ${format(parseISO(claim.next_follow_up_date), "MMM d, yyyy")}.`
          : "No payment recorded within 30 days of service.",
      });
    }

    if (claim.authorization_expiration_date) {
      const daysUntilExpiration = differenceInCalendarDays(parseISO(claim.authorization_expiration_date), now);
      if (daysUntilExpiration >= 0 && daysUntilExpiration <= 14) {
        tasks.push({
          id: `auth-${claim.id}`,
          claim,
          type: "Authorization Expiring",
          priority: daysUntilExpiration <= 7 ? "high" : "medium",
          age: serviceAge,
          detail: `Authorization expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}.`,
        });
      }
    }
  });

  return tasks.sort((a, b) => (a.priority === b.priority ? b.age - a.age : a.priority === "high" ? -1 : 1));
}

export default function TaskCenter() {
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [notes, setNotes] = useState({});
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [claimRows, paymentRows] = await Promise.all([
        base44.entities.Claim.list("-date_of_service", 2000),
        base44.entities.Payment.list("-payment_date", 5000),
      ]);
      setClaims(claimRows);
      setPayments(paymentRows);
    } catch (error) {
      toast({ title: error.message || "Unable to load billing tasks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tasks = useMemo(() => buildTasks(claims, payments), [claims, payments]);
  const visibleTasks = filter === "all" ? tasks : tasks.filter((task) => task.priority === filter);
  const counts = {
    high: tasks.filter((task) => task.priority === "high").length,
    unpaid: tasks.filter((task) => task.type === "Unpaid Claim Follow-Up").length,
    denials: tasks.filter((task) => task.type.includes("Denial") || task.type.includes("Appeal")).length,
  };

  const updateClaim = async (claim, patch, successMessage) => {
    setSavingId(claim.id);
    try {
      await base44.entities.Claim.update(claim.id, patch);
      toast({ title: successMessage });
      await load();
    } catch (error) {
      toast({ title: error.message || "Unable to update task", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const markContacted = (task) => updateClaim(task.claim, {
    last_follow_up_date: todayText(),
    next_follow_up_date: format(addDays(new Date(), 14), "yyyy-MM-dd"),
    follow_up_status: "Waiting for Payer",
    follow_up_notes: notes[task.id] || task.claim.follow_up_notes || "",
  }, "Follow-up recorded; reminder moved forward 14 days.");

  const snooze = (task) => updateClaim(task.claim, {
    next_follow_up_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
  }, "Reminder moved forward 7 days.");

  const resolve = (task) => updateClaim(task.claim, {
    follow_up_status: "Resolved",
    last_follow_up_date: todayText(),
    follow_up_notes: notes[task.id] || task.claim.follow_up_notes || "",
  }, "Follow-up task resolved.");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BellRing className="w-5 h-5" />Task Center</h1>
          <p className="text-sm text-muted-foreground">Smart reminders for unpaid claims, denials, appeals, and expiring authorizations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Open Tasks" value={tasks.length} icon={BellRing} tone="text-primary" />
        <SummaryCard label="High Priority" value={counts.high} icon={AlertTriangle} tone="text-red-600" />
        <SummaryCard label="Unpaid Claims" value={counts.unpaid} icon={Clock3} tone="text-orange-600" />
        <SummaryCard label="Denials / Appeals" value={counts.denials} icon={RefreshCw} tone="text-purple-600" />
      </div>

      <div className="flex gap-2">
        {[['all', 'All'], ['high', 'High Priority'], ['medium', 'Medium']].map(([key, label]) => (
          <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>{label}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : visibleTasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" /><p className="font-semibold">No follow-up tasks are due.</p><p className="text-sm text-muted-foreground">ChiroMike will flag new items automatically as deadlines arrive.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => (
            <Card key={task.id} className={task.priority === "high" ? "border-red-200" : "border-orange-200"}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>{task.priority === "high" ? "High" : "Medium"}</Badge>
                      <span className="font-semibold">{task.type}</span>
                    </div>
                    <p className="text-sm font-medium">{task.claim.patient_name || "Unknown patient"} · DOS {task.claim.date_of_service || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{task.claim.insurance_company || "Payer not listed"} · Balance {money(claimBalance(task.claim))} · {task.age} days</p>
                    <p className="text-sm mt-2">{task.detail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => markContacted(task)} disabled={savingId === task.claim.id}>Mark Contacted</Button>
                    <Button size="sm" variant="outline" onClick={() => snooze(task)} disabled={savingId === task.claim.id}>Remind in 7 Days</Button>
                    <Button size="sm" variant="ghost" onClick={() => resolve(task)} disabled={savingId === task.claim.id}>Resolve</Button>
                  </div>
                </div>
                <Input
                  value={notes[task.id] ?? task.claim.follow_up_notes ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))}
                  placeholder="Optional follow-up notes"
                  aria-label={`Follow-up notes for ${task.claim.patient_name || "claim"}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Icon className={`w-4 h-4 ${tone}`} />{label}</CardTitle></CardHeader>
      <CardContent className="p-4 pt-1"><p className={`text-2xl font-bold ${tone}`}>{value}</p></CardContent>
    </Card>
  );
}
