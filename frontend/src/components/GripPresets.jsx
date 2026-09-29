// =============================================================================
// GripPresets.jsx - Clinical Bionic Grip Mode Selector & Monitor
//
// WHAT THIS COMPONENT DOES:
// Shows standard prosthetic grasp patterns used in medical bionics.
// Automatically highlights which grasp pattern is active based on real-time gestures.
// =============================================================================

import React from "react";

// Clinical Prosthetic Grip Definitions
const presets = [
  {
    name: "Power Grip",
    match: "Fist (Power Grip)",
    desc: "All 5 fingers closed. Used for lifting bottles, handles, or tools.",
  },
  {
    name: "Precision Pinch",
    match: "Precision Pinch",
    desc: "Thumb and index tips meet. Used for delicate tasks like holding a key or coin.",
  },
  {
    name: "Point / Index Trigger",
    match: "Pointing",
    desc: "Index extended, remaining fingers folded. Used for touchscreen interaction or typing.",
  },
  {
    name: "Open Release",
    match: "Open Hand",
    desc: "All digits fully extended. Neutral resting state ready to receive objects.",
  },
];

export default function GripPresets({ activeGesture }) {
  return (
    <div
      style={{
        background: "rgba(18, 18, 21, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
            margin: "0 0 16px",
          }}
        >
          Prosthetic Grip Presets
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {presets.map((p) => {
            const isActive = p.match === activeGesture;
            return (
              <div
                key={p.name}
                style={{
                  background: isActive ? "rgba(41, 151, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${isActive ? "rgba(41, 151, 255, 0.5)" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: isActive ? "#2997FF" : "var(--text-main)",
                    }}
                  >
                    {p.name}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "#2997FF",
                        color: "#FFFFFF",
                        padding: "2px 7px",
                        borderRadius: 10,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.4 }}>
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-tertiary)",
        }}
      >
        Automated classification based on 21-point spatial landmarks.
      </div>
    </div>
  );
}