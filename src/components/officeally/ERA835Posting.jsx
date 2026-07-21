import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const currency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function ERA835Posting({ refreshKey = 0, onPosted }) {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [working, setWorking] = useState(false);
  const { toast } = useToast();

  const load = async () => setReports(await base44.entities.OfficeAllyReport.filter({ report_type: "835" }, "-retrieved_at", 100));
  useEffect(() => { load(); }, [refreshKey]);

  const previewReport = async (report) => {
    setSelected(report); setPreview(null); setWorking(true);
    try {
      const response = await base44.functions.invoke("process835", { report_id: report.id, action: "preview" });
      setPreview(response.data);
    } catch (error) { toast({ title: error.message || "Unable to parse 835", variant: "destructive" }); }
    finally { setWorking(false); }
  };

  const post = async () => {
    if (!selected || !preview?.safe_to_post) return;
    if (!window.confirm(`Post ${preview.transactions.length} matched 835 transaction(s)? Duplicate remittances will be skipped automatically.`)) return;
    setWorking(true);
    try {
      const response = await base44.functions.invoke("process835", { report_id: selected.id, action: "post" });
      toast({ title: `${response.data.posted} payment transaction(s) posted. ${response.data.skipped_duplicates || 0} duplicate(s) skipped.` });
      setPreview(null); setSelected(null); await load(); await onPosted?.();
    } catch (error) { toast({ title: error.message || "Unable to post 835", variant: "destructive" }); }
    finally { setWorking(false); }
  };

  return <div className="space-y-4">
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-900"><strong>Controlled auto-posting:</strong> preview and verify every claim match before posting. ChiroMike blocks posting when any claim control number is unmatched.</div>
    <div className="border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-3">Retrieved</th><th className="text-left p-3">835 File</th><th className="text-left p-3">Status</th><th className="text-right p-3">Action</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id} className="border-t"><td className="p-3">{report.retrieved_at?.slice(0, 10)}</td><td className="p-3 font-mono text-xs">{report.filename}</td><td className="p-3"><Badge variant="secondary">{report.posting_status || (report.posting_confirmed ? "Posted" : "Not Processed")}</Badge></td><td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => previewReport(report)} disabled={working || report.posting_confirmed}><FileCheck2 className="w-4 h-4 mr-2" />Preview</Button></td></tr>)}{!reports.length && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No 835 files retrieved from Office Ally yet.</td></tr>}</tbody></table></div>
    {working && <div className="flex justify-center p-6"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>}
    {preview && <div className="border rounded-xl p-4 space-y-3"><div className="flex items-center gap-2">{preview.safe_to_post ? <CheckCircle2 className="text-emerald-600" /> : <AlertTriangle className="text-red-600" />}<strong>{preview.transactions.length} transaction(s); {preview.unmatched.length} unmatched</strong></div><div className="max-h-72 overflow-y-auto border rounded-lg"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-2">Control #</th><th className="text-left p-2">Matched Patient</th><th className="text-right p-2">Charge</th><th className="text-right p-2">Payment</th></tr></thead><tbody>{preview.transactions.map((transaction, index) => <tr key={`${transaction.patient_control_number}-${index}`} className="border-t"><td className="p-2 font-mono text-xs">{transaction.patient_control_number}</td><td className={`p-2 ${transaction.matched_claim_id ? "" : "text-red-600 font-semibold"}`}>{transaction.patient_name || "UNMATCHED — review required"}</td><td className="p-2 text-right">{currency(transaction.total_charge)}</td><td className="p-2 text-right">{currency(transaction.payment_amount)}</td></tr>)}</tbody></table></div><div className="flex justify-end"><Button onClick={post} disabled={!preview.safe_to_post || working}>Post Matched 835 Payments</Button></div></div>}
  </div>;
}
