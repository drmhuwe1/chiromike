import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Building, Upload, X, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PayerProfilesTab from "../components/settings/PayerProfilesTab";

export default function OfficeSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = async () => {
    const all = await base44.entities.OfficeSettings.list("-updated_date", 1);
    setSettings(all[0] || {
      practice_name: "Huwe Chiropractic",
      billing_address_line1: "", billing_address_line2: "",
      billing_city: "", billing_state: "", billing_zip: "",
      phone: "", fax: "",
      rendering_provider: "", rendering_npi: "",
      billing_provider: "", billing_npi: "",
      ein_tax_id: "", taxonomy_code: "",
      default_place_of_service: "11",
      default_claim_notes: "",
      receipt_header: "Huwe Chiropractic",
      receipt_footer: "Thank you for your visit!",
      superbill_notes: "",
    });
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const set = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (settings.id) {
      await base44.entities.OfficeSettings.update(settings.id, settings);
    } else {
      const created = await base44.entities.OfficeSettings.create(settings);
      setSettings(created);
    }
    toast({ title: "Settings saved" });
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Office Settings</h1>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </Button>
      </div>

      <Tabs defaultValue="practice">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="practice">Practice Info</TabsTrigger>
          <TabsTrigger value="billing">Billing Provider</TabsTrigger>
          <TabsTrigger value="payers">Payer Profiles</TabsTrigger>
          <TabsTrigger value="receipts">Receipts & Superbills</TabsTrigger>
        </TabsList>

        <TabsContent value="practice">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Building className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Practice Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Practice Name</Label>
                <Input value={settings.practice_name || ""} onChange={e => set("practice_name", e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={settings.phone || ""} onChange={e => set("phone", e.target.value)} />
              </div>
              <div>
                <Label>Fax</Label>
                <Input value={settings.fax || ""} onChange={e => set("fax", e.target.value)} />
              </div>
              <div>
                <Label>Default Place of Service</Label>
                <Input value={settings.default_place_of_service || ""} onChange={e => set("default_place_of_service", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Address Line 1</Label>
                <Input value={settings.billing_address_line1 || ""} onChange={e => set("billing_address_line1", e.target.value)} />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input value={settings.billing_address_line2 || ""} onChange={e => set("billing_address_line2", e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={settings.billing_city || ""} onChange={e => set("billing_city", e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={settings.billing_state || ""} onChange={e => set("billing_state", e.target.value)} />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input value={settings.billing_zip || ""} onChange={e => set("billing_zip", e.target.value)} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-4">
            {/* Primary Provider */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Primary Billing / Rendering Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Rendering Provider Name</Label>
                  <Input value={settings.rendering_provider || ""} onChange={e => set("rendering_provider", e.target.value)} />
                </div>
                <div>
                  <Label>Rendering NPI</Label>
                  <Input value={settings.rendering_npi || ""} onChange={e => set("rendering_npi", e.target.value)} />
                </div>
                <div>
                  <Label>Billing Provider Name</Label>
                  <Input value={settings.billing_provider || ""} onChange={e => set("billing_provider", e.target.value)} />
                </div>
                <div>
                  <Label>Billing NPI</Label>
                  <Input value={settings.billing_npi || ""} onChange={e => set("billing_npi", e.target.value)} />
                </div>
                <div>
                  <Label>EIN / Tax ID</Label>
                  <Input value={settings.ein_tax_id || ""} onChange={e => set("ein_tax_id", e.target.value)} />
                </div>
                <div>
                  <Label>Taxonomy Code</Label>
                  <Input value={settings.taxonomy_code || ""} onChange={e => set("taxonomy_code", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Default Claim Notes</Label>
                <Textarea value={settings.default_claim_notes || ""} onChange={e => set("default_claim_notes", e.target.value)} rows={3} />
              </div>
            </div>

            {/* Additional Providers */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Additional Billing Providers</h2>
                <Button size="sm" variant="outline" onClick={() => {
                  const providers = [...(settings.additional_providers || []), { provider_name: "", npi: "", ein_tax_id: "", taxonomy_code: "", is_default: false }];
                  set("additional_providers", providers);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Provider
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">These providers will be selectable when printing claims, receipts, and superbills.</p>
              {(!settings.additional_providers || settings.additional_providers.length === 0) ? (
                <p className="text-sm text-muted-foreground italic">No additional providers added yet.</p>
              ) : (
                <div className="space-y-4">
                  {(settings.additional_providers || []).map((prov, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-4 space-y-3 relative">
                      <button
                        onClick={() => {
                          const providers = (settings.additional_providers || []).filter((_, i) => i !== idx);
                          set("additional_providers", providers);
                        }}
                        className="absolute top-3 right-3 text-destructive hover:opacity-70"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                        <div>
                          <Label>Provider Name</Label>
                          <Input value={prov.provider_name || ""} onChange={e => {
                            const providers = [...(settings.additional_providers || [])];
                            providers[idx] = { ...providers[idx], provider_name: e.target.value };
                            set("additional_providers", providers);
                          }} />
                        </div>
                        <div>
                          <Label>NPI</Label>
                          <Input value={prov.npi || ""} onChange={e => {
                            const providers = [...(settings.additional_providers || [])];
                            providers[idx] = { ...providers[idx], npi: e.target.value };
                            set("additional_providers", providers);
                          }} />
                        </div>
                        <div>
                          <Label>EIN / Tax ID</Label>
                          <Input value={prov.ein_tax_id || ""} onChange={e => {
                            const providers = [...(settings.additional_providers || [])];
                            providers[idx] = { ...providers[idx], ein_tax_id: e.target.value };
                            set("additional_providers", providers);
                          }} />
                        </div>
                        <div>
                          <Label>Taxonomy Code</Label>
                          <Input value={prov.taxonomy_code || ""} onChange={e => {
                            const providers = [...(settings.additional_providers || [])];
                            providers[idx] = { ...providers[idx], taxonomy_code: e.target.value };
                            set("additional_providers", providers);
                          }} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={!!prov.is_default} onChange={e => {
                          const providers = (settings.additional_providers || []).map((p, i) => ({
                            ...p, is_default: i === idx ? e.target.checked : false
                          }));
                          set("additional_providers", providers);
                        }} className="accent-primary" />
                        Set as default for printing
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payers">
          <PayerProfilesTab />
        </TabsContent>

        <TabsContent value="receipts">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Receipts & Superbills</h2>
            <div>
              <Label>Practice Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">Displayed at the top of printed superbills and receipts</p>
              {settings.logo_url ? (
                <div className="flex items-center gap-3">
                  <img src={settings.logo_url} alt="Logo" className="h-16 max-w-[200px] object-contain border border-border rounded p-1 bg-white" />
                  <button onClick={() => set("logo_url", "")} className="text-destructive hover:opacity-70 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" /> Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:bg-muted transition-colors text-sm text-muted-foreground">
                    <Upload className="w-4 h-4" /> Upload Logo (PNG, JPG)
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    set("logo_url", file_url);
                  }} />
                </label>
              )}
            </div>
            <div>
              <Label>Receipt Header Text</Label>
              <Textarea value={settings.receipt_header || ""} onChange={e => set("receipt_header", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Receipt Footer Text</Label>
              <Textarea value={settings.receipt_footer || ""} onChange={e => set("receipt_footer", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Superbill Notes</Label>
              <Textarea value={settings.superbill_notes || ""} onChange={e => set("superbill_notes", e.target.value)} rows={3} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}