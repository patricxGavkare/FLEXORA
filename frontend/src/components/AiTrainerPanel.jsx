// =============================================================================
// AiTrainerPanel.jsx - Interactive In-Browser Machine Learning Calibration Studio
//
// WHAT THIS COMPONENT DOES:
// 1. Lets students and patients train brand-new custom bionic grips on the fly.
// 2. Records 30 normalized feature frames from the live webcam.
// 3. Computes centroid weights and updates the model in real time (takes < 0.5s).
// 4. Displays a real-time Softmax Confidence Meter (0% to 100%).
// 5. Allows downloading the trained model weights as a .json file for course submission!
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { classifierModel } from "../utils/mlClassifier";

export default function AiTrainerPanel({ currentFeatures, mlPrediction, flexions }) {
  const [gripName, setGripName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [recordedSamples, setRecordedSamples] = useState([]);
  const [trainedList, setTrainedList] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  const samplesBufferRef = useRef([]);

  // Load list of trained grips on mount
  useEffect(() => {
    refreshGripList();
  }, []);

  function refreshGripList() {
    setTrainedList(classifierModel.getTrainedGripNames());
  }

  // Handle start recording: 3-second countdown then collects 30 sample frames
  function startTraining() {
    if (!gripName.trim()) {
      setStatusMessage("Please enter a name for your custom grip.");
      return;
    }

    if (!currentFeatures) {
      setStatusMessage("No hand detected. Please hold your hand in front of the camera.");
      return;
    }

    setStatusMessage("Hold hand steady... Calibration starting in 3 seconds.");
    setCountdown(3);
    samplesBufferRef.current = [];

    // 3-second countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Collect 30 consecutive feature vectors from the live stream
  function executeRecording() {
    setIsRecording(true);
    setStatusMessage("Recording 30 spatial feature frames...");

    const collected = [];
    let framesCaptured = 0;

    const captureInterval = setInterval(() => {
      if (currentFeatures) {
        collected.push([...currentFeatures]);
        framesCaptured++;
      }

      if (framesCaptured >= 30) {
        clearInterval(captureInterval);
        setIsRecording(false);

        // Train the model with the collected dataset
        const success = classifierModel.addTrainedGrip(gripName.trim(), collected);
        if (success) {
          setStatusMessage(`✓ Successfully trained "${gripName.trim()}" with 30 vector samples!`);
          setGripName("");
          refreshGripList();
        } else {
          setStatusMessage("Calibration failed. Please try again.");
        }
      }
    }, 50); // Record every 50ms (~1.5 seconds total)
  }

  // Remove a trained grip
  function handleDeleteGrip(name) {
    classifierModel.removeGrip(name);
    refreshGripList();
    setStatusMessage(`Removed "${name}" from model.`);
  }

  // Export trained model as JSON file
  function handleExportModel() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(classifierModel.exportJSON());
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "flexora_trained_model_weights.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setStatusMessage("Model weights exported as JSON file.");
  }

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
        gap: 22,
      }}
    >
      {/* Studio Header */}
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
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent)",
              }}
            />
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              AI Model Studio & Few-Shot Grip Calibrator
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
              CLIENT-SIDE AIML
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Normalized 66-D Euclidean feature vectors with Softmax confidence scoring
          </p>
        </div>

        <button
          onClick={handleExportModel}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--border)",
            color: "var(--text-main)",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          Download Model JSON
        </button>
      </div>

      {/* Real-Time Live Inference HUD */}
      {mlPrediction ? (
        <div
          style={{
            background: "rgba(41, 151, 255, 0.06)",
            border: "1px solid rgba(41, 151, 255, 0.25)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Active ML Classification
            </span>
            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, fontFamily: "monospace" }}>
              Confidence: {mlPrediction.confidence}%
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>
              {mlPrediction.topGesture}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
              (Euclidean distance: {mlPrediction.distance})
            </span>
          </div>

          {/* Animated Softmax Confidence Bar */}
          <div
            style={{
              height: 6,
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${mlPrediction.confidence}%`,
                height: "100%",
                background: "linear-gradient(90deg, #2997FF, #30D158)",
                borderRadius: 3,
                transition: "width 0.15s ease-out",
              }}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px 20px",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          No custom grips calibrated yet. Record your first custom grip below!
        </div>
      )}

      {/* Training / Calibration Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {/* Left: Input & Capture */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
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
            Calibrate New Grip Pattern
          </p>

          <input
            type="text"
            placeholder="e.g. Key Grip, Rock Sign, Pen Grip"
            value={gripName}
            onChange={(e) => setGripName(e.target.value)}
            disabled={isRecording || countdown > 0}
            style={{
              background: "#08080A",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#FFFFFF",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          />

          <button
            onClick={startTraining}
            disabled={isRecording || countdown > 0}
            style={{
              background: isRecording
                ? "var(--warning)"
                : countdown > 0
                ? "rgba(255, 255, 255, 0.15)"
                : "var(--accent)",
              color: "#FFFFFF",
              padding: "12px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            {countdown > 0
              ? `Get Ready in ${countdown}s...`
              : isRecording
              ? "Recording 30 Frames..."
              : "Record & Train Grip"}
          </button>

          {statusMessage && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--accent)", lineHeight: 1.4 }}>
              {statusMessage}
            </p>
          )}
        </div>

        {/* Right: Trained Model Inventory */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              Calibrated Grip Classes ({trainedList.length})
            </p>
          </div>

          {trainedList.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "auto 0" }}>
              No custom grips in memory. Train one to test the model!
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
              {trainedList.map((name) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                  <button
                    onClick={() => handleDeleteGrip(name)}
                    style={{
                      color: "#FF453A",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live 5-Digit Feature Vector Bar Visualizer */}
      {flexions && (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              margin: "0 0 10px",
            }}
          >
            Live Normalized Digit Flexion Vectors (Inputs to Classifier)
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, textAlign: "center" }}>
            {Object.entries(flexions).map(([digit, val]) => (
              <div key={digit}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "capitalize", display: "block" }}>
                  {digit}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "var(--accent)" }}>
                  {val.toFixed(2)}
                </span>
                <div
                  style={{
                    height: 4,
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: 2,
                    marginTop: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(val * 100)}%`,
                      height: "100%",
                      background: "var(--accent)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
