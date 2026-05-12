import { Link } from "react-router-dom";

export default function Terms() {
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
            <Link to="/privacy" className="text-foreground/70 hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="text-foreground hover:text-primary transition-colors">Terms</Link>
          </div>
        </nav>
      </div>
      <main id="main-content" className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <Link to="/" className="text-sm text-primary hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold mt-3">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: May 12, 2026</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Authorized Use</h2>
        <p className="text-sm text-muted-foreground">Access to ChiroMike is restricted to authorized personnel of Huwe Chiropractic. Unauthorized access is strictly prohibited.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Data Responsibility</h2>
        <p className="text-sm text-muted-foreground">Users are responsible for the accuracy of data entered into the system. All clinical and billing data must comply with applicable healthcare regulations including HIPAA.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. Security</h2>
        <p className="text-sm text-muted-foreground">Users must keep their login credentials confidential and immediately report any suspected unauthorized access to the system administrator.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground">Huwe Chiropractic and ChiroMike are not liable for data loss, billing errors, or other damages resulting from system misuse or third-party outages.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. Changes</h2>
        <p className="text-sm text-muted-foreground">These terms may be updated at any time. Continued use of the system constitutes acceptance of the current terms.</p>
      </section>
      </main>
    </div>
  );
}