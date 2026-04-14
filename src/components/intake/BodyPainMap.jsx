import React from 'react';
import { X } from 'lucide-react';

const BODY_AREAS = [
  // Head & Neck
  { id: 'head', label: 'Head', region: 'head' },
  { id: 'neck', label: 'Neck', region: 'neck' },
  
  // Upper Body
  { id: 'shoulder_left', label: 'Left Shoulder', region: 'shoulder' },
  { id: 'shoulder_right', label: 'Right Shoulder', region: 'shoulder' },
  { id: 'upper_back', label: 'Upper Back', region: 'back' },
  { id: 'chest', label: 'Chest', region: 'front' },
  { id: 'arm_left_upper', label: 'Left Upper Arm', region: 'arm' },
  { id: 'arm_right_upper', label: 'Right Upper Arm', region: 'arm' },
  { id: 'arm_left_lower', label: 'Left Lower Arm', region: 'arm' },
  { id: 'arm_right_lower', label: 'Right Lower Arm', region: 'arm' },
  { id: 'elbow_left', label: 'Left Elbow', region: 'joint' },
  { id: 'elbow_right', label: 'Right Elbow', region: 'joint' },
  { id: 'wrist_left', label: 'Left Wrist', region: 'joint' },
  { id: 'wrist_right', label: 'Right Wrist', region: 'joint' },
  { id: 'hand_left', label: 'Left Hand', region: 'hand' },
  { id: 'hand_right', label: 'Right Hand', region: 'hand' },
  
  // Core
  { id: 'mid_back', label: 'Mid Back', region: 'back' },
  { id: 'lower_back', label: 'Lower Back', region: 'back' },
  { id: 'abdomen', label: 'Abdomen', region: 'front' },
  
  // Lower Body
  { id: 'hip_left', label: 'Left Hip', region: 'hip' },
  { id: 'hip_right', label: 'Right Hip', region: 'hip' },
  { id: 'thigh_left', label: 'Left Thigh', region: 'leg' },
  { id: 'thigh_right', label: 'Right Thigh', region: 'leg' },
  { id: 'knee_left', label: 'Left Knee', region: 'joint' },
  { id: 'knee_right', label: 'Right Knee', region: 'joint' },
  { id: 'shin_left', label: 'Left Shin', region: 'leg' },
  { id: 'shin_right', label: 'Right Shin', region: 'leg' },
  { id: 'calf_left', label: 'Left Calf', region: 'leg' },
  { id: 'calf_right', label: 'Right Calf', region: 'leg' },
  { id: 'ankle_left', label: 'Left Ankle', region: 'joint' },
  { id: 'ankle_right', label: 'Right Ankle', region: 'joint' },
  { id: 'foot_left', label: 'Left Foot', region: 'foot' },
  { id: 'foot_right', label: 'Right Foot', region: 'foot' },
];

export default function BodyPainMap({ selected, onChange }) {
  const toggle = (areaId) => {
    if (selected.includes(areaId)) {
      onChange(selected.filter(id => id !== areaId));
    } else {
      onChange([...selected, areaId]);
    }
  };

  const getSelectedLabel = (areaId) => {
    return BODY_AREAS.find(a => a.id === areaId)?.label || '';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6">
        <p className="text-sm font-medium text-muted-foreground mb-4">Click on body areas to select pain locations</p>
        
        {/* Front View */}
        <div className="flex justify-center mb-6">
          <svg width="200" height="500" viewBox="0 0 200 500" className="border border-border rounded">
            {/* Head */}
            <circle cx="100" cy="40" r="25" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('head')} style={{fill: selected.includes('head') ? '#e0e7ff' : 'none'}} />
            
            {/* Neck */}
            <rect x="90" y="65" width="20" height="20" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('neck')} style={{fill: selected.includes('neck') ? '#e0e7ff' : 'none'}} />
            
            {/* Chest & Torso */}
            <ellipse cx="100" cy="130" rx="35" ry="45" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('chest')} style={{fill: selected.includes('chest') ? '#e0e7ff' : 'none'}} />
            
            {/* Shoulders */}
            <circle cx="70" cy="100" r="10" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('shoulder_left')} style={{fill: selected.includes('shoulder_left') ? '#e0e7ff' : 'none'}} />
            <circle cx="130" cy="100" r="10" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('shoulder_right')} style={{fill: selected.includes('shoulder_right') ? '#e0e7ff' : 'none'}} />
            
            {/* Left Arm */}
            <line x1="60" y1="110" x2="40" y2="200" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_left_upper')} style={{stroke: selected.includes('arm_left_upper') ? '#a5b4fc' : '#333'}} />
            <line x1="40" y1="200" x2="30" y2="290" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_left_lower')} style={{stroke: selected.includes('arm_left_lower') ? '#a5b4fc' : '#333'}} />
            
            {/* Right Arm */}
            <line x1="140" y1="110" x2="160" y2="200" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_right_upper')} style={{stroke: selected.includes('arm_right_upper') ? '#a5b4fc' : '#333'}} />
            <line x1="160" y1="200" x2="170" y2="290" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_right_lower')} style={{stroke: selected.includes('arm_right_lower') ? '#a5b4fc' : '#333'}} />
            
            {/* Abdomen */}
            <ellipse cx="100" cy="180" rx="25" ry="35" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('abdomen')} style={{fill: selected.includes('abdomen') ? '#e0e7ff' : 'none'}} />
            
            {/* Hip & Pelvis */}
            <path d="M 75 215 L 65 245 L 75 245 L 85 215 L 115 215 L 125 245 L 135 245 L 125 215 Z" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('hip_left')} style={{fill: selected.includes('hip_left') ? '#e0e7ff' : 'none'}} />
            
            {/* Left Leg */}
            <line x1="75" y1="245" x2="65" y2="380" stroke="#333" strokeWidth="10" className="cursor-pointer hover:opacity-50" onClick={() => toggle('thigh_left')} style={{stroke: selected.includes('thigh_left') ? '#a5b4fc' : '#333'}} />
            <line x1="65" y1="380" x2="60" y2="460" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('shin_left')} style={{stroke: selected.includes('shin_left') ? '#a5b4fc' : '#333'}} />
            
            {/* Right Leg */}
            <line x1="125" y1="245" x2="135" y2="380" stroke="#333" strokeWidth="10" className="cursor-pointer hover:opacity-50" onClick={() => toggle('thigh_right')} style={{stroke: selected.includes('thigh_right') ? '#a5b4fc' : '#333'}} />
            <line x1="135" y1="380" x2="140" y2="460" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('shin_right')} style={{stroke: selected.includes('shin_right') ? '#a5b4fc' : '#333'}} />
            
            {/* Feet */}
            <ellipse cx="60" cy="475" rx="8" ry="12" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('foot_left')} style={{fill: selected.includes('foot_left') ? '#e0e7ff' : 'none'}} />
            <ellipse cx="140" cy="475" rx="8" ry="12" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('foot_right')} style={{fill: selected.includes('foot_right') ? '#e0e7ff' : 'none'}} />
          </svg>
        </div>

        {/* Back View */}
        <div className="flex justify-center mb-6">
          <svg width="200" height="500" viewBox="0 0 200 500" className="border border-border rounded">
            {/* Head */}
            <circle cx="100" cy="40" r="25" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('head')} style={{fill: selected.includes('head') ? '#e0e7ff' : 'none'}} />
            
            {/* Neck */}
            <rect x="90" y="65" width="20" height="20" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('neck')} style={{fill: selected.includes('neck') ? '#e0e7ff' : 'none'}} />
            
            {/* Upper Back */}
            <path d="M 70 95 L 130 95 L 135 130 L 65 130 Z" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('upper_back')} style={{fill: selected.includes('upper_back') ? '#e0e7ff' : 'none'}} />
            
            {/* Mid Back */}
            <path d="M 65 130 L 135 130 L 140 165 L 60 165 Z" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('mid_back')} style={{fill: selected.includes('mid_back') ? '#e0e7ff' : 'none'}} />
            
            {/* Lower Back */}
            <path d="M 60 165 L 140 165 L 135 210 L 65 210 Z" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('lower_back')} style={{fill: selected.includes('lower_back') ? '#e0e7ff' : 'none'}} />
            
            {/* Shoulders */}
            <circle cx="50" cy="105" r="12" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('shoulder_left')} style={{fill: selected.includes('shoulder_left') ? '#e0e7ff' : 'none'}} />
            <circle cx="150" cy="105" r="12" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('shoulder_right')} style={{fill: selected.includes('shoulder_right') ? '#e0e7ff' : 'none'}} />
            
            {/* Left Arm */}
            <line x1="45" y1="120" x2="20" y2="220" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_left_upper')} style={{stroke: selected.includes('arm_left_upper') ? '#a5b4fc' : '#333'}} />
            <line x1="20" y1="220" x2="10" y2="310" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_left_lower')} style={{stroke: selected.includes('arm_left_lower') ? '#a5b4fc' : '#333'}} />
            
            {/* Right Arm */}
            <line x1="155" y1="120" x2="180" y2="220" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_right_upper')} style={{stroke: selected.includes('arm_right_upper') ? '#a5b4fc' : '#333'}} />
            <line x1="180" y1="220" x2="190" y2="310" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('arm_right_lower')} style={{stroke: selected.includes('arm_right_lower') ? '#a5b4fc' : '#333'}} />
            
            {/* Hip & Pelvis */}
            <path d="M 70 215 L 60 245 L 70 245 L 80 215 L 120 215 L 130 245 L 140 245 L 130 215 Z" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('hip_right')} style={{fill: selected.includes('hip_right') ? '#e0e7ff' : 'none'}} />
            
            {/* Left Leg */}
            <line x1="70" y1="245" x2="55" y2="380" stroke="#333" strokeWidth="10" className="cursor-pointer hover:opacity-50" onClick={() => toggle('thigh_left')} style={{stroke: selected.includes('thigh_left') ? '#a5b4fc' : '#333'}} />
            <line x1="55" y1="380" x2="50" y2="460" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('calf_left')} style={{stroke: selected.includes('calf_left') ? '#a5b4fc' : '#333'}} />
            
            {/* Right Leg */}
            <line x1="130" y1="245" x2="145" y2="380" stroke="#333" strokeWidth="10" className="cursor-pointer hover:opacity-50" onClick={() => toggle('thigh_right')} style={{stroke: selected.includes('thigh_right') ? '#a5b4fc' : '#333'}} />
            <line x1="145" y1="380" x2="150" y2="460" stroke="#333" strokeWidth="8" className="cursor-pointer hover:opacity-50" onClick={() => toggle('calf_right')} style={{stroke: selected.includes('calf_right') ? '#a5b4fc' : '#333'}} />
            
            {/* Feet */}
            <ellipse cx="50" cy="475" rx="8" ry="12" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('foot_left')} style={{fill: selected.includes('foot_left') ? '#e0e7ff' : 'none'}} />
            <ellipse cx="150" cy="475" rx="8" ry="12" fill="none" stroke="#333" strokeWidth="2" className="cursor-pointer hover:opacity-50" onClick={() => toggle('foot_right')} style={{fill: selected.includes('foot_right') ? '#e0e7ff' : 'none'}} />
          </svg>
        </div>
      </div>

      {/* Selected Areas */}
      {selected.length > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">{selected.length} area(s) selected:</p>
          <div className="flex flex-wrap gap-2">
            {selected.map(areaId => (
              <button
                key={areaId}
                onClick={() => toggle(areaId)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition-colors"
              >
                {getSelectedLabel(areaId)}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">No areas selected</p>
      )}
    </div>
  );
}