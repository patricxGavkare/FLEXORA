// =============================================================================
// McuPanel.jsx - Embedded Microcontroller & Servo PWM Controller
//
// WHAT THIS COMPONENT DOES (in simple English):
// Bridges AI computer vision to physical hardware concepts for DEAM:
// 1. Converts finger kinematics into 5-channel standard Servo PWM pulses (1000 µs – 2000 µs at 50 Hz).
// 2. Simulates the 8-bit GPIO Data Register (PORTB) used by microcontrollers (ATmega328P / STM32).
// 3. Live 3:8 Decoder View (74LS138 standard) decoding the 3 lower bus lines.
// 4. Live Fast PWM Timing Diagram showing ICR1 (39999), OCR1A, and pulse width in µs.
// 5. Estimates dynamic motor current load (mA) and outputs real-time UART serial packets ($FLEX,...).
// =============================================================================

import React, { useState } from "react";

export default function McuPanel({ binaryCode = "00000", pwm, fingers, isLiveHandDataAvailable = false }) {
  // Currently inspected channel for PWM timing diagram (default: index servo)
  const [selectedChannelId, setSelectedChannelId] = useState("index");

  // Determine whether valid live or manual telemetry is present
  const isDataAvailable = Boolean(isLiveHandDataAvailable && binaryCode && /^[01]{5}$/.test(binaryCode));

  // Servo channel configuration mapped to microcontroller Port B pins
  const channels = [
    { id: "thumb", label: "Thumb Servo", pin: "PB0", pwm: isDataAvailable ? (pwm?.thumb || 1000) : 1000 },
    { id: "index", label: "Index Servo", pin: "PB1", pwm: isDataAvailable ? (pwm?.index || 1000) : 1000 },
    { id: "middle", label: "Middle Servo", pin: "PB2", pwm: isDataAvailable ? (pwm?.middle || 1000) : 1000 },
    { id: "ring", label: "Ring Servo", pin: "PB3", pwm: isDataAvailable ? (pwm?.ring || 1000) : 1000 },
    { id: "pinky", label: "Pinky Servo", pin: "PB4", pwm: isDataAvailable ? (pwm?.pinky || 1000) : 1000 },
  ];

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[1];

  // Convert binary string to hexadecimal and integer for register representation
  const portBVal = isDataAvailable ? parseInt(binaryCode, 2) : "—";
  const hexPortB = isDataAvailable ? ("0x" + portBVal.toString(16).toUpperCase().padStart(2, "0")) : "—";
  const binPortB = isDataAvailable ? ("0b000" + binaryCode) : "0b000—————";

  // ---------------------------------------------------------------------------
  // 3:8 Decoder (74LS138 Standard) Logic:
  // Decodes 3 binary inputs [A2, A1, A0] into 8 active-low outputs Y0..Y7.
  // We use bits [b2, b1, b0] (Middle, Ring, Pinky) as the select lines.
  // ---------------------------------------------------------------------------
  const a2 = isDataAvailable ? (binaryCode[2] === "1" ? 1 : 0) : "—";
  const a1 = isDataAvailable ? (binaryCode[3] === "1" ? 1 : 0) : "—";
  const a0 = isDataAvailable ? (binaryCode[4] === "1" ? 1 : 0) : "—";
  const decoderSelect = isDataAvailable
    ? ((binaryCode[2] === "1" ? 4 : 0) + (binaryCode[3] === "1" ? 2 : 0) + (binaryCode[4] === "1" ? 1 : 0))
    : -1;

  // ---------------------------------------------------------------------------
  // ATmega328P 16-Bit Timer 1 (Mode 14: Fast PWM) Math:
  // f_clk = 16 MHz, Prescaler N = 8 -> Timer clock = 2 MHz (0.5 µs per tick)
  // TOP = ICR1 = (16 MHz / (8 * 50 Hz)) - 1 = 39999 (exact 20.0 ms period)
  // OCR1A = PulseWidth(µs) * 2
  // For 1000 µs: OCR1A = 2000. For 1500 µs: OCR1A = 3000. For 2000 µs: OCR1A = 4000.
  // ---------------------------------------------------------------------------
  const icr1Top = 39999;
  const activePwmUs = activeChannel.pwm;
  const ocr1aValue = Math.round(activePwmUs * 2);
  const dutyPercent = ((activePwmUs / 20000) * 100).toFixed(1);

  // Dynamic current consumption (mA)
  let dynamicCurrent = 120;
  if (isDataAvailable && fingers?.flexions) {
    const totalFlex = Object.values(fingers.flexions).reduce((sum, v) => sum + v, 0);
    dynamicCurrent += Math.round(totalFlex * 45);
  }

  // Simulated serial packet (standard NMEA-style telemetry for USB/Bluetooth)
  const uartPacket = isDataAvailable
    ? `$FLEX,${binaryCode},${channels.map((c) => c.pwm).join(",")}`
    : "TX IDLE — Awaiting Live Telemetry";

  return (
    <div
      style={{
        background: "rgba(18, 18, 21, 0.8)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "22px 24px",
        color: "var(--text-main)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 14,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--success)",
                boxShadow: "0 0 8px var(--success)",
              }}
            />
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Digital Electronics & Microprocessor Bus (DEAM)
            </h4>
            <span
              style={{
                fontSize: 10,
                background: "rgba(41, 151, 255, 0.12)",
                color: "var(--accent)",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 600,
                fontFamily: "monospace",
              }}
            >
              50 Hz FAST PWM & 3:8 DECODER
            </span>
            <span
              style={{
                fontSize: 9,
                background: "rgba(255, 159, 10, 0.15)",
                color: "#FF9F0A",
                border: "1px solid rgba(255, 159, 10, 0.3)",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 600,
                fontFamily: "monospace",
              }}
            >
              SIMULATED
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            16-Bit Timer 1 Registers • 3:8 Line Decoder Emulation • PORTB GPIO Interfacing
          </p>
        </div>

        {/* Live Diagnostics Pills */}
        <div style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "monospace", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-secondary)" }}>PERIOD: </span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>20.0 ms (50 Hz)</span>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-secondary)" }}>RAIL: </span>
            <span style={{ color: "var(--success)", fontWeight: 600 }}>5.00 V DC</span>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-secondary)" }}>LOAD: </span>
            <span style={{ color: "var(--warning)", fontWeight: 600 }}>{dynamicCurrent} mA</span>
          </div>
        </div>
      </div>

      {/* TOP SECTION: 5 Servo PWM Meters + GPIO Registers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {/* Left: 5 PWM Channels */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>
              Servo PWM Pulse Widths (1000 µs – 2000 µs)
            </span>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Click channel to view timing
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {channels.map((ch) => {
              const isInspected = ch.id === selectedChannelId;
              const percentage = Math.max(0, Math.min(100, (ch.pwm - 1000) / 10));
              const duty = ((ch.pwm / 20000) * 100).toFixed(1);

              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChannelId(ch.id)}
                  style={{
                    background: isInspected
                      ? "rgba(41, 151, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${
                      isInspected ? "rgba(41, 151, 255, 0.4)" : "var(--border)"
                    }`,
                    padding: "8px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isInspected ? "#FFFFFF" : "var(--text-main)" }}>
                        {ch.label}
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--accent)" }}>
                        {ch.pin}
                      </span>
                      {isInspected && (
                        <span style={{ fontSize: 9, background: "var(--accent)", color: "#FFFFFF", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                      {ch.pwm} µs <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>({duty}%)</span>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 5, background: "rgba(255, 255, 255, 0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        background: isInspected
                          ? "var(--accent)"
                          : "linear-gradient(90deg, #2997FF, #00D4FF)",
                        borderRadius: 3,
                        transition: "width 0.06s ease-out",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Digital Register + UART */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* GPIO Register (PORTB) */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border)",
              padding: "14px 16px",
              borderRadius: 10,
            }}
          >
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              Microcontroller GPIO Data Register (PORTB)
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Binary Register</span>
                <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "var(--success)", letterSpacing: 1.5 }}>
                  {binPortB}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Hex Value</span>
                <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
                  {hexPortB}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Decimal State</span>
                <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "var(--warning)" }}>
                  {portBVal}
                </span>
              </div>
            </div>
          </div>

          {/* UART Serial Telemetry Stream */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border)",
              padding: "14px 16px",
              borderRadius: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                UART Serial Protocol (115200 Baud)
              </span>
              <span style={{ fontSize: 10, color: isDataAvailable ? "var(--success)" : "var(--text-tertiary)", fontFamily: "monospace" }}>
                {isDataAvailable ? "TX ACTIVE" : "TX IDLE"}
              </span>
            </div>

            <div
              style={{
                background: "#08080A",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 12px",
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--text-secondary)",
                overflowX: "auto",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "var(--accent)" }}>TX &gt; </span>
              {uartPacket}
            </div>

            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>
              Data formatted to pipe directly to physical servos via Arduino / STM32 / ESP32 USB COM port.
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: 3:8 Decoder View + PWM Timing Diagram (DEAM Core) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          borderTop: "1px solid var(--border)",
          paddingTop: 18,
        }}
      >
        {/* 1. Live 3:8 Decoder View (74LS138) */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", fontWeight: 600 }}>
                Combinational Logic
              </span>
              <h5 style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>
                Live 3:8 Line Decoder (74LS138)
              </h5>
            </div>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-tertiary)" }}>
              Active-Low Outputs
            </span>
          </div>

          {/* 3 Input Pins (A2, A1, A0) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255, 255, 255, 0.03)",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Input Pins:</span>
            <div style={{ display: "flex", gap: 10, fontFamily: "monospace", fontSize: 12 }}>
              <span>
                <strong style={{ color: "var(--accent)" }}>A₂</strong> (M): {a2}
              </span>
              <span>
                <strong style={{ color: "var(--accent)" }}>A₁</strong> (R): {a1}
              </span>
              <span>
                <strong style={{ color: "var(--accent)" }}>A₀</strong> (P): {a0}
              </span>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: isDataAvailable ? "#30D158" : "var(--text-tertiary)", fontFamily: "monospace" }}>
              {isDataAvailable ? `Select: Line ${decoderSelect}` : "Bus Idle (No Signal)"}
            </span>
          </div>

          {/* 8 Output Pins (Y0..Y7) with live LED status */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 6,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
              const isLineActive = k === decoderSelect;
              return (
                <div
                  key={k}
                  style={{
                    background: isLineActive
                      ? "rgba(41, 151, 255, 0.2)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${
                      isLineActive ? "var(--accent)" : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: 6,
                    padding: "8px 2px",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isLineActive ? "#2997FF" : "var(--text-tertiary)",
                      boxShadow: isLineActive ? "0 0 6px #2997FF" : "none",
                      margin: "0 auto 4px",
                    }}
                  />
                  <div style={{ fontSize: 10, fontWeight: 700, color: isLineActive ? "#FFFFFF" : "var(--text-secondary)" }}>
                    Y{k}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "monospace", color: isLineActive ? "#30D158" : "var(--text-tertiary)" }}>
                    {isLineActive ? "LOW" : "HIGH"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            In standard 74LS138 architecture, inputs <code style={{ color: "var(--accent)" }}>[A₂..A₀] = {a2}{a1}{a0}₂</code> assert output line <strong style={{ color: "#FFFFFF" }}>Y{decoderSelect}</strong> (Active-Low <code style={{ color: "var(--accent)" }}>Y{decoderSelect} = 0V</code>) to drive bus multiplexing.
          </div>
        </div>

        {/* 2. PWM Timing Diagram (ICR1, OCR1A, and Pulse Width) */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", fontWeight: 600 }}>
                16-Bit Timer 1 (Mode 14)
              </span>
              <h5 style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>
                PWM Timing Diagram • {activeChannel.label}
              </h5>
            </div>
            <div style={{ display: "flex", gap: 6, fontFamily: "monospace", fontSize: 10 }}>
              <span style={{ background: "rgba(255, 255, 255, 0.08)", padding: "2px 6px", borderRadius: 4 }}>
                ICR1: {icr1Top}
              </span>
              <span style={{ background: "rgba(41, 151, 255, 0.15)", color: "var(--accent)", padding: "2px 6px", borderRadius: 4 }}>
                OCR1A: {ocr1aValue}
              </span>
            </div>
          </div>

          {/* SVG Timing Diagram */}
          <div style={{ width: "100%", background: "#08080A", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <svg viewBox="0 0 460 145" style={{ width: "100%", height: "auto", display: "block" }}>
              {/* Grid Lines */}
              <line x1="35" y1="15" x2="435" y2="15" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
              <line x1="35" y1="65" x2="435" y2="65" stroke="rgba(255,255,255,0.06)" />
              <line x1="35" y1="125" x2="435" y2="125" stroke="rgba(255,255,255,0.06)" />

              {/* Labels on Left Axis */}
              <text x="30" y="20" fill="#8E8E93" fontSize="9" textAnchor="end" fontFamily="monospace">ICR1</text>
              <text x="30" y="42" fill="#2997FF" fontSize="9" textAnchor="end" fontFamily="monospace">OCR1A</text>
              <text x="30" y="68" fill="#8E8E93" fontSize="9" textAnchor="end" fontFamily="monospace">0</text>
              <text x="30" y="96" fill="#30D158" fontSize="9" textAnchor="end" fontFamily="monospace">5V</text>
              <text x="30" y="128" fill="#8E8E93" fontSize="9" textAnchor="end" fontFamily="monospace">0V</text>

              {/* UPPER GRAPH: TCNT1 Counter Sawtooth Ramp (0 to ICR1=39999) */}
              <polyline
                points="35,65 235,18 235,65 435,18 435,65"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="1.5"
              />

              {/* Dashed Threshold Line for OCR1A */}
              {(() => {
                // OCR1A maps between 2000 and 4000 ticks out of 40000 (5% to 10% height)
                const ocrY = 65 - (ocr1aValue / 40000) * 47;
                return (
                  <line
                    x1="35"
                    y1={ocrY}
                    x2="435"
                    y2={ocrY}
                    stroke="#FF9F0A"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                  />
                );
              })()}

              {/* LOWER GRAPH: Digital Output Waveform (PB1 / OC1A) */}
              {(() => {
                // Pulse width width in 200px period
                const pulseWidthPx = Math.max(12, Math.min(40, (activePwmUs / 20000) * 200));
                return (
                  <g>
                    {/* Period 1 */}
                    <polyline
                      points={`35,125 35,92 ${35 + pulseWidthPx},92 ${35 + pulseWidthPx},125 235,125 235,92 ${235 + pulseWidthPx},92 ${235 + pulseWidthPx},125 435,125`}
                      fill="none"
                      stroke="#30D158"
                      strokeWidth="2"
                    />

                    {/* Width dimension annotation */}
                    <line x1="35" y1="84" x2={35 + pulseWidthPx} y2="84" stroke="#2997FF" strokeWidth="1" />
                    <text
                      x={35 + pulseWidthPx / 2}
                      y="80"
                      fill="#2997FF"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {activePwmUs} µs
                    </text>
                  </g>
                );
              })()}

              {/* Full Period Dimension Arrow (20 ms) */}
              <line x1="35" y1="138" x2="235" y2="138" stroke="#8E8E93" strokeWidth="1" />
              <text x="135" y="136" fill="#8E8E93" fontSize="8" textAnchor="middle" fontFamily="monospace">
                T = 20.0 ms (50 Hz Period)
              </text>
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)" }}>
            <span>
              Pulse Width: <strong style={{ color: "var(--accent)", fontFamily: "monospace" }}>{activePwmUs} µs</strong>
            </span>
            <span>
              Duty Cycle: <strong style={{ color: "#30D158", fontFamily: "monospace" }}>{dutyPercent}%</strong>
            </span>
            <span>
              Timer Register: <strong style={{ color: "#FF9F0A", fontFamily: "monospace" }}>OCR1A={ocr1aValue}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
