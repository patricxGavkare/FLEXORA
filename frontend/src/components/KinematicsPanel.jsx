// =============================================================================
// KinematicsPanel.jsx - Bionic Hand Kinematics, Grip Presets & Manual Override
//
// WHAT THIS COMPONENT DOES (in simple English):
// 1. Displays continuous real-time joint angles (MCP, PIP, DIP) for all 5 fingers.
// 2. Features an interactive "Manual Hardware Override" mode with 5 Apple-style
//    sliders so users and evaluators can test prosthetic movement without a webcam.
// 3. Includes 8 clinical bionic grip presets (Power Fist, Precision Pinch,
//    Cylindrical Grasp, Key Grip, Tripod, Peace, Pointing, Rest).
// 4. Displays the DEAM 5-bit register bus, Hex/Dec equivalents, and Truth Table.
// =============================================================================

import React, { useState } from "react";
import { gestureTruthTable } from "../utils/handLogic";

// 8 standard medical bionic grip presets (Strictly unique 5-bit digital codes)
const CLINICAL_PRESETS = [
  {
    id: "fist",
    name: "Fist (Power Grip)",
    binary: "11111",
    description: "Full flexion of all digits. Used for heavy lifting & holding tools.",
    flexions: { thumb: 1.0, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
    icon: "✊",
  },
  {
    id: "open",
    name: "Open Hand (Rest)",
    binary: "00000",
    description: "All digits fully extended in neutral physiological resting posture.",
    flexions: { thumb: 0.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
    icon: "✋",
  },
  {
    id: "pinch",
    name: "Precision Pinch",
    binary: "00111",
    description: "Thumb and Index fingertips in opposition. Used for coins, pens, needles.",
    // Thumb and index flexed to touch tips, others flexed into palm
    flexions: { thumb: 0.65, index: 0.60, middle: 1.0, ring: 1.0, pinky: 1.0 },
    icon: "🤏",
  },
  {
    id: "pointing",
    name: "Pointing",
    binary: "10111",
    description: "Index extended straight, other fingers curled. For keyboards & touchscreens.",
    flexions: { thumb: 1.0, index: 0.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
    icon: "👉",
  },
  {
    id: "peace",
    name: "Peace Sign",
    binary: "10011",
    description: "Index and Middle extended in V-formation; others fully flexed.",
    flexions: { thumb: 1.0, index: 0.0, middle: 0.0, ring: 1.0, pinky: 1.0 },
    icon: "✌️",
  },
  {
    id: "thumbs",
    name: "Thumbs Up",
    binary: "01111",
    description: "Thumb extended upward in abduction, 4 medial fingers closed.",
    flexions: { thumb: 0.0, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 },
    icon: "👍",
  },
  {
    id: "key",
    name: "Lateral Key",
    binary: "01100",
    description: "Thumb presses pad against radial side of flexed index finger. Used for turning keys.",
    // Thumb presses against side of flexed index; medial fingers provide support
    flexions: { thumb: 0.48, index: 0.88, middle: 0.95, ring: 0.95, pinky: 0.95 },
    icon: "🔑",
  },
  {
    id: "hook",
    name: "Hook Grip",
    binary: "11110",
    description: "Primary fingers hooked to carry handles; thumb secures; pinky unhooked.",
    flexions: { thumb: 0.85, index: 0.92, middle: 0.92, ring: 0.92, pinky: 0.08 },
    icon: "🪝",
  },
];

// Automated verification that no two presets collide
(function verifyPresetUniqueness() {
  const binarySet = new Set();
  CLINICAL_PRESETS.forEach((p) => {
    if (binarySet.has(p.binary)) {
      throw new Error(`[FLEXORA ERROR] Preset collision detected: "${p.binary}" on ${p.name}`);
    }
    binarySet.add(p.binary);
  });
})();


export default function KinematicsPanel({
  activeGesture,
  binaryCode,
  fingers,
  isManualMode,
  setIsManualMode,
  manualFlexions,
  setManualFlexions,
  cameraState, // { isReady, hasError, status, streamActive, isCameraPowerOn }
  isLiveHandDataAvailable,
}) {
  const hasLiveSignal = Boolean(isManualMode || isLiveHandDataAvailable);

  // Active flexions: use manual values if manual mode is enabled, otherwise use camera data
  const flex = isManualMode
    ? manualFlexions
    : fingers?.flexions || { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };

  // Calculate joint angles:
  // MCP (Metacarpophalangeal): 0° to 90°
  // PIP (Proximal Interphalangeal): 0° to 100°
  // DIP (Distal Interphalangeal): 0° to 70°
  const getJointAngles = (flexionVal) => {
    const f = flexionVal || 0;
    return {
      mcp: Math.round(f * 90),
      pip: Math.round(f * 100),
      dip: Math.round(f * 70),
    };
  };

  const fingerNames = [
    { key: "thumb", label: "Thumb", bit: "Bit 4 (MSB)" },
    { key: "index", label: "Index", bit: "Bit 3" },
    { key: "middle", label: "Middle", bit: "Bit 2" },
    { key: "ring", label: "Ring", bit: "Bit 1" },
    { key: "pinky", label: "Pinky", bit: "Bit 0 (LSB)" },
  ];

  // Handle manual slider adjustment
  const handleSliderChange = (fingerKey, value) => {
    const newFlex = {
      ...manualFlexions,
      [fingerKey]: parseFloat(value),
    };
    setManualFlexions(newFlex);
  };

  // Apply a clinical preset directly in manual mode
  const applyPreset = (preset) => {
    setIsManualMode(true);
    setManualFlexions(preset.flexions);
  };

  // In manual mode, match clinical preset if flexions are close to preserve unique 5-bit codes
  const matchingPreset = CLINICAL_PRESETS.find((p) => {
    return (
      Math.abs(p.flexions.thumb - flex.thumb) < 0.08 &&
      Math.abs(p.flexions.index - flex.index) < 0.08 &&
      Math.abs(p.flexions.middle - flex.middle) < 0.08 &&
      Math.abs(p.flexions.ring - flex.ring) < 0.08 &&
      Math.abs(p.flexions.pinky - flex.pinky) < 0.08
    );
  });

  // Compute 5-bit value for register display (Requirement 2 & 3: blank to "—————" when no hand data)
  const currentBinary = isManualMode
    ? (matchingPreset
        ? matchingPreset.binary
        : [
            manualFlexions.thumb >= 0.5 ? "1" : "0",
            manualFlexions.index >= 0.5 ? "1" : "0",
            manualFlexions.middle >= 0.5 ? "1" : "0",
            manualFlexions.ring >= 0.5 ? "1" : "0",
            manualFlexions.pinky >= 0.5 ? "1" : "0",
          ].join(""))
    : (isLiveHandDataAvailable ? (binaryCode || "00000") : "—————");

  const isValidBinary = Boolean(currentBinary && /^[01]{5}$/.test(currentBinary));
  const decimalVal = isValidBinary ? parseInt(currentBinary, 2) : "—";
  const hexVal = isValidBinary ? ("0x" + decimalVal.toString(16).toUpperCase().padStart(2, "0")) : "—";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        color: "var(--text-main)",
      }}
    >
      {/* TOP HEADER & MODE SWITCH */}
      <div
        style={{
          background: "rgba(18, 18, 21, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--accent)",
              marginBottom: 4,
            }}
          >
            Anatomical Kinematics & Manual Studio
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#FFFFFF" }}>
            Bionic Proportional Joint Control
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Continuously calculates MCP, PIP, and DIP articulation angles across all 5 anatomical rays.
          </p>
        </div>

        {/* Manual Hardware Override Switch - Reflects Real Webcam State */}
        <div
          onClick={() => setIsManualMode(!isManualMode)}
          style={{
            cursor: "pointer",
            background: isManualMode
              ? "rgba(41, 151, 255, 0.15)"
              : cameraState?.hasError
              ? "rgba(255, 69, 58, 0.12)"
              : cameraState?.isReady
              ? "rgba(48, 209, 88, 0.08)"
              : "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${
              isManualMode
                ? "rgba(41, 151, 255, 0.4)"
                : cameraState?.hasError
                ? "rgba(255, 69, 58, 0.3)"
                : cameraState?.isReady
                ? "rgba(48, 209, 88, 0.25)"
                : "var(--border)"
            }`,
            borderRadius: 12,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isManualMode
                ? "var(--accent)"
                : cameraState?.hasError
                ? "#FF453A"
                : cameraState?.isReady
                ? "#30D158"
                : "#FF9F0A",
              boxShadow: isManualMode
                ? "0 0 10px var(--accent)"
                : cameraState?.isReady
                ? "0 0 8px #30D158"
                : "none",
            }}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>
              {isManualMode ? "Manual Override: Active" : "Manual Override: Inactive"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {isManualMode
                ? "Webcam Bypassed • Direct Slider Control"
                : cameraState?.hasError
                ? "Webcam Offline / Denied (Click for Manual)"
                : cameraState?.isCameraPowerOn === false
                ? "Webcam Powered Off (Click for Manual)"
                : cameraState?.streamActive
                ? (isLiveHandDataAvailable ? "Webcam Live • Tracking Hand" : "Webcam Live • No Hand in Frame")
                : "Webcam Inactive / Initializing..."}
            </div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: Left is 5-Finger Articulation Sliders/Meters, Right is DEAM Register & Presets */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {/* LEFT COLUMN: 5-Digit Kinematic Articulation Bars */}
        <div
          style={{
            background: "rgba(18, 18, 21, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 22,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>
              Finger Flexion & Joint Angles
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {isManualMode ? "Adjust Sliders Directly" : hasLiveSignal ? "Live Camera Tracking" : "Awaiting Hand Signal"}
            </span>
          </div>

          {/* 5 Finger Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fingerNames.map(({ key, label, bit }) => {
              const flexion = flex[key] || 0;
              const percent = hasLiveSignal ? Math.round(flexion * 100) : "—";
              const joints = hasLiveSignal ? getJointAngles(flexion) : { mcp: "—", pip: "—", dip: "—" };

              return (
                <div
                  key={key}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  {/* Top line: Label, Bit, and Flexion Percentage */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginLeft: 8,
                          fontFamily: "monospace",
                        }}
                      >
                        {bit}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: hasLiveSignal
                            ? (flexion >= 0.5 ? "var(--accent)" : "var(--text-secondary)")
                            : "var(--text-tertiary)",
                          fontFamily: "monospace",
                        }}
                      >
                        {hasLiveSignal ? `${percent}%` : "—"}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: hasLiveSignal
                            ? (flexion >= 0.5 ? "#30D158" : "var(--text-tertiary)")
                            : "var(--text-tertiary)",
                          fontWeight: 600,
                        }}
                      >
                        {hasLiveSignal ? (flexion >= 0.5 ? "BENT" : "EXTENDED") : "NO SIGNAL"}
                      </span>
                    </div>
                  </div>

                  {/* Manual Slider or Live Meter Bar */}
                  {isManualMode ? (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={flexion}
                      onChange={(e) => handleSliderChange(key, e.target.value)}
                      style={{
                        width: "100%",
                        accentColor: "var(--accent)",
                        cursor: "pointer",
                        margin: "4px 0 8px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 6,
                        background: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 3,
                        overflow: "hidden",
                        margin: "6px 0 8px",
                      }}
                    >
                      <div
                        style={{
                          width: hasLiveSignal ? `${percent}%` : "0%",
                          height: "100%",
                          background: "var(--accent)",
                          transition: "width 0.05s ease-out",
                        }}
                      />
                    </div>
                  )}

                  {/* Sub-Joint Angle Metrics (MCP, PIP, DIP) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      fontFamily: "monospace",
                    }}
                  >
                    <span>MCP: {joints.mcp !== "—" ? `${joints.mcp}°` : "—"}</span>
                    <span>PIP: {joints.pip !== "—" ? `${joints.pip}°` : "—"}</span>
                    <span>DIP: {joints.dip !== "—" ? `${joints.dip}°` : "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DEAM 5-Bit Bus Register & Clinical Presets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* DEAM 5-Bit Register Block */}
          <div
            style={{
              background: "rgba(18, 18, 21, 0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-tertiary)",
                    fontWeight: 600,
                  }}
                >
                  DEAM Hardware Control Word
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                  5-Bit Parallel Bus Register
                </div>
              </div>

              {/* Hex and Dec Pills */}
              <div style={{ display: "flex", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    background: "rgba(255, 255, 255, 0.08)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    color: "#FFFFFF",
                  }}
                >
                  Dec: {decimalVal}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    background: "rgba(41, 151, 255, 0.15)",
                    border: "1px solid rgba(41, 151, 255, 0.3)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    color: "var(--accent)",
                  }}
                >
                  Hex: {hexVal}
                </span>
              </div>
            </div>

            {/* 5 Physical LED Bit Cells */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {currentBinary.split("").map((bit, idx) => {
                const isActive = bit === "1";
                const bitLabels = ["T (MSB)", "I", "M", "R", "P (LSB)"];
                return (
                  <div
                    key={idx}
                    style={{
                      background: isActive
                        ? "rgba(41, 151, 255, 0.2)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${
                        isActive ? "var(--accent)" : "rgba(255, 255, 255, 0.1)"
                      }`,
                      borderRadius: 10,
                      padding: "10px 4px",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 20,
                        fontWeight: 700,
                        color: isActive ? "#FFFFFF" : "var(--text-tertiary)",
                      }}
                    >
                      {bit}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: isActive ? "var(--accent)" : "var(--text-tertiary)",
                        marginTop: 4,
                        fontWeight: 600,
                      }}
                    >
                      {bitLabels[idx]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Truth Table Match */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Decoded Logic State:</span>
              <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                {activeGesture || "Mixed Grip"}
              </span>
            </div>
          </div>

          {/* Clinical Grip Presets Selection Grid */}
          <div
            style={{
              background: "rgba(18, 18, 21, 0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                marginBottom: 12,
              }}
            >
              Clinical Grip Presets (1-Click Test)
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 8,
              }}
            >
              {CLINICAL_PRESETS.map((preset) => {
                const isActive =
                  activeGesture?.toLowerCase().includes(preset.name.toLowerCase().split(" ")[0]) ||
                  currentBinary === preset.binary;

                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    style={{
                      background: isActive
                        ? "rgba(41, 151, 255, 0.15)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${
                        isActive ? "rgba(41, 151, 255, 0.4)" : "var(--border)"
                      }`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{preset.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: 1.25,
                        }}
                      >
                        {preset.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: "monospace",
                          color: "var(--text-tertiary)",
                          marginTop: 2,
                        }}
                      >
                        {preset.binary}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
