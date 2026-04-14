import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Loader2, CheckCircle, Upload } from "lucide-react";

export default function InsuranceCardScanner({ onExtracted, onPhotoUploaded }) {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const cameraFrontRef = useRef(null);
  const cameraBackRef = useRef(null);

  const handleScan = async (file, side) => {
    if (!file) return;
    setScanning(true);
    setError("");
    setDone(false);

    // Upload photo
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onPhotoUploaded(side, file_url);

    // Only extract data from front
    if (side === "front") {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `This is a photo of a health insurance card (front). Extract all visible insurance information accurately.
Return the data as JSON. If a field is not visible or unclear, return null for that field.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            insurance_company: { type: "string" },
            insurance_plan: { type: "string" },
            insurance_id: { type: "string" },
            insurance_group: { type: "string" },
            insured_name: { type: "string" },
            insured_employer: { type: "string" },
            edi_payer_id: { type: "string" },
            phone: { type: "string" }
          }
        }
      });

      const cleaned = Object.fromEntries(
        Object.entries(result).filter(([_, v]) => v !== null && v !== "")
      );
      onExtracted(cleaned);
      setDone(true);
    }

    setScanning(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {["front", "back"].map(side => (
          <div key={side}>
            <input
              ref={side === "front" ? frontRef : backRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleScan(e.target.files[0], side)}
            />
            <input
              ref={side === "front" ? cameraFrontRef : cameraBackRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleScan(e.target.files[0], side)}
            />
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => (side === "front" ? cameraFrontRef : cameraBackRef).current?.click()}
                disabled={scanning}
                className="w-full border-2 border-dashed border-border rounded-lg p-3 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Camera className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium">Camera</span>
              </button>
              <button
                type="button"
                onClick={() => (side === "front" ? frontRef : backRef).current?.click()}
                disabled={scanning}
                className="w-full border-2 border-dashed border-border rounded-lg p-3 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-medium">Upload</span>
              </button>
              <p className="text-xs text-muted-foreground text-center capitalize">{side} of Card</p>
            </div>
          </div>
        ))}
      </div>

      {scanning && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Scanning card and extracting insurance information...
        </div>
      )}
      {done && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4" />
          Insurance info extracted! Review the fields below and make any corrections.
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}