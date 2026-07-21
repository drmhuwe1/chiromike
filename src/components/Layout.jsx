import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, FileText, Settings, BookOpen, 
  Library, Zap, BarChart3, Menu, Wallet, HelpCircle, ShieldCheck, ClipboardList, Stethoscope, Calendar, LogOut, Activity, Send, BellRing, Lock
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import AppFooter from "./AppFooter";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/patients", label: "Patients", icon: Users },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/patient-account", label: "Patient Account", icon: Users },
  { path: "/claim-builder", label: "New Claim", icon: FileText },
  { path: "/new-patient-exam", label: "New Patient Exam", icon: Stethoscope },
  { path: "/re-examination", label: "Re-Examination", icon: Stethoscope },
  { path: "/saved-claims", label: "Saved Claims", icon: BookOpen },
  { path: "/code-library", label: "Code Library", icon: Library },
  { path: "/templates", label: "Quick Templates", icon: Zap },
  { path: "/billing", label: "Billing Dashboard", icon: Wallet },
  { path: "/task-center", label: "Task Center", icon: BellRing },
  { path: "/revenue-recovery", label: "Revenue Recovery", icon: BarChart3 },
  { path: "/ai-operations", label: "AI Operations Center", icon: Activity },
  { path: "/soap-notes", label: "SOAP Notes", icon: ClipboardList },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/financial-reports", label: "Financial Reports", icon: Wallet },
  { path: "/guide", label: "Feature Guide", icon: HelpCircle },
  { path: "/compliance", label: "HIPAA Compliance", icon: ShieldCheck },
  { path: "/settings", label: "Office Settings", icon: Settings },
  { path: "/office-ally", label: "Office Ally", icon: Send },
  { path: "/office-ally-settings", label: "Office Ally Settings", icon: Settings },
  { path: "/admin/stability", label: "Stability Monitor", icon: Activity },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip navigation for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
       fixed lg:static inset-y-0 left-0 z-40 w-64 min-h-screen
       bg-sidebar text-sidebar-foreground
       transform transition-transform duration-200 ease-in-out
       ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
       flex flex-col
      `}>
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight">
            ChiroMike
          </h1>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">Howe Chiropractic</p>
        </div>
        <div className="px-5 py-3 border-b border-sidebar-border">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>

        <nav aria-label="Sidebar navigation" className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto relative z-0">
          {navItems.filter(item => item.path !== "/admin/stability").map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          {/* Admin-only link — hidden from non-admin users */}
          {isAdmin && (
            <Link
              to="/admin/stability"
              onClick={() => setMobileOpen(false)}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 mt-2 border border-sidebar-border
                ${location.pathname === "/admin/stability"
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
              `}
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span className="truncate">Admin Center</span>
            </Link>
          )}
        </nav>
      </aside>

      {/* Main content */}
       <div className="flex-1 flex flex-col overflow-hidden">
         {/* Top bar */}
         <header role="banner" className="h-16 min-h-[64px] border-b border-border bg-card flex items-center px-4 lg:px-6 shrink-0 z-30">
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
        <main id="main-content" role="main" className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 lg:p-6 pb-6 lg:pb-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}