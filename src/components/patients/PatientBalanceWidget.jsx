import { useMemo } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function PatientBalanceWidget({ patientId, claims = [], payments = [] }) {
  const balance = useMemo(() => {
    const patientClaims = claims.filter(c => c.patient_id === patientId);
    const patientPayments = payments.filter(p => p.patient_id === patientId);

    const totalCharged = patientClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0);
    const totalPaid = patientPayments.reduce((sum, p) => sum + (p.payment_amount || 0), 0);

    return {
      totalCharged: totalCharged || 0,
      totalPaid: totalPaid || 0,
      balance: (totalCharged || 0) - (totalPaid || 0)
    };
  }, [patientId, claims, payments]);

  if (balance.balance === 0) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-sm font-semibold text-green-700">Paid</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {balance.balance > 0 ? (
        <>
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">${balance.balance.toFixed(2)} Due</span>
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">${Math.abs(balance.balance).toFixed(2)} Credit</span>
        </>
      )}
    </div>
  );
}