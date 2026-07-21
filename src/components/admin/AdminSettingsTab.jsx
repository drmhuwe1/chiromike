import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

const SETTINGS_KEY = "chiromike_admin_settings";

const DEFAULT_SETTINGS = {
  report_email: "",
  alert_email: "",
  backup_email: "",
  report_frequency: "weekly",
  alert_on_failure: true,
  alert_on_warning: false,
};

export default function AdminSettingsTab() {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; }
    catch { return DEFAULT_SETTINGS; }
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold">Report Settings</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Primary Report Email</Label>
            <Input className="mt-1" placeholder="admin@example.com" value={settings.report_email} onChange={e => set("report_email", e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Critical Alert Email</Label>
            <Input className="mt-1" placeholder="alerts@example.com" value={settings.alert_email} onChange={e => set("alert_email", e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Backup Email (optional)</Label>
            <Input className="mt-1" placeholder="backup@example.com" value={settings.backup_email} onChange={e => set("backup_email", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold">Report Frequency</h3>
        <div className="space-y-2">
          {["daily", "weekly", "monthly", "critical_only"].map(freq => (
            <label key={freq} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value={freq}
                checked={settings.report_frequency === freq}
                onChange={() => set("report_frequency", freq)}
                className="w-4 h-4"
              />
              <span className="text-sm capitalize">{freq.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold">Alert Settings</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.alert_on_failure} onChange={e => set("alert_on_failure", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Send immediate alert on critical failure</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.alert_on_warning} onChange={e => set("alert_on_warning", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Send alert on warnings</span>
          </label>
        </div>
      </div>

      <Button onClick={save} className="flex items-center gap-2">
        <Save className="w-4 h-4" />
        {saved ? "Saved!" : "Save Settings"}
      </Button>
    </div>
  );
}