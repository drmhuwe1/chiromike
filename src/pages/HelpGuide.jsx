import { useState } from "react";
import { 
  Users, FileText, BookOpen, Library, Zap, BarChart3, Settings, 
  ClipboardList, Wallet, Mail, Printer, ChevronDown, ChevronRight,
  CheckCircle, AlertCircle, Lightbulb, HelpCircle, Stethoscope, CreditCard
} from "lucide-react";

const sections = [
  {
    id: "patients",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    title: "Patients",
    subtitle: "Your patient roster and records",
    steps: [
      { type: "step", text: "Click **Add Patient** to manually create a new patient record with their name, DOB, contact info, and insurance." },
      { type: "step", text: "Click a patient's name in the table to expand their **Cases** — each case holds insurance info, diagnoses, and accident details for a specific episode of care (e.g. auto accident, general insurance)." },
      { type: "step", text: "Use **Cases** to keep separate insurance info when a patient has multiple active cases (e.g. general BCBS + an open auto claim)." },
      { type: "step", text: "The **star icon** on a case marks it as the Default — this auto-fills the Claim Builder when you select that patient." },
      { type: "tip", text: "Use **Copy Intake Link** to send patients a digital intake form. Their info auto-populates into the patient record when they submit." },
      { type: "tip", text: "The **⚠️ alert banner** under a patient shows any missing info (email, insurance ID, HIPAA consent) that would block billing." },
      { type: "step", text: "Click the **FileText icon** next to any patient to jump directly into a new claim for them." },
    ],
  },
  {
    id: "intake",
    icon: ClipboardList,
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200",
    title: "Patient Intake Form",
    subtitle: "Digital intake for new patients",
    steps: [
      { type: "step", text: "Go to **Patients → Copy Intake Link** and text or email that URL to a new patient before their first visit." },
      { type: "step", text: "The patient fills out the multi-step form on their phone or computer — personal info, health history, insurance card, pain areas, and HIPAA consent." },
      { type: "step", text: "On submission, their record is automatically created in the system with a **New Intake** badge visible when you expand them in the Patients list." },
      { type: "tip", text: "The insurance card scanner uses AI to extract the member ID, group number, and plan name from a photo — saves manual entry." },
    ],
  },
  {
    id: "claim-builder",
    icon: FileText,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    title: "Claim Builder",
    subtitle: "Build and submit visit claims",
    steps: [
      { type: "step", text: "Select your **Patient** — their insurance and diagnosis info auto-fills from their default case." },
      { type: "step", text: "Set the **Date of Service** and choose the **Visit Type** (Insurance, Auto, Cash, etc.)." },
      { type: "step", text: "Use **Quick Panel templates** to instantly add your standard procedure lines and diagnoses in one click." },
      { type: "step", text: "Add or adjust **Diagnoses (ICD-10)** and **Service Lines (CPT codes)** as needed. Starred favorites appear as quick-tap chips." },
      { type: "step", text: "Hit **Save** to store the claim, **Print** to generate a CMS-1500 form, or **Email Superbill** to send the patient a superbill for self-submission." },
      { type: "step", text: "Check **Also attach CMS-1500** before emailing to include the filled HCFA form in the same email." },
      { type: "tip", text: "Use **Last Visit** button to copy the previous claim's codes and diagnoses for a returning patient — saves time on repeat visits." },
      { type: "tip", text: "**Same Date All** stamps today's date on every service line at once." },
    ],
  },
  {
    id: "saved-claims",
    icon: BookOpen,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    title: "Saved Claims",
    subtitle: "Review and manage all visit records",
    steps: [
      { type: "step", text: "All saved visits appear here. Filter by type (Insurance, Auto, Cash) or search by patient name." },
      { type: "step", text: "Click the **Printer icon** to reprint a claim or receipt at any time." },
      { type: "step", text: "Click the **Mail icon** to re-email a superbill to the patient. Check the small checkbox next to it to also attach the CMS-1500 form." },
      { type: "step", text: "Click **Duplicate** to copy a claim into the Claim Builder pre-filled — useful for resubmissions." },
      { type: "step", text: "Claim **Status** updates automatically: Draft → Saved → Printed → Submitted → Paid / Denied." },
    ],
  },
  {
    id: "code-library",
    icon: Library,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    title: "Code Library",
    subtitle: "CPT codes, ICD-10 diagnoses, and insurers",
    steps: [
      { type: "step", text: "**Procedure Codes tab** — add your standard CPT codes with default charges, units, and modifiers." },
      { type: "step", text: "**Diagnosis Codes tab** — add your most-used ICD-10 codes." },
      { type: "step", text: "Click the **⭐ star** on any code to mark it as a favorite — starred codes appear as quick-tap chips in the Claim Builder." },
      { type: "step", text: "**Insurers tab** — store insurance company details: EDI payer ID, claims mailing address, portal URL, timely filing limits." },
      { type: "tip", text: "The AI lookup in the Insurers tab can auto-fill a company's claims address and portal URL — just type the name and click the AI button." },
    ],
  },
  {
    id: "templates",
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-200",
    title: "Quick Templates",
    subtitle: "One-click procedure bundles",
    steps: [
      { type: "step", text: "Create a template by giving it a name and adding the CPT codes and ICD-10 codes you use most for that visit type." },
      { type: "step", text: "Templates appear in the **Quick Panel** inside the Claim Builder." },
      { type: "step", text: "Clicking a template instantly adds all its procedure lines and diagnoses to the current claim." },
      { type: "tip", text: "Build separate templates for your common visit patterns: Standard Adjustment, New Patient Eval, Auto Injury Visit, etc." },
    ],
  },
  {
    id: "billing",
    icon: Wallet,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    title: "Billing Dashboard",
    subtitle: "AR aging, outstanding claims, denials, and payments",
    steps: [
      { type: "step", text: "**AR Aging tab** — shows every patient's outstanding balance bucketed by age (0-30, 31-60, 61-90, 91-120, 120+ days). Use this to prioritize collections." },
      { type: "step", text: "**Outstanding Claims tab** — lists every unpaid claim sorted oldest first. Age is color-coded: green < 30 days, yellow < 60, orange < 90, red > 90." },
      { type: "step", text: "**Resubmission Queue tab** — all denied claims in one place. Denial codes (CO-97, CO-4, etc.) are shown with a plain-English tip. Click **Resubmit** to copy the claim into the builder." },
      { type: "step", text: "**Payment Posting tab** — search for a submitted claim and post what the insurer paid: payment amount, EFT/check number, allowed amount, contractual adjustment, deductible applied, and copay/coinsurance." },
      { type: "step", text: "Posting a **Denial** type payment marks the claim Denied and moves it to the Resubmission Queue automatically." },
      { type: "tip", text: "The 4 KPI cards at the top (Total AR, Submitted, Denied, >90 days) give you the quick pulse of your billing health at a glance." },
    ],
  },
  {
    id: "superbill",
    icon: Mail,
    color: "text-sky-600",
    bg: "bg-sky-50 border-sky-200",
    title: "Superbill & Out-of-Network Emails",
    subtitle: "Help patients self-submit to their insurance",
    steps: [
      { type: "step", text: "A **superbill** is a detailed receipt with CPT codes, ICD-10 codes, NPI, and tax ID — everything an insurance company needs to reimburse a patient directly." },
      { type: "step", text: "Email it from the **Claim Builder** (Save + Email) or from **Saved Claims** (Mail icon) — it goes directly to the patient's email on file." },
      { type: "step", text: "The email includes your practice info, the full service/diagnosis table, and step-by-step instructions for the patient to submit online, by mail, or via their insurer's app." },
      { type: "step", text: "If the insurer is saved in your **Code Library → Insurers** with a claims address and portal URL, those are automatically included in the email." },
      { type: "step", text: "Check **Also attach CMS-1500** to include a pre-filled HCFA form — ideal for patients whose insurers require a formal claim form." },
      { type: "tip", text: "Make sure each patient has an **email address on file** in their patient record — otherwise the send button will fail." },
    ],
  },
  {
    id: "print",
    icon: Printer,
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    title: "Printing Claims & Receipts",
    subtitle: "CMS-1500 and cash receipts",
    steps: [
      { type: "step", text: "**Insurance claims** print as a formatted CMS-1500 (HCFA) form. Use it for manual paper submissions or to fax to insurers." },
      { type: "step", text: "**Cash visits** print as a clean itemized receipt with your practice branding." },
      { type: "step", text: "Print from the **Claim Builder** (Print button) or re-print any time from **Saved Claims** (Printer icon)." },
      { type: "tip", text: "Make sure your NPI, Tax ID, and billing address are filled in under **Office Settings** — they appear on every printed form." },
    ],
  },
  {
    id: "reports",
    icon: BarChart3,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    title: "Reports",
    subtitle: "Financial summaries and visit history",
    steps: [
      { type: "step", text: "Filter by **date range** and **visit type** to see revenue for any period." },
      { type: "step", text: "Summary cards show total billed, total paid, outstanding balance, and claim counts." },
      { type: "step", text: "The breakdown table shows totals by visit type and by claim status." },
      { type: "tip", text: "Use this at month-end to reconcile collections and identify which visit types generate the most revenue." },
    ],
  },
  {
    id: "exams",
    icon: Stethoscope,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    title: "Patient Exams & ROM",
    subtitle: "Comprehensive clinical documentation",
    steps: [
      { type: "step", text: "Go to **New Patient Exam** to document the initial intake exam — vital signs, posture/gait, range of motion (ROM), orthopedic tests, neurological findings, palpation, and imaging." },
      { type: "step", text: "Use **ROM quick-fill buttons** for each direction: Normal (green), Diminished (blue), or Severe (red) — the system pre-fills clinically accurate degree ranges." },
      { type: "step", text: "Add **Orthopedic Tests** with quick presets (Spurling's, SLR, Distraction) — mark each as Positive/Negative and add notes or voice dictation." },
      { type: "step", text: "Fill **Neurological Exam** with quick presets for DTRs, sensory, motor, cranial nerves — voice dictation available for all fields." },
      { type: "step", text: "Upload **imaging photos** directly (X-rays, etc.) — supports multiple file uploads per exam." },
      { type: "step", text: "Rate **Pain Scale (0-10)** and select **Pain Areas** (Neck, Shoulders, Low Back, etc.) for quick documentation." },
      { type: "step", text: "Use **Generate Treatment Plans** to auto-create AI-powered clinical treatment plans based on diagnoses and exam findings." },
      { type: "step", text: "For follow-ups, use **Re-Examination** page with the same features to document progress and compare to baseline." },
      { type: "tip", text: "All exams auto-save with timestamps. Use voice dictation (🎤 button) for faster note entry, then polish with AI if needed." },
    ],
  },
  {
    id: "soap-notes",
    icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    title: "SOAP Notes",
    subtitle: "AI-generated clinical documentation linked to exams and visits",
    steps: [
      { type: "step", text: "After saving a claim, click **Generate SOAP Note** to auto-create a professional SOAP note combining the claim, patient exam data, and visit history." },
      { type: "step", text: "The AI pulls data from: exam findings (ROM, neuro, palpation), previous visit history, diagnoses, procedures, pain scale, and functional limitations." },
      { type: "step", text: "Enter the patient's **current pain scale** and **functional limitations** (difficulty sitting, lifting, work tasks, etc.) to personalize the note." },
      { type: "step", text: "Add **optional doctor notes** to include any extra findings or patient progress — use voice dictation or polish with AI." },
      { type: "step", text: "The note auto-populates **Subjective** (patient complaints, MVA details if auto/PI), **Objective** (exam findings with ROM degrees, orthopedic/neuro results), **Assessment** (diagnoses, causation statement for accidents), and **Plan** (treatment frequency, home care, goals)." },
      { type: "step", text: "Generated notes are stored in **SOAP Notes** page — searchable by patient and date, printable as PDF." },
      { type: "tip", text: "For **Auto/PI cases**, the SOAP note automatically includes causation language, mechanism of injury, and detailed documentation standards required by insurers." },
      { type: "tip", text: "Exams and visit history are merged intelligently — no manual copying needed." },
    ],
  },
  {
    id: "payments",
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    title: "Stripe Payments & Treatment Plans",
    subtitle: "Collect cash/card payments and offer pre-packaged treatment plans",
    steps: [
      { type: "step", text: "On a **cash visit claim**, the payment section shows the total due. Click **💵 Cash** or **💳 Credit Card** to log payment method." },
      { type: "step", text: "Click **Collect Payment (Stripe)** to open a secure Stripe checkout — patient pays with card, link expires after one use." },
      { type: "step", text: "Available **treatment plan products**: 6-visit plan ($325), 12-visit plan ($650), maintenance plans (monthly subscription), and individual services." },
      { type: "step", text: "After a successful payment, the receipt email is sent automatically — patient gets itemized charges and payment confirmation." },
      { type: "tip", text: "Stripe is live mode — all transactions are real. Include app ID in metadata for transaction tracking." },
      { type: "tip", text: "Checkout only works from a published app, not the preview — make sure to publish before collecting real payments." },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    title: "Office Settings",
    subtitle: "Practice info, billing credentials, and branding",
    steps: [
      { type: "step", text: "Fill in your **Practice Name, Address, Phone** — these appear on every printed form and emailed superbill." },
      { type: "step", text: "Enter your **Rendering NPI** and **EIN / Tax ID** — required fields on CMS-1500 and superbills." },
      { type: "step", text: "Set **Default Place of Service** (usually 11 for office) and **Default Claim Notes** to pre-fill every new claim." },
      { type: "step", text: "Customize **Receipt Header/Footer** and **Superbill Notes** to add your own messaging to patient documents." },
      { type: "tip", text: "Complete Office Settings first before building claims — the NPI and Tax ID are required for any valid insurance submission." },
    ],
  },
];

function Section({ section }) {
  const [open, setOpen] = useState(true);
  const Icon = section.icon;
  return (
    <div className={`border rounded-xl overflow-hidden ${section.bg}`}>
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className={`w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className={`w-5 h-5 ${section.color}`} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{section.title}</p>
          <p className="text-xs text-muted-foreground">{section.subtitle}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-2 bg-white/60">
          {section.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              {s.type === "step"
                ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                : <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />}
              <p
                className="leading-relaxed text-slate-700"
                dangerouslySetInnerHTML={{
                  __html: s.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpGuide() {
  const [search, setSearch] = useState("");
  const filtered = sections.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" /> Feature Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Step-by-step instructions for every feature. Updated as new features are added.</p>
      </div>

      <div className="relative">
        <input
          className="w-full border border-border rounded-lg px-4 py-2.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Search features..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map(s => <Section key={s.id} section={s} />)}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No matching sections found.</p>}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>This guide is updated automatically as new features and integrations are added to the app.</p>
      </div>
    </div>
  );
}