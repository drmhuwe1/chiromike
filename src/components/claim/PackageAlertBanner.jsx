import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package } from "lucide-react";
import PackageTrackerModal from "./PackageTrackerModal";

export default function PackageAlertBanner({ patient }) {
  const [packages, setPackages] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);

  const loadPackages = async () => {
    if (!patient?.id) return;
    const pkgs = await base44.entities.PatientPackage.filter(
      { patient_id: patient.id, status: "active" },
      "-purchase_date",
      10
    );
    setPackages(pkgs);
  };

  useEffect(() => {
    loadPackages();
  }, [patient?.id]);

  if (!patient || packages.length === 0) return null;

  const colorMap = {
    "Laser Package": "blue",
    "Adjustment Package": "green",
    "Laser Lipo Package": "purple",
  };

  const styleMap = {
    blue: "bg-blue-50 border-blue-300 text-blue-800",
    green: "bg-green-50 border-green-300 text-green-800",
    purple: "bg-purple-50 border-purple-300 text-purple-800",
  };

  const btnMap = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    purple: "bg-purple-600 hover:bg-purple-700",
  };

  return (
    <>
      {packages.map(pkg => {
        const color = colorMap[pkg.package_type] || "blue";
        const remaining = (pkg.total_visits || 0) - (pkg.visits_used || 0);
        return (
          <div key={pkg.id} className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-2.5 ${styleMap[color]}`}>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-sm">{pkg.package_type}</span>
              <span className="text-xs">— {pkg.visits_used || 0}/{pkg.total_visits} visits used · <strong>{remaining} remaining</strong></span>
            </div>
            <button
              onClick={() => setSelectedPkg(pkg)}
              className={`text-xs text-white px-3 py-1 rounded-lg font-semibold ${btnMap[color]}`}
            >
              Track Visit
            </button>
          </div>
        );
      })}

      {selectedPkg && (
        <PackageTrackerModal
          pkg={selectedPkg}
          onClose={() => setSelectedPkg(null)}
          onUpdated={() => { setSelectedPkg(null); loadPackages(); }}
        />
      )}
    </>
  );
}