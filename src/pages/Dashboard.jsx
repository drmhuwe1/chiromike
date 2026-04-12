import { Link } from "react-router-dom";
import { 
  FileText, Car, DollarSign, Users, BookOpen, 
  Settings, BarChart3, Zap 
} from "lucide-react";

const quickActions = [
  { label: "New Insurance Claim", icon: FileText, path: "/claim-builder?type=Insurance", color: "bg-primary" },
  { label: "New Auto Claim", icon: Car, path: "/claim-builder?type=Auto", color: "bg-amber-600" },
  { label: "New Cash Visit", icon: DollarSign, path: "/claim-builder?type=Cash", color: "bg-accent" },
  { label: "Patients", icon: Users, path: "/patients", color: "bg-indigo-600" },
  { label: "Saved Claims", icon: BookOpen, path: "/saved-claims", color: "bg-slate-600" },
  { label: "Quick Templates", icon: Zap, path: "/templates", color: "bg-purple-600" },
  { label: "Reports", icon: BarChart3, path: "/reports", color: "bg-rose-600" },
  { label: "Office Settings", icon: Settings, path: "/settings", color: "bg-gray-700" },
];

export default function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to ChiroMike</h1>
        <p className="text-muted-foreground mt-1">Fast chiropractic claim entry for Huwe Chiropractic</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.path}
              className="group relative flex flex-col items-center justify-center p-6 rounded-xl bg-card border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-14 h-14 rounded-xl ${action.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm font-semibold text-center">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}