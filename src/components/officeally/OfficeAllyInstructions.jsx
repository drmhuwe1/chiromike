import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronRight, UploadCloud, Server, ExternalLink, Info,
  FileWarning, ClipboardCheck
} from "lucide-react";

const OA_SECURE_SITE = "https://cms.officeally.com";
const OA_SUBMISSION_GUIDE = "https://cms.officeally.com/OfficeAlly/Forms/Forms/File_Submission_Guidelines_20141126.pdf";
const OA_837P_COMPANION_GUIDE = "https://cms.officeally.com/OfficeAlly/Forms/Forms/OA-Professional-837P-Companion-Guide-20210930.pdf";
const OA_SERVICE_CENTER_MANUAL = "https://cms.officeally.com/OfficeAlly/Forms/Forms/OA_ServiceCenter_UserManual_r060822.pdf";
const OA_SFTP_SUPPORT = "https://support.officeally.com/claims/how-to-submit-claims-through-service-center";

export default function OfficeAllyInstructions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-blue-200 bg-blue-50/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-700" />
          <span className="font-semibold text-sm text-blue-900">How to Batch Submit Claims to Office Ally</span>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-blue-700" />
          : <ChevronRight className="w-4 h-4 text-blue-700" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-blue-900 border-t border-blue-200 bg-white/50">
          <p className="pt-3">
            <strong>Yes — Office Ally supports bulk uploads of multiple claims at once.</strong>{' '}
            This app generates <span className="font-semibold">ANSI X12 837P</span> batch files containing many claims
            in a single <code className="text-xs bg-blue-100 px-1 rounded">.edi</code> file you can upload to Office Ally.
          </p>

          {/* Method 1: Web Portal */}
          <div className="border border-blue-200 rounded-lg p-3 bg-white">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <UploadCloud className="w-4 h-4 text-blue-700" /> Method 1: Web Portal Manual Upload
            </h3>
            <p className="text-xs mb-2 text-blue-800">Use this method if you have not set up Direct SFTP.</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>In the table below, check the box next to each claim you want to include.</li>
              <li>Click <span className="font-semibold">"Batch Download 837P"</span> — a <code>.edi</code> file saves to your computer.</li>
              <li>Log into the <a href={OA_SECURE_SITE} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">Office Ally Secure Website <ExternalLink className="w-3 h-3" /></a>.</li>
              <li>Hover over the <span className="font-semibold">Upload Claims</span> menu and select <span className="font-semibold">Upload Professional File</span> (CMS-1500 / 837P).</li>
              <li>Click the blue file icon and choose your downloaded <code>.edi</code> file.</li>
              <li>Click <span className="font-semibold">Open / Upload</span>. You will see a confirmation once the batch uploads.</li>
              <li>Copy the <span className="font-semibold">Office Ally File ID</span> and (optionally) record it in the Submission History tab.</li>
            </ol>
          </div>

          {/* Method 2: SFTP */}
          <div className="border border-blue-200 rounded-lg p-3 bg-white">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-blue-700" /> Method 2: Direct SFTP
            </h3>
            <p className="text-xs mb-2 text-blue-800">For high-volume billing — drops files directly into Office Ally's INBOUND folder.</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Email Office Ally Support to request SFTP credentials if you don't already have them.</li>
              <li>Enter them under <span className="font-semibold">Office Ally Settings → Direct SFTP</span> in this app.</li>
              <li>Once the <span className="font-semibold">"Submit via SFTP"</span> button appears on this page, select your claims and click it — the app takes care of uploading the batch for you.</li>
              <li>Use the <span className="font-semibold">"Check Office Ally Reports (SFTP)"</span> button to pull back 277CA / 835 / 999 response files.</li>
            </ul>
          </div>

          {/* First-time rule */}
          <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 flex gap-2 items-start">
            <FileWarning className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-semibold">Important — First-Time Submission Rule:</span>{' '}
              Office Ally typically requires a minimum of <span className="font-semibold">10 claims</span> on your very first
              file submission so they can verify formatting. Submitting fewer claims on your first file may cause
              immediate rejection. Once approved, subsequent batches can be any size.
            </div>
          </div>

          {/* Supported file types */}
          <div className="border border-blue-200 rounded-lg p-3 bg-white">
            <h3 className="font-semibold flex items-center gap-2 mb-1 text-xs">
              <ClipboardCheck className="w-4 h-4 text-blue-700" /> Accepted by Office Ally
            </h3>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li>ANSI X12 837 files — <span className="font-semibold">837P</span> (Professional) / 837I (Institutional) — <em>this app produces 837P</em></li>
              <li>HCFA / CMS-1500 / UB-04 print image files</li>
              <li>Tab-delimited files</li>
            </ul>
          </div>

          {/* Reference links */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={OA_837P_COMPANION_GUIDE} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <ExternalLink className="w-3 h-3" /> 837P Companion Guide
              </Button>
            </a>
            <a href={OA_SUBMISSION_GUIDE} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <ExternalLink className="w-3 h-3" /> File Submission Guide
              </Button>
            </a>
            <a href={OA_SERVICE_CENTER_MANUAL} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <ExternalLink className="w-3 h-3" /> Service Center Manual
              </Button>
            </a>
            <a href={OA_SFTP_SUPPORT} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <ExternalLink className="w-3 h-3" /> OA Support (SFTP setup)
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}