import { BadgeCheck, AlertTriangle } from "lucide-react";

const PLAN_DETAILS = {
  "Maintenance Plan": { amount: "$150/mo", description: "Perfect for consistent care" },
  "Wellness Plan":    { amount: "$200/mo", description: "Enhanced therapeutic care" },
  "Family Plan":      { amount: "$300/mo", description: "Flexible for families" },
};

export default function MembershipAlertBanner({ patient }) {
  if (!patient) return null;

  const { membership_status, membership_plan } = patient;

  if (membership_status === "active" && membership_plan) {
    const details = PLAN_DETAILS[membership_plan] || {};
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-300 rounded-xl px-4 py-2.5">
        <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div>
          <span className="font-semibold text-blue-800 text-sm">Active Membership: {membership_plan}</span>
          <span className="text-blue-600 text-xs ml-2">({details.amount} — {details.description})</span>
        </div>
      </div>
    );
  }

  if (membership_status === "cancelled" && membership_plan) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-2.5">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <span className="font-semibold text-red-700 text-sm">Membership Cancelled: {membership_plan} Plan</span>
          <span className="text-red-500 text-xs ml-2">— Patient no longer has an active membership.</span>
        </div>
      </div>
    );
  }

  return null;
}