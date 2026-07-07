import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Copy, Wrench, CheckCircle2, XCircle, AlertTriangle, GitCompare } from "lucide-react";

const BASELINE_KEY = "chiromike_crawl_baseline";
const REGRESSION_KEY = "chiromike_regression_results";

function generateRegressionFixPrompt(regressions) {
  if (!regressions || regressions.length === 0) return null;
  const lines = [
    "# ChiroMike — Regression Suite Fix Prompt",
    `Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
    "",
    "Regressions detected vs. baseline. Fix each issue. Do NOT change other code.",
    "",
    "REGRESSIONS TO FIX:",
    "━━━━━━━━━━━━━━━━━━━",
  ];
  regressions.forEach((r, i) => {
    lines.push(`\nREGRESSION ${i + 1}: Route ${r.path}`);
    if (r.newBroken) lines.push(`  - NEW BROKEN ROUTE: This route was working at baseline but now shows not-found`);
    r.newErrors.forEach(e => lines.push(`  - NEW CONSOLE ERROR: ${e}`));
    r.newFailedCalls.forEach(n => lines.push(`  - NEW FAILED NETWORK CALL: ${n}`));
    lines.push(`  Fix required: Restore route ${r.path} to its baseline state`);
  });
  lines.push("\nAfter making all fixes:\n1. Save all changes\n2. Re-run Regression Suite from /admin/stability\n3. Verify PASS result");
  return lines.join("\n");
}

function diffResults(baseline, current) {
  const baseMap = Object.fromEntries(baseline.map(r => [r.path, r]));
  const regressions = [];

  for (const cur of current) {
    const base = baseMap[cur.path];
    if (!base) continue; // new route, not a regression

    const baseErrors = new Set(base.errors || []);
    const baseCalls = new Set(base.failedNetworkCalls || []);

    const newErrors = (cur.errors || []).filter(e => !baseErrors.has(e));
    const newFailedCalls = (cur.failedNetworkCalls || []).filter(n => !baseCalls.has(n));
    const newBroken = cur.broken && !base.broken;

    if (newErrors.length > 0 || newFailedCalls.length > 0 || newBroken) {
      regressions.push({ path: cur.path, newErrors, newFailedCalls, newBroken });
    }
  }

  // Also flag newly broken routes not in baseline at all
  const curPaths = new Set(current.map(r => r.path));
  for (const base of baseline) {
    if (!curPaths.has(base.path) && !base.broken) {
      regressions.push({ path: base.path, newErrors: [], newFailedCalls: [], newBroken: true });
    }
  }

  return regressions;
}

export default function RegressionSuite({ baseline, onSaveBaseline, lastCrawlResults }) {
  const [regressionResult, setRegressionResult] = useState(() => {
    try { return JSON.parse(localStorage.getItem(REGRESSION_KEY)); } catch { return null; }
  });
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const runRegression = async () => {
    if (!baseline) {
      alert("No baseline saved. Run the Automated Crawl first, then click 'Save as Baseline'.");
      return;
    }
    if (!lastCrawlResults) {
      alert("No crawl results available. Run the Automated Crawl first, then run the regression.");
      return;
    }

    setRunning(true);
    await new Promise(r => setTimeout(r, 200)); // let UI update

    const regressions = diffResults(baseline, lastCrawlResults);
    const passed = regressions.length === 0;
    const result = {
      passed,
      regressions,
      run_at: new Date().toISOString(),
      baseline_saved_at: baseline._saved_at || "unknown",
      routes_compared: lastCrawlResults.length,
    };

    localStorage.setItem(REGRESSION_KEY, JSON.stringify(result));
    setRegressionResult(result);
    setRunning(false);
  };

  const fixPrompt = regressionResult && !regressionResult.passed
    ? generateRegressionFixPrompt(regressionResult.regressions)
    : null;

  const copyGlobalFix = () => {
    if (!fixPrompt) return;
    navigator.clipboard.writeText(fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRegressionFix = (idx, reg) => {
    const p = generateRegressionFixPrompt([reg]);
    if (!p) return;
    navigator.clipboard.writeText(p);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={runRegression} disabled={running || !baseline || !lastCrawlResults} className="gap-1.5">
          {running
            ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running...</>
            : <><Play className="w-3.5 h-3.5" /> Run Regression Suite</>}
        </Button>
        {lastCrawlResults && (
          <Button variant="outline" size="sm" onClick={() => onSaveBaseline(lastCrawlResults)} className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50">
            Save as Baseline
          </Button>
        )}
        {fixPrompt && (
          <Button size="sm" onClick={copyGlobalFix} className="gap-1.5 bg-red-600 hover:bg-red-700 text-white">
            <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy Fix Prompt"}
          </Button>
        )}
      </div>

      {/* Baseline info */}
      <div className="flex flex-wrap gap-3">
        <div className={`rounded-xl border px-4 py-3 text-sm flex-1 min-w-[200px] ${baseline ? "bg-blue-50 border-blue-200" : "bg-muted border-border"}`}>
          <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Baseline</p>
          {baseline
            ? <p className="text-blue-800 font-medium">Saved · {baseline._saved_at ? new Date(baseline._saved_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"} · {(baseline.filter ? baseline.filter(r => !r.broken) : baseline).length} routes</p>
            : <p className="text-muted-foreground">No baseline saved. Run Crawl → Save as Baseline.</p>}
        </div>
        {lastCrawlResults && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm flex-1 min-w-[200px]">
            <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Latest Crawl</p>
            <p className="text-foreground">{lastCrawlResults.length} routes · {lastCrawlResults.reduce((s, r) => s + r.errors.length, 0)} errors · {lastCrawlResults.reduce((s, r) => s + r.failedNetworkCalls.length, 0)} failed calls</p>
          </div>
        )}
      </div>

      {!baseline && !lastCrawlResults && (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          To use Regression Suite: 1) Run Automated Crawl → 2) Save as Baseline → 3) Run Crawl again → 4) Run Regression Suite
        </div>
      )}

      {/* Result Banner */}
      {regressionResult && (
        <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${regressionResult.passed ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          {regressionResult.passed
            ? <CheckCircle2 className="w-10 h-10 text-green-600 shrink-0" />
            : <XCircle className="w-10 h-10 text-red-600 shrink-0 animate-pulse" />}
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${regressionResult.passed ? "text-green-700" : "text-red-700"}`}>
              {regressionResult.passed ? "✅ PASS — No Regressions" : `❌ FAIL — ${regressionResult.regressions.length} Regression(s) Detected`}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {regressionResult.routes_compared} routes compared · Run: {new Date(regressionResult.run_at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
            </p>
          </div>
        </div>
      )}

      {/* Regression Breakdown */}
      {regressionResult && !regressionResult.passed && regressionResult.regressions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 border-b text-sm font-semibold flex items-center gap-2">
            <GitCompare className="w-4 h-4" /> Regression Details
          </div>
          <div className="divide-y divide-border">
            {regressionResult.regressions.map((reg, idx) => (
              <div key={reg.path} className="px-4 py-3 bg-red-50/40">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="font-mono font-semibold text-sm">{reg.path}</span>
                  </div>
                  <button
                    onClick={() => copyRegressionFix(idx, reg)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                  >
                    <Wrench className="w-3 h-3" /> {copiedIdx === idx ? "Copied!" : "Fix Prompt"}
                  </button>
                </div>
                {reg.newBroken && (
                  <p className="text-xs text-red-700 bg-red-100 rounded px-2 py-1 mb-1 font-semibold">NEW BROKEN ROUTE — was OK at baseline</p>
                )}
                {reg.newErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 font-mono bg-red-100 rounded px-2 py-1 mb-1">NEW ERROR: {e}</p>
                ))}
                {reg.newFailedCalls.map((n, i) => (
                  <p key={i} className="text-xs text-amber-700 font-mono bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">NEW FAILED CALL: {n}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {regressionResult?.passed && (
        <div className="text-center py-6 text-green-700 font-medium text-sm">
          🎉 All routes match baseline — no new errors, broken routes, or failed network calls detected.
        </div>
      )}
    </div>
  );
}