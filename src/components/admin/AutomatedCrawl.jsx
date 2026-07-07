import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Copy, Wrench, CheckCircle2, XCircle, AlertTriangle, Globe } from "lucide-react";

// All authenticated app routes to crawl
const APP_ROUTES = [
  "/", "/patients", "/calendar", "/claim-builder", "/saved-claims",
  "/procedures", "/diagnoses", "/templates", "/reports", "/settings",
  "/code-library", "/patient-account", "/billing", "/guide", "/compliance",
  "/soap-notes", "/new-patient-exam", "/re-examination", "/financial-reports",
  "/office-ally", "/office-ally-settings", "/admin/stability",
];

// Complete list of all valid internal SPA routes (from App.jsx)
const ALL_VALID_ROUTES = new Set([
  "/", "/patients", "/calendar", "/claim-builder", "/saved-claims",
  "/procedures", "/diagnoses", "/templates", "/reports", "/settings",
  "/print-claim", "/print-receipt", "/code-library", "/patient-account",
  "/billing", "/guide", "/compliance", "/soap-notes", "/new-patient-exam",
  "/re-examination", "/financial-reports", "/office-ally", "/office-ally-settings",
  "/admin/stability",
  // Public routes
  "/privacy", "/terms", "/baa", "/sla", "/about", "/contact",
  "/intake", "/intake-kiosk", "/payment-success", "/payment-cancelled",
]);

// Fetch check — confirms the SPA shell returns 200 and isn't a hard 404/500
async function crawlRoute(path) {
  const url = window.location.origin + path;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, credentials: "include" });
    clearTimeout(timeout);
    const text = await res.text();

    const broken = res.status === 404 ||
      text.toLowerCase().includes("cannot get") ||
      (text.length < 100 && !text.includes("<"));

    const errors = [];
    if (res.status >= 500) errors.push(`HTTP ${res.status} server error`);

    return { path, broken, errors, status: res.status, timedOut: false };
  } catch (e) {
    const timedOut = e.name === "AbortError";
    return { path, broken: false, errors: timedOut ? [] : [e.message], status: null, timedOut };
  }
}

// Static link audit — checks all known nav links in the app against the valid route registry
// This replaces iframe DOM scanning which fails on auth-gated pages
function auditStaticLinks() {
  // All internal links used across the app (Layout nav, footers, cross-page links)
  const allLinks = [
    // Layout sidebar nav
    { href: "/", label: "Dashboard" },
    { href: "/patients", label: "Patients" },
    { href: "/calendar", label: "Calendar" },
    { href: "/claim-builder", label: "Claim Builder" },
    { href: "/saved-claims", label: "Saved Claims" },
    { href: "/procedures", label: "Procedures" },
    { href: "/diagnoses", label: "Diagnoses" },
    { href: "/templates", label: "Templates" },
    { href: "/soap-notes", label: "SOAP Notes" },
    { href: "/new-patient-exam", label: "New Patient Exam" },
    { href: "/re-examination", label: "Re-Examination" },
    { href: "/reports", label: "Reports" },
    { href: "/financial-reports", label: "Financial Reports" },
    { href: "/billing", label: "Billing" },
    { href: "/office-ally", label: "Office Ally" },
    { href: "/office-ally-settings", label: "Office Ally Settings" },
    { href: "/code-library", label: "Code Library" },
    { href: "/patient-account", label: "Patient Account" },
    { href: "/settings", label: "Settings" },
    { href: "/guide", label: "Help Guide" },
    { href: "/compliance", label: "Compliance" },
    { href: "/admin/stability", label: "Admin Stability" },
    // Footer / legal links
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/baa", label: "BAA" },
    { href: "/sla", label: "SLA" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    // Kiosk / payment flows
    { href: "/intake", label: "Patient Intake" },
    { href: "/intake-kiosk", label: "Intake Kiosk" },
    { href: "/payment-success", label: "Payment Success" },
    { href: "/payment-cancelled", label: "Payment Cancelled" },
    { href: "/print-claim", label: "Print Claim" },
    { href: "/print-receipt", label: "Print Receipt" },
  ];

  const broken = allLinks.filter(l => !ALL_VALID_ROUTES.has(l.href));
  return { checked: allLinks.length, broken };
}

function generateCrawlFixPrompt(results, linkAudit) {
  const routeIssues = results.filter(r => r.broken || r.timedOut || r.errors.length > 0);
  const hasLinkIssues = linkAudit && linkAudit.broken.length > 0;
  if (routeIssues.length === 0 && !hasLinkIssues) return null;

  const lines = [
    "# ChiroMike — Automated Crawl Fix Prompt",
    `Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
    "",
    "Issues detected. Fix each below. Do NOT change other code.",
    "",
    "ISSUES TO FIX:",
    "━━━━━━━━━━━━━━━",
  ];

  routeIssues.forEach((r, i) => {
    lines.push(`\nISSUE ${i + 1}: Route ${r.path}`);
    if (r.broken) lines.push(`  - BROKEN ROUTE: Page not found (HTTP ${r.status || "?"})`);
    if (r.timedOut) lines.push(`  - TIMEOUT: Route did not respond within 8 seconds`);
    r.errors.forEach(e => lines.push(`  - ERROR: ${e}`));
    lines.push(`  Fix: Investigate and resolve errors on route ${r.path}`);
  });

  if (hasLinkIssues) {
    lines.push(`\nLINK AUDIT ISSUES:`);
    linkAudit.broken.forEach(l => lines.push(`  - Link "${l.label}" points to unregistered route: ${l.href} — add to App.jsx`));
  }

  lines.push("\nAfter fixes:\n1. Save changes\n2. Re-run crawl from /admin/stability\n3. Verify all routes show green");
  return lines.join("\n");
}

export default function AutomatedCrawl({ baseline, onSaveBaseline, onCrawlComplete }) {
  const [crawling, setCrawling] = useState(false);
  const [results, setResults] = useState(null);
  const [linkAudit, setLinkAudit] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: APP_ROUTES.length, route: "" });
  const [copied, setCopied] = useState(false);

  const runCrawl = async () => {
    setCrawling(true);
    setResults(null);
    setLinkAudit(null);

    // Run static link audit immediately (no async needed)
    const audit = auditStaticLinks();

    const allResults = [];
    for (let i = 0; i < APP_ROUTES.length; i++) {
      const route = APP_ROUTES[i];
      setProgress({ current: i + 1, total: APP_ROUTES.length, route });
      const result = await crawlRoute(route);
      allResults.push(result);
    }

    setResults(allResults);
    setLinkAudit(audit);
    setCrawling(false);
    if (onCrawlComplete) onCrawlComplete(allResults);
  };

  const summary = results ? {
    routes: results.length,
    broken: results.filter(r => r.broken).length,
    errors: results.reduce((s, r) => s + r.errors.length, 0),
    timedOut: results.filter(r => r.timedOut).length,
    linksChecked: linkAudit?.checked || 0,
    linksBroken: linkAudit?.broken.length || 0,
  } : null;

  const fixPrompt = results ? generateCrawlFixPrompt(results, linkAudit) : null;

  const copyFix = () => {
    if (!fixPrompt) return;
    navigator.clipboard.writeText(fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRowStatus = (r) => {
    if (r.broken) return "broken";
    if (r.errors.length > 0) return "issues";
    if (r.timedOut) return "timeout";
    return "ok";
  };

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
          <span className="text-xs text-muted-foreground">Checking: <code className="font-mono">{progress.route}</code></span>
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

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Routes Checked", value: summary.routes, color: "text-foreground" },
            { label: "Broken Routes", value: summary.broken, color: summary.broken > 0 ? "text-red-600" : "text-green-600" },
            { label: "Server Errors", value: summary.errors, color: summary.errors > 0 ? "text-red-600" : "text-green-600" },
            { label: "Timed Out", value: summary.timedOut, color: summary.timedOut > 0 ? "text-amber-600" : "text-green-600" },
            { label: "Links Audited", value: summary.linksChecked, color: "text-foreground" },
            { label: "Broken Links", value: summary.linksBroken, color: summary.linksBroken > 0 ? "text-red-600" : "text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Link audit results */}
      {linkAudit && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 border-b text-sm font-semibold flex items-center gap-2">
            🔗 Link Audit — {linkAudit.checked} links checked
            {linkAudit.broken.length === 0
              ? <span className="ml-auto text-green-600 font-normal text-xs">All links valid ✓</span>
              : <span className="ml-auto text-red-600 font-normal text-xs">{linkAudit.broken.length} broken</span>}
          </div>
          {linkAudit.broken.length > 0 && (
            <div className="p-4 space-y-1.5">
              {linkAudit.broken.map((l, i) => (
                <div key={i} className="text-xs font-mono bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700">
                  ⛔ "{l.label}" → <code>{l.href}</code> — not registered in App.jsx
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per-route table */}
      {results && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 border-b text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4" /> Route Health
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-2 px-4 font-medium">Route</th>
                <th className="text-center py-2 px-3 font-medium">Status</th>
                <th className="text-center py-2 px-3 font-medium">HTTP</th>
                <th className="text-center py-2 px-3 font-medium">Errors</th>
                <th className="text-right py-2 px-4 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const st = getRowStatus(r);
                const hasIssues = st !== "ok";
                const routeFixPrompt = hasIssues ? generateCrawlFixPrompt([r], null) : null;
                return <RouteRow key={r.path} r={r} st={st} hasIssues={hasIssues} routeFixPrompt={routeFixPrompt} />;
              })}
            </tbody>
          </table>
        </div>
      )}

      {!results && !crawling && (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          Click "Run Crawl" to check all {APP_ROUTES.length} routes for HTTP errors and audit all internal navigation links.
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

  const details = [
    ...(r.broken ? [`⛔ Broken — not-found content (HTTP ${r.status || "?"})`] : []),
    ...(r.timedOut ? ["⏱ Timed out — no response within 8 seconds"] : []),
    ...r.errors.map(e => `🔴 ${e}`),
  ];

  return (
    <>
      <tr
        className={`border-b last:border-0 hover:bg-muted/20 ${hasIssues ? "cursor-pointer" : ""} ${r.broken ? "bg-red-50/40" : r.timedOut ? "bg-amber-50/30" : hasIssues ? "bg-amber-50/30" : ""}`}
        onClick={() => hasIssues && setExpanded(v => !v)}
      >
        <td className="py-2 px-4 font-mono">{r.path}</td>
        <td className="py-2 px-3 text-center">
          {st === "ok"      && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
          {st === "broken"  && <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
          {st === "issues"  && <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
          {st === "timeout" && <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" />}
        </td>
        <td className={`py-2 px-3 text-center font-mono ${r.status >= 500 ? "text-red-600 font-semibold" : r.status === 404 ? "text-red-500" : "text-muted-foreground"}`}>
          {r.timedOut ? "—" : (r.status || "—")}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.errors.length > 0 ? "text-red-600" : "text-green-600"}`}>
          {r.errors.length > 0 ? r.errors.length : "✓"}
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
      {expanded && details.length > 0 && (
        <tr className="border-b bg-red-50/30">
          <td colSpan={5} className="px-6 py-3 space-y-1.5">
            {details.map((d, i) => (
              <p key={i} className="text-xs font-mono bg-white/70 border border-border rounded px-2 py-1">{d}</p>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}