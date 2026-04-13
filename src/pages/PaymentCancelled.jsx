import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 text-amber-600" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground">You cancelled the payment process. Your visit information has been saved as a draft.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          You can continue editing this visit later or try payment again whenever you're ready.
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate("/claim-builder")} className="w-full h-11">
            Continue Editing Visit
          </Button>
          <Button variant="outline" onClick={() => navigate("/saved-claims")} className="w-full">
            View Saved Claims
          </Button>
        </div>
      </div>
    </div>
  );
}