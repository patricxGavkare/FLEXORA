// =============================================================================
// SemgPanel.jsx - Virtual Surface Electromyography (sEMG) Oscilloscope
//
// WHAT THIS COMPONENT DOES:
// In commercial bionic prosthetics (like Open Bionics Hero Arm or Ottobock),
// users do not wear cameras—they wear surface electrodes (sEMG) on their
// forearm muscles (Flexor and Extensor groups) that detect muscle electrical
// potentials in microvolts (µV).
//
// This component simulates an actual medical bio-signal acquisition device:
// 1. Synthesizes real-time physiological sEMG bursts based on hand flexion.
// 2. Draws an interactive dual-channel 60 FPS oscilloscope.
// 3. Computes live Digital Signal Processing (DSP) telemetry:
//    - RMS (Root Mean Square in µV)
//    - MAV (Mean Absolute Value in µV)
//    - SNR (Signal-to-Noise Ratio in dB)
// 4. Provides filtering filters: Raw Differential vs Rectified vs Linear Envelope.
// =============================================================================

import React, { useEffect, useRef, useState } from "react";

export default function SemgPanel({ fingers, gesture }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Filter mode: "raw" (bipolar spikes), "rectified" (absolute value), "envelope" (low-pass smoothed)
  const [filterMode, setFilterMode] = useState("raw");
  const [isPaused, setIsPaused] = useState(false);
  const [gain, setGain] = useState(1.5);

  // Telemetry metrics
  const [metrics, setMetrics] = useState({
    ch1Rms: 24,
    ch1Mav: 18,
    ch2Rms: 15,
    ch2Mav: 12,
    snr: 26.4,
  });

  // History buffer for the scrolling oscilloscope (300 points)
  const bufferLength = 320;
  const ch1HistoryRef = useRef(new Array(bufferLength).fill(0));
  const ch2HistoryRef = useRef(new Array(bufferLength).fill(0));
  const timeRef = useRef(0);

  // Compute total hand flexion (0.0 = open, 1.0 = solid fist)
  const totalFlexion = fingers?.flexions
    ? (fingers.flexions.thumb +
        fingers.flexions.index +
        fingers.flexions.middle +
        fingers.flexions.ring +
        fingers.flexions.pinky) /
      5.0
    : 0;

  // Extension activation (high when hand is wide open)
  const totalExtension = Math.max(0, 1.0 - totalFlexion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function renderLoop() {
      if (!isPaused) {
        timeRef.current += 0.2;

        // ---------------------------------------------------------------------
        // Synthesize Muscle Action Potentials:
        // Raw sEMG is modeled as a band-limited stochastic process (Gaussian noise)
        // modulated by muscle recruitment amplitude + motor unit action potential (MUAP) spikes.
        // ---------------------------------------------------------------------

        // Baseline thermal noise (~10 - 20 µV)
        const noise1 = (Math.random() - 0.5) * 18;
        const noise2 = (Math.random() - 0.5) * 18;

        // Channel 1: Flexor Digitorum (fires strongly when flexing fingers / making a fist)
        const flexorDrive = totalFlexion * 280 * gain;
        const muapFlexor =
          Math.sin(timeRef.current * 1.8) *
          Math.cos(timeRef.current * 3.4) *
          (Math.random() * 0.9 + 0.1);
        let rawCh1 = noise1 + flexorDrive * muapFlexor;

        // Channel 2: Extensor Carpi Radialis (fires when extending fingers outward)
        const extensorDrive = totalExtension * 220 * gain;
        const muapExtensor =
          Math.sin(timeRef.current * 2.2) *
          Math.cos(timeRef.current * 4.1) *
          (Math.random() * 0.9 + 0.1);
        let rawCh2 = noise2 + extensorDrive * muapExtensor;

        // Apply selected DSP Filter mode
        let plotCh1 = rawCh1;
        let plotCh2 = rawCh2;

        if (filterMode === "rectified") {
          // Full-wave rectification (|x|)
          plotCh1 = Math.abs(rawCh1);
          plotCh2 = Math.abs(rawCh2);
        } else if (filterMode === "envelope") {
          // Low-pass filtered envelope (smoothed positive envelope for motor control)
          const lastCh1 = ch1HistoryRef.current[ch1HistoryRef.current.length - 1] || 0;
          const lastCh2 = ch2HistoryRef.current[ch2HistoryRef.current.length - 1] || 0;
          plotCh1 = lastCh1 * 0.85 + Math.abs(rawCh1) * 0.15;
          plotCh2 = lastCh2 * 0.85 + Math.abs(rawCh2) * 0.15;
        }

        // Push into scrolling history buffer
        ch1HistoryRef.current.push(plotCh1);
        ch1HistoryRef.current.shift();

        ch2HistoryRef.current.push(plotCh2);
        ch2HistoryRef.current.shift();

        // Calculate DSP metrics every 8 frames
        if (Math.floor(timeRef.current * 5) % 8 === 0) {
          const ch1SqSum = ch1HistoryRef.current.reduce((sum, v) => sum + v * v, 0);
          const ch1AbsSum = ch1HistoryRef.current.reduce((sum, v) => sum + Math.abs(v), 0);
          const ch2SqSum = ch2HistoryRef.current.reduce((sum, v) => sum + v * v, 0);
          const ch2AbsSum = ch2HistoryRef.current.reduce((sum, v) => sum + Math.abs(v), 0);

          const r1 = Math.sqrt(ch1SqSum / bufferLength);
          const m1 = ch1AbsSum / bufferLength;
          const r2 = Math.sqrt(ch2SqSum / bufferLength);
          const m2 = ch2AbsSum / bufferLength;

          setMetrics({
            ch1Rms: Math.round(r1),
            ch1Mav: Math.round(m1),
            ch2Rms: Math.round(r2),
            ch2Mav: Math.round(m2),
            snr: Number((20 + (totalFlexion + totalExtension) * 12).toFixed(1)),
          });
        }
      }

      // -----------------------------------------------------------------------
      // Render Oscilloscope Display
      // -----------------------------------------------------------------------
      ctx.fillStyle = "#07090E";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw oscilloscope grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;

      // Vertical divisions (time marks)
      const xStep = canvas.width / 10;
      for (let x = 0; x < canvas.width; x += xStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal division lines (voltage scale)
      const yStep = canvas.height / 6;
      for (let y = 0; y < canvas.height; y += yStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Midline reference axes for each channel
      const midCh1 = canvas.height * 0.28;
      const midCh2 = canvas.height * 0.74;

      ctx.strokeStyle = "rgba(41, 151, 255, 0.2)";
      ctx.beginPath();
      ctx.moveTo(0, midCh1);
      ctx.lineTo(canvas.width, midCh1);
      ctx.stroke();

      ctx.strokeStyle = "rgba(48, 209, 88, 0.2)";
      ctx.beginPath();
      ctx.moveTo(0, midCh2);
      ctx.lineTo(canvas.width, midCh2);
      ctx.stroke();

      // Channel 1 Label
      ctx.font = "11px monospace";
      ctx.fillStyle = "#2997FF";
      ctx.fillText("CH1: FLEXOR DIGITORUM (µV)", 12, midCh1 - 44);

      // Channel 2 Label
      ctx.fillStyle = "#30D158";
      ctx.fillText("CH2: EXTENSOR CARPI (µV)", 12, midCh2 - 44);

      // Scale factor to map µV values to canvas pixels
      const scale = filterMode === "raw" ? 0.35 : 0.45;

      // Draw Channel 1 Waveform (Flexor - Cyan/Blue)
      ctx.strokeStyle = "#2997FF";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "rgba(41, 151, 255, 0.5)";
      ctx.shadowBlur = 6;
      ctx.beginPath();

      const dx = canvas.width / (bufferLength - 1);
      for (let i = 0; i < bufferLength; i++) {
        const x = i * dx;
        const y = midCh1 - ch1HistoryRef.current[i] * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Channel 2 Waveform (Extensor - Green)
      ctx.strokeStyle = "#30D158";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "rgba(48, 209, 88, 0.5)";
      ctx.shadowBlur = 6;
      ctx.beginPath();

      for (let i = 0; i < bufferLength; i++) {
        const x = i * dx;
        const y = midCh2 - ch2HistoryRef.current[i] * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Reset shadows
      ctx.shadowBlur = 0;

      // Trigger next animation frame
      animationRef.current = requestAnimationFrame(renderLoop);
    }

    renderLoop();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [filterMode, isPaused, gain, totalFlexion, totalExtension]);

  return (
    <div
      style={{
        background: "rgba(18, 18, 21, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "24px",
        color: "var(--text-main)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#30D158",
                boxShadow: "0 0 8px #30D158",
              }}
            />
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Virtual Surface EMG (sEMG) Bio-Signal Oscilloscope
            </h4>
            <span
              style={{
                fontSize: 10,
                background: "rgba(48, 209, 88, 0.15)",
                color: "#30D158",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 600,
                fontFamily: "monospace",
              }}
            >
              1000 Hz BIO-ADC
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
              SIMULATED BIO-POTENTIAL
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Simulates real-world forearm electrode muscle potentials for myoelectric bionic prosthesis control
          </p>
        </div>

        {/* Controls: Filter modes & Pause */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              padding: 3,
              borderRadius: 8,
              display: "inline-flex",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setFilterMode("raw")}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: filterMode === "raw" ? "#FFFFFF" : "var(--text-secondary)",
                background: filterMode === "raw" ? "rgba(255, 255, 255, 0.15)" : "transparent",
              }}
            >
              Raw Differential
            </button>
            <button
              onClick={() => setFilterMode("rectified")}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: filterMode === "rectified" ? "#FFFFFF" : "var(--text-secondary)",
                background: filterMode === "rectified" ? "rgba(255, 255, 255, 0.15)" : "transparent",
              }}
            >
              Full-Wave Rectified
            </button>
            <button
              onClick={() => setFilterMode("envelope")}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: filterMode === "envelope" ? "#FFFFFF" : "var(--text-secondary)",
                background: filterMode === "envelope" ? "rgba(255, 255, 255, 0.15)" : "transparent",
              }}
            >
              Linear Envelope
            </button>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              background: isPaused ? "var(--warning)" : "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--border)",
              color: isPaused ? "#000000" : "var(--text-main)",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {isPaused ? "RESUME" : "FREEZE"}
          </button>
        </div>
      </div>

      {/* Main Canvas Oscilloscope */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 240,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={240}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />

        {/* Live Legend */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            display: "flex",
            gap: 16,
            fontSize: 11,
            fontFamily: "monospace",
            background: "rgba(0, 0, 0, 0.65)",
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <span style={{ color: "#2997FF" }}>● CH1: Flexor Group</span>
          <span style={{ color: "#30D158" }}>● CH2: Extensor Group</span>
          <span style={{ color: "var(--text-secondary)" }}>Timebase: 20 ms/div</span>
        </div>
      </div>

      {/* DSP Telemetry Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
        }}
      >
        {/* Metric 1: CH1 RMS */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
            CH1 Flexor RMS
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "#2997FF" }}>
            {metrics.ch1Rms} µV
          </span>
        </div>

        {/* Metric 2: CH1 MAV */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
            CH1 Mean Abs (MAV)
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "#2997FF" }}>
            {metrics.ch1Mav} µV
          </span>
        </div>

        {/* Metric 3: CH2 RMS */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
            CH2 Extensor RMS
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "#30D158" }}>
            {metrics.ch2Rms} µV
          </span>
        </div>

        {/* Metric 4: CH2 MAV */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
            CH2 Mean Abs (MAV)
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "#30D158" }}>
            {metrics.ch2Mav} µV
          </span>
        </div>

        {/* Metric 5: Signal to Noise Ratio */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
            Electrode SNR
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "var(--warning)" }}>
            {metrics.snr} dB
          </span>
        </div>
      </div>

      {/* Educational Explanation Box */}
      <div
        style={{
          background: "rgba(48, 209, 88, 0.05)",
          border: "1px solid rgba(48, 209, 88, 0.2)",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#30D158" }}>How Real Myoelectric Bionics Work:</strong> When a user intends to close their hand, motor neurons depolarize muscle fibers in the forearm, producing microvolt-level electrical bursts. The microcontroller filters these signals via band-pass ($20 - 450\text{ Hz}$) and rectifies them into a linear envelope that directly modulates the servo motor duty cycles.
      </div>
    </div>
  );
}
