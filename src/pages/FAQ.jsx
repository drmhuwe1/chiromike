export default function FAQ() {
  const faqs = [
    {
      q: "What is ChiroMike?",
      a: "ChiroMike is a practice management system built exclusively for Huwe Chiropractic. It handles patient records, billing, SOAP notes, insurance claims, and appointment scheduling in one place.",
    },
    {
      q: "Who can access this system?",
      a: "Access is restricted to authorized staff at Huwe Chiropractic. Each user must be invited by an administrator. Unauthorized access is prohibited.",
    },
    {
      q: "Is my data secure?",
      a: "Yes. ChiroMike is built with HIPAA compliance in mind. All data is encrypted in transit and at rest. Role-based access controls ensure that only authorized users can view or modify patient records.",
    },
    {
      q: "Can I use ChiroMike on my phone?",
      a: "Yes. ChiroMike is a Progressive Web App (PWA) and can be installed on Android and iOS devices directly from your browser. Use the 'Add to Home Screen' option in your browser menu.",
    },
    {
      q: "How do I add a new patient?",
      a: "Go to the Patients page and click 'New Patient'. You can enter information manually or direct the patient to the intake form or kiosk for self-service intake.",
    },
    {
      q: "How do I submit an insurance claim?",
      a: "Open the Claim Builder, select the patient, add diagnosis and procedure codes, then save the claim. From there you can print a CMS-1500, export an EDI 837P file, or submit via Office Ally.",
    },
    {
      q: "Are refunds or money-back offers available?",
      a: "No. All payments processed through ChiroMike — including cash visit packages, exam fees, and membership plans — are final. No refunds or money-back offers are provided.",
    },
    {
      q: "What happens if I forget to sync an appointment to Google Calendar?",
      a: "You can manually sync any appointment from the Calendar page by opening the appointment and clicking 'Sync to Google Calendar'.",
    },
    {
      q: "How do I get support?",
      a: "Contact your system administrator or the ChiroMike support team via the Contact page.",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-10">Common questions about ChiroMike and how it works.</p>
        <div className="space-y-6">
          {faqs.map((item, i) => (
            <div key={i} className="border border-border rounded-xl p-6 bg-card">
              <h2 className="font-semibold text-base mb-2">{item.q}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}