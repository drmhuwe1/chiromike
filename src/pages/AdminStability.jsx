import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, 
  Mail, Copy, ChevronDown, ChevronRight, Clock, Activity
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const STATUS_CONFIG = {
  clear:   { icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50  border-green-200",  label: "ALL CLEAR",          badge: "bg-green-100 text-green-800" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50  border-amber-200",  label: "WARNINGS PRESENT",   badge: "bg-amber-100 text-amber-800" },
  failure: { icon: XCircle,       color: "text-red-600",   bg: "bg-red-50    border-red-200",    label: "FAILURES DETECTED",  badge: "bg-red-100 text-red-800" },
  unknown: { icon: Activity,      color: "text-gray-500",  bg: "bg-gray-50   border-gray-200",   label: "NOT RUN YET",        badge: "bg-gray-100 text-gray-700" },
};

const CHECK_STATUS_ICON = { pass: "✅", warn: "⚠️", fail: "❌" };
const CHECK_BORDER = { pass: "border-green-400", warn: "border-amber-400", fail: "border-red-400" };

function CheckRow({ check }) {
  const [open, setOpen] = useState(check.status !== "pass");
  return (
    <div className={`border-l-4 ${CHECK_BORDER[check.status] || "border-gray-300"} bg-card rounded-r-lg mb-2`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-base">{CHECK_STATUS_ICON[check.status] || "❓"}</span>
        <span className="font-medium text-sm flex-1">[{check.id}] {check.name}</span>
        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
          check.severity === "critical" ? "bg-red-100 text-red-700" :
          check.severity === "high" ? "bg-orange-100 text-orange-700" :
          check.severity === "medium" ? "bg-blue-100 text-blue-700" :
          "bg-gray-100 text-gray-600"
        }`}>{check.severity}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1.5 text-sm">
          <p className="text-muted-foreground">{check.result}</p>
          {check.fix && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-amber-800 text-xs">
              <strong>Fix: </strong>{check.fix}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminStability() {
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const runs = await base44.entities.StabilityRun.list("-created_date", 30);
      setHistory(runs);
      if (runs.length > 0 && !currentResult) {
        const latest = runs[0];
        setCurrentResult({
          overall_status: latest.overall_status,
          total_checks: latest.total_checks,
          passed: latest.passed,
          warned: latest.warned,
          failed: latest.failed,
          checks: latest.checks_json ? JSON.parse(latest.checks_json) : [],
          fix_prompt: latest.fix_prompt,
          run_date: latest.run_date || latest.created_date,
          triggered_by: latest.triggered_by,
        });
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
    setLoadingHistory(false);
  };

  const runNow = async () => {
    setRunning(true);
    setCurrentResult(null);
    try {
      const res = await base44.functions.invoke("stabilityMonitor", { triggered_by: "manual" });
      setCurrentResult(res.data);
      await loadHistory();
    } catch (e) {
      alert("Failed to run stability check: " + (e.message || "Unknown error"));
    }
    setRunning(false);
  };

  const copyFixPrompt = () => {
    const prompt = currentResult?.fix_prompt || selectedRun?.fix_prompt;
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayResult = selectedRun
    ? {
        overall_status: selectedRun.overall_status,
        total_checks: selectedRun.total_checks,
        passed: selectedRun.passed,
        warned: selectedRun.warned,
        failed: selectedRun.failed,
        checks: selectedRun.checks_json ? JSON.parse(selectedRun.checks_json) : [],
        fix_prompt: selectedRun.fix_prompt,
        run_date: selectedRun.run_date || selectedRun.created_date,
        triggered_by: selectedRun.triggered_by,
      }
    : currentResult;

  const statusCfg = STATUS_CONFIG[displayResult?.overall_status || "unknown"];
  const StatusIcon = statusCfg.icon;

  const chartData = [...history].reverse().map(r => ({
    date: new Date(r.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    passed: r.passed || 0,
    warned: r.warned || 0,
    failed: r.failed || 0,
  }));

  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-2">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-lg font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground text-sm">This page is restricted to admin users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">ChiroMike Stability Monitor</h1>
          {displayResult?.run_date && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last run: {new Date(displayResult.run_date).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
              {displayResult.triggered_by && ` · ${displayResult.triggered_by}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={loadingHistory}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingHistory ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={runNow} disabled={running} size="sm">
            {running
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Running...</>
              : <><Activity className="w-3.5 h-3.5 mr-1" />Run Now</>
            }
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <div className={`border-2 rounded-2xl p-6 ${statusCfg.bg}`}>
        <div className="flex items-center gap-4">
          <StatusIcon className={`w-12 h-12 ${statusCfg.color} ${displayResult?.overall_status === "failure" ? "animate-pulse" : ""}`} />
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${statusCfg.color}`}>{statusCfg.label}</h2>
            {displayResult ? (
              <div className="flex gap-4 mt-1 text-sm">
                <span className="text-green-700 font-semibold">✅ {displayResult.passed} passed</span>
                <span className="text-amber-700 font-semibold">⚠️ {displayResult.warned} warned</span>
                <span className="text-red-700 font-semibold">❌ {displayResult.failed} failed</span>
                <span className="text-gray-500">/ {displayResult.total_checks} total</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {running ? "Running checks..." : "Click 'Run Now' to run a manual check."}
              </p>
            )}
          </div>
        </div>

        {/* Fix Prompt CTA */}
        {displayResult?.fix_prompt && (
          <div className="mt-4 pt-4 border-t border-red-300">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-800 font-medium">Auto-fix prompt available — paste into Base44 to repair issues.</p>
              <Button
                size="sm"
                onClick={copyFixPrompt}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                {copied ? "Copied!" : "Copy Fix Prompt"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Check Results */}
      {displayResult?.checks?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Check Results</h3>
          {displayResult.checks.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      )}

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Pass Rate — Last {chartData.length} Runs</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="passed" stroke="#22c55e" strokeWidth={2} dot={false} name="Passed" />
              <Line type="monotone" dataKey="warned" stroke="#f59e0b" strokeWidth={2} dot={false} name="Warned" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Run History */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-3">Run History</h3>
        {loadingHistory ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No runs yet. Click "Run Now" to start.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left pr-4">Triggered By</th>
                  <th className="text-center pr-4">Pass</th>
                  <th className="text-center pr-4">Warn</th>
                  <th className="text-center pr-4">Fail</th>
                  <th className="text-left pr-4">Status</th>
                  <th className="text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {history.map(run => {
                  const cfg = STATUS_CONFIG[run.overall_status] || STATUS_CONFIG.unknown;
                  const isSelected = selectedRun?.id === run.id;
                  return (
                    <tr
                      key={run.id}
                      onClick={() => setSelectedRun(isSelected ? null : run)}
                      className={`border-b border-border cursor-pointer transition-colors hover:bg-muted/40 ${isSelected ? "bg-muted/60" : ""}`}
                    >
                      <td className="py-2 pr-4 font-mono text-xs">
                        {new Date(run.created_date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="pr-4 text-muted-foreground">{run.triggered_by || "scheduled"}</td>
                      <td className="text-center pr-4 text-green-700 font-semibold">{run.passed ?? "-"}</td>
                      <td className="text-center pr-4 text-amber-700 font-semibold">{run.warned ?? "-"}</td>
                      <td className="text-center pr-4 text-red-700 font-semibold">{run.failed ?? "-"}</td>
                      <td className="pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.badge}`}>
                          {run.overall_status || "unknown"}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{run.email_sent ? <Mail className="w-3.5 h-3.5 text-green-600" /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Scheduled to run daily at 7:00 AM ET · Reports sent to drmhuwe@gmail.com
      </div>
    </div>
  );
}