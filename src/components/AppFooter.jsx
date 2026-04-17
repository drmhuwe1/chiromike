import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="border-t border-border bg-card py-3 px-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2 no-print">
      <span>© {new Date().getFullYear()} Huwe Chiropractic — ChiroMike</span>
      <nav aria-label="Footer navigation" className="flex gap-4">
        <Link to="/" className="hover:text-foreground transition-colors">Dashboard</Link>
        <Link to="/patients" className="hover:text-foreground transition-colors">Patients</Link>
        <Link to="/claim-builder" className="hover:text-foreground transition-colors">New Claim</Link>
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        <Link to="/baa" className="hover:text-foreground transition-colors">BAA</Link>
        <Link to="/sla" className="hover:text-foreground transition-colors">SLA</Link>
      </nav>
    </footer>
  );
}