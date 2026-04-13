import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing"); // "processing", "success", "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);

  const sessionId = searchParams.get("session_id");
  const claimId = searchParams.get("claim_id");
  const patientId = searchParams.get("patient_id");
  const dosDate = searchParams.get("dos");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !claimId) {
        setStatus("error");
        setErrorMsg("Missing payment details");
        return;
      }

      try {
        // Call backend to verify and record payment
        const res = await base44.functions.invoke("verifyStripePayment", {
          session_id: sessionId,
          claim_id: claimId,
          patient_id: patientId,
          date_of_service: dosDate,
        });

        setPaymentDetails(res.data);
        setStatus("success");
      } catch (e) {
        setStatus("error");
        setErrorMsg(e.message || "Payment verification failed");
      }
    };

    verifyPayment();
  }, [sessionId, claimId, patientId, dosDate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">
        {status === "processing" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Processing Payment</h1>
              <p className="text-muted-foreground">Please wait while we verify your payment...</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Payment Received</h1>
              <p className="text-muted-foreground">Thank you for your payment!</p>
            </div>

            {paymentDetails && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold">${(paymentDetails.amount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-xs">{paymentDetails.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              ✓ Receipt has been emailed to the patient
            </div>

            <Button onClick={() => navigate("/saved-claims")} className="w-full h-11 bg-green-600 hover:bg-green-700">
              View All Claims
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Payment Error</h1>
              <p className="text-destructive">{errorMsg}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Go Back
              </Button>
              <Button onClick={() => navigate("/claim-builder")} className="flex-1">
                New Visit
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}