import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import BodyPainMap from "../components/intake/BodyPainMap";
import InsuranceCardScanner from "../components/intake/InsuranceCardScanner";

const STEPS = ["Personal Info", "Current Condition", "Health History", "Insurance", "Consent"];

const HEALTH_CONDITIONS = [
  "Heart Disease", "High Blood Pressure", "Diabetes", "Arthritis", "Osteoporosis",
  "Cancer", "Stroke", "Epilepsy / Seizures", "Asthma", "Thyroid Disorder",
  "Kidney Disease", "Liver Disease", "Depression / Anxiety", "Fibromyalgia",
  "Herniated Disc", "Scoliosis", "Prior Fractures", "Pacemaker / Implants"
];

const FAMILY_CONDITIONS = [
  "Heart Disease", "High Blood Pressure", "Diabetes", "Cancer", "Stroke",
  "Arthritis", "Osteoporosis", "Mental Health Conditions", "Scoliosis"
];

const PAIN_FREQUENCIES = ["Constant", "Frequent", "Occasional", "Rare"];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i < current ? "bg-primary text-primary-foreground" :
            i === current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
            "bg-muted text-muted-foreground"
          }`}>
            {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${i < current ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );
}

function CheckGroup({ items, selected, onChange }) {
  const toggle = (item) => {
    if (selected.includes(item)) onChange(selected.filter(i => i !== item));
    else onChange([...selected, item]);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(item => (
        <label key={item} className="flex items-center gap-2 cursor-pointer group">
          <Checkbox checked={selected.includes(item)} onCheckedChange={() => toggle(item)} />
          <span className="text-sm group-hover:text-foreground transition-colors">{item}</span>
        </label>
      ))}
    </div>
  );
}

export default function PatientIntake() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    // Personal
    first_name: "", last_name: "", dob: "", sex: "",
    address_line1: "", city: "", state: "", zip: "",
    phone: "", email: "",
    occupation: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "Spouse",
    how_heard: "",
    // Condition
    chief_complaint: "", pain_scale: 5, pain_areas: [],
    pain_description: "", pain_onset: "", pain_frequency: "",
    is_accident_related: false, accident_date: "", accident_state: "", accident_type: "",
    // Health History
    health_history: [], health_history_other: "",
    current_medications: "", allergies: "", surgeries: "",
    family_history: [], family_history_other: "",
    // Insurance
    insurance_company: "", insurance_plan: "", insurance_id: "",
    insurance_group: "", insured_name: "", insured_dob: "",
    relationship_to_insured: "Self",
    insurance_card_photo_front: "", insurance_card_photo_back: "",
    // Consent
    hipaa_consent: false,
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const validateStep = () => {
    const errs = {};
    if (step === 0) {
      if (!form.first_name.trim()) errs.first_name = "Required";
      if (!form.last_name.trim()) errs.last_name = "Required";
      if (!form.dob) errs.dob = "Required";
      if (!form.phone.trim()) errs.phone = "Required";
    }
    if (step === 4) {
      if (!form.hipaa_consent) errs.hipaa_consent = "You must agree to continue";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    await base44.entities.Patient.create({
      ...form,
      active: true,
      intake_source: "intake_form",
      intake_completed_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-4">
            Your new patient intake has been submitted successfully. Our team will review your information before your appointment.
          </p>
          <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
            If you have any questions, please call our office directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">New Patient Intake Form</h1>
          <p className="text-slate-500 text-sm mt-1">Huwe Chiropractic — Please complete all sections</p>
        </div>

        <StepIndicator current={step} />

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <h2 className="text-lg font-semibold border-b pb-2">{STEPS[step]}</h2>

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name *</Label>
                  <Input value={form.first_name} onChange={e => set("first_name", e.target.value)} className={errors.first_name ? "border-destructive" : ""} />
                  {errors.first_name && <p className="text-xs text-destructive mt-0.5">{errors.first_name}</p>}
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={form.last_name} onChange={e => set("last_name", e.target.value)} className={errors.last_name ? "border-destructive" : ""} />
                  {errors.last_name && <p className="text-xs text-destructive mt-0.5">{errors.last_name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date of Birth *</Label>
                  <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} className={errors.dob ? "border-destructive" : ""} />
                  {errors.dob && <p className="text-xs text-destructive mt-0.5">{errors.dob}</p>}
                </div>
                <div>
                  <Label>Sex</Label>
                  <Select value={form.sex} onValueChange={v => set("sex", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input placeholder="Street address" value={form.address_line1} onChange={e => set("address_line1", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => set("city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="TX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ZIP</Label>
                  <Input value={form.zip} onChange={e => set("zip", e.target.value)} />
                </div>
                <div>
                  <Label>Cell Phone *</Label>
                  <Input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} className={errors.phone ? "border-destructive" : ""} />
                  {errors.phone && <p className="text-xs text-destructive mt-0.5">{errors.phone}</p>}
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input value={form.occupation} onChange={e => set("occupation", e.target.value)} />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Select value={form.emergency_contact_relation} onValueChange={v => set("emergency_contact_relation", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Friend">Friend</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>How did you hear about us?</Label>
                    <Input value={form.how_heard} onChange={e => set("how_heard", e.target.value)} placeholder="e.g. Google, friend..." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Current Condition */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>What brings you in today? (Chief Complaint)</Label>
                <Textarea value={form.chief_complaint} onChange={e => set("chief_complaint", e.target.value)} rows={2} placeholder="Describe your main reason for visiting..." />
              </div>

              <div>
                <Label>Pain Scale: <span className="text-primary font-bold">{form.pain_scale}/10</span></Label>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground">0 (No Pain)</span>
                  <input type="range" min="0" max="10" step="1" value={form.pain_scale}
                    onChange={e => set("pain_scale", parseInt(e.target.value))}
                    className="flex-1 accent-primary" />
                  <span className="text-xs text-muted-foreground">10 (Worst)</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Mark Your Pain Areas</Label>
                <BodyPainMap selected={form.pain_areas} onChange={v => set("pain_areas", v)} />
              </div>

              <div>
                <Label>Describe the pain</Label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {["Sharp", "Dull", "Burning", "Throbbing", "Stabbing", "Radiating", "Tingling", "Numbness", "Aching", "Cramping"].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const current = form.pain_description ? form.pain_description + ", " : "";
                          set("pain_description", current + type);
                        }}
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                          form.pain_description?.includes(type)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <Textarea value={form.pain_description} onChange={e => set("pain_description", e.target.value)} rows={2}
                    placeholder="Or describe in your own words..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>When did it start?</Label>
                  <Input type="date" value={form.pain_onset} onChange={e => set("pain_onset", e.target.value)} />
                </div>
                <div>
                  <Label>How often?</Label>
                  <Select value={form.pain_frequency} onValueChange={v => set("pain_frequency", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {PAIN_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={form.is_accident_related} onCheckedChange={v => set("is_accident_related", v)} />
                  <span className="font-medium">Is this condition related to an accident?</span>
                </label>
                {form.is_accident_related && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <div>
                      <Label>Date of Accident</Label>
                      <Input type="date" value={form.accident_date} onChange={e => set("accident_date", e.target.value)} />
                    </div>
                    <div>
                      <Label>Accident Type</Label>
                      <Select value={form.accident_type} onValueChange={v => set("accident_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Auto">Auto</SelectItem>
                          <SelectItem value="Work">Work</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>State of Accident</Label>
                      <Input value={form.accident_state} onChange={e => set("accident_state", e.target.value)} placeholder="e.g. TX" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Health History */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-base font-medium mb-3 block">Have you ever been diagnosed with or treated for any of the following?</Label>
                <CheckGroup items={HEALTH_CONDITIONS} selected={form.health_history} onChange={v => set("health_history", v)} />
                <div className="mt-3">
                  <Label>Other</Label>
                  <Input value={form.health_history_other} onChange={e => set("health_history_other", e.target.value)} placeholder="List any other conditions..." />
                </div>
              </div>

              <div>
                <Label>Current Medications</Label>
                <Textarea value={form.current_medications} onChange={e => set("current_medications", e.target.value)} rows={2}
                  placeholder="List all medications and supplements..." />
              </div>

              <div>
                <Label>Allergies</Label>
                <Input value={form.allergies} onChange={e => set("allergies", e.target.value)} placeholder="e.g. Penicillin, latex, none" />
              </div>

              <div>
                <Label>Prior Surgeries / Hospitalizations</Label>
                <Textarea value={form.surgeries} onChange={e => set("surgeries", e.target.value)} rows={2}
                  placeholder="List any surgeries with approximate dates..." />
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-medium mb-3 block">Family Health History</Label>
                <p className="text-sm text-muted-foreground mb-3">Has anyone in your immediate family (parents, siblings) had:</p>
                <CheckGroup items={FAMILY_CONDITIONS} selected={form.family_history} onChange={v => set("family_history", v)} />
                <div className="mt-3">
                  <Label>Other</Label>
                  <Input value={form.family_history_other} onChange={e => set("family_history_other", e.target.value)} placeholder="Other family history..." />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Insurance */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label className="text-base font-medium mb-2 block">Upload Insurance Card (optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">Take a photo of your insurance card and we'll fill in the details automatically.</p>
                <InsuranceCardScanner
                  onExtracted={(data) => setForm(prev => ({ ...prev, ...data }))}
                  onPhotoUploaded={(side, url) => set(side === "front" ? "insurance_card_photo_front" : "insurance_card_photo_back", url)}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Insurance Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Insurance Company</Label>
                    <Input value={form.insurance_company} onChange={e => set("insurance_company", e.target.value)} />
                  </div>
                  <div>
                    <Label>Member/Insurance ID</Label>
                    <Input value={form.insurance_id} onChange={e => set("insurance_id", e.target.value)} />
                  </div>
                  <div>
                    <Label>Group Number</Label>
                    <Input value={form.insurance_group} onChange={e => set("insurance_group", e.target.value)} />
                  </div>
                  <div>
                    <Label>Plan Name</Label>
                    <Input value={form.insurance_plan} onChange={e => set("insurance_plan", e.target.value)} />
                  </div>
                  <div>
                    <Label>Relationship to Insured</Label>
                    <Select value={form.relationship_to_insured} onValueChange={v => set("relationship_to_insured", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self">Self</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.relationship_to_insured !== "Self" && (
                    <>
                      <div>
                        <Label>Insured Name</Label>
                        <Input value={form.insured_name} onChange={e => set("insured_name", e.target.value)} />
                      </div>
                      <div>
                        <Label>Insured DOB</Label>
                        <Input type="date" value={form.insured_dob} onChange={e => set("insured_dob", e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Consent */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-3 max-h-64 overflow-y-auto">
                <p className="font-semibold">HIPAA Notice of Privacy Practices</p>
                <p>Huwe Chiropractic is required by law to maintain the privacy of your protected health information (PHI) and to provide you with notice of our legal duties and privacy practices.</p>
                <p><strong>How we use your information:</strong> Your health information may be used for treatment, payment, and healthcare operations. We may share your information with other treating providers, your insurance company for billing purposes, and as required by law.</p>
                <p><strong>Your rights:</strong> You have the right to request access to your health information, request corrections, receive a copy of this notice, and file a complaint if you believe your privacy rights have been violated.</p>
                <p><strong>Data Security:</strong> Your information is stored securely with industry-standard encryption and is only accessible to authorized staff.</p>
                <p><strong>Contact:</strong> For questions about this notice or your privacy rights, please contact our office directly.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    By submitting this form, you acknowledge that the information provided is accurate and complete to the best of your knowledge.
                  </p>
                </div>
              </div>

              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-colors ${form.hipaa_consent ? "border-primary bg-primary/5" : "border-border"}`}>
                <Checkbox checked={form.hipaa_consent} onCheckedChange={v => set("hipaa_consent", v)} className="mt-0.5" />
                <span className="text-sm font-medium">I have read and understand the HIPAA Notice of Privacy Practices and consent to the collection and use of my health information as described above. *</span>
              </label>
              {errors.hipaa_consent && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.hipaa_consent}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={back} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? "Submitting..." : "Submit Intake Form"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          This form is protected and your information is kept confidential per HIPAA guidelines.
        </p>
      </div>
    </div>
  );
}