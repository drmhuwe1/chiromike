import { Label } from "@/components/ui/label";

const PAIN_AREAS = [
  { key: "neck", label: "Neck" },
  { key: "shoulders", label: "Shoulders" },
  { key: "mid_back", label: "Mid-Back" },
  { key: "low_back", label: "Low Back" },
  { key: "extremities", label: "Extremities" },
  { key: "headache", label: "Headache" },
  { key: "radiating", label: "Radiating Pain" },
  { key: "generalized", label: "Generalized" },
];

function PainScaleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex gap-0.5 flex-wrap">
        {[0,1,2,3,4,5,6,7,8,9,10].map(num => {
          const active = value === num.toString();
          let cls = "w-7 h-7 rounded border text-xs font-semibold transition-colors ";
          if (active) {
            if (num <= 3) cls += "bg-green-500 text-white border-green-600";
            else if (num <= 6) cls += "bg-amber-500 text-white border-amber-600";
            else cls += "bg-red-500 text-white border-red-600";
          } else {
            cls += "bg-white border-gray-300 hover:bg-gray-100";
          }
          return (
            <button key={num} type="button" onClick={() => onChange(num.toString())} className={cls}>
              {num}
            </button>
          );
        })}
        {value && (
          <button type="button" onClick={() => onChange("")} className="w-7 h-7 rounded border border-gray-200 text-xs text-gray-400 hover:bg-gray-100">✕</button>
        )}
      </div>
      {value && <span className="text-xs font-semibold ml-1">{value}/10</span>}
    </div>
  );
}

export default function PainAssessmentSection({ exam, onSet }) {
  // pain_area_scales is an object: { neck: "5", low_back: "7", ... }
  const areaScales = exam.pain_area_scales || {};

  const setAreaScale = (key, val) => {
    onSet("pain_area_scales", { ...areaScales, [key]: val });
  };

  // Active areas = those with a scale value set
  const activeAreas = PAIN_AREAS.filter(a => areaScales[a.key]);

  return (
    <div className="space-y-4">
      {/* Area selector */}
      <div>
        <Label className="text-sm mb-2 block">Select Pain Areas (click to activate scale):</Label>
        <div className="flex flex-wrap gap-2">
          {PAIN_AREAS.map(area => {
            const active = !!areaScales[area.key];
            return (
              <button
                key={area.key}
                type="button"
                onClick={() => {
                  if (active) {
                    const updated = { ...areaScales };
                    delete updated[area.key];
                    onSet("pain_area_scales", updated);
                  } else {
                    setAreaScale(area.key, "0");
                  }
                }}
                className={`px-3 py-1 text-xs border rounded transition-colors ${active ? 'bg-red-100 text-red-700 border-red-300 font-semibold' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
              >
                {area.label} {active ? `(${areaScales[area.key]}/10)` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-area pain scales */}
      {activeAreas.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Rate each area (0 = no pain, 10 = worst):</p>
          {activeAreas.map(area => (
            <PainScaleRow
              key={area.key}
              label={area.label}
              value={areaScales[area.key] || ""}
              onChange={val => setAreaScale(area.key, val)}
            />
          ))}
        </div>
      )}

      {/* Overall / summary */}
      {activeAreas.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">Summary: </span>
          {activeAreas.map(a => `${a.label} ${areaScales[a.key]}/10`).join(" · ")}
        </div>
      )}
    </div>
  );
}