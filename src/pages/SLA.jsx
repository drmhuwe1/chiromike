import { Link } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";

export default function SLA() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-6 text-sm leading-relaxed">
          {/* Header */}
          <div className="text-center space-y-1 border-b border-border pb-6">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Service Level Agreement (SLA)</h1>
            <p className="text-muted-foreground text-xs">ChiroMike — Huwe Chiropractic Practice Management System</p>
            <p className="text-muted-foreground text-xs">Effective Date: April 17, 2026 · Version 1.0</p>
          </div>

          {/* A. General */}
          <section>
            <h2 className="text-base font-bold mb-2">A. General</h2>
            <p>
              This document sets forth the Service Level Commitments at which the ChiroMike platform (operated by Base44 Ltd.) shall perform the services it provides to its End-Users (authorized users of Huwe Chiropractic). Unless otherwise specified, each Service Level Commitment shall be measured on a quarterly basis.
            </p>
          </section>

          {/* B. Definitions */}
          <section>
            <h2 className="text-base font-bold mb-3">B. Definitions</h2>
            <div className="space-y-2">
              <p><strong>"Down"</strong> means the ChiroMike platform is (i) not operational, (ii) not able to accept an End-User login, (iii) not able to perform core functions (patient management, claim building, billing) and no viable workaround exists. A determination that the system is Down includes downtime associated with ChiroMike's hosting infrastructure provider, but excludes downtime associated with the End-User's ISP connectivity.</p>
              <p><strong>"Downtime"</strong> means the elapsed time starting when an End-User notifies Base44 and Base44 confirms that ChiroMike is Down, ending when the End-User is notified that ChiroMike is operational.</p>
              <p><strong>"Response Time"</strong> means the elapsed time for a user activity within ChiroMike, starting when the user completes an action (submits a form, clicks a button) and ending when the system is ready to accept the next action or the requested data is displayed.</p>
              <p><strong>"Scheduled Downtime"</strong> means the period during which Base44 has scheduled maintenance activities regarding the ChiroMike platform or its underlying infrastructure.</p>
              <p><strong>"Unscheduled Downtime"</strong> means elapsed time from when an End-User reports or Base44 discovers that ChiroMike is down, until End-Users are notified that the system is operational.</p>
            </div>
          </section>

          {/* C. Service Level Commitments */}
          <section>
            <h2 className="text-base font-bold mb-3">C. Service Level Commitments</h2>

            <h3 className="font-semibold mb-2">1. System Availability</h3>
            <div className="space-y-2 pl-4 mb-4">
              <p><strong>a. Scheduled Downtime</strong> shall occur only between the hours of 11:00 PM Saturday and 2:00 AM Sunday (Eastern Time). Base44 will provide no less than 48 hours prior written notice to End-Users of any Scheduled Downtime occurring outside those hours. Such notifications shall be displayed on the ChiroMike login screen where feasible.</p>
              <p><strong>b. System Availability Target:</strong> ChiroMike shall be available and fully functioning at a level of <strong>99%</strong> per quarter ("System Availability Percent"), calculated as:</p>
              <div className="bg-muted rounded-lg px-4 py-3 font-mono text-xs my-2">
                Availability = 1 – (Total hours of Unscheduled Downtime / Total hours of scheduled availability in month)
              </div>
              <p>The total hours scheduled for System Availability excludes Downtime incidents caused by factors beyond Base44's control, scheduled maintenance windows, and downtime related to the End-User's ISP connectivity or local systems.</p>
            </div>

            <h3 className="font-semibold mb-2">2. Response Time Targets</h3>
            <div className="pl-4 mb-4">
              <p className="mb-3">Base44 warrants the following performance commitments for ChiroMike (measured exclusive of external internet transmission delays):</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted font-semibold">
                      <th className="text-left p-2.5 border-b border-border">Function</th>
                      <th className="text-left p-2.5 border-b border-border">Description</th>
                      <th className="text-left p-2.5 border-b border-border">Commitment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Page Navigation", "Switching between main sections of ChiroMike", "4 seconds or less, 95% of occurrences"],
                      ["Claim Builder Load", "Loading patient data and code libraries in Claim Builder", "4 seconds or less, 95% of occurrences"],
                      ["Save / Submit Claim", "After Save or Submit is clicked and claim is recorded", "15 seconds or less, 95% of transactions"],
                      ["Report Generation", "Generating financial or clinical reports", "Under 30 seconds"],
                      ["Login", "From login button click to main dashboard load", "15 seconds or less, 95% of transactions"],
                      ["AI Features", "SOAP note generation, note polishing, code lookup", "Under 30 seconds"],
                    ].map(([fn, desc, commit]) => (
                      <tr key={fn} className="border-b border-border last:border-0">
                        <td className="p-2.5 font-medium">{fn}</td>
                        <td className="p-2.5 text-muted-foreground">{desc}</td>
                        <td className="p-2.5">{commit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="font-semibold mb-2">3. Problem Management, Escalation & Resolution</h3>
            <p className="pl-4 mb-3">Base44 shall report to End-Users within the timeframes below all system, database, or service-related failures with respect to ChiroMike. Severity levels are determined at initial report and may be reassessed by mutual agreement.</p>

            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted font-semibold">
                    <th className="text-left p-2.5 border-b border-border">Severity 1 — Critical</th>
                    <th className="text-left p-2.5 border-b border-border">Severity 2 — Major</th>
                    <th className="text-left p-2.5 border-b border-border">Severity 3 — Minor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-2.5 align-top">
                      <p className="font-semibold mb-1">Loss of service; no workaround exists.</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        <li>Platform inaccessible</li>
                        <li>Unable to access patient records</li>
                        <li>Claim submission completely broken</li>
                        <li>Data corruption or loss</li>
                      </ul>
                    </td>
                    <td className="p-2.5 align-top">
                      <p className="font-semibold mb-1">Service degraded; workaround may exist.</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        <li>Non-critical feature not working</li>
                        <li>Performance below expectations</li>
                        <li>Partial feature impairment</li>
                      </ul>
                    </td>
                    <td className="p-2.5 align-top">
                      <p className="font-semibold mb-1">Minor issue; no impact on normal operations.</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        <li>Cosmetic/UI issues</li>
                        <li>Minor inconveniences</li>
                      </ul>
                    </td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="p-2.5 font-semibold text-center" colSpan={3}>Incident Reporting: support via ChiroMike administrator</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2.5 align-top">
                      <p className="font-semibold">Initial Response:</p>
                      <p>Business hours (8am–7pm ET, M–F): <strong>1 hour</strong></p>
                      <p>Off-hours/weekends: <strong>4 hours</strong></p>
                      <p className="mt-1">If unresolved in 4 hours → escalate</p>
                    </td>
                    <td className="p-2.5 align-top">
                      <p className="font-semibold">Initial Response:</p>
                      <p>Business hours: <strong>4 hours</strong></p>
                      <p>Off-hours/weekends: <strong>8 hours</strong></p>
                      <p className="mt-1">If unresolved in 24 hours → escalate</p>
                    </td>
                    <td className="p-2.5 align-top">
                      <p className="font-semibold">Initial Response:</p>
                      <p>Business hours: <strong>8 hours</strong></p>
                      <p>Off-hours/weekends: <strong>24 hours</strong></p>
                      <p className="mt-1">If unresolved in 5 business days → escalate</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold mb-2">4. Events Beyond Base44's Control</h3>
            <p className="pl-4 mb-2">Service Level Commitments do not apply to outages resulting from:</p>
            <ul className="list-disc pl-8 space-y-1 text-muted-foreground">
              <li>Any act or omission by the End-User or a third-party vendor under their control</li>
              <li>The End-User's local equipment, network, or internet connectivity</li>
              <li>Scheduled maintenance windows agreed upon in advance</li>
              <li>Force majeure events (natural disasters, government actions, national emergencies, etc.)</li>
              <li>Third-party service outages (e.g., Google, Stripe, Faxage) used as integrations</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">5. Feature Requests & Platform Gaps</h3>
            <p className="pl-4">
              In the event a reasonable feature requirement is identified that is not currently available in ChiroMike, Base44 agrees to make reasonable, good-faith efforts to provide the functionality within a reasonable timeframe (typically 1–90 days depending on severity and scope). Feature requests that are generic in nature and beneficial to all ChiroMike users will be prioritized. Practice-specific customizations may be subject to separate agreement and pricing.
            </p>
          </section>

          <div className="border-t border-border pt-4 text-xs text-muted-foreground text-center">
            For questions about this SLA or to report an issue, contact your ChiroMike administrator.
          </div>
        </div>
      </div>
    </div>
  );
}