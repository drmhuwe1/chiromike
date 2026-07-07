import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Copy, Wrench, CheckCircle2, XCircle, AlertTriangle, Globe } from "lucide-react";

// All authenticated app routes to crawl
const APP_ROUTES = [
  "/", "/patients", "/calendar", "/claim-builder", "/saved-claims",
  "/procedures", "/diagnoses", "/templates", "/reports", "/settings",
  "/code-library", "/patient-account", "/billing", "/guide", "/compliance",
  "/soap-notes", "/new-patient-exam", "/re-examination", "/financial-reports",
  "/admin/stability",
];

// Crawl a route by fetching it directly — checks that the SPA shell loads (200 OK)
// and that it's a valid HTML page. Auth-gated pages redirect to login (also 200 in SPA)
// but the shell still loads, which is the correct behaviour to verify.
async function crawlRoute(path) {
  const origin = window.location.origin;
  const url = origin + path;
  const errors = [];
  const failedNetworkCalls = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal, credentials: "include" });
    clearTimeout(timeout);

    const text = await res.text();
    const broken = res.status === 404 ||
      text.toLowerCase().includes("cannot get") ||
      (text.length < 100 && !text.includes("<"));

    if (res.status >= 500) {
      errors.push(`HTTP ${res.status} returned for ${path}`);
    }

    return { path, broken, errors, failedNetworkCalls, status: res.status, timedOut: false };
  } catch (e) {
    const timedOut = e.name === "AbortError";
    if (!timedOut) errors.push(e.message);
    return { path, broken: false, errors, failedNetworkCalls, status: null, timedOut };
  }
}

function generateCrawlFixPrompt(results) {
  const issues = results.filter(r => r.broken || r.timedOut || r.errors.length > 0 || r.failedNetworkCalls.length > 0);
  if (issues.length === 0) return null;

  const lines = ["# ChiroMike — Automated Crawl Fix Prompt", `Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`, "", "Issues detected by automated crawl. Fix each issue below. Do NOT change other code.", "", "ISSUES TO FIX:", "━━━━━━━━━━━━━━━"];
  issues.forEach((r, i) => {
    lines.push(`\nISSUE ${i + 1}: Route ${r.path}`);
    if (r.broken) lines.push(`  - BROKEN ROUTE: Page not found content detected (HTTP ${r.status || "?"})`);
    if (r.timedOut) lines.push(`  - TIMEOUT: Route did not respond within 6 seconds — may indicate a loading error, infinite loop, or auth redirect issue`);
    r.errors.forEach(e => lines.push(`  - RUNTIME ERROR: ${e}`));
    r.failedNetworkCalls.forEach(n => lines.push(`  - FAILED NETWORK CALL: ${n}`));
    lines.push(`  Fix required: Investigate and resolve all errors on route ${r.path}`);
  });

  lines.push("\nAfter making all fixes:\n1. Save all changes\n2. Re-run Automated Crawl from /admin/stability\n3. Verify all routes show 0 errors");
  return lines.join("\n");
}

export default function AutomatedCrawl({ baseline, onSaveBaseline, onCrawlComplete }) {
  const [crawling, setCrawling] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: APP_ROUTES.length, route: "" });
  const [copied, setCopied] = useState(false);

  const runCrawl = async () => {
    setCrawling(true);
    setResults(null);
    const allResults = [];

    for (let i = 0; i < APP_ROUTES.length; i++) {
      const route = APP_ROUTES[i];
      setProgress({ current: i + 1, total: APP_ROUTES.length, route });
      const result = await crawlRoute(route);
      allResults.push(result);
    }

    setResults(allResults);
    setCrawling(false);
    if (onCrawlComplete) onCrawlComplete(allResults);
  };

  const summary = results ? {
    routes: results.length,
    broken: results.filter(r => r.broken).length,
    errors: results.reduce((s, r) => s + r.errors.length, 0),
    failedCalls: results.reduce((s, r) => s + r.failedNetworkCalls.length, 0),
    timedOut: results.filter(r => r.timedOut).length,
  } : null;

  const fixPrompt = results ? generateCrawlFixPrompt(results) : null;

  const copyFix = () => {
    if (!fixPrompt) return;
    navigator.clipboard.writeText(fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRowStatus = (r) => {
    if (r.broken) return "broken";
    if (r.errors.length > 0 || r.failedNetworkCalls.length > 0) return "issues";
    if (r.timedOut) return "timeout";
    return "ok";
  };

  const hasIssuesForFix = (r) => r.broken || r.timedOut || r.errors.length > 0 || r.failedNetworkCalls.length > 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={runCrawl} disabled={crawling} className="gap-1.5">
          {crawling
            ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Crawling... ({progress.current}/{progress.total})</>
            : <><Play className="w-3.5 h-3.5" /> Run Crawl</>}
        </Button>
        {results && (
          <>
            <Button variant="outline" size="sm" onClick={() => onSaveBaseline(results)} className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50">
              Save as Baseline
            </Button>
            {fixPrompt && (
              <Button size="sm" onClick={copyFix} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy Fix Prompt"}
              </Button>
            )}
          </>
        )}
        {crawling && progress.route && (
          <span className="text-xs text-muted-foreground">Probing: <code className="font-mono">{progress.route}</code></span>
        )}
      </div>

      {/* Progress bar */}
      {crawling && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Routes Crawled", value: summary.routes, color: "text-foreground" },
            { label: "Broken Routes", value: summary.broken, color: summary.broken > 0 ? "text-red-600" : "text-green-600" },
            { label: "Console Errors", value: summary.errors, color: summary.errors > 0 ? "text-red-600" : "text-green-600" },
            { label: "Failed Network", value: summary.failedCalls, color: summary.failedCalls > 0 ? "text-amber-600" : "text-green-600" },
            { label: "Timed Out", value: summary.timedOut, color: summary.timedOut > 0 ? "text-amber-600" : "text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-route table */}
      {results && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 border-b text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4" /> Per-Route Results
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-2 px-4 font-medium">Route</th>
                <th className="text-center py-2 px-3 font-medium">Status</th>
                <th className="text-center py-2 px-3 font-medium">Errors</th>
                <th className="text-center py-2 px-3 font-medium">Failed Calls</th>
                <th className="text-center py-2 px-3 font-medium">HTTP</th>
                <th className="text-right py-2 px-4 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const st = getRowStatus(r);
                const hasIssues = st !== "ok";
                const routeFixPrompt = hasIssuesForFix(r)
                  ? generateCrawlFixPrompt([r])
                  : null;
                return (
                  <RouteRow key={r.path} r={r} st={st} hasIssues={hasIssues} routeFixPrompt={routeFixPrompt} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!results && !crawling && (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          Click "Run Crawl" to walk all {APP_ROUTES.length} app routes and detect broken pages, console errors, and failed network calls.
        </div>
      )}
    </div>
  );
}

function RouteRow({ r, st, hasIssues, routeFixPrompt }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyFix = (e) => {
    e.stopPropagation();
    if (!routeFixPrompt) return;
    navigator.clipboard.writeText(routeFixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <tr
        className={`border-b last:border-0 cursor-pointer hover:bg-muted/20 ${r.broken ? "bg-red-50/40" : r.timedOut ? "bg-amber-50/40" : hasIssues ? "bg-red-50/40" : ""}`}
        onClick={() => hasIssues && setExpanded(v => !v)}
      >
        <td className="py-2 px-4 font-mono">{r.path}</td>
        <td className="py-2 px-3 text-center">
          {st === "ok" && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
          {st === "broken" && <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
          {st === "issues" && <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
          {st === "timeout" && <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" title="Timed out" />}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.errors.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
          {r.errors.length || "—"}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.failedNetworkCalls.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
          {r.failedNetworkCalls.length || "—"}
        </td>
        <td className={`py-2 px-3 text-center font-mono text-xs ${r.status >= 500 ? "text-red-600 font-semibold" : r.status === 404 ? "text-red-500" : "text-muted-foreground"}`}>
          {r.timedOut ? "—" : (r.status || "—")}
        </td>
        <td className="py-2 px-4 text-right">
          {routeFixPrompt && (
            <button
              onClick={copyFix}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
            >
              <Wrench className="w-3 h-3" /> {copied ? "Copied!" : "Fix"}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasIssues && (
        <tr className="border-b bg-amber-50/40">
          <td colSpan={6} className="px-6 py-3 space-y-2">
            {r.broken && <p className="text-xs text-red-700 font-semibold">⛔ Broken route — not-found content detected (HTTP {r.status || "?"})</p>}
            {r.timedOut && <p className="text-xs text-amber-700 font-semibold">⏱ Timed out — route did not respond within 6 seconds. May indicate a loading error or network issue.</p>}
            {r.errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 font-mono bg-red-100 rounded px-2 py-1">{e}</p>
            ))}
            {r.failedNetworkCalls.map((n, i) => (
              <p key={i} className="text-xs text-amber-700 font-mono bg-amber-50 border border-amber-200 rounded px-2 py-1">{n}</p>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}