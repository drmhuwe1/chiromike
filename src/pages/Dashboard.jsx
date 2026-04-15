import { Link } from "react-router-dom";
import { 
  FileText, Car, DollarSign, Users, BookOpen, 
  Settings, BarChart3, Zap, Calendar, Wallet
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

export default function Dashboard() {
  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <img src="https://media.base44.com/images/public/69dbc37eaf437642fe866557/b98a22851_ChatGPTImageApr13202611_09_56PM.png" alt="ChiroMike Logo" className="h-20 w-auto" width="80" height="80" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to ChiroMike</h1>
          <p className="text-muted-foreground mt-1">Fast chiropractic claim entry for Huwe Chiropractic</p>
        </div>
      </div>

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