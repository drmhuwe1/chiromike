import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function BAA() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-6 text-sm leading-relaxed">
          <div className="text-center space-y-1 border-b border-border pb-6">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Business Associate Agreement</h1>
            <p className="text-muted-foreground text-xs">ChiroMike — Huwe Chiropractic Practice Management System</p>
            <p className="text-muted-foreground text-xs">Effective Date: April 17, 2026 · Version 1.0</p>
          </div>

          <p>
            Whereas the <strong>"Client"</strong> referred herein as <strong>"Covered Entity"</strong> (the chiropractic practice using ChiroMike) and <strong>Base44 Ltd.</strong>, the technology platform provider operating ChiroMike, together with their designees, employees, associates, affiliates, successors, and assigns referred here as <strong>"Business Associate"</strong>, intend to protect the privacy and provide for the security of certain Protected Health Information (PHI) to which Business Associate may have access in order to provide goods or services to or on behalf of Covered Entity. This agreement is effective upon first use of the ChiroMike software and/or services.
          </p>

          <p>
            <strong>WHEREAS,</strong> both parties are subject to the Health Insurance Portability and Accountability Act of 1996 (HIPAA), the HIPAA Privacy Rule (45 CFR Parts 160 and 164), the HIPAA Security Rule (45 CFR Parts 160, 162 and 164), as amended by Subtitle D of the Health Information Technology for Economic and Clinical Health Act (the "HITECH Act"), and the Office of Civil Rights Omnibus Rule released in January 2013, relating to obligations of each in connection with the privacy and security of individually identifiable health information subject to protection under HIPAA.
          </p>

          <p>
            <strong>WHEREAS,</strong> Business Associate may receive PHI from Covered Entity, or may create or obtain PHI from other parties for use on behalf of Covered Entity, which must be handled in accordance with this Agreement and the standards established by the Privacy Rule and the Security Rule.
          </p>

          <p><strong>NOW, THEREFORE,</strong> Covered Entity and Business Associate agree as follows:</p>

          {/* Section 1 */}
          <section>
            <h2 className="text-base font-bold mb-3">1. Definitions</h2>
            <div className="space-y-2 pl-4">
              <p><strong>A. "Business Associate"</strong> shall have the meaning given under the Privacy and Security Rules, including but not limited to 45 CFR §160.103.</p>
              <p><strong>B. "Covered Entity"</strong> shall have the meaning given under the Privacy and Security Rules, including but not limited to 45 CFR §160.103.</p>
              <p><strong>C. "HIPAA"</strong> shall mean the Health Insurance Portability and Accountability Act of 1996, Public Law 104-191.</p>
              <p><strong>D. "Privacy Rule"</strong> shall mean the Standards for Privacy of Individually Identifiable Health Information at 45 CFR Parts 160 and 164, Subparts A and E, as amended by the HITECH Act.</p>
              <p><strong>E. "Protected Health Information" or "PHI"</strong> means any information transmitted or recorded in any form or medium that relates to the past, present, or future physical or mental condition of an individual; the provision of health care to an individual; or payment for the provision of health care to an individual; and that identifies the individual or with respect to which there is a reasonable basis to believe the information can be used to identify the individual, as defined under 45 CFR §164.501.</p>
              <p><strong>F. "Security Rule"</strong> shall mean the Security Standards at 45 CFR Parts 160, 162 and 164.</p>
              <p><strong>G. "Breach"</strong> shall have the same meaning as the term "breach" in §13400 of the HITECH Act, including the unauthorized acquisition, access, use, or disclosure of PHI that compromises the security or privacy of such information.</p>
              <p><strong>H. "Unsecured PHI"</strong> shall mean PHI that is not secured through a technology or methodology that renders it unusable, unreadable, or indecipherable to unauthorized individuals.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-base font-bold mb-3">2. Permitted Uses and Disclosures of PHI</h2>
            <div className="space-y-2 pl-4">
              <p><strong>A.</strong> Business Associate shall be permitted to use and/or disclose PHI provided by or obtained on behalf of Covered Entity for the purpose of operating, supporting, and maintaining the ChiroMike practice management platform, including patient intake, appointment scheduling, claim building, billing support, SOAP note generation, and related clinical and administrative functions.</p>
              <p><strong>B.</strong> Business Associate shall be permitted to use or disclose PHI to perform functions, activities, or services on behalf of Covered Entity as described herein, provided that such use or disclosure would not violate the Privacy and Security Rule if performed by Covered Entity.</p>
              <p><strong>C.</strong> Business Associate may use PHI for the proper management and administration of Business Associate or to carry out its legal responsibilities, provided disclosures are required by law or Business Associate obtains reasonable written assurances of confidentiality from any third-party recipient.</p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-base font-bold mb-3">3. Business Associate Obligations</h2>
            <div className="space-y-2 pl-4">
              <p><strong>A. Limits on Use and Disclosure.</strong> Business Associate shall not use or disclose PHI other than as permitted or required by this Agreement or as required by law, in compliance with Subpart C of 45 CFR Part 164.</p>
              <p><strong>B. Appropriate Safeguards.</strong> Business Associate shall establish and maintain appropriate administrative, physical, and technical safeguards to protect the confidentiality, integrity, and availability of electronic PHI created, received, maintained, or transmitted on behalf of Covered Entity.</p>
              <p><strong>C. Breach Reporting.</strong> Business Associate shall report to Covered Entity within ten (10) days of discovery any use or disclosure of PHI not provided for by this Agreement, and any security incident of which it becomes aware, in compliance with 45 CFR §164.410.</p>
              <p><strong>D. Subcontractors and Agents.</strong> Business Associate shall ensure that any subcontractors or agents that create, receive, maintain, or transmit PHI on behalf of Business Associate agree to the same restrictions and conditions that apply to Business Associate under this Agreement, in compliance with 45 CFR §164.502(e)(1)(ii) and 164.308(b)(2).</p>
              <p><strong>E. Access to PHI.</strong> Business Associate shall make PHI available to Covered Entity or to individuals as required by 45 CFR §164.524 within ten (10) business days of receiving a written request.</p>
              <p><strong>F. Amendment of PHI.</strong> Business Associate shall incorporate amendments to PHI in a designated record set within ten (10) business days of a written request from Covered Entity, in compliance with 45 CFR §164.526.</p>
              <p><strong>G. Accounting of Disclosures.</strong> Business Associate shall maintain records of PHI disclosures and make such records available to Covered Entity or an individual within thirty (30) days of a request, in compliance with 45 CFR §164.528.</p>
              <p><strong>H. Access to Books and Records.</strong> Business Associate shall make its internal practices, books, and records relating to the use or disclosure of PHI available to the Secretary of Health and Human Services for compliance determination purposes.</p>
              <p><strong>I. Return or Destruction of PHI.</strong> Upon termination of this Agreement, Business Associate shall return or destroy all PHI, retaining no copies. If return or destruction is not feasible, Business Associate shall extend the protections of this Agreement to such PHI and limit further use or disclosure.</p>
              <p><strong>J. Mitigation.</strong> Business Associate agrees to mitigate, to the maximum extent practicable, any harmful effect from the use or disclosure of PHI in violation of this Agreement, per 45 CFR §164.530(f).</p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-base font-bold mb-3">4. Obligations of Covered Entity</h2>
            <div className="space-y-2 pl-4">
              <p><strong>A.</strong> Covered Entity shall provide Business Associate with any limitations in its Notice of Privacy Practices per 45 CFR §164.520 that may impact Business Associate's use or disclosure of PHI.</p>
              <p><strong>B.</strong> Covered Entity shall notify Business Associate of any changes in or revocation of permission by individuals to use or disclose PHI that may affect Business Associate's permitted uses and disclosures.</p>
              <p><strong>C.</strong> Covered Entity shall implement and maintain appropriate administrative, physical, and technical safeguards to protect PHI it creates, receives, maintains, or transmits, in compliance with HIPAA and the HITECH Act.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-base font-bold mb-3">5. Term and Termination</h2>
            <div className="space-y-2 pl-4">
              <p><strong>A.</strong> This Agreement shall become effective upon first use of ChiroMike and remain in effect until terminated as set forth herein.</p>
              <p><strong>B. Termination for Cause.</strong> Upon material breach by either party, the non-breaching party shall provide an opportunity to cure. If cure is not possible, the non-breaching party may immediately terminate this Agreement, or if neither termination nor cure is feasible, report the violation to the Secretary.</p>
              <p><strong>C. Effect of Termination.</strong> All rights, duties, and obligations established in this Agreement shall survive termination.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-base font-bold mb-3">6. Indemnification</h2>
            <p className="pl-4">Each party shall indemnify, hold harmless, and defend the other party from and against any and all claims, losses, liabilities, costs, and other expenses arising directly or indirectly from: (i) any misrepresentation, breach of warranty, or non-fulfillment of any undertaking under this Agreement; and (ii) any claims, demands, awards, judgments, actions, and proceedings arising out of or in connection with the breaching party's performance or non-performance of its obligations under this Agreement.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-base font-bold mb-3">7. Other Provisions</h2>
            <div className="space-y-2 pl-4">
              <p><strong>A. Construction.</strong> This Agreement shall be construed as broadly as necessary to implement and comply with HIPAA and the HITECH regulations. Any ambiguity shall be resolved in favor of a meaning that complies with HIPAA and the HITECH regulations.</p>
              <p><strong>B. Amendment.</strong> This Agreement may only be amended through a writing signed by both parties. The parties agree to amend this Agreement as necessary to ensure consistency with changes in applicable federal and state laws and regulations, including HIPAA.</p>
              <p><strong>C. Governing Law.</strong> This Agreement shall be interpreted, construed, and enforced in accordance with applicable federal law and the laws of the state in which Covered Entity's primary practice is located.</p>
              <p><strong>D. Binding Effect.</strong> This Agreement shall be binding upon and inure to the benefit of the parties and their respective permitted successors and assigns.</p>
              <p><strong>E. Priority of Agreement.</strong> If any portion of this Agreement is inconsistent with any other agreement between the parties, the terms of this Agreement shall prevail with respect to PHI obligations.</p>
              <p><strong>F. Authority to Contract.</strong> Each party represents and warrants that it is authorized to enter into this Agreement and to be bound by its terms.</p>
            </div>
          </section>

          <div className="border-t border-border pt-6 space-y-2">
            <p className="font-semibold">IN WITNESS WHEREOF, the parties have agreed to the terms of this Business Associate Agreement effective upon first use of the ChiroMike platform.</p>
            <div className="grid grid-cols-2 gap-8 mt-4 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Business Associate</p>
                <p>Base44 Ltd. (ChiroMike Platform)</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Covered Entity</p>
                <p>Huwe Chiropractic / ChiroMike User</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center border-t border-border pt-4">
            For questions about this agreement, contact your administrator or email support regarding your ChiroMike account.
          </p>
        </div>
      </div>
    </div>
  );
}