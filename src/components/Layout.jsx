import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, FileText, Settings, BookOpen, 
  Library, Zap, BarChart3, Menu, X, Wallet, HelpCircle, ShieldCheck, ClipboardList, Stethoscope
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/patients", label: "Patients", icon: Users },
  { path: "/patient-account", label: "Patient Account", icon: Users },
  { path: "/claim-builder", label: "New Claim", icon: FileText },
  { path: "/new-patient-exam", label: "New Patient Exam", icon: Stethoscope },
  { path: "/saved-claims", label: "Saved Claims", icon: BookOpen },
  { path: "/code-library", label: "Code Library", icon: Library },
  { path: "/templates", label: "Quick Templates", icon: Zap },
  { path: "/billing", label: "Billing Dashboard", icon: Wallet },
  { path: "/soap-notes", label: "SOAP Notes", icon: ClipboardList },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/financial-reports", label: "Financial Reports", icon: Wallet },
  { path: "/guide", label: "Feature Guide", icon: HelpCircle },
  { path: "/compliance", label: "HIPAA Compliance", icon: ShieldCheck },
  { path: "/settings", label: "Office Settings", icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        bg-sidebar text-sidebar-foreground
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight">
            ChiroMike
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">Huwe Chiropractic</p>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 lg:px-6 shrink-0">
          <button 
            className="lg:hidden mr-3 p-1.5 rounded-md hover:bg-muted"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm text-muted-foreground">
            {navItems.find(n => n.path === location.pathname)?.label || "ChiroMike"}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}