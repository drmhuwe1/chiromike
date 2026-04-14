import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, CreditCard, PlusCircle, ChevronDown, ChevronUp, FileText, Loader2, RefreshCw } from "lucide-react";
import PatientStatementPrint from "./PatientStatementPrint";
import PaymentModal from "../payment/PaymentModal";
import PostPaymentModal from "./PostPaymentModal";
import { useToast } from "@/components/ui/use-toast";

export default function PatientAccountView({ patient }) {
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [postPaymentClaim, setPostPaymentClaim] = useState(null);
  const [expandedClaimId, setExpandedClaimId] = useState(null);
  const [soapNotes, setSoapNotes] = useState([]);
  const [generatingSoapNote, setGeneratingSoapNote] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [c, p, s, notes] = await Promise.all([
      base44.entities.Claim.filter({ patient_id: patient.id }, "-date_of_service", 500),
      base44.entities.Payment.filter({ patient_id: patient.id }, "-payment_date", 500),
      base44.entities.OfficeSettings.list("-updated_date", 1),
      base44.entities.SoapNote.filter({ patient_id: patient.id }, "-date_of_service", 50)
    ]);
    setClaims(c);
    setPayments(p);
    setOffice(s[0] || null);
    setSoapNotes(notes);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patient.id]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (startDate && c.date_of_service < startDate) return false;
      if (endDate && c.date_of_service > endDate) return false;
      return true;
    }).sort((a, b) => new Date(b.date_of_service) - new Date(a.date_of_service));
  }, [claims, startDate, endDate]);

  // Group payments by claim_id for per-row display
  // If a payment has no claim_id, try to match it to a claim by date_of_service
  const paymentsByClaimId = useMemo(() => {
    const map = {};
    // Build a DOS -> claim_id lookup
    const dosToClaim = {};
    claims.forEach(c => {
      if (c.date_of_service && !dosToClaim[c.date_of_service]) {
        dosToClaim[c.date_of_service] = c.id;
      }
    });
    payments.forEach(p => {
      const key = p.claim_id || dosToClaim[p.date_of_service] || "__unlinked__";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [payments, claims]);

  const filteredPayments = useMemo(() =>
    payments.filter(p => {
      if (startDate && p.payment_date < startDate) return false;
      if (endDate && p.payment_date > endDate) return false;
      return true;
    }),
    [payments, startDate, endDate]
  );

  const totalCharges = useMemo(() =>
    filteredClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0),
    [filteredClaims]
  );

  const totalPayments = useMemo(() =>
    filteredPayments.reduce((sum, p) => sum + (p.payment_amount || 0), 0),
    [filteredPayments]
  );

  const balance = totalCharges - totalPayments;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (showPrint) {
    return (
      <PatientStatementPrint
        patient={patient}
        office={office}
        claims={filteredClaims}
        payments={filteredPayments}
        onClose={() => setShowPrint(false)}
      />
    );
  }

  const mostRecentClaim = filteredClaims[0] || claims[0] || null;

  const handleGenerateSoapNote = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Please select both From and To dates", variant: "destructive" });
      return;
    }
    setGeneratingSoapNote(true);
    try {
      const res = await base44.functions.invoke("generateSoapNote", {
        patient_id: patient.id,
        date_from: startDate,
        date_to: endDate,
        form_type: "claim"
      });
      if (res.data) {
        setSoapNotes([res.data, ...soapNotes]);
        toast({ title: "SOAP note generated successfully" });
      }
    } catch (e) {
      toast({ title: e.message || "Failed to generate SOAP note", variant: "destructive" });
    }
    setGeneratingSoapNote(false);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-lg font-bold mb-1">{patient.first_name} {patient.last_name}</h2>
        <p className="text-sm text-muted-foreground">{patient.email} | {patient.phone}</p>
        {patient.insurance_company && (
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Insurance:</strong> {patient.insurance_company} {patient.insurance_id && `(${patient.insurance_id})`}
          </p>
        )}
      </div>

      {/* Date Filter & SOAP Note Generator */}
      <div className="bg-card border border-border rounded-xl p-4">
        <Label className="text-sm font-semibold mb-3 block">Filter by Date & Generate SOAP Notes</Label>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 h-9" />
          </div>
        </div>
        <Button
          onClick={handleGenerateSoapNote}
          disabled={generatingSoapNote || !startDate || !endDate}
          variant="outline"
          className="w-full gap-2"
        >
          {generatingSoapNote ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" /> Generate SOAP Note for Date Range
            </>
          )}
        </Button>
      </div>



      {/* Post Manual Payment Modal */}
      {postPaymentClaim && (
        <PostPaymentModal
          patient={patient}
          claim={postPaymentClaim === "general" ? null : postPaymentClaim}
          onClose={() => setPostPaymentClaim(null)}
          onSaved={() => { setPostPaymentClaim(null); load(); }}
        />
      )}

      {/* Stripe Payment Modal */}
      {showStripePayment && (
        <PaymentModal
          claim={mostRecentClaim || { id: null, date_of_service: new Date().toISOString().split("T")[0], total_charge: balance }}
          patient={patient}
          onClose={() => setShowStripePayment(false)}
          onSuccess={() => { setShowStripePayment(false); load(); }}
        />
      )}

      {/* Action Links */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <Button
          onClick={() => window.location.href = `/claim-builder?patient=${patient.id}`}
          className="gap-2"
        >
          <FileText className="w-4 h-4" /> New Claim
        </Button>
        <Button
          onClick={() => window.location.href = `/patient-account?patient=${patient.id}`}
          variant="outline"
          className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
        >
          <CreditCard className="w-4 h-4" /> Patient Statement
        </Button>
        <Button
          onClick={() => window.location.href = `/re-examination?patient=${patient.id}`}
          variant="outline"
          className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          <RefreshCw className="w-4 h-4" /> Re-Exam
        </Button>
      </div>
    </div>
  );
}