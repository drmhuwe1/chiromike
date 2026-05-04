import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm">Skip to main content</a>
      <div role="banner" className="w-full bg-card border-b border-border shadow-sm">
        <header className="w-full min-h-[64px] flex items-center border-b border-border/60">
          <div className="max-w-4xl mx-auto px-6 py-4 w-full">
            <Link to="/" className="text-lg font-bold text-primary">ChiroMike</Link>
          </div>
        </header>
        <nav aria-label="Primary navigation" className="w-full px-6 py-2">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium">
            <Link to="/about" className="text-foreground/70 hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="text-foreground/70 hover:text-primary transition-colors">Contact</Link>
            <Link to="/privacy" className="text-foreground hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="text-foreground/70 hover:text-primary transition-colors">Terms</Link>
          </div>
        </nav>
      </div>
      <main id="main-content" className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <Link to="/" className="text-sm text-primary hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold mt-3">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: April 15, 2026</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Information We Collect</h2>
        <p className="text-sm text-muted-foreground">ChiroMike collects patient information, insurance data, and clinical documentation entered by authorized practitioners for the purpose of chiropractic practice management and billing.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. HIPAA Compliance</h2>
        <p className="text-sm text-muted-foreground">This application is operated in compliance with the Health Insurance Portability and Accountability Act (HIPAA). Protected Health Information (PHI) is stored securely and only accessible to authorized users.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. Cookies</h2>
        <p className="text-sm text-muted-foreground">We use essential cookies solely for authentication and session management. No third-party advertising or tracking cookies are used.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. Data Sharing</h2>
        <p className="text-sm text-muted-foreground">Patient data is never sold or shared with third parties except as required by law or for direct treatment and billing purposes with authorized payers.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. Contact</h2>
        <p className="text-sm text-muted-foreground">For privacy-related questions, contact Huwe Chiropractic directly.</p>
      </section>
      </main>
    </div>
  );
}