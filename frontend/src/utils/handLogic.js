// =============================================================================
// handLogic.js - Bionic Hand Kinematics & Gesture Decoding Logic
//
// WHAT THIS FILE DOES:
// Takes the 21 3D coordinates (landmarks) detected by Google MediaPipe
// and turns them into real physical movements:
// 1. Calculates how bent or straight each of the 5 fingers is (0.0 to 1.0).
// 2. Calculates smooth rotational angles (0° to 42°) for the virtual hand.
// 3. Encodes the hand pose into a 5-bit binary digital word for DEAM logic.
// 4. Generates standard 50 Hz Servo PWM pulse widths (1000 µs to 2000 µs).
// 5. Matches the finger states to medical bionic grip presets.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Distance Helper Function (3D Euclidean Distance)
// Measures the straight-line distance between any two joint points in 3D space:
// formula: d = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
// -----------------------------------------------------------------------------
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Helper to keep numbers within a safe boundary (min to max)
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// -----------------------------------------------------------------------------
// 2. Continuous Finger Flexion (Index, Middle, Ring, Pinky)
//
// IMPORTANT CONCEPT:
// We use a "Scale-Invariant Distance Ratio".
// Whether your hand is right in front of the camera or far away,
// the ratio between (Fingertip-to-Wrist) and (Knuckle/PIP-to-Wrist) stays consistent!
//
// - When finger is STRAIGHT: The fingertip is far from the wrist (ratio ~ 1.35).
// - When finger is BENT: The fingertip curls down close to the wrist (ratio ~ 0.80).
// Returns a smooth float from 0.0 (completely open) to 1.0 (completely closed).
// -----------------------------------------------------------------------------
function calculateFingerFlexion(landmarks, tipIndex, pipIndex, wristIndex = 0) {
  const wrist = landmarks[wristIndex]; // Landmark 0
  const tip = landmarks[tipIndex];     // e.g. Landmark 8 for index tip
  const pip = landmarks[pipIndex];     // e.g. Landmark 6 for index middle joint

  const tipToWrist = distance(tip, wrist);
  const pipToWrist = distance(pip, wrist);

  if (pipToWrist === 0) return 0;
  const ratio = tipToWrist / pipToWrist;

  const straightRef = 1.35; // Value when finger is fully extended
  const bentRef = 0.80;     // Value when finger is fully curled

  // Normalize into 0.0 (straight) -> 1.0 (bent)
  const rawFlexion = (straightRef - ratio) / (straightRef - bentRef);
  return clamp(rawFlexion, 0, 1);
}

// -----------------------------------------------------------------------------
// 3. Continuous Thumb Flexion
//
// The thumb moves sideways across the palm, not straight up and down.
// So we measure how close the thumb tip (Landmark 4) is to the pinky base (Landmark 17).
// - When thumb is OUT (Open): Thumb tip is far from pinky base (ratio ~ 1.25).
// - When thumb is TUCKED IN (Bent): Thumb tip is close to pinky base (ratio ~ 0.75).
// -----------------------------------------------------------------------------
function calculateThumbFlexion(landmarks) {
  const thumbTip = landmarks[4];
  const pinkyBase = landmarks[17];
  const thumbBaseRef = landmarks[2];

  const thumbTipToPinkyBase = distance(thumbTip, pinkyBase);
  const thumbBaseToPinkyBase = distance(thumbBaseRef, pinkyBase);

  if (thumbBaseToPinkyBase === 0) return 0;
  const ratio = thumbTipToPinkyBase / thumbBaseToPinkyBase;

  const extendedRef = 1.25;
  const tuckedRef = 0.75;
  const rawFlexion = (extendedRef - ratio) / (extendedRef - tuckedRef);
  return clamp(rawFlexion, 0, 1);
}

// -----------------------------------------------------------------------------
// 4. Main State Analyzer: getFingerStates()
//
// Calculates states for all 5 digits:
// - Returns discrete label: "Bent" vs "Straight" (threshold at 0.5)
// - Returns continuous flexions: 0.0 to 1.0
// - Returns continuous joint angles: 0° to 42° for the 3D/SVG virtual hand
// - Returns standard Servo PWM values: 1000 µs to 2000 µs for the DEAM microcontroller
// -----------------------------------------------------------------------------
export function getFingerStates(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  // Calculate continuous flexion for each finger
  const thumbFlex = calculateThumbFlexion(landmarks);
  const indexFlex = calculateFingerFlexion(landmarks, 8, 6);
  const middleFlex = calculateFingerFlexion(landmarks, 12, 10);
  const ringFlex = calculateFingerFlexion(landmarks, 16, 14);
  const pinkyFlex = calculateFingerFlexion(landmarks, 20, 18);

  // Digital threshold: >= 0.5 is considered active / bent
  const thumbBent = thumbFlex >= 0.5;
  const indexBent = indexFlex >= 0.5;
  const middleBent = middleFlex >= 0.5;
  const ringBent = ringFlex >= 0.5;
  const pinkyBent = pinkyFlex >= 0.5;

  return {
    // Discrete states for quick truth-table logic
    thumb: thumbBent ? "Bent" : "Straight",
    index: indexBent ? "Bent" : "Straight",
    middle: middleBent ? "Bent" : "Straight",
    ring: ringBent ? "Bent" : "Straight",
    pinky: pinkyBent ? "Bent" : "Straight",

    // Continuous normalized values (0.0 to 1.0)
    flexions: {
      thumb: Number(thumbFlex.toFixed(2)),
      index: Number(indexFlex.toFixed(2)),
      middle: Number(middleFlex.toFixed(2)),
      ring: Number(ringFlex.toFixed(2)),
      pinky: Number(pinkyFlex.toFixed(2)),
    },

    // Smooth rotational angles for prosthetic SVG joints (0° to 42°)
    angles: {
      thumb: Number((thumbFlex * 40).toFixed(1)),
      index: Number((indexFlex * 42).toFixed(1)),
      middle: Number((middleFlex * 42).toFixed(1)),
      ring: Number((ringFlex * 42).toFixed(1)),
      pinky: Number((pinkyFlex * 40).toFixed(1)),
    },

    // Microcontroller Servo PWM timing (1000 µs = 0°, 2000 µs = 90°/180°)
    pwm: {
      thumb: Math.round(1000 + thumbFlex * 1000),
      index: Math.round(1000 + indexFlex * 1000),
      middle: Math.round(1000 + middleFlex * 1000),
      ring: Math.round(1000 + ringFlex * 1000),
      pinky: Math.round(1000 + pinkyFlex * 1000),
    },
  };
}

// -----------------------------------------------------------------------------
// 5. Gesture Recognition: getGesture()
// Matches finger combinations to recognizable human & prosthetic gestures.
// Every clinical preset has a unique 5-bit digital mapping.
// -----------------------------------------------------------------------------
export function getGesture(fingerStates) {
  if (!fingerStates) return "Unknown";

  const { thumb, index, middle, ring, pinky } = fingerStates;
  const allBent = [thumb, index, middle, ring, pinky].every((f) => f === "Bent");
  const allStraight = [thumb, index, middle, ring, pinky].every((f) => f === "Straight");

  // 1. Power Grip (11111): all fingers closed into a solid fist
  if (allBent) return "Fist (Power Grip)";

  // 2. Open Hand (00000): all fingers extended
  if (allStraight) return "Open Hand";

  // 3. Thumbs Up (01111): Thumb straight, all 4 fingers curled
  if (thumb === "Straight" && index === "Bent" && middle === "Bent" && ring === "Bent" && pinky === "Bent") {
    return "Thumbs Up";
  }

  // 4. Pointing (10111): Index straight, thumb and remaining fingers curled
  if (thumb === "Bent" && index === "Straight" && middle === "Bent" && ring === "Bent" && pinky === "Bent") {
    return "Pointing";
  }

  // 5. Precision Pinch (00111): Thumb and Index in opposition/pinch, others curled
  if (thumb === "Straight" && index === "Straight" && middle === "Bent" && ring === "Bent" && pinky === "Bent") {
    return "Precision Pinch";
  }

  // 6. Peace Sign (10011): Index and Middle straight, others bent
  if (thumb === "Bent" && index === "Straight" && middle === "Straight" && ring === "Bent" && pinky === "Bent") {
    return "Peace Sign";
  }

  // 7. Hook Grip (11110): Thumb bent over curled fingers (index, middle, ring), pinky unhooked/straight
  if (thumb === "Bent" && index === "Bent" && middle === "Bent" && ring === "Bent" && pinky === "Straight") {
    return "Hook Grip";
  }

  // 8. Lateral Key Grip (01100): Thumb resting on side of flexed index/middle, ring & pinky neutral
  if (thumb === "Straight" && index === "Bent" && middle === "Bent" && ring === "Straight" && pinky === "Straight") {
    return "Lateral Key Grip";
  }

  return "Mixed Grip";
}

// -----------------------------------------------------------------------------
// 6. 5-Bit Digital Word Converter: getBinaryCode()
//
// Converts finger states into a 5-bit binary string:
// Bit order: Thumb (MSB), Index, Middle, Ring, Pinky (LSB)
// 1 = Bent (Active), 0 = Straight (Neutral)
// Example: Open hand = "00000", Fist = "11111", Pointing = "10111"
// -----------------------------------------------------------------------------
export function getBinaryCode(fingerStates) {
  if (!fingerStates) return "00000";

  const bit = (state) => (state === "Bent" ? "1" : "0");

  return (
    bit(fingerStates.thumb) +
    bit(fingerStates.index) +
    bit(fingerStates.middle) +
    bit(fingerStates.ring) +
    bit(fingerStates.pinky)
  );
}

// -----------------------------------------------------------------------------
// 7. Truth Table for Digital Electronics (DEAM Coursework)
// Shows how the 5-bit input bus maps to prosthetic grip actions with NO collisions.
// Every preset has a strictly unique 5-bit code.
// -----------------------------------------------------------------------------
export const gestureTruthTable = [
  { binary: "00000", gesture: "Open Hand" },
  { binary: "00111", gesture: "Precision Pinch" },
  { binary: "01100", gesture: "Lateral Key Grip" },
  { binary: "01111", gesture: "Thumbs Up" },
  { binary: "10011", gesture: "Peace Sign" },
  { binary: "10111", gesture: "Pointing" },
  { binary: "11110", gesture: "Hook Grip" },
  { binary: "11111", gesture: "Fist (Power Grip)" },
];

// -----------------------------------------------------------------------------
// 8. Automated Preset Collision Checker
// Runs automatically to mathematically verify that no two presets share the same 5-bit code.
// -----------------------------------------------------------------------------
export function validateGripPresets(presets = gestureTruthTable) {
  const binaryMap = new Map();
  const nameMap = new Map();
  const collisions = [];

  for (const item of presets) {
    if (binaryMap.has(item.binary)) {
      collisions.push(`Collision: "${item.binary}" is shared by "${binaryMap.get(item.binary)}" and "${item.gesture}"`);
    } else {
      binaryMap.set(item.binary, item.gesture);
    }

    if (nameMap.has(item.gesture)) {
      collisions.push(`Duplicate name: "${item.gesture}"`);
    } else {
      nameMap.set(item.gesture, item.binary);
    }
  }

  if (collisions.length > 0) {
    const errorMsg = `[FLEXORA ERROR] Grip preset collisions detected: ${collisions.join("; ")}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { isValid: true, count: presets.length };
}

// Execute self-check immediately on module initialization
validateGripPresets();