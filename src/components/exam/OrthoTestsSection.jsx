import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import VoiceDictation from "../VoiceDictation";

const ALL_ORTHO_TESTS = [
  // Cervical
  "Spurling's (Cervical Compression)",
  "Cervical Distraction",
  "Cervical Compression",
  "Jackson's Compression",
  "Foraminal Compression",
  "Lhermitte's Sign",
  "Valsalva's Maneuver",
  "Shoulder Depression Test",
  "Bakody Sign (Shoulder Abduction Relief)",
  "Bikele's Sign",
  "Swallowing Test",
  "DeKleyn's Test",
  "Hautant's Test",
  "Vertebral Artery Test",
  "Soto Hall Test",
  "Brachial Plexus Tension Test",
  // Thoracic/Rib
  "Rib Compression Test",
  "Thoracic Compression Test",
  "Adam's Forward Bend Test",
  "Chest Expansion Test",
  // Lumbar/Sacral
  "SLR (Straight Leg Raise)",
  "Braggard's Test",
  "Well Leg Raise (Cross SLR)",
  "Milgram's Test",
  "Neri's Bowing Sign",
  "Kemp's Test",
  "Ely's Test",
  "Thomas Test",
  "Nachlas Test",
  "Prone Knee Bend",
  "Yeoman's Test",
  "Belt Test",
  "Bowstring Sign",
  "Fajersztajn's Test",
  "Cox Sign",
  "Lasegue's Sign",
  "Hyper-extension Test",
  // SI / Pelvis
  "Patrick's Test (FABER)",
  "Gaenslen's Test",
  "Yeoman's SI Test",
  "ASIS Compression Test",
  "Gillet's March Test",
  "Sacroiliac Stress Test",
  "Mennell's Sign",
  // Hip
  "Ober's Test",
  "Thomas Test (Hip Flexor)",
  "Trendelenburg Test",
  "Hip Scouring Test",
  "Anvil Test",
  // Knee
  "McMurray's Test",
  "Lachman's Test",
  "Anterior Drawer (Knee)",
  "Posterior Drawer (Knee)",
  "Valgus Stress Test",
  "Varus Stress Test",
  "Apley's Compression Test",
  "Apley's Distraction Test",
  "Clarke's Sign (Patella Grind)",
  "Patellar Apprehension Test",
  // Shoulder
  "Apprehension Test",
  "Neer's Impingement Sign",
  "Hawkins-Kennedy Test",
  "Drop Arm Test",
  "Speed's Test",
  "Yergason's Test",
  "AC Compression Test",
  "Empty Can Test",
  "Sulcus Sign",
  // Wrist/Hand
  "Finkelstein's Test",
  "Phalen's Test",
  "Tinel's Sign (Wrist)",
  "Carpal Tunnel Compression Test",
  // Ankle/Foot
  "Thompson's Test",
  "Tinel's Sign (Ankle)",
  "Drawer Test (Ankle)",
  // Neurological/Special
  "Romberg's Test",
  "Babinski's Sign",
  "Hoffman's Sign",
  "Adson's Maneuver",
  "Halstead's Maneuver",
  "Allen Test",
  "Roos Test (EAST)",
  "Slump Test",
  "Quadrant Test",
];

// Per-test result options: { label, value, color }
// color: 'green' | 'blue' | 'amber' | 'red'
const TEST_RESULTS = {
  default: [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "Positive", value: "Positive", color: "red" },
  ],
  "Spurling's (Cervical Compression)": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Pain Local", value: "Positive – local cervical pain reproduced", color: "amber" },
    { label: "+ Radiculopathy", value: "Positive – radicular pain/paresthesia reproduced down arm", color: "red" },
  ],
  "Cervical Distraction": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Relief", value: "Positive – pain relieved with distraction (foraminal stenosis suspected)", color: "blue" },
    { label: "+ Reproduction", value: "Positive – pain reproduced with distraction", color: "amber" },
  ],
  "Cervical Compression": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Local Pain", value: "Positive – local cervical pain on compression", color: "amber" },
    { label: "+ Radicular", value: "Positive – radicular symptoms reproduced on compression", color: "red" },
  ],
  "Jackson's Compression": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Ipsilateral", value: "Positive – ipsilateral radiculopathy reproduced", color: "red" },
    { label: "+ Local Only", value: "Positive – local neck pain only", color: "amber" },
  ],
  "SLR (Straight Leg Raise)": [
    { label: "Negative", value: "Negative (no symptoms <70°)", color: "green" },
    { label: "+ <30°", value: "Positive at <30° – severe disc herniation suspected", color: "red" },
    { label: "+ 30-50°", value: "Positive at 30-50° – disc herniation likely", color: "red" },
    { label: "+ 50-70°", value: "Positive at 50-70° – nerve root irritation", color: "amber" },
    { label: "Equivocal", value: "Equivocal – hamstring tightness vs radiculopathy", color: "blue" },
  ],
  "Braggard's Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Sciatic", value: "Positive – sciatic pain reproduced with dorsiflexion", color: "red" },
    { label: "+ Hamstring", value: "Positive – hamstring pain only, not sciatic distribution", color: "amber" },
  ],
  "Well Leg Raise (Cross SLR)": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "Positive", value: "Positive – contralateral radiculopathy reproduced (central/paramedian disc herniation)", color: "red" },
  ],
  "Kemp's Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Local Pain", value: "Positive – local lumbar pain reproduced", color: "amber" },
    { label: "+ Radicular", value: "Positive – radicular symptoms reproduced into lower extremity", color: "red" },
  ],
  "Patrick's Test (FABER)": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ SI Joint", value: "Positive – SI joint pain reproduced", color: "amber" },
    { label: "+ Hip Joint", value: "Positive – hip joint pathology suspected", color: "amber" },
    { label: "+ Groin Pain", value: "Positive – groin/hip flexor pain reproduced", color: "blue" },
  ],
  "Gaenslen's Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "Positive", value: "Positive – SI joint pain reproduced ipsilaterally", color: "red" },
  ],
  "McMurray's Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Medial Meniscus", value: "Positive – medial meniscus tear suspected (pain/click on external rotation)", color: "red" },
    { label: "+ Lateral Meniscus", value: "Positive – lateral meniscus tear suspected (pain/click on internal rotation)", color: "red" },
    { label: "Click Only", value: "Click noted without pain – degenerative change possible", color: "amber" },
  ],
  "Apley's Compression Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Meniscal", value: "Positive – meniscal pathology (pain on compression + rotation)", color: "red" },
  ],
  "Apley's Distraction Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Ligamentous", value: "Positive – ligamentous injury suspected (pain on distraction)", color: "red" },
  ],
  "Lachman's Test": [
    { label: "Negative", value: "Negative – firm endpoint", color: "green" },
    { label: "+ Grade 1", value: "Positive Grade 1 – 3-5mm translation, firm endpoint (ACL sprain)", color: "amber" },
    { label: "+ Grade 2", value: "Positive Grade 2 – 5-10mm translation, soft endpoint", color: "red" },
    { label: "+ Grade 3", value: "Positive Grade 3 – >10mm translation, no endpoint (complete ACL tear)", color: "red" },
  ],
  "Neer's Impingement Sign": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Impingement", value: "Positive – subacromial impingement reproduced", color: "red" },
  ],
  "Hawkins-Kennedy Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Supraspinatus", value: "Positive – supraspinatus impingement/tendinopathy", color: "red" },
  ],
  "Drop Arm Test": [
    { label: "Negative", value: "Negative – maintained throughout arc", color: "green" },
    { label: "Positive", value: "Positive – unable to maintain arm at 90°, rotator cuff tear suspected", color: "red" },
  ],
  "Adson's Maneuver": [
    { label: "Negative", value: "Negative – radial pulse maintained", color: "green" },
    { label: "+ TOS", value: "Positive – radial pulse diminished/absent (thoracic outlet syndrome suspected)", color: "red" },
  ],
  "Phalen's Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ CTS", value: "Positive – paresthesia in median nerve distribution within 60 seconds (carpal tunnel syndrome)", color: "red" },
  ],
  "Tinel's Sign (Wrist)": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ CTS", value: "Positive – paresthesia reproduced in median nerve distribution", color: "red" },
  ],
  "Babinski's Sign": [
    { label: "Negative (flexor)", value: "Negative – normal plantar flexion response", color: "green" },
    { label: "Positive (extensor)", value: "Positive – dorsiflexion of great toe with fan response (UMN lesion)", color: "red" },
  ],
  "Hoffman's Sign": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "Positive", value: "Positive – thumb/index flexion noted (UMN lesion/cervical myelopathy)", color: "red" },
  ],
  "Romberg's Test": [
    { label: "Negative", value: "Negative – stable with eyes closed", color: "green" },
    { label: "+ Mild", value: "Positive mild – mild sway with eyes closed", color: "amber" },
    { label: "+ Moderate", value: "Positive moderate – significant sway, proprioceptive deficit", color: "red" },
  ],
  "Valsalva's Maneuver": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Local Pain", value: "Positive – increased local spinal pain (increased intrathecal pressure)", color: "amber" },
    { label: "+ Radicular", value: "Positive – radicular symptoms reproduced (disc herniation/space-occupying lesion)", color: "red" },
  ],
  "Nachlas Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Lumbar Pain", value: "Positive – ipsilateral lumbar/SI pain reproduced (SI or lumbar pathology)", color: "amber" },
    { label: "+ Femoral Nerve", value: "Positive – anterior thigh pain reproduced (femoral nerve irritation/upper lumbar disc)", color: "red" },
  ],
  "Ely's Test": [
    { label: "Negative", value: "Negative – hip remains on table", color: "green" },
    { label: "+ Rectus Femoris", value: "Positive – hip rises off table (rectus femoris tightness)", color: "amber" },
    { label: "+ Femoral Nerve", value: "Positive – anterior thigh pain reproduced (femoral nerve irritation)", color: "red" },
  ],
  "Milgram's Test": [
    { label: "Negative", value: "Negative – holds 30 seconds without symptoms", color: "green" },
    { label: "+ Intrathecal", value: "Positive – unable to hold/pain reproduced (intrathecal pathology)", color: "red" },
  ],
  "Slump Test": [
    { label: "Negative", value: "Negative", color: "green" },
    { label: "+ Dural", value: "Positive – symptoms reproduced with slump, relieved with cervical extension (dural tension)", color: "red" },
  ],
  "Thompson's Test": [
    { label: "Negative", value: "Negative – plantar flexion present", color: "green" },
    { label: "Positive", value: "Positive – no plantar flexion (Achilles tendon rupture)", color: "red" },
  ],
};

const btnCls = {
  green: "px-2 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200",
  blue: "px-2 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200",
  amber: "px-2 py-0.5 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200",
  red: "px-2 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200",
};

const QUICK_ADD = ["Spurling's (Cervical Compression)", "SLR (Straight Leg Raise)", "Kemp's Test", "Braggard's Test", "Patrick's Test (FABER)", "Cervical Distraction", "Valsalva's Maneuver", "Nachlas Test"];

export default function OrthoTestsSection({ tests, onUpdate, onRemove, onAdd }) {
  return (
    <div className="space-y-3">
      {/* Quick Add */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick Add:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADD.map(test => (
            <button
              key={test}
              type="button"
              onClick={() => onAdd(test)}
              className="px-2 py-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded hover:bg-primary/20 transition-colors"
            >
              + {test.replace(" (Cervical Compression)", "").replace(" (Straight Leg Raise)", "").replace(" (FABER)", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Full list dropdown */}
      <div className="flex gap-2 items-center">
        <select
          className="flex-1 border border-input rounded px-2 py-1.5 text-xs bg-background"
          value=""
          onChange={e => {
            if (!e.target.value) return;
            onAdd(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="">— Add from full list ({ALL_ORTHO_TESTS.length} tests) —</option>
          {ALL_ORTHO_TESTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="button"
          onClick={() => onAdd("")}
          className="px-2 py-1.5 text-xs border border-input rounded bg-background hover:bg-muted whitespace-nowrap flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Custom
        </button>
      </div>

      {/* Test rows */}
      {tests?.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          {tests.map((test, idx) => {
            const resultOptions = TEST_RESULTS[test.test_name] || TEST_RESULTS.default;
            return (
              <div key={idx} className="bg-muted/30 rounded-lg p-2 space-y-1.5">
                <div className="flex gap-2 items-center">
                  {test.test_name ? (
                    <span className="flex-1 text-sm font-medium truncate">{test.test_name}</span>
                  ) : (
                    <input
                      className="flex-1 border border-input rounded px-2 py-1 text-xs bg-background"
                      placeholder="Test name..."
                      value={test.test_name}
                      onChange={e => onUpdate(idx, "test_name", e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    className="text-destructive hover:text-destructive text-base font-bold px-1"
                    onClick={() => onRemove(idx)}
                  >×</button>
                </div>
                {/* Result buttons */}
                <div className="flex flex-wrap gap-1">
                  {resultOptions.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => onUpdate(idx, "result", opt.value)}
                      className={`${btnCls[opt.color]} ${test.result === opt.value ? 'ring-2 ring-offset-1 ring-current font-bold' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {test.result && (
                  <p className="text-xs text-muted-foreground italic">{test.result}</p>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Additional notes..."
                    className="flex-1 h-7 text-xs"
                    value={test.notes}
                    onChange={e => onUpdate(idx, "notes", e.target.value)}
                  />
                  <VoiceDictation label="🎤" onTranscript={t => onUpdate(idx, "notes", test.notes ? test.notes + ' ' + t : t)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}