import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  FileText, Users, BookOpen, 
  Settings, BarChart3, Zap, Calendar, Wallet, Bell, X, ChevronRight
} from "lucide-react";

const quickActions = [
  { label: "Patients", icon: Users, path: "/patients", color: "bg-indigo-600" },
  { label: "New Claim", icon: FileText, path: "/claim-builder", color: "bg-primary" },
  { label: "Patient Account", icon: Wallet, path: "/patient-account", color: "bg-green-600" },
  { label: "New Patient Exam", icon: FileText, path: "/new-patient-exam", color: "bg-purple-600" },
  { label: "Re-Exam", icon: FileText, path: "/re-examination", color: "bg-blue-600" },
  { label: "SOAP Notes", icon: FileText, path: "/soap-notes", color: "bg-indigo-500" },
  { label: "Calendar", icon: Calendar, path: "/calendar", color: "bg-teal-600" },
  { label: "Saved Claims", icon: BookOpen, path: "/saved-claims", color: "bg-slate-600" },
  { label: "Quick Templates", icon: Zap, path: "/templates", color: "bg-pink-600" },
  { label: "Reports", icon: BarChart3, path: "/reports", color: "bg-rose-600" },
  { label: "Office Settings", icon: Settings, path: "/settings", color: "bg-gray-700" },
];

// Track which intake patient IDs have been dismissed this session
const DISMISSED_KEY = "chiromike_dismissed_intakes";

function IntakeBanner() {
  const [newPatients, setNewPatients] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    // Check for intake_form patients created in the last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    base44.entities.Patient.list("-created_date", 50).then(patients => {
      const recent = patients.filter(p =>
        p.intake_source === "intake_form" &&
        p.created_date > since &&
        !dismissed.includes(p.id)
      );
      setNewPatients(recent);
    }).catch(() => {});
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    setNewPatients(prev => prev.filter(p => p.id !== id));
  };

  if (newPatients.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {newPatients.map(patient => (
        <div key={patient.id} className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              New intake: {patient.first_name} {patient.last_name}
            </p>
            <p className="text-xs text-blue-700">
              Submitted {new Date(patient.created_date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              {patient.chief_complaint ? ` · ${patient.chief_complaint.slice(0, 60)}${patient.chief_complaint.length > 60 ? "…" : ""}` : ""}
            </p>
          </div>
          <Link
            to="/patients"
            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
          >
            View <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => dismiss(patient.id)} className="text-blue-400 hover:text-blue-700 ml-1" title="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <img src="https://media.base44.com/images/public/69dbc37eaf437642fe866557/b98a22851_ChatGPTImageApr13202611_09_56PM.png" alt="ChiroMike Logo" className="h-20 w-20 object-contain" width="80" height="80" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to ChiroMike</h1>
          <p className="text-muted-foreground mt-1">Fast chiropractic claim entry for Huwe Chiropractic</p>
        </div>
      </div>

      <IntakeBanner />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.path}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 md:flex-col md:items-center md:justify-center md:p-6 md:text-center"
            >
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0 md:mb-3 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              <span className="text-sm font-semibold">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}