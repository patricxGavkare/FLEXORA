import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import VirtualHand from "./VirtualHand";
import StatsPanel from "./StatsPanel";
import GripPresets from "./GripPresets";
import { getFingerStates, getGesture, getBinaryCode } from "../utils/handLogic";
import BinaryPanel from "./BinaryPanel";

export default function HandTracker() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const latencyHistoryRef = useRef([]);
  const [status, setStatus] = useState("Loading model...");
  const [fingers, setFingers] = useState(null);
  const [gesture, setGesture] = useState("Unknown");
  const [latency, setLatency] = useState(null);
  const [avgLatency, setAvgLatency] = useState(null);
  const [binaryCode, setBinaryCode] = useState("00000");

  useEffect(() => {
    let handLandmarker;
    let animationId;

    async function setup() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });

      setStatus("Model loaded. Starting camera...");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      videoRef.current.onloadeddata = () => {
        setStatus("Tracking hand...");
        predictLoop();
      };
    }

    function predictLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const startTime = performance.now();
      const results = handLandmarker.detectForVideo(video, startTime);
      const endTime = performance.now();
      
const currentLatency = endTime - startTime;

setLatency(currentLatency);

// keep a rolling window of the last 30 readings
latencyHistoryRef.current.push(currentLatency);
if (latencyHistoryRef.current.length > 30) {
  latencyHistoryRef.current.shift();
}
const avg =
  latencyHistoryRef.current.reduce((sum, val) => sum + val, 0) /
  latencyHistoryRef.current.length;
setAvgLatency(avg);



      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        for (const hand of results.landmarks) {
          for (const point of hand) {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "#2997FF";
            ctx.fill();
          }

          const fingerStates = getFingerStates(hand);
          if (fingerStates) {
            setFingers(fingerStates);
            setGesture(getGesture(fingerStates));
            setBinaryCode(getBinaryCode(fingerStates));
          }
        }
      }

      animationId = requestAnimationFrame(predictLoop);
    }

    setup();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div
        style={{
          position: "relative",
          width: 640,
          height: 480,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <p
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
            color: "#F5F5F7",
            background: "rgba(0,0,0,0.5)",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 13,
            margin: 0,
          }}
        >
          {status}
        </p>

        {fingers && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              zIndex: 2,
              color: "#F5F5F7",
              background: "rgba(0,0,0,0.6)",
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            <div>Thumb: {fingers.thumb}</div>
            <div>Index: {fingers.index}</div>
            <div>Middle: {fingers.middle}</div>
            <div>Ring: {fingers.ring}</div>
            <div>Pinky: {fingers.pinky}</div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            width: 640,
            height: 480,
            transform: "scaleX(-1)",
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            width: 640,
            height: 480,
            transform: "scaleX(-1)",
          }}
        />
      </div>

      <div
        style={{
          width: 260,
          height: 280,
          background: "#0D1117",
          border: "1px solid #252A32",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VirtualHand fingers={fingers} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
  {fingers ? (
    <>
      <StatsPanel gesture={gesture} latency={latency} avgLatency={avgLatency} />
      <BinaryPanel binaryCode={binaryCode} />
      <GripPresets activeGesture={gesture} />
    </>
  ) : (
    <div
      style={{
        background: "#11151c",
        border: "1px solid #252A32",
        borderRadius: 12,
        padding: 20,
        color: "#A1A1AA",
        fontSize: 14,
      }}
    >
      Waiting for hand detection...
    </div>
  )}
</div>
    </div>
  );
}