import { Link } from "react-router-dom";
import { Stethoscope, ClipboardList, CreditCard, Calendar } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm">Skip to main content</a>
      <header className="w-full border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary">ChiroMike</Link>
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <Link to="/about" className="text-foreground hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms</Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <section>
          <h1 className="text-3xl font-bold tracking-tight mb-3">About ChiroMike</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            ChiroMike is the all-in-one chiropractic practice management system built exclusively for
            Huwe Chiropractic. It streamlines claim entry, billing, patient records, and scheduling
            into a single, fast, HIPAA-compliant platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-5">What ChiroMike Does</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: ClipboardList, title: "Claim Builder", desc: "Fast CMS-1500 claim entry with insurance, auto, and cash visit support." },
              { icon: CreditCard, title: "Patient Billing", desc: "Stripe-powered payment collection, package tracking, and ERA posting." },
              { icon: Stethoscope, title: "Clinical Documentation", desc: "AI-assisted SOAP notes, new patient exams, and re-examination forms." },
              { icon: Calendar, title: "Scheduling", desc: "Google Calendar integration for appointment sync and reminders." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-sm text-muted-foreground">
            Have questions?{" "}
            <Link to="/contact" className="text-primary hover:underline font-medium">Contact us</Link>
            {" "}or review our{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            {" "}and{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-card mt-12 py-4 px-6 text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} Huwe Chiropractic — ChiroMike &nbsp;·&nbsp;
        <Link to="/privacy" className="hover:underline">Privacy</Link> &nbsp;·&nbsp;
        <Link to="/terms" className="hover:underline">Terms</Link> &nbsp;·&nbsp;
        <Link to="/contact" className="hover:underline">Contact</Link>
      </footer>
    </div>
  );
}