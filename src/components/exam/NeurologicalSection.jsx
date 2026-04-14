import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import VoiceDictation from "../VoiceDictation";

const b = {
  green: "px-2 py-0.5 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200",
  blue: "px-2 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200",
  amber: "px-2 py-0.5 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200",
  red: "px-2 py-0.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200",
  purple: "px-2 py-0.5 text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200",
};

const FIELDS = [
  {
    key: "dtr_cervical",
    label: "DTR Cervical",
    buttons: [
      { label: "2+ Normal", value: "2+ normal bilaterally", cls: b.green },
      { label: "1+ Diminished", value: "1+ diminished bilaterally", cls: b.blue },
      { label: "1+ Left", value: "1+ diminished left, 2+ normal right", cls: b.blue },
      { label: "1+ Right", value: "1+ diminished right, 2+ normal left", cls: b.blue },
      { label: "3+ Brisk", value: "3+ brisk/hyperactive bilaterally", cls: b.amber },
      { label: "4+ Clonus", value: "4+ hyperactive with clonus present", cls: b.red },
      { label: "0 Absent", value: "0 absent bilaterally", cls: b.red },
    ],
  },
  {
    key: "dtr_lumbar",
    label: "DTR Lumbar",
    buttons: [
      { label: "2+ Normal", value: "2+ normal bilaterally", cls: b.green },
      { label: "1+ Diminished", value: "1+ diminished bilaterally", cls: b.blue },
      { label: "1+ Left", value: "1+ diminished left, 2+ normal right", cls: b.blue },
      { label: "1+ Right", value: "1+ diminished right, 2+ normal left", cls: b.blue },
      { label: "3+ Brisk", value: "3+ brisk/hyperactive bilaterally", cls: b.amber },
      { label: "0 Absent", value: "0 absent bilaterally", cls: b.red },
    ],
  },
  {
    key: "sensory",
    label: "Sensory Testing",
    buttons: [
      { label: "Intact Bilateral", value: "Intact bilaterally to light touch and pinprick", cls: b.green },
      { label: "↓ C5", value: "Diminished in C5 dermatome (lateral arm/deltoid)", cls: b.blue },
      { label: "↓ C6", value: "Diminished in C6 dermatome (lateral forearm, thumb/index)", cls: b.blue },
      { label: "↓ C7", value: "Diminished in C7 dermatome (middle finger)", cls: b.blue },
      { label: "↓ C8", value: "Diminished in C8 dermatome (ring/little finger)", cls: b.blue },
      { label: "↓ L3", value: "Diminished in L3 dermatome (anterior thigh)", cls: b.blue },
      { label: "↓ L4", value: "Diminished in L4 dermatome (medial leg)", cls: b.blue },
      { label: "↓ L5", value: "Diminished in L5 dermatome (lateral leg/dorsum foot)", cls: b.blue },
      { label: "↓ S1", value: "Diminished in S1 dermatome (lateral foot/plantar)", cls: b.blue },
      { label: "Absent Left", value: "Absent on left side", cls: b.red },
      { label: "Absent Right", value: "Absent on right side", cls: b.red },
    ],
  },
  {
    key: "motor_strength",
    label: "Motor Strength",
    buttons: [
      { label: "5/5 Bilateral", value: "5/5 bilateral upper and lower extremities", cls: b.green },
      { label: "4/5 Bilateral", value: "4/5 bilateral – mild weakness", cls: b.blue },
      { label: "4/5 Left UE", value: "4/5 left upper extremity – mild weakness", cls: b.blue },
      { label: "4/5 Right UE", value: "4/5 right upper extremity – mild weakness", cls: b.blue },
      { label: "4/5 Left LE", value: "4/5 left lower extremity – mild weakness", cls: b.blue },
      { label: "4/5 Right LE", value: "4/5 right lower extremity – mild weakness", cls: b.blue },
      { label: "3/5 Mod Weak", value: "3/5 moderate weakness – active movement against gravity only", cls: b.amber },
      { label: "2/5 Severe", value: "2/5 severe weakness – movement only with gravity eliminated", cls: b.red },
    ],
  },
  {
    key: "cranial_nerves",
    label: "Cranial Nerves",
    buttons: [
      { label: "II-XII Intact", value: "Cranial nerves II-XII grossly intact bilaterally", cls: b.green },
      { label: "I Anosmia", value: "CN I deficit – anosmia (loss of smell)", cls: b.amber },
      { label: "II Vision ↓", value: "CN II deficit – visual acuity decreased; visual field defect noted", cls: b.amber },
      { label: "III/IV/VI Oculomotor", value: "CN III/IV/VI deficit – abnormal extraocular movements; diplopia noted", cls: b.amber },
      { label: "V Trigeminal", value: "CN V deficit – facial sensation decreased; trigeminal neuralgia pattern", cls: b.amber },
      { label: "VII Facial", value: "CN VII deficit – facial weakness/asymmetry; Bell's palsy pattern", cls: b.amber },
      { label: "VIII Vestibulocochlear", value: "CN VIII deficit – hearing loss/tinnitus/vertigo noted", cls: b.amber },
      { label: "IX/X Glossopharyngeal/Vagal", value: "CN IX/X deficit – dysphagia, hoarseness, diminished gag reflex", cls: b.amber },
      { label: "XI Accessory", value: "CN XI deficit – weakness in SCM and trapezius", cls: b.amber },
      { label: "XII Hypoglossal", value: "CN XII deficit – tongue deviation on protrusion; dysarthria", cls: b.amber },
    ],
  },
  {
    key: "pathological_signs",
    label: "Pathological Signs",
    buttons: [
      { label: "All Negative", value: "Babinski, Hoffman, clonus – all negative", cls: b.green },
      { label: "Babinski +", value: "Babinski positive – great toe dorsiflexion with fan sign (UMN lesion)", cls: b.red },
      { label: "Babinski Bilateral", value: "Babinski bilaterally positive (bilateral UMN lesion)", cls: b.red },
      { label: "Hoffman +", value: "Hoffman's sign positive – thumb/index flexion on middle finger flick (cervical myelopathy)", cls: b.red },
      { label: "Hoffman Bilateral", value: "Hoffman's sign bilaterally positive (bilateral cervical myelopathy)", cls: b.red },
      { label: "Clonus +", value: "Clonus present at ankle – sustained rhythmic contractions (UMN pathology)", cls: b.red },
      { label: "Oppenheim +", value: "Oppenheim sign positive – extensor response on tibial stroking (UMN lesion)", cls: b.red },
      { label: "Gordon +", value: "Gordon reflex positive – great toe extension on calf squeeze (UMN lesion)", cls: b.purple },
      { label: "Chaddock +", value: "Chaddock sign positive – dorsiflexion of great toe on lateral foot stroke", cls: b.purple },
      { label: "Inverted Radial +", value: "Inverted radial reflex positive – finger flexion on brachioradialis tap (C5-C6 myelopathy)", cls: b.red },
    ],
  },
];

export default function NeurologicalSection({ findings, onSet }) {
  const setField = (key, value) => onSet(`neurological_findings.${key}`, value);

  return (
    <div className="space-y-3">
      {/* Quick fill all normal */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick Fill All Normal:</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => { setField("dtr_cervical", "2+ normal bilaterally"); setField("dtr_lumbar", "2+ normal bilaterally"); }} className={b.green}>DTRs Normal</button>
          <button type="button" onClick={() => setField("sensory", "Intact bilaterally to light touch and pinprick")} className={b.green}>Sensory Intact</button>
          <button type="button" onClick={() => setField("motor_strength", "5/5 bilateral upper and lower extremities")} className={b.green}>Motor 5/5</button>
          <button type="button" onClick={() => setField("cranial_nerves", "Cranial nerves II-XII grossly intact bilaterally")} className={b.green}>CN Intact</button>
          <button type="button" onClick={() => setField("pathological_signs", "Babinski, Hoffman, clonus – all negative")} className={b.green}>Path Signs Negative</button>
        </div>
      </div>

      {FIELDS.map(field => (
        <div key={field.key}>
          <Label className="text-xs font-semibold">{field.label}</Label>
          <div className="flex flex-wrap gap-1 mt-1 mb-1">
            {field.buttons.map(btn => (
              <button
                key={btn.label}
                type="button"
                onClick={() => setField(field.key, btn.value)}
                className={`${btn.cls} ${findings?.[field.key] === btn.value ? 'ring-2 ring-offset-1 ring-current font-bold' : ''}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              className="flex-1 min-h-[40px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={findings?.[field.key] || ""}
              onChange={e => setField(field.key, e.target.value)}
              placeholder={findings?.[field.key] ? "" : "Or type custom..."}
              rows={1}
            />
            <VoiceDictation label="🎤" onTranscript={t => setField(field.key, findings?.[field.key] ? findings[field.key] + ' ' + t : t)} />
          </div>
        </div>
      ))}
    </div>
  );
}