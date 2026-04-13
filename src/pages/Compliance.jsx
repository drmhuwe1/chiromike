import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, FileWarning, ClipboardList, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRACTICE = "Huwe Chiropractic";
const PROVIDER = "Dr. Michael Huwe, DC";
const DATE = "April 13, 2026";

const tabs = [
  { key: "risk", label: "Risk Analysis", icon: FileWarning },
  { key: "irp", label: "Incident Response Plan", icon: Shield },
  { key: "audit", label: "Audit Log", icon: ClipboardList },
];

function RiskAnalysis() {
  return (
    <div className="prose max-w-none text-sm space-y-5 print-area">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold">{PRACTICE} — HIPAA Security Risk Analysis</h2>
          <p className="text-muted-foreground">Prepared by: {PROVIDER} | Date: {DATE} | Review: Annually</p>
        </div>
        <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>

      <Section title="1. Scope">
        This risk analysis covers all electronic Protected Health Information (ePHI) created, received, maintained, or transmitted by {PRACTICE}. Systems in scope include the ChiroMike practice management application (hosted by Base44), Google Workspace (Gmail / drmhuwe@huwechiropractic.com), and any workstations used to access these systems.
      </Section>

      <Section title="2. ePHI Inventory">
        {[
          ["Patient demographics", "ChiroMike database (Base44)", "High"],
          ["Diagnosis & treatment records", "ChiroMike database (Base44)", "High"],
          ["Insurance & billing information", "ChiroMike database (Base44)", "High"],
          ["Superbills / claim documents", "Gmail (Google Workspace)", "High"],
          ["Intake form submissions", "ChiroMike database (Base44)", "High"],
        ].map(([data, location, sensitivity]) => (
          <div key={data} className="flex gap-4 py-1 border-b border-border text-xs">
            <span className="flex-1 font-medium">{data}</span>
            <span className="flex-1 text-muted-foreground">{location}</span>
            <span className={`w-16 font-semibold ${sensitivity === "High" ? "text-red-600" : "text-yellow-600"}`}>{sensitivity}</span>
          </div>
        ))}
      </Section>

      <Section title="3. Threat & Vulnerability Assessment">
        <RiskTable rows={[
          ["Unauthorized access to app", "Weak/shared passwords", "Medium", "Medium", "Require strong unique passwords; never share login credentials"],
          ["Data breach via vendor", "Base44 or Google infrastructure compromise", "Low", "High", "BAA in place with both vendors; rely on their security controls"],
          ["Lost/stolen device", "Unencrypted workstation or phone", "Medium", "High", "Enable full-disk encryption; use auto-lock screen timeout ≤5 min"],
          ["Phishing / malware", "Staff clicking malicious links", "Medium", "High", "Staff training; use Google Workspace phishing filters"],
          ["Unauthorized email disclosure", "Superbill sent to wrong address", "Low", "High", "Verify patient email at intake; patient consents to email PHI"],
          ["Insider misuse", "Staff accessing records without need", "Low", "High", "Audit log in place; access limited to authorized users only"],
          ["Ransomware", "Malware encrypting workstation data", "Low", "High", "Data lives in cloud (Base44); workstation backups recommended"],
          ["Session hijacking", "Unattended logged-in session", "Low", "Medium", "Lock computer when away; Base44 session timeouts apply"],
        ]} />
      </Section>

      <Section title="4. Current Security Measures">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>ePHI stored in Base44 cloud platform — encrypted at rest and in transit (TLS)</li>
          <li>Application requires authenticated login for all access</li>
          <li>BAA executed with Base44 (application & database host)</li>
          <li>BAA / HIPAA Amendment accepted with Google Workspace</li>
          <li>Patient HIPAA consent collected at intake</li>
          <li>Email superbills sent only to patient-provided email with patient consent</li>
          <li>Audit logging enabled for all PHI access events within the application</li>
        </ul>
      </Section>

      <Section title="5. Residual Risk & Remediation Plan">
        <p>Overall residual risk is assessed as <strong>Low to Medium</strong>. Highest residual risk is unauthorized workstation access. Remediation: enable full-disk encryption on all workstations and enforce screen lock policy. Review annually or after any security incident.</p>
      </Section>

      <Section title="6. Certification">
        <p>I, {PROVIDER}, attest that this risk analysis was completed in good faith and reflects the current security posture of {PRACTICE} as of {DATE}.</p>
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm">Signature: ___________________________ &nbsp;&nbsp; Date: _______________</p>
        </div>
      </Section>
    </div>
  );
}

function IncidentResponsePlan() {
  return (
    <div className="prose max-w-none text-sm space-y-5 print-area">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold">{PRACTICE} — HIPAA Incident Response Plan</h2>
          <p className="text-muted-foreground">Prepared by: {PROVIDER} | Date: {DATE} | Review: Annually</p>
        </div>
        <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>

      <Section title="1. Purpose">
        This plan establishes procedures for identifying, containing, investigating, and reporting security incidents that involve or may involve protected health information (PHI) at {PRACTICE}.
      </Section>

      <Section title="2. Incident Response Team">
        {[
          ["Incident Response Lead", PROVIDER, "drmhuwe@huwechiropractic.com"],
          ["Alternate Contact", "Office Staff", "On file"],
        ].map(([role, name, contact]) => (
          <div key={role} className="flex gap-4 py-1 border-b border-border text-xs">
            <span className="w-48 font-medium">{role}</span>
            <span className="flex-1">{name}</span>
            <span className="flex-1 text-muted-foreground">{contact}</span>
          </div>
        ))}
      </Section>

      <Section title="3. What Constitutes an Incident">
        <ul className="list-disc pl-5 space-y-1">
          <li>Unauthorized access to the ChiroMike application or patient records</li>
          <li>Superbill or PHI emailed to the wrong patient or third party</li>
          <li>Lost or stolen device that was used to access PHI</li>
          <li>Ransomware, malware, or hacking of any system containing PHI</li>
          <li>Vendor (Base44, Google) notifies of a security breach</li>
          <li>Any accidental disclosure of PHI to an unauthorized person</li>
        </ul>
      </Section>

      <Section title="4. Response Procedures — Step by Step">
        <ol className="list-decimal pl-5 space-y-3">
          <li><strong>Identify & Contain (0–4 hours)</strong><br />Immediately disable the compromised account or device. If a device is lost/stolen, remotely wipe if possible. Log all known facts: what happened, when, what data was involved, who was affected.</li>
          <li><strong>Assess the Breach (4–24 hours)</strong><br />Determine if PHI was actually accessed or disclosed. Use the Audit Log in ChiroMike to identify accessed records. Apply the 4-factor risk assessment: nature of PHI, who accessed it, whether it was actually acquired/viewed, and extent to which risk has been mitigated.</li>
          <li><strong>Notify Internally (within 24 hours)</strong><br />Document the incident in writing. Retain all records for a minimum of 6 years.</li>
          <li><strong>Notify Affected Patients (within 60 days if breach confirmed)</strong><br />Send written notice to each affected individual. Include: description of what happened, types of PHI involved, steps individuals can take to protect themselves, steps the practice is taking, and contact information.</li>
          <li><strong>Notify HHS (Department of Health & Human Services)</strong><br />
            - If &lt;500 individuals affected: log on HHS breach portal within 60 days of year-end<br />
            - If ≥500 individuals affected: notify HHS within 60 days of discovery<br />
            - Portal: <strong>hhs.gov/hipaa/for-professionals/breach-notification</strong>
          </li>
          <li><strong>Notify Media (only if ≥500 residents in a state/jurisdiction affected)</strong><br />Submit press release to prominent media outlets in affected area within 60 days.</li>
          <li><strong>Post-Incident Review (within 30 days of resolution)</strong><br />Update risk analysis. Implement corrective actions. Retrain staff if applicable. Document all actions taken.</li>
        </ol>
      </Section>

      <Section title="5. Breach Notification Template (Patient Letter)">
        <div className="bg-muted/40 border border-border rounded-lg p-4 font-mono text-xs whitespace-pre-wrap">{`Dear [Patient Name],

We are writing to inform you of a recent security incident at ${PRACTICE} that may have affected your protected health information.

What Happened: [Brief description]

What Information Was Involved: [Types of PHI, e.g., name, date of service, diagnosis codes]

What We Are Doing: [Steps taken to address the incident and prevent recurrence]

What You Can Do: [Recommended steps for the patient, e.g., monitor EOBs, contact insurer]

For More Information: Please contact our office at [phone number] or [email].

We sincerely apologize for any inconvenience this may cause.

Sincerely,
${PROVIDER}
${PRACTICE}`}</div>
      </Section>

      <Section title="6. Key Contacts">
        {[
          ["HHS OCR Breach Portal", "hhs.gov/hipaa/for-professionals/breach-notification"],
          ["Base44 Security", "support@base44.com"],
          ["Google Workspace Support", "workspace.google.com/support"],
          ["Practice Attorney", "On file"],
          ["Cyber Liability Insurance", "On file"],
        ].map(([name, contact]) => (
          <div key={name} className="flex gap-4 py-1 border-b border-border text-xs">
            <span className="w-56 font-medium">{name}</span>
            <span className="text-muted-foreground">{contact}</span>
          </div>
        ))}
      </Section>

      <Section title="7. Certification">
        <p>I, {PROVIDER}, acknowledge this Incident Response Plan and commit to following it in the event of a security incident at {PRACTICE}.</p>
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm">Signature: ___________________________ &nbsp;&nbsp; Date: _______________</p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-2 border-b border-border pb-1">{title}</h3>
      <div className="text-sm text-foreground/90">{children}</div>
    </div>
  );
}

function RiskTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/60">
            <th className="text-left py-2 px-3 font-medium">Threat</th>
            <th className="text-left py-2 px-3 font-medium">Vulnerability</th>
            <th className="text-left py-2 px-3 font-medium">Likelihood</th>
            <th className="text-left py-2 px-3 font-medium">Impact</th>
            <th className="text-left py-2 px-3 font-medium">Mitigation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([threat, vuln, likelihood, impact, mitigation]) => (
            <tr key={threat} className="border-t border-border hover:bg-muted/20">
              <td className="py-2 px-3 font-medium">{threat}</td>
              <td className="py-2 px-3 text-muted-foreground">{vuln}</td>
              <td className={`py-2 px-3 font-semibold ${likelihood === "High" ? "text-red-600" : likelihood === "Medium" ? "text-orange-500" : "text-green-600"}`}>{likelihood}</td>
              <td className={`py-2 px-3 font-semibold ${impact === "High" ? "text-red-600" : impact === "Medium" ? "text-orange-500" : "text-green-600"}`}>{impact}</td>
              <td className="py-2 px-3 text-muted-foreground">{mitigation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AuditLog.list("-created_date", 200).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-semibold">PHI Access Audit Log</h2>
          <p className="text-xs text-muted-foreground">Automatically records every time patient records or claims are accessed</p>
        </div>
        <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2.5 px-4 font-medium">Timestamp</th>
              <th className="text-left py-2.5 px-4 font-medium">User</th>
              <th className="text-left py-2.5 px-4 font-medium">Action</th>
              <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Resource</th>
              <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Record</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-10 text-center"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No audit events yet. Events will appear as staff access patient records.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="py-2.5 px-4 text-xs text-muted-foreground">{new Date(log.created_date).toLocaleString()}</td>
                <td className="py-2.5 px-4 text-xs font-medium">{log.user_email}</td>
                <td className="py-2.5 px-4 text-xs">{log.action}</td>
                <td className="py-2.5 px-4 text-xs hidden md:table-cell text-muted-foreground">{log.resource_type}</td>
                <td className="py-2.5 px-4 text-xs hidden md:table-cell">{log.resource_label || log.resource_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Compliance() {
  const [tab, setTab] = useState("risk");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">HIPAA Compliance Center</h1>
        <p className="text-sm text-muted-foreground">Risk analysis, incident response plan, and PHI access audit log — keep these on file</p>
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {tab === "risk" && <RiskAnalysis />}
        {tab === "irp" && <IncidentResponsePlan />}
        {tab === "audit" && <AuditLogTab />}
      </div>
    </div>
  );
}