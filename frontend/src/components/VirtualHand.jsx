// =============================================================================
// VirtualHand.jsx - Articulated Bionic Hand Renderer
//
// WHAT THIS COMPONENT DOES (in simple English):
// Renders a high-precision, anatomically-anchored vector SVG prosthetic hand:
// 1. Clearly visible palm chassis with metallic titanium plates & bionic contour.
// 2. Mechanical knuckle socket brackets anchoring all 4 medial fingers to the palm.
// 3. Robust thenar eminence saddle joint connecting the thumb directly to the palm base.
// 4. Biomechanical continuous kinematics with zero lag:
//    - Precision Pinch: Thumb tip and Index tip flex in opposition to touch.
//    - Lateral Key: Thumb pad presses against radial side of flexed index finger.
//    - Power Fist / Hook / Pointing: Anatomically correct joint coupling.
// =============================================================================

import React from "react";

// Represents a single articulated prosthetic finger
function Finger({
  x,
  baseY,
  segLengths,
  width,
  bend = 0,
  tilt = 0,
  id,
  isPinch = false,
  isKey = false,
}) {
  const [seg1, seg2, seg3] = segLengths;
  const bendAngle = typeof bend === "number" ? bend : bend ? 35 : 0;

  // In precision pinch or key grip, index finger curls inward toward thumb
  let effectiveTilt = tilt;
  let mcpBend = bendAngle;
  let pipMultiplier = 1.25;
  let dipMultiplier = 1.45;

  if (id === "index") {
    if (isPinch) {
      // Inward adduction curl so index fingertip meets thumb fingertip
      effectiveTilt = -14;
      mcpBend = bendAngle * 0.95;
      pipMultiplier = 1.35;
      dipMultiplier = 1.6;
    } else if (isKey) {
      // Index flexes down to provide lateral platform for key grip
      effectiveTilt = -4;
      mcpBend = bendAngle;
      pipMultiplier = 1.3;
      dipMultiplier = 1.4;
    }
  } else if (id === "thumb") {
    if (isPinch) {
      // Thumb abducts and opposes index fingertip
      effectiveTilt = -32;
      mcpBend = bendAngle * 1.05;
      pipMultiplier = 1.15;
      dipMultiplier = 1.3;
    } else if (isKey) {
      // Thumb presses flat against radial side of index
      effectiveTilt = -25;
      mcpBend = bendAngle * 0.9;
    }
  }

  return (
    // Base joint tilt (natural anatomical spread angle)
    <g transform={`rotate(${effectiveTilt}, ${x}, ${baseY})`}>
      {/* Knuckle Socket Bracket (Locks finger into palm chassis) */}
      <rect
        x={x - width / 2 - 2}
        y={baseY - 4}
        width={width + 4}
        height={10}
        rx={3}
        fill="url(#bracketGrad)"
        stroke="#3A4150"
        strokeWidth="1.2"
      />
      <circle cx={x - width / 2 + 2} cy={baseY + 1} r={1.2} fill="#A0AEC0" />
      <circle cx={x + width / 2 - 2} cy={baseY + 1} r={1.2} fill="#A0AEC0" />

      {/* Knuckle joint (MCP): rotates proximal segment */}
      <g transform={`rotate(${mcpBend}, ${x}, ${baseY})`}>
        {/* Soft shadow */}
        <rect
          x={x - width / 2 + 2}
          y={baseY - seg1 + 3}
          width={width}
          height={seg1 + 4}
          rx={width / 2}
          fill="#000000"
          opacity="0.3"
        />

        {/* Proximal Bone Segment (Titanium / Carbon aesthetic) */}
        <rect
          x={x - width / 2}
          y={baseY - seg1}
          width={width}
          height={seg1 + 4}
          rx={width / 2}
          fill={`url(#segGrad-${id})`}
          stroke="#1F242F"
          strokeWidth="1.3"
        />

        {/* Knuckle Joint Pin & Bearing */}
        <circle cx={x} cy={baseY - seg1} r={width / 2 - 1} fill="#D1D5DB" stroke="#1F242F" strokeWidth="1.2" />
        <circle cx={x} cy={baseY - seg1} r={width / 2 - 4} fill="#1F2937" />
        <circle cx={x} cy={baseY - seg1} r={1.5} fill="#60A5FA" />

        {/* Middle joint (PIP): rotates middle segment */}
        <g transform={`rotate(${mcpBend * pipMultiplier}, ${x}, ${baseY - seg1})`}>
          <rect
            x={x - width / 2 + 1.5 + 2}
            y={baseY - seg1 - seg2 + 3}
            width={width - 3}
            height={seg2 + 4}
            rx={(width - 3) / 2}
            fill="#000000"
            opacity="0.3"
          />
          <rect
            x={x - width / 2 + 1.5}
            y={baseY - seg1 - seg2}
            width={width - 3}
            height={seg2 + 4}
            rx={(width - 3) / 2}
            fill={`url(#segGrad-${id})`}
            stroke="#1F242F"
            strokeWidth="1.3"
          />

          {/* Second joint pin */}
          <circle cx={x} cy={baseY - seg1 - seg2} r={width / 2 - 3} fill="#D1D5DB" stroke="#1F242F" strokeWidth="1.2" />
          <circle cx={x} cy={baseY - seg1 - seg2} r={width / 2 - 5} fill="#1F2937" />

          {/* Fingertip joint (DIP): curls distal tip */}
          <g transform={`rotate(${mcpBend * dipMultiplier}, ${x}, ${baseY - seg1 - seg2})`}>
            <rect
              x={x - width / 2 + 3 + 1.5}
              y={baseY - seg1 - seg2 - seg3 + 2}
              width={width - 6}
              height={seg3 + 4}
              rx={(width - 6) / 2}
              fill="#000000"
              opacity="0.25"
            />
            {/* Silicone touch pad / Tip */}
            <rect
              x={x - width / 2 + 3}
              y={baseY - seg1 - seg2 - seg3}
              width={width - 6}
              height={seg3 + 4}
              rx={(width - 6) / 2}
              fill={`url(#tipGrad-${id})`}
              stroke="#1F242F"
              strokeWidth="1.3"
            />
            {/* Sensor dot on fingertip */}
            <circle cx={x} cy={baseY - seg1 - seg2 - seg3 + 4} r={2} fill="#2997FF" opacity="0.8" />
          </g>
        </g>
      </g>
    </g>
  );
}

export default function VirtualHand({ fingers }) {
  if (!fingers) {
    return (
      <div style={{ textAlign: "center", color: "#86868b", padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500 }}>Waiting for tracking stream...</p>
      </div>
    );
  }

  // Get exact continuous angle (0° to 42°) calculated by handLogic.js
  const getAngle = (name) => {
    if (fingers.angles && typeof fingers.angles[name] === "number") {
      return fingers.angles[name];
    }
    return fingers[name] === "Bent" ? 35 : 0;
  };

  // Detect specific precision grips
  const isPinch =
    fingers.flexions &&
    fingers.flexions.thumb > 0.35 &&
    fingers.flexions.index > 0.35 &&
    fingers.flexions.middle > 0.7;

  const isKey =
    fingers.flexions &&
    fingers.flexions.index > 0.65 &&
    fingers.flexions.thumb > 0.25 &&
    fingers.flexions.ring > 0.7;

  // Anatomical definition of all 5 human fingers:
  // x: horizontal socket on palm, baseY: vertical knuckle height
  // segLengths: lengths of [MCP-to-PIP, PIP-to-DIP, DIP-to-TIP]
  const fingerDefs = [
    { id: "thumb", x: 92, baseY: 195, segLengths: [34, 28, 22], width: 26, tilt: -46 },
    { id: "index", x: 120, baseY: 148, segLengths: [42, 28, 22], width: 22, tilt: 3 },
    { id: "middle", x: 150, baseY: 146, segLengths: [50, 32, 24], width: 22, tilt: 0 },
    { id: "ring", x: 180, baseY: 148, segLengths: [44, 30, 22], width: 22, tilt: -3 },
    { id: "pinky", x: 207, baseY: 152, segLengths: [34, 22, 18], width: 18, tilt: -9 },
  ];

  return (
    <svg
      viewBox="0 0 300 340"
      style={{
        width: "100%",
        height: "100%",
        maxHeight: 320,
        filter: "drop-shadow(0 14px 28px rgba(0, 0, 0, 0.75))",
      }}
    >
      <defs>
        {/* Sleek frosted silver gradient for bionic finger links */}
        {fingerDefs.map((f) => (
          <linearGradient key={f.id} id={`segGrad-${f.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="40%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
        ))}

        {/* Fingertip grip pads */}
        {fingerDefs.map((f) => (
          <linearGradient key={`tip-${f.id}`} id={`tipGrad-${f.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
        ))}

        {/* Titanium Chassis Outer Outline Gradient */}
        <linearGradient id="palmLimbsGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2D3748" />
          <stop offset="50%" stopColor="#1A202C" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>

        {/* Inner Palm Shell Faceplate */}
        <linearGradient id="palmInnerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E2430" />
          <stop offset="50%" stopColor="#141822" />
          <stop offset="100%" stopColor="#0B0E14" />
        </linearGradient>

        {/* Mechanical Socket Bracket Gradient */}
        <linearGradient id="bracketGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A5568" />
          <stop offset="50%" stopColor="#2D3748" />
          <stop offset="100%" stopColor="#1A202C" />
        </linearGradient>
      </defs>

      <g>
        {/* 1. VISIBLE PALM CHASSIS & ANATOMICAL CONTOUR */}
        {/* Outer reinforced structural rim (High contrast) */}
        <path
          d="M80,180
             C72,205 68,225 80,248
             C92,272 108,290 130,304
             C152,315 178,315 198,302
             C218,290 232,265 230,225
             C228,180 226,156 220,150
             L105,146
             C92,148 83,160 80,180 Z"
          fill="url(#palmLimbsGrad)"
          stroke="#4B5563"
          strokeWidth="2.5"
        />

        {/* Inner Carbon Faceplate with beveled inset */}
        <path
          d="M88,185
             C82,208 78,224 88,242
             C98,262 114,278 134,292
             C152,302 174,302 192,290
             C208,280 220,256 218,222
             C216,182 215,158 210,154
             L112,150
             C100,152 92,165 88,185 Z"
          fill="url(#palmInnerGrad)"
          stroke="#1F2937"
          strokeWidth="1.5"
        />

        {/* 2. THENAR EMINENCE SADDLE MOUNT (Thumb Anchor Socket) */}
        {/* Structural saddle bracket connecting thumb base firmly to palm */}
        <path
          d="M78,180
             C70,186 64,198 66,210
             C68,222 76,230 88,232
             L102,215
             L100,192
             C92,184 84,180 78,180 Z"
          fill="url(#bracketGrad)"
          stroke="#4B5563"
          strokeWidth="1.5"
        />
        {/* Saddle Hinge Pivot Pin for Thumb */}
        <circle cx="92" cy="195" r="9" fill="url(#bracketGrad)" stroke="#38BDF8" strokeWidth="1.2" />
        <circle cx="92" cy="195" r="5" fill="#1F2937" />
        <circle cx="92" cy="195" r="2" fill="#E2E8F0" />

        {/* 3. BIONIC ELECTRONIC CIRCUIT CONDUIT & LOGO */}
        {/* Glowing cyan circuit trace across palm */}
        <path
          d="M92,195 Q145,225 200,190"
          stroke="#2997FF"
          strokeWidth="2"
          fill="none"
          opacity="0.85"
          strokeDasharray="4 2"
        />
        <circle cx="145" cy="225" r="3.5" fill="#30D158" />
        <circle cx="145" cy="225" r="1.5" fill="#FFFFFF" />

        {/* Wrist Connection Flange / Mounting Screws at Bottom */}
        <rect x="135" y="306" width="55" height="14" rx="4" fill="#1E2430" stroke="#4B5563" strokeWidth="1.2" />
        <circle cx="145" cy="313" r="2" fill="#94A3B8" />
        <circle cx="180" cy="313" r="2" fill="#94A3B8" />

        {/* 4. RENDER EACH ARTICULATED FINGER (Emerging cleanly from knuckle sockets) */}
        {fingerDefs.map((f) => (
          <Finger
            key={f.id}
            {...f}
            bend={getAngle(f.id)}
            isPinch={isPinch}
            isKey={isKey}
          />
        ))}
      </g>
    </svg>
  );
}