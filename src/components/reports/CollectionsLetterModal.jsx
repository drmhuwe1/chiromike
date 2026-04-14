import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Download, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CollectionsLetterModal({ patient, claims, payments, onClose }) {
  const [printing, setPrinting] = useState(false);
  const { toast } = useToast();

  if (!patient) return null;

  // Calculate balance
  const totalCharge = claims.reduce((s, c) => s + (c.total_charge || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.payment_amount || 0), 0);
  const balance = totalCharge - totalPaid;

  // Get visit dates
  const visitDates = claims.map(c => c.date_of_service).sort().reverse();

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Collections Letter</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Letter Preview */}
        <div className="bg-white border border-border rounded-lg p-8 font-serif text-sm leading-relaxed space-y-4 print-area">
          <div className="text-center text-xs text-muted-foreground mb-6">
            [Your Practice Letterhead Would Appear Here]
          </div>

          <div className="text-right text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>

          <div className="space-y-1 text-xs">
            <p className="font-semibold">{patient.first_name} {patient.last_name}</p>
            <p>{patient.address_line1}</p>
            {patient.address_line2 && <p>{patient.address_line2}</p>}
            <p>{patient.city}, {patient.state} {patient.zip}</p>
          </div>

          <div className="pt-4">
            <p>Dear {patient.first_name},</p>
          </div>

          <div className="space-y-3">
            <p>
              We write to you regarding your outstanding account balance with our office. We truly value the opportunity to have cared for you and appreciate your trust in our practice.
            </p>

            <p>
              According to our records, we have provided you with chiropractic care and treatment services. The details of your account are summarized below:
            </p>

            <div className="bg-muted/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Total Charges:</span>
                <span className="font-semibold">${totalCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payments Received:</span>
                <span className="font-semibold">${totalPaid.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Amount Due:</span>
                <span className="text-red-600">${balance.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                <p>Date Range: {visitDates.length > 0 ? `${visitDates[visitDates.length - 1]} to ${visitDates[0]}` : "N/A"}</p>
                <p>Total Visits: {claims.length}</p>
              </div>
            </div>

            <p>
              We understand that unforeseen circumstances can sometimes make it difficult to keep accounts current. However, we must request that this outstanding balance be resolved promptly. Your prompt attention to this matter is essential and greatly appreciated.
            </p>

            <p>
              <strong>Payment Options:</strong> We accept cash, check, credit card, and electronic transfers. If you have any questions about your account or need to discuss a payment arrangement, please contact our billing department at your earliest convenience. We are here to help and want to work with you to resolve this matter.
            </p>

            <p>
              If we do not receive payment or hear from you within 15 days of this letter, we may pursue additional collection measures, which could affect your credit rating. We would prefer to resolve this matter cooperatively and avoid such action.
            </p>

            <p>
              Thank you for your prompt attention to this important matter. We look forward to continuing to serve your healthcare needs.
            </p>

            <div className="pt-6 space-y-1">
              <p>Sincerely,</p>
              <div className="h-12"></div>
              <p className="text-xs">Billing Department</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="w-4 h-4 mr-2" /> Print Letter
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}