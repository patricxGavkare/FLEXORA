// =============================================================================
// HapticGraspPanel.jsx - Closed-Loop Virtual Object Interaction & Force Lab
//
// WHAT THIS COMPONENT DOES (in simple English):
// In a real bionic arm, you cannot just close the fingers with full motor strength.
// If you hold a fragile egg or paper cup too tightly, you crush it!
// If you hold it too loosely, it slips out of the hand and drops to the floor.
//
// In Digital Electronics & Microprocessors (DEAM), we study:
// 1. Sensors (Force-Sensing Resistors / FSRs).
// 2. Analog-to-Digital Conversion (ADC on ATmega328P / 8051 / ARM).
// 3. Closed-Loop Feedback Control (Interrupts & PID loops that stop motor squeeze).
//
// This panel provides a live virtual physics testing ground:
// - Choose 5 different objects: Egg, Soda Can, Paper Cup, Key, Ripe Berry.
// - Squeeze your real hand to apply contact force in Newtons (N).
// - Watch the object deform in real-time, slip, or crush if safe force is exceeded.
// - Toggle "DEAM Auto-Crush Protector" to let the microcontroller automatically
//   prevent shell fracture!
// =============================================================================

import React, { useState, useEffect } from "react";
import MathView from "./MathView";

// Physical definitions of test objects
const OBJECT_PROFILES = {
  egg: {
    id: "egg",
    name: "Fresh Hen Egg",
    category: "Fragile Biomaterial",
    minGripN: 2.5,     // Minimum force needed to prevent slip (Newtons)
    optimalN: 4.2,     // Ideal grasp force
    maxCrushN: 6.8,    // Force threshold where the shell fractures!
    color: "#F6E58D",
    accentColor: "#F9CA24",
    icon: "🥚",
    description: "Calcium carbonate shell. Requires delicate proportional pinch control.",
    hapticWarning: "High fragility. Micro-cracks occur above 6.0 N.",
  },
  can: {
    id: "can",
    name: "Aluminum Soda Can",
    category: "Thin-Walled Elastic",
    minGripN: 5.0,
    optimalN: 11.0,
    maxCrushN: 17.0,   // Force threshold where thin aluminum crumples
    color: "#EB4D4B",
    accentColor: "#FF7979",
    icon: "🥫",
    description: "Cylindrical aluminum. Tolerates medium cylindrical grip.",
    hapticWarning: "Plastic deformation occurs rapidly above 16.5 N.",
  },
  cup: {
    id: "cup",
    name: "Paper Coffee Cup",
    category: "Semi-Compliant Cellulose",
    minGripN: 3.0,
    optimalN: 6.5,
    maxCrushN: 9.5,    // Liquid spill / side wall collapse threshold
    color: "#686DE0",
    accentColor: "#4834D4",
    icon: "☕",
    description: "Filled with hot liquid. Over-flexion causes liquid spillage.",
    hapticWarning: "Liquid contents create severe spill risk upon rim collapse.",
  },
  key: {
    id: "key",
    name: "Brass Cylinder Key",
    category: "Rigid High-Modulus Metal",
    minGripN: 4.0,
    optimalN: 12.0,
    maxCrushN: 99.0,   // Cannot be crushed by human/prosthetic grip!
    color: "#F0932B",
    accentColor: "#E056FD",
    icon: "🔑",
    description: "High tensile brass. Tests lateral key grip stability.",
    hapticWarning: "Non-deformable. Safe for maximum motor torque testing.",
  },
  berry: {
    id: "berry",
    name: "Ripe Strawberry",
    category: "Ultra-Soft Organic",
    minGripN: 1.0,
    optimalN: 2.2,
    maxCrushN: 3.6,    // Easily bruised and squished
    color: "#FF5252",
    accentColor: "#FF7675",
    icon: "🍓",
    description: "Cellular pulp structure. Requires micro-gram force resolution.",
    hapticWarning: "Zero tolerance for motor overshoot.",
  },
};

export default function HapticGraspPanel({ fingers, gesture }) {
  // Currently selected virtual object
  const [selectedObjectId, setSelectedObjectId] = useState("egg");
  const activeObj = OBJECT_PROFILES[selectedObjectId];

  // Has the current object been crushed/ruined?
  const [isCrushed, setIsCrushed] = useState(false);

  // DEAM Closed-Loop Microcontroller Protection (auto-clamps servo force before crush)
  const [autoProtectionEnabled, setAutoProtectionEnabled] = useState(true);

  // Calculate overall hand flexion (0.0 = hand open, 1.0 = tightly closed fist)
  let rawFlexion = 0;
  if (fingers?.flexions) {
    rawFlexion =
      (fingers.flexions.thumb +
        fingers.flexions.index +
        fingers.flexions.middle +
        fingers.flexions.ring +
        fingers.flexions.pinky) /
      5.0;
  }

  // Calculate simulated contact force in Newtons (0 to 22 N peak)
  let appliedForceN = rawFlexion * 22.0;

  // Closed-loop microcontroller firmware simulation:
  // If autoProtectionEnabled is TRUE and force approaches 90% of crush threshold,
  // the MCU interrupt routine clamps motor PWM output!
  let isMcuClamping = false;
  if (autoProtectionEnabled && activeObj.maxCrushN < 90) {
    const safetyCeiling = activeObj.maxCrushN * 0.88;
    if (appliedForceN > safetyCeiling) {
      appliedForceN = safetyCeiling;
      isMcuClamping = true;
    }
  }

  // Round force to 1 decimal place
  const displayForce = Number(appliedForceN.toFixed(1));

  // Determine Grasp Physical State
  let graspState = "NO_CONTACT"; // Hand open
  let statusBadgeColor = "var(--text-tertiary)";
  let statusLabel = "No Contact (Hand Open)";

  if (rawFlexion > 0.12) {
    if (displayForce < activeObj.minGripN) {
      graspState = "SLIPPING";
      statusBadgeColor = "#FF9F0A"; // Orange warning
      statusLabel = "Slip Warning: Insufficient Grip Force";
    } else if (displayForce <= activeObj.maxCrushN) {
      graspState = "OPTIMAL";
      statusBadgeColor = "#30D158"; // Green optimal
      statusLabel = "Optimal Secure Grasp (Stable Hold)";
    } else {
      graspState = "CRUSHED";
      statusBadgeColor = "#FF453A"; // Red alert
      statusLabel = "Object Fractured / Structure Crushed!";
    }
  }

  // Trigger permanent crush state if exceeded and protection was turned off
  useEffect(() => {
    if (graspState === "CRUSHED" && !isCrushed) {
      setIsCrushed(true);
      // Trigger subtle browser haptic vibration pulse if supported on device
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 200]);
      }
    }
  }, [graspState, isCrushed]);

  // Reset function to restore broken object
  const handleResetObject = () => {
    setIsCrushed(false);
  };

  // Convert Force (N) to simulated 10-bit Microcontroller ADC Readout (0 to 1023)
  // Formula: V_out = (Force / 22.0) * 5.0 Volts
  // ADC_Value = (V_out / 5.0) * 1023
  const simulatedVout = Math.min(5.0, (appliedForceN / 22.0) * 5.0);
  const mcuAdcValue = Math.round((simulatedVout / 5.0) * 1023);

  // Compute deformation scale for the animated SVG graphic
  // Squish percentage between 0% and 35%
  const deformationAmount = Math.min(0.35, (appliedForceN / (activeObj.maxCrushN || 20)) * 0.22);
  const svgScaleY = isCrushed ? 0.45 : Math.max(0.65, 1.0 - deformationAmount);
  const svgScaleX = isCrushed ? 1.4 : Math.min(1.3, 1.0 + deformationAmount * 0.7);

  return (
    <div
      style={{
        background: "rgba(18, 18, 21, 0.8)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        color: "var(--text-main)",
      }}
    >
      {/* HEADER SECTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
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
            DEAM Closed-Loop Laboratory
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#FFFFFF" }}>
            Tactile Force & Haptic Grasp Simulator
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              margin: "4px 0 0",
              maxWidth: 550,
            }}
          >
            Simulating fingertip Force-Sensing Resistors (FSR), 10-bit ADC digitization,
            and firmware-level motor torque limiter for compliant prosthetic grasping.
          </p>
        </div>

        {/* Closed-Loop Safety Switch (Core DEAM Microcontroller feature) */}
        <div
          onClick={() => setAutoProtectionEnabled(!autoProtectionEnabled)}
          style={{
            cursor: "pointer",
            background: autoProtectionEnabled
              ? "rgba(48, 209, 88, 0.12)"
              : "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${
              autoProtectionEnabled ? "rgba(48, 209, 88, 0.35)" : "var(--border)"
            }`,
            borderRadius: 12,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: autoProtectionEnabled ? "#30D158" : "var(--text-tertiary)",
              boxShadow: autoProtectionEnabled ? "0 0 8px #30D158" : "none",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>
                MCU Auto-Crush Protector
              </span>
              <span
                style={{
                  fontSize: 9,
                  background: "rgba(255, 159, 10, 0.15)",
                  color: "#FF9F0A",
                  border: "1px solid rgba(255, 159, 10, 0.3)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontWeight: 600,
                  fontFamily: "monospace",
                }}
              >
                SIMULATED PID
              </span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {autoProtectionEnabled ? "ACTIVE (Firmware Clamping)" : "DISABLED (Open Loop)"}
            </div>
          </div>
        </div>
      </div>

      {/* OBJECT SELECTOR CAROUSEL TABS */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Target Virtual Payload:
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 8,
          }}
        >
          {Object.values(OBJECT_PROFILES).map((obj) => {
            const isSelected = obj.id === selectedObjectId;
            return (
              <button
                key={obj.id}
                onClick={() => {
                  setSelectedObjectId(obj.id);
                  setIsCrushed(false);
                }}
                style={{
                  background: isSelected
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${
                    isSelected ? "rgba(255, 255, 255, 0.25)" : "var(--border)"
                  }`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 22 }}>{obj.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                    }}
                  >
                    {obj.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                    Limit: {obj.maxCrushN > 50 ? "Indestructible" : `${obj.maxCrushN} N`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TWO-COLUMN MAIN STAGE: Left is Physics Visualizer, Right is DEAM Sensor Telemetry */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* LEFT COLUMN: Physical Object Visualizer & Deformation Stage */}
        <div
          style={{
            background: "#08080A",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 22,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 290,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top Status Alert Ribbon */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255, 255, 255, 0.05)",
                padding: "4px 10px",
                borderRadius: 20,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: 11,
                color: statusBadgeColor,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: statusBadgeColor,
                  boxShadow: `0 0 8px ${statusBadgeColor}`,
                }}
              />
              {isCrushed ? "OBJECT DESTROYED" : statusLabel}
            </div>

            {/* MCU Clamping Indicator */}
            {isMcuClamping && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "#30D158",
                  background: "rgba(48, 209, 88, 0.15)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(48, 209, 88, 0.3)",
                }}
              >
                INTERRUPT ACTIVE: PID CLAMP
              </span>
            )}
          </div>

          {/* Interactive Object Graphic (Deforms dynamically under applied force) */}
          <div
            style={{
              position: "relative",
              width: 140,
              height: 140,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "16px 0",
            }}
          >
            {/* Visual Fingertip Force Arrows (Pressing in from both sides) */}
            {rawFlexion > 0.12 && (
              <>
                {/* Left Finger Contact Pad */}
                <div
                  style={{
                    position: "absolute",
                    left: 2,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 12,
                    height: 50,
                    background: "linear-gradient(90deg, #3A3A3C, #5C5C60)",
                    border: "1px solid #8E8E93",
                    borderRadius: "4px 0 0 4px",
                    boxShadow: `0 0 ${displayForce * 1.5}px var(--accent)`,
                    transition: "all 0.05s ease",
                  }}
                />
                {/* Right Finger Contact Pad */}
                <div
                  style={{
                    position: "absolute",
                    right: 2,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 12,
                    height: 50,
                    background: "linear-gradient(270deg, #3A3A3C, #5C5C60)",
                    border: "1px solid #8E8E93",
                    borderRadius: "0 4px 4px 0",
                    boxShadow: `0 0 ${displayForce * 1.5}px var(--accent)`,
                    transition: "all 0.05s ease",
                  }}
                />
              </>
            )}

            {/* Rendered Object Shape */}
            <div
              style={{
                transform: `scale(${svgScaleX}, ${svgScaleY})`,
                transition: isCrushed ? "transform 0.1s ease" : "transform 0.04s ease-out",
                fontSize: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: isCrushed
                  ? "grayscale(0.6) drop-shadow(0 0 14px rgba(255, 69, 58, 0.7))"
                  : `drop-shadow(0 0 ${displayForce * 1.2}px rgba(255, 255, 255, 0.15))`,
              }}
            >
              {isCrushed ? "💥" : activeObj.icon}
            </div>
          </div>

          {/* Bottom Object Description & Reset Trigger */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {activeObj.description}
            </div>

            {isCrushed && (
              <button
                onClick={handleResetObject}
                style={{
                  background: "var(--accent)",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset Object
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time DEAM Microcontroller & Sensor Telemetry */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Dynamic Force Gauge Bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                Normal Contact Force (<MathView math="F_N" inline />):
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color:
                    displayForce > activeObj.maxCrushN
                      ? "#FF453A"
                      : displayForce >= activeObj.minGripN
                      ? "#30D158"
                      : "var(--text-main)",
                }}
              >
                {displayForce} N
              </span>
            </div>

            {/* Gauge Track */}
            <div
              style={{
                width: "100%",
                height: 10,
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: 5,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Slip Threshold Marker */}
              <div
                style={{
                  position: "absolute",
                  left: `${(activeObj.minGripN / 22.0) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "#FF9F0A",
                  zIndex: 2,
                }}
                title="Slip Threshold"
              />

              {/* Crush Threshold Marker */}
              {activeObj.maxCrushN < 22 && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(activeObj.maxCrushN / 22.0) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "#FF453A",
                    zIndex: 2,
                  }}
                  title="Crush Rupture Limit"
                />
              )}

              {/* Filled Force Bar */}
              <div
                style={{
                  width: `${Math.min(100, (displayForce / 22.0) * 100)}%`,
                  height: "100%",
                  background:
                    displayForce > activeObj.maxCrushN
                      ? "#FF453A"
                      : displayForce >= activeObj.minGripN
                      ? "#30D158"
                      : "#FF9F0A",
                  transition: "width 0.06s ease-out",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--text-tertiary)",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              <span>0.0 N (Open)</span>
              <span>Min Slip: {activeObj.minGripN} N</span>
              <span>Max: {activeObj.maxCrushN > 50 ? "∞" : `${activeObj.maxCrushN} N`}</span>
            </div>
          </div>

          {/* DEAM Circuit & ADC Conversion Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {/* Metric 1: FSR Sensor Voltage */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                Analog Voltage (<MathView math="V_{\text{out}}" inline />)
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "var(--accent)",
                  marginTop: 2,
                }}
              >
                {simulatedVout.toFixed(2)} V
              </div>
              <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2 }}>
                FSR Voltage Divider (<MathView math="V_{\text{cc}} = 5.0\text{ V}" inline />)
              </div>
            </div>

            {/* Metric 2: 10-Bit ADC Register */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                  10-Bit ADC Register
                </div>
                <span
                  style={{
                    fontSize: 8,
                    background: "rgba(255, 159, 10, 0.15)",
                    color: "#FF9F0A",
                    border: "1px solid rgba(255, 159, 10, 0.3)",
                    padding: "1px 4px",
                    borderRadius: 3,
                    fontWeight: 600,
                    fontFamily: "monospace",
                  }}
                >
                  SIMULATED
                </span>
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "#30D158",
                  marginTop: 2,
                }}
              >
                0x{mcuAdcValue.toString(16).toUpperCase().padStart(3, "0")} ({mcuAdcValue})
              </div>
              <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2 }}>
                Channels: ADC0..ADC4 (ATmega328P)
              </div>
            </div>
          </div>

          {/* DEAM Course Relevance Explainer Note */}
          <div
            style={{
              background: "rgba(41, 151, 255, 0.06)",
              border: "1px solid rgba(41, 151, 255, 0.2)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--accent)" }}>DEAM Closed-Loop Concept:</strong> When an
            amputee picks up an object, open-loop vision is not enough. The microcontroller reads the
            FSR sensor via the internal ADC module, computes pressure in real time, and interrupts
            PWM pulse generation when grip exceeds the mechanical rupture limit.
          </div>
        </div>
      </div>
    </div>
  );
}
