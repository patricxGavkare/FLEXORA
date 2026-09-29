// =============================================================================
// gestureStabilizer.js - Temporal Gesture Stabilization & Predictive Trajectory State Machine
//
// WHAT THIS MODULE DOES (in simple English):
// 1. Maintains a rolling window buffer (last 18 frames, ~300ms at 60fps) of the 5
//    finger flexion values.
// 2. Evaluates hand kinematic stability by measuring the max-min range of each finger
//    over the window.
// 3. Flags the hand as "settled" only when all 5 digits stay within a 4.5% tolerance
//    for at least 8 consecutive frames (~130ms), eliminating instantaneous flicker.
// 4. Computes per-finger velocities over a 5-frame (~80ms) baseline to predict
//    settling gestures early (~100-150ms before settling) based on motion convergence.
// 5. Holds the previous stabilized gesture during dynamic hand transit until a new
//    gesture stabilizes or is confidently predicted.
//
// NOTE: Pure deterministic kinematic arithmetic — no ML/neural models used.
// =============================================================================

// TUNABLE THRESHOLD CONSTANTS
export const STABILIZER_CONFIG = {
  // Size of rolling window buffer (~300ms at 60 FPS)
  BUFFER_SIZE: 18,

  // Maximum allowed max-min range across any finger to be considered "stable"
  // 0.045 = 4.5% of full 0.0 to 1.0 flexion range
  VARIANCE_THRESHOLD: 0.045,

  // Minimum consecutive stable frames required to transition to "settled" (~130ms)
  N_SETTLED_FRAMES: 8,

  // Lookback frames for computing per-finger velocity (~80ms at 60fps)
  VELOCITY_LOOKBACK_FRAMES: 5,

  // Forward projection lookahead time in seconds for predictive matching (~130ms)
  PREDICT_LOOKAHEAD_SEC: 0.13,

  // Minimum consecutive frames of consistent trajectory to commit early prediction (~50ms)
  PREDICT_STREAK_FRAMES: 3,

  // Maximum normalized distance for a projected pose to qualify as predicted
  PREDICT_MAX_PROJECTED_DIST: 0.16,

  // Maximum normalized distance for current pose to match a preset when settled
  SETTLED_MAX_DIST: 0.24,
};

// Known clinical & standard bionic grip target flexion profiles (0.0 = straight, 1.0 = bent)
export const PRESET_TARGETS = [
  {
    name: "Open Hand",
    binary: "00000",
    flexions: { thumb: 0.05, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 },
  },
  {
    name: "Fist (Power Grip)",
    binary: "11111",
    flexions: { thumb: 0.95, index: 0.95, middle: 0.95, ring: 0.95, pinky: 0.95 },
  },
  {
    name: "Precision Pinch",
    binary: "00111",
    flexions: { thumb: 0.25, index: 0.25, middle: 0.90, ring: 0.90, pinky: 0.90 },
  },
  {
    name: "Pointing",
    binary: "10111",
    flexions: { thumb: 0.90, index: 0.10, middle: 0.90, ring: 0.90, pinky: 0.90 },
  },
  {
    name: "Peace Sign",
    binary: "10011",
    flexions: { thumb: 0.90, index: 0.10, middle: 0.10, ring: 0.90, pinky: 0.90 },
  },
  {
    name: "Thumbs Up",
    binary: "01111",
    flexions: { thumb: 0.10, index: 0.90, middle: 0.90, ring: 0.90, pinky: 0.90 },
  },
  {
    name: "Lateral Key Grip",
    binary: "01100",
    flexions: { thumb: 0.15, index: 0.85, middle: 0.85, ring: 0.15, pinky: 0.15 },
  },
  {
    name: "Hook Grip",
    binary: "11110",
    flexions: { thumb: 0.85, index: 0.90, middle: 0.90, ring: 0.90, pinky: 0.10 },
  },
];

const FINGER_KEYS = ["thumb", "index", "middle", "ring", "pinky"];

// Helper to calculate normalized Euclidean distance between two 5D flexion vectors (0 to 1)
function calcNormalizedDistance(flexA, flexB) {
  let sumSq = 0;
  for (let i = 0; i < FINGER_KEYS.length; i++) {
    const k = FINGER_KEYS[i];
    const diff = (flexA[k] || 0) - (flexB[k] || 0);
    sumSq += diff * diff;
  }
  // Max possible distance across 5 dimensions [0..1] is sqrt(5) ~ 2.236
  return Math.sqrt(sumSq) / Math.sqrt(5);
}

// Clamp helper
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Creates initial ref state container
 */
export function createStabilizerState() {
  return {
    history: [],            // Array of { t, flex }
    settledStreak: 0,       // Count of consecutive stable frames
    predictStreak: 0,       // Count of consecutive frames predicting same target
    lastPredictCandidate: null,
    committedGesture: null, // Stable committed gesture name
    committedBinary: null,  // Stable committed 5-bit binary code
    isPredicted: false,     // True if currently early-predicted
    gestureConfidence: null,// Pose match 0.0 to 1.0
    stabilityScore: 0,      // Stability index 0.0 to 1.0
    state: "idle",          // "idle" | "moving" | "predicted" | "settled"
  };
}

/**
 * Resets stabilizer state completely
 */
export function resetStabilizerState(state) {
  state.history = [];
  state.settledStreak = 0;
  state.predictStreak = 0;
  state.lastPredictCandidate = null;
  state.committedGesture = null;
  state.committedBinary = null;
  state.isPredicted = false;
  state.gestureConfidence = null;
  state.stabilityScore = 0;
  state.state = "idle";
}

/**
 * Main frame processing step
 * 
 * @param {Object} state - The mutable ref state container
 * @param {Object|null} currentFlexions - { thumb, index, middle, ring, pinky }
 * @param {string} instantGesture - Instant single-frame gesture label (e.g. from getGesture)
 * @param {string} instantBinary - Instant single-frame binary code (e.g. from getBinaryCode)
 * @returns {Object} Snapshot of current stabilization telemetry
 */
export function updateGestureStabilizer(state, currentFlexions, instantGesture, instantBinary) {
  if (!currentFlexions) {
    resetStabilizerState(state);
    return {
      stabilizedGesture: null,
      stabilizedBinary: null,
      isPredicted: false,
      gestureConfidence: null,
      stabilityScore: 0,
      state: "idle",
    };
  }

  const now = performance.now();
  const flex = {
    thumb: clamp(currentFlexions.thumb || 0, 0, 1),
    index: clamp(currentFlexions.index || 0, 0, 1),
    middle: clamp(currentFlexions.middle || 0, 0, 1),
    ring: clamp(currentFlexions.ring || 0, 0, 1),
    pinky: clamp(currentFlexions.pinky || 0, 0, 1),
  };

  // 1. Maintain Rolling Buffer (Requirement 1)
  state.history.push({ t: now, flex });
  if (state.history.length > STABILIZER_CONFIG.BUFFER_SIZE) {
    state.history.shift();
  }

  // 2. Compute Max-Min Range over Window (Requirement 2)
  let maxFingerRange = 0;
  if (state.history.length >= 3) {
    for (let i = 0; i < FINGER_KEYS.length; i++) {
      const k = FINGER_KEYS[i];
      let minVal = 1.0;
      let maxVal = 0.0;
      for (let j = 0; j < state.history.length; j++) {
        const val = state.history[j].flex[k];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      const range = maxVal - minVal;
      if (range > maxFingerRange) {
        maxFingerRange = range;
      }
    }
  } else {
    maxFingerRange = 0.1;
  }

  // Stability score (1.0 = completely motionless, 0.0 = high velocity movement)
  state.stabilityScore = clamp(1 - (maxFingerRange / 0.16), 0, 1);

  // Check if current frame satisfies variance threshold
  const isStableFrame = maxFingerRange <= STABILIZER_CONFIG.VARIANCE_THRESHOLD;
  if (isStableFrame) {
    state.settledStreak += 1;
  } else {
    state.settledStreak = 0;
  }

  const isSettled = state.settledStreak >= STABILIZER_CONFIG.N_SETTLED_FRAMES;

  // 3. Compute Per-Finger Flexion Velocities (Requirement 3)
  const velocities = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
  const lookbackIndex = state.history.length - 1 - STABILIZER_CONFIG.VELOCITY_LOOKBACK_FRAMES;
  if (lookbackIndex >= 0) {
    const past = state.history[lookbackIndex];
    const dt = (now - past.t) / 1000; // in seconds
    if (dt > 0.02) {
      for (let i = 0; i < FINGER_KEYS.length; i++) {
        const k = FINGER_KEYS[i];
        velocities[k] = (flex[k] - past.flex[k]) / dt;
      }
    }
  }

  // 4. Decision State Machine (Settled vs Predicted vs Moving)
  if (isSettled) {
    // Hand pose is steady and settled across window
    // Find closest preset target
    let bestPreset = null;
    let minDistance = 999;
    for (let p = 0; p < PRESET_TARGETS.length; p++) {
      const target = PRESET_TARGETS[p];
      const dist = calcNormalizedDistance(flex, target.flexions);
      if (dist < minDistance) {
        minDistance = dist;
        bestPreset = target;
      }
    }

    if (bestPreset && minDistance <= STABILIZER_CONFIG.SETTLED_MAX_DIST) {
      state.committedGesture = bestPreset.name;
      state.committedBinary = bestPreset.binary;
      state.gestureConfidence = Number(clamp(1 - minDistance, 0, 1).toFixed(2));
    } else {
      // Fallback to instant frame logic if non-standard grip
      state.committedGesture = instantGesture || "Mixed Grip";
      state.committedBinary = instantBinary || "00000";
      state.gestureConfidence = Number(clamp(1 - minDistance, 0, 1).toFixed(2));
    }

    state.isPredicted = false;
    state.state = "settled";
    state.predictStreak = 0;
    state.lastPredictCandidate = null;
  } else {
    // Hand is in motion — check for predictive early-commit trajectory (Requirement 4)
    let bestPredictCandidate = null;
    let minProjectedDist = 999;

    // Projected flexion 130ms into the future based on current velocity vectors
    const projectedFlex = {};
    for (let i = 0; i < FINGER_KEYS.length; i++) {
      const k = FINGER_KEYS[i];
      projectedFlex[k] = clamp(flex[k] + velocities[k] * STABILIZER_CONFIG.PREDICT_LOOKAHEAD_SEC, 0, 1);
    }

    for (let p = 0; p < PRESET_TARGETS.length; p++) {
      const preset = PRESET_TARGETS[p];
      const currentDist = calcNormalizedDistance(flex, preset.flexions);
      const projectedDist = calcNormalizedDistance(projectedFlex, preset.flexions);

      // Trajectory convergence conditions:
      // 1. Projected distance is close to the preset
      // 2. Trajectory is moving closer (projected distance is lower than current distance)
      if (
        projectedDist <= STABILIZER_CONFIG.PREDICT_MAX_PROJECTED_DIST &&
        projectedDist < currentDist - 0.02
      ) {
        // Verify that moving fingers are heading in correct direction towards target
        let convergingFingers = 0;
        for (let i = 0; i < FINGER_KEYS.length; i++) {
          const k = FINGER_KEYS[i];
          const toTarget = preset.flexions[k] - flex[k];
          const vel = velocities[k];
          const isNear = Math.abs(toTarget) <= 0.15;
          const isHeadingTowards = toTarget * vel > 0;
          if (isNear || isHeadingTowards) {
            convergingFingers++;
          }
        }

        // At least 4 of 5 fingers align with target posture trajectory
        if (convergingFingers >= 4 && projectedDist < minProjectedDist) {
          minProjectedDist = projectedDist;
          bestPredictCandidate = preset;
        }
      }
    }

    if (bestPredictCandidate) {
      if (state.lastPredictCandidate && state.lastPredictCandidate.name === bestPredictCandidate.name) {
        state.predictStreak += 1;
      } else {
        state.lastPredictCandidate = bestPredictCandidate;
        state.predictStreak = 1;
      }

      // Early-commit if trajectory is verified across consecutive frames (~50ms)
      if (state.predictStreak >= STABILIZER_CONFIG.PREDICT_STREAK_FRAMES) {
        state.committedGesture = bestPredictCandidate.name;
        state.committedBinary = bestPredictCandidate.binary;
        state.isPredicted = true;
        state.gestureConfidence = Number(clamp(1 - minProjectedDist, 0, 1).toFixed(2));
        state.state = "predicted";
      } else {
        state.state = "moving";
      }
    } else {
      state.predictStreak = 0;
      state.lastPredictCandidate = null;
      state.state = "moving";
      state.isPredicted = false;
    }

    // While moving, compute confidence to whatever gesture is currently held
    if (state.committedGesture) {
      const currentMatchedPreset = PRESET_TARGETS.find((p) => p.name === state.committedGesture);
      if (currentMatchedPreset) {
        const d = calcNormalizedDistance(flex, currentMatchedPreset.flexions);
        state.gestureConfidence = Number(clamp(1 - d, 0, 1).toFixed(2));
      }
    }
  }

  return {
    stabilizedGesture: state.committedGesture,
    stabilizedBinary: state.committedBinary,
    isPredicted: state.isPredicted,
    gestureConfidence: state.gestureConfidence,
    stabilityScore: state.stabilityScore,
    state: state.state,
  };
}
