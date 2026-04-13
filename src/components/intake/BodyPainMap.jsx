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
          {/* Body outline */}
          {/* Head */}
          <ellipse cx="200" cy="42" rx="26" ry="28" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Neck */}
          <rect x="190" y="68" width="20" height="18" rx="4" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Torso */}
          <path d="M155 100 Q145 110 138 130 L132 220 Q138 240 160 248 L168 260 L200 265 L232 260 L240 248 Q262 240 268 220 L262 130 Q255 110 245 100 Z" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Left arm */}
          <path d="M155 100 Q135 115 125 145 L110 215 L118 220 L132 165 L155 115 Z" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Right arm */}
          <path d="M245 100 Q265 115 275 145 L290 215 L282 220 L268 165 L245 115 Z" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Left hand */}
          <ellipse cx="108" cy="228" rx="10" ry="14" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Right hand */}
          <ellipse cx="292" cy="228" rx="10" ry="14" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Left leg */}
          <path d="M168 260 L160 390 L172 393 L178 295 L200 290 L200 265 Z" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Right leg */}
          <path d="M232 260 L240 390 L228 393 L222 295 L200 290 L200 265 Z" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Left foot */}
          <ellipse cx="162" cy="408" rx="14" ry="10" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Right foot */}
          <ellipse cx="238" cy="408" rx="14" ry="10" fill="#e8edf5" stroke="#94a3b8" strokeWidth="1.5" />

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