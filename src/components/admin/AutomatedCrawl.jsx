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

const CRAWL_TIMEOUT = 8000; // ms per route

function crawlRoute(path) {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    const url = origin + path;
    const errors = [];
    const failedNetworkCalls = [];
    let linkCount = 0;
    let buttonCount = 0;
    let broken = false;
    let timedOut = false;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1280px;height:800px;visibility:hidden;pointer-events:none;";
    iframe.sandbox = "allow-same-origin allow-scripts";
    document.body.appendChild(iframe);

    const timer = setTimeout(() => {
      timedOut = true;
      cleanup();
    }, CRAWL_TIMEOUT);

    const handleMessage = (e) => {
      if (e.data?.type === "crawl_result" && e.data.path === path) {
        errors.push(...(e.data.errors || []));
        failedNetworkCalls.push(...(e.data.failedNetworkCalls || []));
        linkCount = e.data.linkCount || 0;
        buttonCount = e.data.buttonCount || 0;
        broken = e.data.broken || false;
        cleanup();
      }
    };

    window.addEventListener("message", handleMessage);

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      resolve({ path, broken, errors, failedNetworkCalls, linkCount, buttonCount, timedOut });
    };

    // Inject a probe script via srcdoc that navigates and reports back
    const probeScript = `
      <html><head></head><body><script>
      (function() {
        var errors = [];
        var failedNetworkCalls = [];
        var path = ${JSON.stringify(path)};

        window.onerror = function(msg, src, line) {
          errors.push(msg + ' (' + (src||'') + ':' + (line||'') + ')');
          return true;
        };
        window.addEventListener('unhandledrejection', function(e) {
          errors.push('UnhandledRejection: ' + (e.reason?.message || e.reason || 'unknown'));
        });

        // Patch console.error
        var origErr = console.error;
        console.error = function() {
          var msg = Array.from(arguments).join(' ');
          errors.push('console.error: ' + msg);
          origErr.apply(console, arguments);
        };

        // Resource timing observer — check after 4s
        setTimeout(function() {
          try {
            var entries = performance.getEntriesByType('resource');
            entries.forEach(function(e) {
              if (e.responseStatus >= 400 || (e.transferSize === 0 && e.decodedBodySize === 0 && e.duration === 0 && e.initiatorType !== 'beacon')) {
                if (e.name && !e.name.includes('chrome-extension')) {
                  failedNetworkCalls.push(e.name.replace(window.location.origin, '') + ' [' + (e.responseStatus || '?') + ']');
                }
              }
            });
          } catch(ex) {}

          var links = document.querySelectorAll('a[href]').length;
          var buttons = document.querySelectorAll('button, [role=button], input[type=button], input[type=submit]').length;
          var notFound = document.body && (
            document.title.toLowerCase().includes('not found') ||
            document.body.innerText.toLowerCase().includes('page not found') ||
            document.body.innerText.toLowerCase().includes('404')
          );

          window.parent.postMessage({
            type: 'crawl_result',
            path: path,
            errors: errors.slice(0, 10),
            failedNetworkCalls: [...new Set(failedNetworkCalls)].slice(0, 10),
            linkCount: links,
            buttonCount: buttons,
            broken: notFound
          }, '*');
        }, 4000);
      })();
      <\/script>
      <script>window.location.href = ${JSON.stringify(url)};<\/script>
      </body></html>`;

    try {
      iframe.srcdoc = probeScript;
    } catch (e) {
      cleanup();
    }
  });
}

function generateCrawlFixPrompt(results) {
  const issues = results.filter(r => r.broken || r.errors.length > 0 || r.failedNetworkCalls.length > 0);
  if (issues.length === 0) return null;

  const lines = ["# ChiroMike — Automated Crawl Fix Prompt", `Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`, "", "Issues detected by automated crawl. Fix each issue below. Do NOT change other code.", "", "ISSUES TO FIX:", "━━━━━━━━━━━━━━━"];
  issues.forEach((r, i) => {
    lines.push(`\nISSUE ${i + 1}: Route ${r.path}`);
    if (r.broken) lines.push(`  - BROKEN ROUTE: Page not found content detected`);
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
                <th className="text-center py-2 px-3 font-medium">Links</th>
                <th className="text-center py-2 px-3 font-medium">Buttons</th>
                <th className="text-right py-2 px-4 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const st = getRowStatus(r);
                const hasIssues = st !== "ok" && st !== "timeout";
                const routeFixPrompt = (r.broken || r.errors.length > 0 || r.failedNetworkCalls.length > 0)
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
        className={`border-b last:border-0 cursor-pointer hover:bg-muted/20 ${hasIssues ? "bg-red-50/40" : ""}`}
        onClick={() => hasIssues && setExpanded(v => !v)}
      >
        <td className="py-2 px-4 font-mono">{r.path}</td>
        <td className="py-2 px-3 text-center">
          {st === "ok" && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
          {st === "broken" && <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
          {st === "issues" && <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
          {st === "timeout" && <span className="text-muted-foreground text-xs">Timeout</span>}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.errors.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
          {r.errors.length || "—"}
        </td>
        <td className={`py-2 px-3 text-center font-semibold ${r.failedNetworkCalls.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
          {r.failedNetworkCalls.length || "—"}
        </td>
        <td className="py-2 px-3 text-center text-muted-foreground">{r.linkCount || "—"}</td>
        <td className="py-2 px-3 text-center text-muted-foreground">{r.buttonCount || "—"}</td>
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
        <tr className="border-b bg-red-50/60">
          <td colSpan={7} className="px-6 py-3 space-y-2">
            {r.broken && <p className="text-xs text-red-700 font-semibold">⛔ Broken route — not-found content detected</p>}
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