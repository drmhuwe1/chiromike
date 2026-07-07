import { useState, useRef } from "react";
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

// Internal SPA routes (valid hrefs that aren't external)
const KNOWN_SPA_ROUTES = new Set(APP_ROUTES);
const KNOWN_EXTERNAL_PREFIXES = ["http://", "https://", "mailto:", "tel:", "#"];

// Fetch check — confirms the SPA shell returns 200
async function fetchCheck(path) {
  const url = window.location.origin + path;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal, credentials: "include" });
    clearTimeout(timeout);
    const text = await res.text();
    const broken = res.status === 404 ||
      text.toLowerCase().includes("cannot get") ||
      (text.length < 100 && !text.includes("<"));
    const errors = res.status >= 500 ? [`HTTP ${res.status} returned for ${path}`] : [];
    return { broken, errors, status: res.status, timedOut: false };
  } catch (e) {
    const timedOut = e.name === "AbortError";
    return { broken: false, errors: timedOut ? [] : [e.message], status: null, timedOut };
  }
}

// iframe DOM scan — loads the route in a hidden iframe, waits for render, inspects links & buttons
function iframeScan(path, iframeEl) {
  return new Promise((resolve) => {
    const SETTLE_MS = 3500; // wait for React to mount
    const TIMEOUT_MS = 8000;

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ brokenLinks: [], deadButtons: [], iframeTimedOut: true });
      }
    }, TIMEOUT_MS);

    iframeEl.onload = () => {
      setTimeout(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const doc = iframeEl.contentDocument || iframeEl.contentWindow?.document;
          if (!doc) return resolve({ brokenLinks: [], deadButtons: [], iframeTimedOut: false });

          // Check <a> tags for broken/missing hrefs
          const brokenLinks = [];
          doc.querySelectorAll("a[href]").forEach(a => {
            const href = a.getAttribute("href");
            if (!href || href === "" || href === "javascript:void(0)") {
              brokenLinks.push(`Empty/invalid href on link: "${a.textContent.trim().slice(0, 40) || "(no text)"}"`);
            } else if (href.startsWith("/") && !KNOWN_SPA_ROUTES.has(href) && !KNOWN_EXTERNAL_PREFIXES.some(p => href.startsWith(p))) {
              brokenLinks.push(`Link points to unknown route: ${href} — "${a.textContent.trim().slice(0, 30) || "(no text)"}"`);
            }
          });

          // Check <button> tags — flag ones with no text, no aria-label, and no apparent type
          const deadButtons = [];
          doc.querySelectorAll("button").forEach(btn => {
            const label = (btn.textContent || "").trim();
            const ariaLabel = btn.getAttribute("aria-label") || "";
            const hasIcon = btn.querySelector("svg");
            if (!label && !ariaLabel && !hasIcon) {
              deadButtons.push(`Button with no label, aria-label, or icon found on page`);
            }
          });

          resolve({ brokenLinks, deadButtons, iframeTimedOut: false });
        } catch {
          // Cross-origin or other access error
          resolve({ brokenLinks: [], deadButtons: [], iframeTimedOut: false });
        }
      }, SETTLE_MS);
    };

    iframeEl.src = window.location.origin + path;
  });
}

async function crawlRoute(path, iframeEl) {
  const [fetch_result, dom_result] = await Promise.all([
    fetchCheck(path),
    iframeScan(path, iframeEl),
  ]);

  return {
    path,
    broken: fetch_result.broken,
    errors: fetch_result.errors,
    failedNetworkCalls: [],
    status: fetch_result.status,
    timedOut: fetch_result.timedOut,
    brokenLinks: dom_result.brokenLinks,
    deadButtons: dom_result.deadButtons,
    iframeTimedOut: dom_result.iframeTimedOut,
  };
}

function generateCrawlFixPrompt(results) {
  const issues = results.filter(r =>
    r.broken || r.timedOut || r.errors.length > 0 ||
    r.failedNetworkCalls.length > 0 || r.brokenLinks.length > 0 || r.deadButtons.length > 0
  );
  if (issues.length === 0) return null;

  const lines = [
    "# ChiroMike — Automated Crawl Fix Prompt",
    `Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
    "",
    "Issues detected by automated crawl. Fix each issue below. Do NOT change other code.",
    "",
    "ISSUES TO FIX:",
    "━━━━━━━━━━━━━━━",
  ];
  issues.forEach((r, i) => {
    lines.push(`\nISSUE ${i + 1}: Route ${r.path}`);
    if (r.broken) lines.push(`  - BROKEN ROUTE: Page not found content detected (HTTP ${r.status || "?"})`);
    if (r.timedOut) lines.push(`  - TIMEOUT: Route did not respond within 6 seconds`);
    r.errors.forEach(e => lines.push(`  - RUNTIME ERROR: ${e}`));
    r.failedNetworkCalls.forEach(n => lines.push(`  - FAILED NETWORK CALL: ${n}`));
    r.brokenLinks.forEach(l => lines.push(`  - BROKEN LINK: ${l}`));
    r.deadButtons.forEach(b => lines.push(`  - UNLABELED BUTTON: ${b}`));
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
  const iframeRef = useRef(null);

  const runCrawl = async () => {
    setCrawling(true);
    setResults(null);
    const allResults = [];

    for (let i = 0; i < APP_ROUTES.length; i++) {
      const route = APP_ROUTES[i];
      setProgress({ current: i + 1, total: APP_ROUTES.length, route });
      const result = await crawlRoute(route, iframeRef.current);
      allResults.push(result);
    }

    setResults(allResults);
    setCrawling(false);
    // Reset iframe
    if (iframeRef.current) iframeRef.current.src = "about:blank";
    if (onCrawlComplete) onCrawlComplete(allResults);
  };

  const summary = results ? {
    routes: results.length,
    broken: results.filter(r => r.broken).length,
    errors: results.reduce((s, r) => s + r.errors.length, 0),
    timedOut: results.filter(r => r.timedOut).length,
    brokenLinks: results.reduce((s, r) => s + r.brokenLinks.length, 0),
    deadButtons: results.reduce((s, r) => s + r.deadButtons.length, 0),
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
    if (r.brokenLinks.length > 0 || r.deadButtons.length > 0) return "issues";
    if (r.timedOut || r.iframeTimedOut) return "timeout";
    return "ok";
  };

  const hasIssuesForFix = (r) =>
    r.broken || r.timedOut || r.errors.length > 0 ||
    r.failedNetworkCalls.length > 0 || r.brokenLinks.length > 0 || r.deadButtons.length > 0;

  return (
    <div className="space-y-5">
      {/* Hidden iframe for DOM scanning */}
      <iframe
        ref={iframeRef}
        src="about:blank"
        style={{ position: "absolute", width: 1280, height: 900, top: -9999, left: -9999, opacity: 0, pointerEvents: "none" }}
        title="crawl-scanner"
        sandbox="allow-same-origin allow-scripts"
      />

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
          <span className="text-xs text-muted-foreground">Scanning: <code className="font-mono">{progress.route}</code></span>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Routes Crawled", value: summary.routes, color: "text-foreground" },
            { label: "Broken Routes", value: summary.broken, color: summary.broken > 0 ? "text-red-600" : "text-green-600" },
            { label: "Console Errors", value: summary.errors, color: summary.errors > 0 ? "text-red-600" : "text-green-600" },
            { label: "Timed Out", value: summary.timedOut, color: summary.timedOut > 0 ? "text-amber-600" : "text-green-600" },
            { label: "Broken Links", value: summary.brokenLinks, color: summary.brokenLinks > 0 ? "text-red-600" : "text-green-600" },
            { label: "Bad Buttons", value: summary.deadButtons, color: summary.deadButtons > 0 ? "text-amber-600" : "text-green-600" },
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
                <th className="text-center py-2 px-3 font-medium">HTTP</th>
                <th className="text-center py-2 px-3 font-medium">Errors</th>
                <th className="text-center py-2 px-3 font-medium">Links</th>
                <th className="text-center py-2 px-3 font-medium">Buttons</th>
                <th className="text-right py-2 px-4 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const st = getRowStatus(r);
                const hasIssues = st !== "ok";
                const routeFixPrompt = hasIssuesForFix(r) ? generateCrawlFixPrompt([r]) : null;
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
          Click "Run Crawl" to scan all {APP_ROUTES.length} routes — checks HTTP status, broken links, and unlabeled buttons.
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

  const allIssueDetails = [
    ...(r.broken ? [`⛔ Broken route — not-found content detected (HTTP ${r.status || "?"})`] : []),
    ...(r.timedOut ? ["⏱ Fetch timed out — route did not respond within 6 seconds"] : []),
    ...(r.iframeTimedOut ? ["⏱ DOM scan timed out — page may have a loading/render issue"] : []),
    ...r.errors.map(e => `🔴 Runtime error: ${e}`),
    ...r.failedNetworkCalls.map(n => `🟠 Failed network call: ${n}`),
    ...r.brokenLinks.map(l => `🔗 Broken link: ${l}`),
    ...r.deadButtons.map(b => `🔘 ${b}`),
  ];

  return (
    <>
      <tr
        className={`border-b last:border-0 cursor-pointer hover:bg-muted/20 ${r.broken ? "bg-red-50/40" : hasIssues ? "bg-amber-50/30" : ""}`}
        onClick={() => hasIssues && setExpanded(v => !v)}
      >
        <td className="py-2 px-4 font-mono">{r.path}</td>
        <td className="py-2 px-3 text-center">
          {st === "ok" && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
          {st === "broken" && <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
          {st === "issues" && <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
          {st === "timeout" && <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" title="Timed out" />}
        </td>
        <td className={`py-2 px-3 text-center font-mono ${r.status >= 500 ? "text-red-600 font-semibold" : r.status === 404 ? "text-red-500" : "text-muted-foreground"}`}>
          {r.timedOut ? "—" : (r.status || "—")}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.errors.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
          {r.errors.length || "—"}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.brokenLinks.length > 0 ? "text-red-600" : r.iframeTimedOut ? "text-muted-foreground" : "text-green-600"}`}>
          {r.iframeTimedOut ? "?" : (r.brokenLinks.length > 0 ? r.brokenLinks.length : "✓")}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.deadButtons.length > 0 ? "text-amber-600" : r.iframeTimedOut ? "text-muted-foreground" : "text-green-600"}`}>
          {r.iframeTimedOut ? "?" : (r.deadButtons.length > 0 ? r.deadButtons.length : "✓")}
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
      {expanded && hasIssues && allIssueDetails.length > 0 && (
        <tr className="border-b bg-amber-50/40">
          <td colSpan={7} className="px-6 py-3 space-y-1.5">
            {allIssueDetails.map((detail, i) => (
              <p key={i} className="text-xs font-mono bg-white/70 border border-border rounded px-2 py-1">{detail}</p>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}