import { useState } from "react";

const PAIN_REGIONS = [
  { id: "head", label: "Head", cx: 200, cy: 42, r: 28 },
  { id: "neck", label: "Neck", cx: 200, cy: 82, r: 14 },
  { id: "left_shoulder", label: "Left Shoulder", cx: 155, cy: 105, r: 18 },
  { id: "right_shoulder", label: "Right Shoulder", cx: 245, cy: 105, r: 18 },
  { id: "upper_back", label: "Upper Back", cx: 200, cy: 118, r: 22 },
  { id: "chest", label: "Chest", cx: 200, cy: 140, r: 22 },
  { id: "left_arm", label: "Left Arm", cx: 132, cy: 150, r: 18 },
  { id: "right_arm", label: "Right Arm", cx: 268, cy: 150, r: 18 },
  { id: "mid_back", label: "Mid Back", cx: 200, cy: 170, r: 20 },
  { id: "left_elbow", label: "Left Elbow", cx: 118, cy: 185, r: 14 },
  { id: "right_elbow", label: "Right Elbow", cx: 282, cy: 185, r: 14 },
  { id: "abdomen", label: "Abdomen", cx: 200, cy: 195, r: 22 },
  { id: "low_back", label: "Low Back", cx: 200, cy: 220, r: 22 },
  { id: "left_wrist", label: "Left Wrist", cx: 108, cy: 220, r: 12 },
  { id: "right_wrist", label: "Right Wrist", cx: 292, cy: 220, r: 12 },
  { id: "left_hip", label: "Left Hip", cx: 168, cy: 252, r: 20 },
  { id: "right_hip", label: "Right Hip", cx: 232, cy: 252, r: 20 },
  { id: "left_thigh", label: "Left Thigh", cx: 165, cy: 290, r: 18 },
  { id: "right_thigh", label: "Right Thigh", cx: 235, cy: 290, r: 18 },
  { id: "left_knee", label: "Left Knee", cx: 163, cy: 325, r: 16 },
  { id: "right_knee", label: "Right Knee", cx: 237, cy: 325, r: 16 },
  { id: "left_calf", label: "Left Calf", cx: 162, cy: 360, r: 16 },
  { id: "right_calf", label: "Right Calf", cx: 238, cy: 360, r: 16 },
  { id: "left_ankle", label: "Left Ankle", cx: 160, cy: 393, r: 13 },
  { id: "right_ankle", label: "Right Ankle", cx: 240, cy: 393, r: 13 },
  { id: "left_foot", label: "Left Foot", cx: 155, cy: 418, r: 14 },
  { id: "right_foot", label: "Right Foot", cx: 245, cy: 418, r: 14 },
];

export default function BodyPainMap({ selected = [], onChange }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground text-center">Tap/click the areas where you feel pain</p>
      <div className="relative">
        <svg viewBox="80 10 240 430" width="220" height="380" className="block mx-auto">
          {/* Anatomically accurate human figure */}
          {/* Head */}
          <ellipse cx="200" cy="42" rx="20" ry="24" fill="none" stroke="#333" strokeWidth="2" />
          {/* Eyes and nose */}
          <circle cx="194" cy="38" r="1.5" fill="#333" />
          <circle cx="206" cy="38" r="1.5" fill="#333" />
          <line x1="200" y1="40" x2="200" y2="43" stroke="#333" strokeWidth="1" />
          
          {/* Neck */}
          <rect x="195" y="65" width="10" height="15" fill="none" stroke="#333" strokeWidth="2" />
          
          {/* Shoulders and arms */}
          <path d="M 155 82 L 145 105 L 130 185 L 125 245" stroke="#333" strokeWidth="2" fill="none" />
          <path d="M 245 82 L 255 105 L 270 185 L 275 245" stroke="#333" strokeWidth="2" fill="none" />
          
          {/* Torso front */}
          <path d="M 170 82 L 165 95 L 160 130 L 162 200 L 170 260" stroke="#333" strokeWidth="2" fill="none" />
          <path d="M 230 82 L 235 95 L 240 130 L 238 200 L 230 260" stroke="#333" strokeWidth="2" fill="none" />
          <ellipse cx="200" cy="130" rx="35" ry="45" fill="none" stroke="#333" strokeWidth="1.5" />
          
          {/* Chest line */}
          <line x1="200" y1="90" x2="200" y2="165" stroke="#333" strokeWidth="1" />
          
          {/* Hands */}
          <ellipse cx="125" cy="250" rx="8" ry="12" fill="none" stroke="#333" strokeWidth="1.5" />
          <ellipse cx="275" cy="250" rx="8" ry="12" fill="none" stroke="#333" strokeWidth="1.5" />
          
          {/* Pelvis */}
          <ellipse cx="200" cy="275" rx="40" ry="25" fill="none" stroke="#333" strokeWidth="2" />
          
          {/* Legs */}
          <line x1="175" y1="298" x2="170" y2="390" stroke="#333" strokeWidth="2" />
          <line x1="225" y1="298" x2="230" y2="390" stroke="#333" strokeWidth="2" />
          
          {/* Feet */}
          <ellipse cx="168" cy="405" rx="12" ry="8" fill="none" stroke="#333" strokeWidth="1.5" />
          <ellipse cx="232" cy="405" rx="12" ry="8" fill="none" stroke="#333" strokeWidth="1.5" />

          {/* Clickable regions */}
          {PAIN_REGIONS.map(region => (
            <circle
              key={region.id}
              cx={region.cx}
              cy={region.cy}
              r={region.r}
              fill={selected.includes(region.id) ? "rgba(220, 38, 38, 0.55)" : "transparent"}
              stroke={selected.includes(region.id) ? "#dc2626" : "transparent"}
              strokeWidth="2"
              className="cursor-pointer hover:fill-red-200 transition-colors"
              onClick={() => toggle(region.id)}
            >
              <title>{region.label}</title>
            </circle>
          ))}
        </svg>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
          {selected.map(id => {
            const r = PAIN_REGIONS.find(r => r.id === id);
            return (
              <span key={id} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                {r?.label}
                <button onClick={() => toggle(id)} className="hover:text-red-900 font-bold">×</button>
              </span>
            );
          })}
        </div>
      )}
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">No areas selected</p>
      )}
    </div>
  );
}