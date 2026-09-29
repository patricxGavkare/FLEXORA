// =============================================================================
// HandTracker.jsx - Main Real-Time Vision & Prosthetic Simulation Workstation
//
// WHAT THIS COMPONENT DOES (in simple English):
// 1. Loads Google MediaPipe HandLandmarker in browser memory (via GPU + WASM).
// 2. Streams video from the user webcam and detects 21 3D hand keypoints in real time.
// 3. Batches state to keep pipeline latency sub-15ms at 60 frames per second.
// 4. Feeds joint angles directly to the articulated SVG prosthetic hand.
// 5. Houses the 5 specialized engineering & biomedical workstation tabs:
//    - Tab 1: Bionic Kinematics, Clinical Presets & Manual Slider Override
//    - Tab 2: DEAM Microcontroller Hardware Bus, Timers & PWM Registers
//    - Tab 3: AI Model Few-Shot Custom Grip Calibrator
//    - Tab 4: sEMG Dual-Channel Forearm Muscle Bio-Potential Oscilloscope
//    - Tab 5: Closed-Loop Tactile Force & Haptic Grasp Laboratory
// =============================================================================

import React, { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import VirtualHand from "./VirtualHand";
import { getFingerStates, getGesture, getBinaryCode } from "../utils/handLogic";
import KinematicsPanel from "./KinematicsPanel";
import McuPanel from "./McuPanel";
import AiTrainerPanel from "./AiTrainerPanel";
import SemgPanel from "./SemgPanel";
import HapticGraspPanel from "./HapticGraspPanel";
import { extractNormalizedFeatures, classifierModel } from "../utils/mlClassifier";
import {
  createStabilizerState,
  resetStabilizerState,
  updateGestureStabilizer,
} from "../utils/gestureStabilizer";

// Anatomical skeleton joint connections for drawing lines between the 21 keypoints
const SKELETON_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm knuckle bridge
];

export default function HandTracker({ onLatencyUpdate }) {
  // DOM References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Performance tracking refs (avoid triggering React re-renders every 16ms)
  const latencyHistoryRef = useRef([]);
  const frameCountRef = useRef(0);

  // Gesture stabilization & predictive trajectory state ref (pure kinematic arithmetic across rolling window)
  const stabilizerRef = useRef(createStabilizerState());

  // Stabilizer reactive telemetry for UI display
  const [stabilizerTelemetry, setStabilizerTelemetry] = useState({
    stabilizedGesture: null,
    stabilizedBinary: null,
    isPredicted: false,
    gestureConfidence: null,
    stabilityScore: 0,
    state: "idle", // "idle" | "moving" | "predicted" | "settled"
  });

  // Camera stream track ref for pausing / stopping
  const mediaStreamRef = useRef(null);

  // Hardware Power & Stream State (Single Source of Truth inputs)
  const [isCameraPowerOn, setIsCameraPowerOn] = useState(true);
  const [streamActive, setStreamActive] = useState(false);
  const [handDetected, setHandDetected] = useState(false);

  // Primary status state
  const [status, setStatus] = useState("Initializing neural pipeline...");
  const [isReady, setIsReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Camera Overlay Controls
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [isBgBlur, setIsBgBlur] = useState(false); // Webcam background blur toggle
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings gear dropdown
  const settingsRef = useRef(null);

  // Close settings dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Active View Tab (5 Workstation Modes)
  // "kinematics" | "mcu" | "ai" | "semg" | "haptic"
  const [activeTab, setActiveTab] = useState("kinematics");

  // Manual Hardware Override State (allows testing without camera)
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualFlexions, setManualFlexions] = useState({
    thumb: 0.0,
    index: 0.0,
    middle: 0.0,
    ring: 0.0,
    pinky: 0.0,
  });

  // Batched hand tracking data from computer vision (strictly null when no active live hand)
  const [handData, setHandData] = useState({
    fingers: null,
    gesture: null,
    binaryCode: null,
  });

  // Throttled latency telemetry state (strictly null when no active live hand)
  const [telemetry, setTelemetry] = useState({
    instantLatency: null,
    avgLatency: null,
  });

  // Spatial features for custom AI model training
  const [currentFeatures, setCurrentFeatures] = useState(null);
  const [mlPrediction, setMlPrediction] = useState(null);

  // Helper to immediately reset telemetry, stabilizer, and hand tracking state
  const clearHandDataAndLatency = useCallback(() => {
    latencyHistoryRef.current = [];
    frameCountRef.current = 0;
    resetStabilizerState(stabilizerRef.current);
    setStabilizerTelemetry((prev) => {
      if (prev.state !== "idle" || prev.stabilizedGesture !== null) {
        return {
          stabilizedGesture: null,
          stabilizedBinary: null,
          isPredicted: false,
          gestureConfidence: null,
          stabilityScore: 0,
          state: "idle",
        };
      }
      return prev;
    });
    setTelemetry((prev) => {
      if (prev.instantLatency !== null || prev.avgLatency !== null) {
        return { instantLatency: null, avgLatency: null };
      }
      return prev;
    });
    if (onLatencyUpdate) {
      onLatencyUpdate(null);
    }
    setHandData((prev) => {
      if (prev.fingers !== null || prev.gesture !== null || prev.binaryCode !== null) {
        return { fingers: null, gesture: null, binaryCode: null };
      }
      return prev;
    });
    setCurrentFeatures(null);
    setMlPrediction(null);
  }, [onLatencyUpdate]);

  // Comprehensive reset when camera stream drops, errors, unmounts, or turns off
  const resetVisionState = useCallback(
    (reason = "Camera inactive") => {
      setStreamActive(false);
      setHandDetected(false);
      clearHandDataAndLatency();
      if (reason) setStatus(reason);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    },
    [clearHandDataAndLatency]
  );

  // Manual Test: Toggle camera on/off explicitly
  const toggleCameraPower = () => {
    if (isCameraPowerOn) {
      setIsCameraPowerOn(false);
      setIsReady(false);
      resetVisionState("Camera Powered Off (Manual Test)");
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } else {
      setCameraError(false);
      setIsCameraPowerOn(true);
    }
  };

  useEffect(() => {
    let handLandmarker = null;
    let animationId = null;

    if (!isCameraPowerOn) {
      resetVisionState("Camera Powered Off (Manual Test)");
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsReady(false);
      setStreamActive(false);
      return;
    }

    async function initializeVision() {
      try {
        setStatus("Loading MediaPipe Vision Model...");

        // Load WASM binaries from Google CDN
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // Create HandLandmarker instance with GPU delegate for low-latency inference
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        setStatus("Requesting camera access...");

        // Request 640x480 webcam video stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 60 } },
        });

        mediaStreamRef.current = stream;

        // Reset state immediately on stream ended/inactive/mute (Requirement 4)
        const handleStreamEnded = () => {
          resetVisionState("Camera stream ended / inactive");
          setIsReady(false);
          setStreamActive(false);
        };

        const handleTrackMuted = () => {
          resetVisionState("Camera stream muted / backgrounded");
        };

        const handleTrackUnmuted = () => {
          setStreamActive(true);
          setStatus("Live Neural Tracking Active");
        };

        stream.addEventListener("inactive", handleStreamEnded);
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", handleStreamEnded);
          track.addEventListener("mute", handleTrackMuted);
          track.addEventListener("unmute", handleTrackUnmuted);
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setIsReady(true);
            setStreamActive(true);
            setStatus("Live Neural Tracking Active");
            // Start the continuous animation frame loop
            predictFrame();
          };
        }
      } catch (err) {
        console.error("Failed to initialize vision pipeline:", err);
        setCameraError(true);
        setIsReady(false);
        setStreamActive(false);
        resetVisionState("Camera offline / denied. Enable Manual Override below to test.");
      }
    }

    // Visibility change handler (e.g. background tab)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetVisionState("Tab backgrounded • Camera telemetry idle");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Main animation frame loop (~60 FPS)
    function predictFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const isVideoStreaming =
        isCameraPowerOn &&
        !isStreamPaused &&
        !cameraError &&
        video &&
        canvas &&
        handLandmarker &&
        video.readyState >= 2 &&
        mediaStreamRef.current &&
        mediaStreamRef.current.active;

      if (!isVideoStreaming) {
        setStreamActive(false);
        setHandDetected(false);
        clearHandDataAndLatency();
        animationId = requestAnimationFrame(predictFrame);
        return;
      }

      setStreamActive(true);

      const ctx = canvas.getContext("2d");

      // Sync canvas dimensions with video
      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Clear canvas for fresh draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Measure pure inference time (ms)
      const tStart = performance.now();
      let results = null;
      try {
        results = handLandmarker.detectForVideo(video, tStart);
      } catch (err) {
        console.warn("HandLandmarker detection error:", err);
      }
      const tEnd = performance.now();
      const frameLatency = tEnd - tStart;

      const hasHand = Boolean(results && results.landmarks && results.landmarks.length > 0);

      if (!hasHand) {
        // No hand in view: Clear telemetry and hand states immediately
        if (handDetected) {
          setHandDetected(false);
        }
        clearHandDataAndLatency();
      } else {
        if (!handDetected) {
          setHandDetected(true);
        }

        // Maintain rolling window of last 30 frames ONLY when hand is detected
        latencyHistoryRef.current.push(frameLatency);
        if (latencyHistoryRef.current.length > 30) {
          latencyHistoryRef.current.shift();
        }

        // Throttle telemetry update to every 8 frames to save CPU cycles
        frameCountRef.current++;
        if (frameCountRef.current % 8 === 0) {
          const sum = latencyHistoryRef.current.reduce((a, b) => a + b, 0);
          const rollingAvg = sum / latencyHistoryRef.current.length;
          const avgNum = Number(rollingAvg.toFixed(1));
          setTelemetry({
            instantLatency: Number(frameLatency.toFixed(1)),
            avgLatency: avgNum,
          });
          if (onLatencyUpdate) {
            onLatencyUpdate(avgNum);
          }
        }

        const hand = results.landmarks[0];

        // 1. Draw subtle Apple-style skeleton lines
        if (showSkeleton) {
          ctx.strokeStyle = "rgba(41, 151, 255, 0.65)";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";

          for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
            const p1 = hand[startIdx];
            const p2 = hand[endIdx];
            ctx.beginPath();
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            ctx.stroke();
          }
        }

        // 2. Draw subtle joint dots
        if (showLandmarks) {
          for (const pt of hand) {
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3.5, 0, 2 * Math.PI);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
            ctx.strokeStyle = "#2997FF";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // 3. Extract normalized scale-invariant features for custom AI model
        const features = extractNormalizedFeatures(hand);
        setCurrentFeatures(features);

        // 4. Run real-time inference on custom ML classifier
        const pred = classifierModel.predict(features);
        setMlPrediction(pred);

        // 5. Compute continuous kinematics & discrete states
        const computedFingers = getFingerStates(hand);
        if (computedFingers) {
          let computedGesture = getGesture(computedFingers);

          // If custom trained model detects a grip with high confidence (>= 65%), prioritize it
          if (pred && pred.confidence >= 65) {
            computedGesture = `${pred.topGesture} (AI Model)`;
          }

          const computedBinary = getBinaryCode(computedFingers);

          // Update raw hand state
          setHandData({
            fingers: computedFingers,
            gesture: computedGesture,
            binaryCode: computedBinary,
          });

          // 6. Temporal gesture stabilization & predictive trajectory state machine
          const stabResult = updateGestureStabilizer(
            stabilizerRef.current,
            computedFingers.flexions,
            computedGesture,
            computedBinary
          );

          // Batch update stabilization state when telemetry values change
          setStabilizerTelemetry((prev) => {
            if (
              prev.stabilizedGesture !== stabResult.stabilizedGesture ||
              prev.isPredicted !== stabResult.isPredicted ||
              prev.state !== stabResult.state ||
              Math.abs(prev.stabilityScore - stabResult.stabilityScore) > 0.05 ||
              prev.gestureConfidence !== stabResult.gestureConfidence
            ) {
              return stabResult;
            }
            return prev;
          });
        }
      }

      animationId = requestAnimationFrame(predictFrame);
    }

    initializeVision();

    // Cleanup when component unmounts or camera toggles
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animationId) cancelAnimationFrame(animationId);
      if (handLandmarker) handLandmarker.close();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      resetVisionState("Camera inactive");
    };
  }, [isCameraPowerOn, showSkeleton, showLandmarks, isStreamPaused, resetVisionState, clearHandDataAndLatency, onLatencyUpdate]);

  // SINGLE SOURCE OF TRUTH (Requirement 2)
  const isLiveHandDataAvailable = Boolean(streamActive && handDetected && !isManualMode);

  // Compute effective hand kinematics:
  // If Manual Mode is ON, synthesize finger structures from manual sliders;
  // otherwise, use live camera vision when isLiveHandDataAvailable is true.
  const effectiveFingers = isManualMode
    ? {
        thumb: manualFlexions.thumb >= 0.5 ? "Bent" : "Straight",
        index: manualFlexions.index >= 0.5 ? "Bent" : "Straight",
        middle: manualFlexions.middle >= 0.5 ? "Bent" : "Straight",
        ring: manualFlexions.ring >= 0.5 ? "Bent" : "Straight",
        pinky: manualFlexions.pinky >= 0.5 ? "Bent" : "Straight",
        flexions: { ...manualFlexions },
        angles: {
          thumb: Number((manualFlexions.thumb * 40).toFixed(1)),
          index: Number((manualFlexions.index * 42).toFixed(1)),
          middle: Number((manualFlexions.middle * 42).toFixed(1)),
          ring: Number((manualFlexions.ring * 42).toFixed(1)),
          pinky: Number((manualFlexions.pinky * 40).toFixed(1)),
        },
        pwm: {
          thumb: Math.round(1000 + manualFlexions.thumb * 1000),
          index: Math.round(1000 + manualFlexions.index * 1000),
          middle: Math.round(1000 + manualFlexions.middle * 1000),
          ring: Math.round(1000 + manualFlexions.ring * 1000),
          pinky: Math.round(1000 + manualFlexions.pinky * 1000),
        },
      }
    : isLiveHandDataAvailable
    ? handData.fingers
    : null;

  const effectiveGesture = isManualMode
    ? getGesture(effectiveFingers)
    : !streamActive
    ? "Camera inactive"
    : !handDetected
    ? "No hand detected"
    : stabilizerTelemetry.stabilizedGesture
    ? (stabilizerTelemetry.isPredicted
        ? `${stabilizerTelemetry.stabilizedGesture} (predicted)`
        : stabilizerTelemetry.stabilizedGesture)
    : handData.gesture
    ? `${handData.gesture} (stabilizing...)`
    : "Stabilizing intent...";

  const effectiveBinary = isManualMode
    ? getBinaryCode(effectiveFingers)
    : isLiveHandDataAvailable
    ? (stabilizerTelemetry.stabilizedBinary || handData.binaryCode || "00000")
    : "—————";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
      {/* Keyframe pulse animation for trajectory predicted intent */}
      <style>{`
        @keyframes flexora-predict-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .flexora-predicting {
          animation: flexora-predict-pulse 1.1s ease-in-out infinite;
        }
      `}</style>

      {/* REAL-TIME TELEMETRY GLANCE BAR (Requirement 2 & 3: Single Source of Truth) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {/* Metric 1: Recognized Intent & Temporal Stabilization */}
        <div
          style={{
            background: "rgba(18, 18, 21, 0.8)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Header row: Title + Status Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              Recognized Intent
            </div>
            {isLiveHandDataAvailable && (
              <div
                className={stabilizerTelemetry.isPredicted ? "flexora-predicting" : ""}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                  padding: "2px 7px",
                  borderRadius: 6,
                  background:
                    stabilizerTelemetry.state === "settled"
                      ? "rgba(48, 209, 88, 0.15)"
                      : stabilizerTelemetry.state === "predicted"
                      ? "rgba(41, 151, 255, 0.18)"
                      : "rgba(255, 255, 255, 0.06)",
                  border: `1px solid ${
                    stabilizerTelemetry.state === "settled"
                      ? "rgba(48, 209, 88, 0.35)"
                      : stabilizerTelemetry.state === "predicted"
                      ? "rgba(41, 151, 255, 0.4)"
                      : "rgba(255, 255, 255, 0.1)"
                  }`,
                  color:
                    stabilizerTelemetry.state === "settled"
                      ? "#30D158"
                      : stabilizerTelemetry.state === "predicted"
                      ? "#2997FF"
                      : "var(--text-tertiary)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      stabilizerTelemetry.state === "settled"
                        ? "#30D158"
                        : stabilizerTelemetry.state === "predicted"
                        ? "#2997FF"
                        : "#8E8E93",
                    boxShadow:
                      stabilizerTelemetry.state === "settled"
                        ? "0 0 6px #30D158"
                        : stabilizerTelemetry.state === "predicted"
                        ? "0 0 8px #2997FF"
                        : "none",
                  }}
                />
                {stabilizerTelemetry.state === "settled"
                  ? "SETTLED"
                  : stabilizerTelemetry.state === "predicted"
                  ? "PREDICTED"
                  : "MOVING"}
              </div>
            )}
          </div>

          {/* Gesture Name Display */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: isLiveHandDataAvailable || isManualMode ? "#FFFFFF" : "var(--text-tertiary)",
              minHeight: 28,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontStyle: stabilizerTelemetry.isPredicted ? "italic" : "normal",
                color: stabilizerTelemetry.isPredicted ? "#64D2FF" : "inherit",
                opacity: stabilizerTelemetry.isPredicted ? 0.92 : 1,
                transition: "color 0.15s ease",
              }}
            >
              {effectiveGesture}
            </span>
          </div>

          {/* Stability Bar & Telemetry (Requirement 7) */}
          {isLiveHandDataAvailable && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {/* Thin horizontal stability bar */}
              <div
                style={{
                  width: "100%",
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255, 255, 255, 0.08)",
                  overflow: "hidden",
                }}
                title={`Kinematic Stability: ${Math.round(stabilizerTelemetry.stabilityScore * 100)}%`}
              >
                <div
                  className={stabilizerTelemetry.isPredicted ? "flexora-predicting" : ""}
                  style={{
                    height: "100%",
                    width: `${Math.round(
                      (stabilizerTelemetry.state === "settled"
                        ? 1
                        : stabilizerTelemetry.state === "predicted"
                        ? Math.max(0.65, stabilizerTelemetry.stabilityScore)
                        : stabilizerTelemetry.stabilityScore) * 100
                    )}%`,
                    background:
                      stabilizerTelemetry.state === "settled"
                        ? "#30D158"
                        : stabilizerTelemetry.state === "predicted"
                        ? "linear-gradient(90deg, #2997FF, #64D2FF)"
                        : "rgba(255, 255, 255, 0.25)",
                    boxShadow:
                      stabilizerTelemetry.state === "settled"
                        ? "0 0 6px rgba(48, 209, 88, 0.45)"
                        : stabilizerTelemetry.state === "predicted"
                        ? "0 0 8px rgba(41, 151, 255, 0.6)"
                        : "none",
                    transition: "width 0.15s ease, background 0.2s ease",
                  }}
                />
              </div>

              {/* Metric info row: Pose Match & Stability % */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--text-tertiary)",
                }}
              >
                <span>Stability: {Math.round(stabilizerTelemetry.stabilityScore * 100)}%</span>
                {stabilizerTelemetry.gestureConfidence !== null && (
                  <span style={{ color: stabilizerTelemetry.isPredicted ? "#64D2FF" : "var(--text-secondary)" }}>
                    Pose Match: {Math.round(stabilizerTelemetry.gestureConfidence * 100)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Subtitle / Mode Indicator */}
          <div style={{ fontSize: 11, color: isLiveHandDataAvailable ? "#30D158" : isManualMode ? "var(--accent)" : "var(--text-tertiary)" }}>
            {isLiveHandDataAvailable
              ? stabilizerTelemetry.isPredicted
                ? "◐ Trajectory Early-Commit (Kinematic Matching)"
                : stabilizerTelemetry.state === "settled"
                ? "● Kinematically Stabilized Pose"
                : "○ Hand In Motion (Retaining Last Intent)"
              : isManualMode
              ? "● Manual Slider Override"
              : (!streamActive ? "● Camera Inactive" : "○ Awaiting Hand in Frame")}
          </div>
        </div>

        {/* Metric 2: Pipeline Latency */}
        <div
          style={{
            background: "rgba(18, 18, 21, 0.8)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Pipeline Latency
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "monospace",
              color: isLiveHandDataAvailable && telemetry.instantLatency !== null ? "var(--accent)" : "var(--text-tertiary)",
              minHeight: 28,
              display: "flex",
              alignItems: "center",
            }}
          >
            {isLiveHandDataAvailable && telemetry.instantLatency !== null ? `${telemetry.instantLatency.toFixed(1)} ms` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
            Avg (30 frames): {isLiveHandDataAvailable && telemetry.avgLatency !== null ? `${telemetry.avgLatency.toFixed(1)} ms` : "—"}
          </div>
        </div>

        {/* Metric 3: 5-Bit Bus Register */}
        <div
          style={{
            background: "rgba(18, 18, 21, 0.8)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            5-Bit Bus Register
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "monospace",
              color: isLiveHandDataAvailable || isManualMode ? "#30D158" : "var(--text-tertiary)",
              letterSpacing: 3,
              minHeight: 28,
              display: "flex",
              alignItems: "center",
            }}
          >
            {effectiveBinary}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
            PORTB [b4..b0] {isLiveHandDataAvailable || isManualMode ? `(Hex: 0x${(parseInt(effectiveBinary, 2) || 0).toString(16).toUpperCase().padStart(2, "0")})` : "(Bus Idle)"}
          </div>
        </div>
      </div>

      {/* MAIN INTERACTIVE STAGE: Camera on Left, Virtual Hand on Right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        {/* LEFT STAGE: Camera Stream & Skeleton Overlay */}
        <div
          style={{
            position: "relative",
            background: "#08080A",
            border: "1px solid var(--border)",
            borderRadius: 18,
            overflow: "hidden",
            height: 420,
            minHeight: 420,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Top Camera Overlay Control Bar (Single Row, No Overlap) */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            {/* Left Controls Group: Camera ON/OFF & Background Blur */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, pointerEvents: "auto" }}>
              {/* Camera Power Toggle */}
              <button
                type="button"
                onClick={toggleCameraPower}
                title="Toggle Camera Feed (Click to power camera on/off)"
                style={{
                  background: isCameraPowerOn ? "rgba(48, 209, 88, 0.2)" : "rgba(255, 69, 58, 0.25)",
                  border: `1px solid ${isCameraPowerOn ? "rgba(48, 209, 88, 0.5)" : "rgba(255, 69, 58, 0.5)"}`,
                  color: isCameraPowerOn ? "#30D158" : "#FF453A",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  backdropFilter: "blur(10px)",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: isCameraPowerOn ? "#30D158" : "#FF453A",
                    boxShadow: isCameraPowerOn ? "0 0 6px #30D158" : "none",
                  }}
                />
                {isCameraPowerOn ? "Camera: ON" : "Camera: OFF"}
              </button>

              {/* Blur Toggle */}
              <button
                type="button"
                onClick={() => setIsBgBlur(!isBgBlur)}
                title="Toggle Webcam Background Blur"
                style={{
                  background: isBgBlur ? "rgba(41, 151, 255, 0.25)" : "rgba(0, 0, 0, 0.65)",
                  border: `1px solid ${isBgBlur ? "rgba(41, 151, 255, 0.45)" : "rgba(255, 255, 255, 0.15)"}`,
                  color: isBgBlur ? "var(--accent)" : "#F5F5F7",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "5px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {isBgBlur ? "Blur: On" : "Blur: Off"}
              </button>
            </div>

            {/* Right Controls Group: Freeze & Settings Dropdown */}
            <div
              ref={settingsRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                pointerEvents: "auto",
                position: "relative",
              }}
            >
              {/* Freeze Button */}
              <button
                type="button"
                onClick={() => setIsStreamPaused(!isStreamPaused)}
                title="Freeze or Resume Camera Stream"
                style={{
                  background: isStreamPaused ? "rgba(255, 69, 58, 0.35)" : "rgba(0, 0, 0, 0.65)",
                  border: `1px solid ${isStreamPaused ? "rgba(255, 69, 58, 0.6)" : "rgba(255, 255, 255, 0.15)"}`,
                  color: isStreamPaused ? "#FF453A" : "#F5F5F7",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "5px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 9 }}>{isStreamPaused ? "▶" : "⏸"}</span>
                {isStreamPaused ? "Resume" : "Freeze"}
              </button>

              {/* Settings Dropdown Trigger (Gear Icon) */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                title="Overlay Settings (Wireframe & Nodes)"
                aria-label="Overlay Settings"
                style={{
                  background: isSettingsOpen ? "rgba(41, 151, 255, 0.25)" : "rgba(0, 0, 0, 0.65)",
                  border: `1px solid ${isSettingsOpen ? "var(--accent)" : "rgba(255, 255, 255, 0.15)"}`,
                  color: isSettingsOpen ? "var(--accent)" : "#F5F5F7",
                  fontSize: 12,
                  padding: "6px 9px",
                  borderRadius: 8,
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              {/* Collapsed Dropdown Menu */}
              {isSettingsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    background: "rgba(18, 18, 21, 0.96)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 6,
                    minWidth: 154,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      color: "var(--text-tertiary)",
                      padding: "4px 8px 2px",
                      fontWeight: 600,
                    }}
                  >
                    Overlay Elements
                  </div>

                  {/* Wireframe Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    style={{
                      background: showSkeleton ? "rgba(41, 151, 255, 0.15)" : "transparent",
                      border: `1px solid ${showSkeleton ? "rgba(41, 151, 255, 0.3)" : "transparent"}`,
                      color: showSkeleton ? "#FFFFFF" : "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>Wireframe</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: showSkeleton ? "var(--accent)" : "var(--text-tertiary)",
                      }}
                    >
                      {showSkeleton ? "ON" : "OFF"}
                    </span>
                  </button>

                  {/* Nodes Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    style={{
                      background: showLandmarks ? "rgba(41, 151, 255, 0.15)" : "transparent",
                      border: `1px solid ${showLandmarks ? "rgba(41, 151, 255, 0.3)" : "transparent"}`,
                      color: showLandmarks ? "#FFFFFF" : "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>Nodes</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: showLandmarks ? "var(--accent)" : "var(--text-tertiary)",
                      }}
                    >
                      {showLandmarks ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mirrored Webcam Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
              opacity: isManualMode ? 0.35 : 1.0,
              filter: isManualMode ? "grayscale(0.8)" : isBgBlur ? "blur(8px)" : "none",
              transition: "opacity 0.2s ease, filter 0.2s ease",
            }}
          />

          {/* Mirrored Vision Canvas Overlay */}
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
              pointerEvents: "none",
            }}
          />

          {/* Overlay notification if manual override is engaged */}
          {isManualMode && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                background: "rgba(0, 0, 0, 0.8)",
                border: "1px solid var(--accent)",
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 11,
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              Manual Sliders Active — Virtual Hand Is Driven By On-Screen Controls
            </div>
          )}
        </div>

        {/* RIGHT STAGE: Articulated Bionic Hand SVG */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(180deg, #121215 0%, #0A0A0D 100%)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            height: 420,
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          {/* Top Title Tag */}
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Virtual Prosthetic Kinematics
          </div>

          {/* Articulated Bionic Hand SVG */}
          <div style={{ width: "100%", maxWidth: 280, display: "flex", justifyContent: "center" }}>
            <VirtualHand fingers={effectiveFingers} />
          </div>

          <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
            Real-time joint mirroring with continuous proportional flexion
          </p>
        </div>
      </div>

      {/* APPLE-STYLE SEGMENTED WORKSTATION SWITCHER: 5 Workstation Modes */}
      <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 4px" }}>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            padding: 4,
            borderRadius: 14,
            display: "inline-flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 4,
            border: "1px solid var(--border)",
          }}
        >
          {/* Tab 1: Bionic Kinematics */}
          <button
            onClick={() => setActiveTab("kinematics")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === "kinematics" ? "#FFFFFF" : "var(--text-secondary)",
              background: activeTab === "kinematics" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
          >
            Kinematics & Grips
          </button>

          {/* Tab 2: DEAM Microcontroller Bus */}
          <button
            onClick={() => setActiveTab("mcu")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === "mcu" ? "#FFFFFF" : "var(--text-secondary)",
              background: activeTab === "mcu" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
          >
            DEAM Microcontroller Bus
          </button>

          {/* Tab 3: AI Model Calibrator */}
          <button
            onClick={() => setActiveTab("ai")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === "ai" ? "#FFFFFF" : "var(--text-secondary)",
              background: activeTab === "ai" ? "rgba(41, 151, 255, 0.25)" : "transparent",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
          >
            AI Model Calibrator
          </button>

          {/* Tab 4: sEMG Bio-Signals */}
          <button
            onClick={() => setActiveTab("semg")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === "semg" ? "#FFFFFF" : "var(--text-secondary)",
              background: activeTab === "semg" ? "rgba(48, 209, 88, 0.2)" : "transparent",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
          >
            sEMG Muscle Oscilloscope
          </button>

          {/* Tab 5: Tactile & Haptic Grasp Lab */}
          <button
            onClick={() => setActiveTab("haptic")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === "haptic" ? "#FFFFFF" : "var(--text-secondary)",
              background: activeTab === "haptic" ? "rgba(255, 159, 10, 0.2)" : "transparent",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
          >
            Tactile & Haptic Lab
          </button>
        </div>
      </div>

      {/* TAB 1: BIONIC KINEMATICS & MANUAL SLIDER STUDIO */}
      {activeTab === "kinematics" && (
        <KinematicsPanel
          activeGesture={effectiveGesture}
          binaryCode={effectiveBinary}
          fingers={effectiveFingers}
          isManualMode={isManualMode}
          setIsManualMode={setIsManualMode}
          manualFlexions={manualFlexions}
          setManualFlexions={setManualFlexions}
          cameraState={{ isReady, hasError: cameraError, status, streamActive: streamActive && !isStreamPaused && isCameraPowerOn, isCameraPowerOn }}
          isLiveHandDataAvailable={isLiveHandDataAvailable}
        />
      )}

      {/* TAB 2: DEAM MICROCONTROLLER HARDWARE TELEMETRY */}
      {activeTab === "mcu" && (
        <McuPanel
          binaryCode={effectiveBinary}
          pwm={effectiveFingers?.pwm}
          fingers={effectiveFingers}
          isLiveHandDataAvailable={isLiveHandDataAvailable || isManualMode}
        />
      )}

      {/* TAB 3: AI MODEL FEW-SHOT CALIBRATOR */}
      {activeTab === "ai" && (
        <AiTrainerPanel
          currentFeatures={currentFeatures}
          mlPrediction={mlPrediction}
          flexions={effectiveFingers?.flexions}
        />
      )}

      {/* TAB 4: sEMG MUSCLE OSCILLOSCOPE & DSP TELEMETRY */}
      {activeTab === "semg" && (
        <SemgPanel
          fingers={effectiveFingers}
          gesture={effectiveGesture}
        />
      )}

      {/* TAB 5: CLOSED-LOOP FORCE & HAPTIC GRASP LAB */}
      {activeTab === "haptic" && (
        <HapticGraspPanel
          fingers={effectiveFingers}
          gesture={effectiveGesture}
        />
      )}
    </div>
  );
}