import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Shield, Server, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function OfficeAllySettings() {
  const [settings, setSettings] = useState({
    submitter_id: "",
    practice_name: "",
    billing_npi: "",
    ein_tax_id: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    sftp_host: "",
    sftp_port: "22",
    sftp_username: "",
    sftp_inbound_folder: "/inbound",
    sftp_outbound_folder: "/outbound",
    submission_mode: "Manual Upload",
    sftp_configured: false,
  });
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = async () => {
    const res = await base44.functions.invoke('officeAllySettings', { action: 'get' });
    if (res.data?.settings) {
      setSettings(prev => ({ ...prev, ...res.data.settings }));
    }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const set = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...settings };
    if (newPassword.trim()) {
      payload.sftp_password_plain = newPassword.trim();
    }
    const res = await base44.functions.invoke('officeAllySettings', { action: 'save', data: payload });
    if (res.data?.settings) {
      setSettings(prev => ({ ...prev, ...res.data.settings }));
      setNewPassword("");
    }
    toast({ title: "Office Ally settings saved" });
    setSaving(false);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Office Ally Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your Office Ally integration for electronic claim submission.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Submission Mode Banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${settings.submission_mode === 'Manual Upload' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
        {settings.submission_mode === 'Manual Upload' ? (
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        ) : (
          <Server className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold">{settings.submission_mode === 'Manual Upload' ? 'Manual Upload Mode (Recommended)' : 'Direct SFTP Mode'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {settings.submission_mode === 'Manual Upload'
              ? 'Generate 837P files and upload them manually at officeally.com. Simpler, safer, and works without SFTP approval.'
              : 'Files are transmitted directly to Office Ally via SFTP. Requires SFTP approval from Office Ally.'}
          </p>
        </div>
      </div>

      {/* Submitter Info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Office Ally Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Office Ally Submitter ID</Label>
            <Input value={settings.submitter_id || ""} onChange={e => set("submitter_id", e.target.value)} placeholder="Assigned by Office Ally" />
          </div>
          <div>
            <Label>Practice Name</Label>
            <Input value={settings.practice_name || ""} onChange={e => set("practice_name", e.target.value)} />
          </div>
          <div>
            <Label>Billing Provider NPI</Label>
            <Input value={settings.billing_npi || ""} onChange={e => set("billing_npi", e.target.value)} />
          </div>
          <div>
            <Label>Tax ID / EIN</Label>
            <Input value={settings.ein_tax_id || ""} onChange={e => set("ein_tax_id", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Practice Address</Label>
            <Input value={settings.address_line1 || ""} onChange={e => set("address_line1", e.target.value)} placeholder="Address Line 1" />
          </div>
          <div>
            <Label>Address Line 2</Label>
            <Input value={settings.address_line2 || ""} onChange={e => set("address_line2", e.target.value)} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={settings.city || ""} onChange={e => set("city", e.target.value)} />
          </div>
          <div>
            <Label>State</Label>
            <Input value={settings.state || ""} onChange={e => set("state", e.target.value)} maxLength={2} />
          </div>
          <div>
            <Label>ZIP</Label>
            <Input value={settings.zip || ""} onChange={e => set("zip", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Submission Mode */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold">Submission Mode</h2>
        <div>
          <Label>Default Submission Method</Label>
          <Select value={settings.submission_mode || "Manual Upload"} onValueChange={v => set("submission_mode", v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Manual Upload">Manual Upload (Recommended)</SelectItem>
              <SelectItem value="Direct SFTP">Direct SFTP</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Manual Upload is the default. Switch to Direct SFTP only after Office Ally approves your SFTP connection.</p>
        </div>
      </div>

      {/* SFTP Settings */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> SFTP Connection
          </h2>
          {settings.sftp_configured && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Credentials saved
            </span>
          )}
        </div>
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">SFTP credentials are encrypted before storage. The password is never shown after saving. All SFTP activity runs server-side only — never from the browser.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>SFTP Host</Label>
            <Input value={settings.sftp_host || ""} onChange={e => set("sftp_host", e.target.value)} placeholder="sftp.officeally.com" />
          </div>
          <div>
            <Label>SFTP Port</Label>
            <Input value={settings.sftp_port || "22"} onChange={e => set("sftp_port", e.target.value)} placeholder="22" />
          </div>
          <div>
            <Label>SFTP Username</Label>
            <Input value={settings.sftp_username || ""} onChange={e => set("sftp_username", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>SFTP Password {settings.sftp_configured && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep existing)</span>}</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={settings.sftp_configured ? "Enter new password to change..." : "Enter SFTP password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {settings.sftp_configured && !newPassword && (
              <p className="text-xs text-emerald-700 mt-1">✓ Password is saved and encrypted. Not shown for security.</p>
            )}
          </div>
          <div>
            <Label>Inbound Folder (upload claims here)</Label>
            <Input value={settings.sftp_inbound_folder || "/inbound"} onChange={e => set("sftp_inbound_folder", e.target.value)} />
          </div>
          <div>
            <Label>Outbound Folder (response files here)</Label>
            <Input value={settings.sftp_outbound_folder || "/outbound"} onChange={e => set("sftp_outbound_folder", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="bg-muted/40 border border-border rounded-xl p-4 text-sm space-y-2">
        <p className="font-semibold">Getting Started with Office Ally</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
          <li>Register or log in at <a href="https://www.officeally.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">officeally.com</a>.</li>
          <li>Complete provider enrollment and obtain your Submitter ID.</li>
          <li>To enable SFTP, contact Office Ally support to request SFTP credentials.</li>
          <li>Until SFTP is approved, use Manual Upload mode (download 837P and upload at the portal).</li>
        </ol>
        <a href="https://www.officeally.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
          <ExternalLink className="w-3 h-3" /> Open Office Ally
        </a>
      </div>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}