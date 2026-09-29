// =============================================================================
// BinaryPanel.jsx - 5-Bit Digital Control Bus & Truth Table
//
// WHAT THIS COMPONENT DOES:
// Converts the 5 finger states into a digital binary word (Thumb to Pinky).
// Bent finger = 1 (active pull-down/logic HIGH), Straight finger = 0.
// This links computer vision directly to Digital Electronics (DEAM syllabus).
// =============================================================================

import React from "react";
import { gestureTruthTable } from "../utils/handLogic";

export default function BinaryPanel({ binaryCode = "00000" }) {
  // Label for each bit position: Bit 4 (Thumb / MSB) down to Bit 0 (Pinky / LSB)
  const bitLabels = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

  return (
    <div
      style={{
        background: "rgba(18, 18, 21, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "22px 24px",
        color: "var(--text-main)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Section Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
            margin: 0,
          }}
        >
          5-Bit Digital Bus Register
        </p>
        <span
          style={{
            fontSize: 10,
            color: "var(--accent)",
            fontFamily: "monospace",
            background: "rgba(41, 151, 255, 0.1)",
            padding: "2px 8px",
            borderRadius: 4,
          }}
        >
          LOGIC BUS
        </span>
      </div>

      {/* 5-Bit Register Visualizer (Apple dark aesthetic) */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 24 }}>
        {binaryCode.split("").map((bit, i) => {
          const isHigh = bit === "1";
          return (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: 48,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                  fontFamily: "monospace",
                  background: isHigh
                    ? "linear-gradient(180deg, #2997FF 0%, #0071E3 100%)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${isHigh ? "#2997FF" : "rgba(255, 255, 255, 0.08)"}`,
                  color: isHigh ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: isHigh ? "0 4px 14px rgba(41, 151, 255, 0.35)" : "none",
                  transition: "all 0.1s ease",
                }}
              >
                {bit}
              </div>
              <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500 }}>
                {bitLabels[i]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Logic Truth Table */}
      <p
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        Gesture Decoding Truth Table
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Table Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontWeight: 600,
            padding: "0 8px 4px",
          }}
        >
          <span>BINARY (BUS)</span>
          <span>INTENDED GESTURE</span>
        </div>

        {/* Table Rows */}
        {gestureTruthTable.map((row) => {
          const isActive = row.binary === binaryCode;
          return (
            <div
              key={row.binary}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 8,
                background: isActive ? "rgba(41, 151, 255, 0.12)" : "transparent",
                border: `1px solid ${isActive ? "rgba(41, 151, 255, 0.4)" : "transparent"}`,
                color: isActive ? "#2997FF" : "var(--text-main)",
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.12s ease",
              }}
            >
              <span style={{ fontFamily: "monospace", letterSpacing: 1.5 }}>{row.binary}</span>
              <span>{row.gesture}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}