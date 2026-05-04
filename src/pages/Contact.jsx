import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm">Skip to main content</a>
      <header className="w-full border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary">ChiroMike</Link>
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="text-foreground hover:text-primary transition-colors">Contact</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms</Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <section>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Contact Us</h1>
          <p className="text-muted-foreground">Reach out to Huwe Chiropractic for appointments or support.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm mb-0.5">Practice Address</h2>
              <p className="text-sm text-muted-foreground">Huwe Chiropractic<br />Contact the office for current address</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm mb-0.5">Phone</h2>
              <p className="text-sm text-muted-foreground">Please call the office directly for appointments and inquiries.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm mb-0.5">Platform Support</h2>
              <p className="text-sm text-muted-foreground">
                For ChiroMike system support, visit{" "}
                <a href="https://base44.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">base44.com</a>.
              </p>
            </div>
          </div>
        </section>

        <p className="text-sm text-muted-foreground">
          Learn more on our{" "}
          <Link to="/about" className="text-primary hover:underline font-medium">About page</Link>
          {" "}or review our{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </main>

      <footer className="border-t border-border bg-card mt-12 py-4 px-6 text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} Huwe Chiropractic — ChiroMike &nbsp;·&nbsp;
        <Link to="/privacy" className="hover:underline">Privacy</Link> &nbsp;·&nbsp;
        <Link to="/terms" className="hover:underline">Terms</Link> &nbsp;·&nbsp;
        <Link to="/about" className="hover:underline">About</Link>
      </footer>
    </div>
  );
}