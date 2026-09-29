// =============================================================================
// mlClassifier.js - Client-Side Machine Learning Gesture Classifier
//
// WHAT THIS FILE DOES:
// 1. Feature Engineering: Converts raw 21 MediaPipe coordinates into a
//    normalized, scale-invariant, translation-invariant feature vector.
// 2. Training / Calibration: Lets users record custom grip samples and computes
//    mathematical centroid prototypes.
// 3. Classification: Uses Euclidean Distance + Softmax Probability to predict
//    which grip is being performed and computes real-time confidence (0-100%).
// 4. Persistence: Saves custom trained grips to browser localStorage.
// =============================================================================

// Helper: 3D Euclidean distance
function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// -----------------------------------------------------------------------------
// 1. FEATURE EXTRACTION & NORMALIZATION
//
// Why this is important for AIML:
// Raw pixel coordinates change if your hand moves around the camera view.
// Here, we normalize all 21 points:
// 1. Translation: Subtract wrist (Landmark 0) so the wrist is always at (0, 0, 0).
// 2. Scale: Divide by distance between wrist and middle knuckle (Landmark 9).
// Result: The feature vector is invariant to hand size and camera distance!
// -----------------------------------------------------------------------------
export function extractNormalizedFeatures(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const middleMcp = landmarks[9]; // Palm reference point

  // Palm baseline scale reference (distance from wrist to middle knuckle)
  const palmScale = dist(wrist, middleMcp) || 1.0;

  // Normalized 3D joint offsets (20 joints * 3 coordinates = 60 values)
  const normalizedPoints = [];
  for (let i = 1; i < 21; i++) {
    normalizedPoints.push((landmarks[i].x - wrist.x) / palmScale);
    normalizedPoints.push((landmarks[i].y - wrist.y) / palmScale);
    normalizedPoints.push(((landmarks[i].z || 0) - (wrist.z || 0)) / palmScale);
  }

  // Key inter-finger distance features (for distinguishing grips like pinch, fist, point)
  const tipToWristThumb = dist(landmarks[4], wrist) / palmScale;
  const tipToWristIndex = dist(landmarks[8], wrist) / palmScale;
  const tipToWristMiddle = dist(landmarks[12], wrist) / palmScale;
  const tipToWristRing = dist(landmarks[16], wrist) / palmScale;
  const tipToWristPinky = dist(landmarks[20], wrist) / palmScale;
  const thumbToIndexPinch = dist(landmarks[4], landmarks[8]) / palmScale;

  // Compact 66-dimensional engineered feature vector
  return [
    ...normalizedPoints,
    tipToWristThumb,
    tipToWristIndex,
    tipToWristMiddle,
    tipToWristRing,
    tipToWristPinky,
    thumbToIndexPinch,
  ];
}

// -----------------------------------------------------------------------------
// 2. DEFAULT PRE-TRAINED GRIP PROTOTYPES
// Standard baseline dataset for bionic grasp patterns.
// -----------------------------------------------------------------------------
const STORAGE_KEY = "flexora_trained_grips_v1";

// Compute distance between two feature vectors of identical length
function vectorDistance(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// -----------------------------------------------------------------------------
// 3. MODEL MANAGEMENT (Load, Save, Train, Predict)
// -----------------------------------------------------------------------------
class GestureClassifierModel {
  constructor() {
    this.classes = {};
    this.loadFromStorage();
  }

  // Load custom trained classes from localStorage if available
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.classes = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not load stored grip models:", e);
      this.classes = {};
    }
  }

  // Save current dataset to localStorage
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.classes));
    } catch (e) {
      console.warn("Could not persist grip models:", e);
    }
  }

  // Add or update a trained grip class
  // samples: Array of 66-dimensional feature vectors collected during calibration
  addTrainedGrip(name, samples) {
    if (!samples || samples.length === 0) return false;

    // Calculate centroid vector (mathematical average across all recorded sample frames)
    const vectorLength = samples[0].length;
    const centroid = new Array(vectorLength).fill(0);

    for (const sample of samples) {
      for (let i = 0; i < vectorLength; i++) {
        centroid[i] += sample[i];
      }
    }

    for (let i = 0; i < vectorLength; i++) {
      centroid[i] /= samples.length;
    }

    this.classes[name] = {
      name,
      sampleCount: samples.length,
      centroid,
      createdAt: new Date().toISOString(),
    };

    this.saveToStorage();
    return true;
  }

  // Remove a custom trained grip
  removeGrip(name) {
    if (this.classes[name]) {
      delete this.classes[name];
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // List all available custom grips
  getTrainedGripNames() {
    return Object.keys(this.classes);
  }

  // ---------------------------------------------------------------------------
  // 4. PREDICTION INFERENCE: predict()
  // Uses Softmax Temperature Scaling over Euclidean distances to generate
  // calibrated probability scores (0% to 100%).
  // ---------------------------------------------------------------------------
  predict(featureVector) {
    const classNames = Object.keys(this.classes);
    if (classNames.length === 0 || !featureVector) {
      return null;
    }

    // 1. Calculate Euclidean distance from input to each class centroid
    const distances = [];
    for (const name of classNames) {
      const d = vectorDistance(featureVector, this.classes[name].centroid);
      distances.push({ name, distance: d });
    }

    // 2. Convert distance to similarity using Softmax Temperature Scaling
    // Small distance = high probability. Temperature tau controls sharpness.
    const tau = 1.2;
    const expTerms = distances.map((item) => ({
      name: item.name,
      distance: item.distance,
      exp: Math.exp(-item.distance / tau),
    }));

    const sumExp = expTerms.reduce((sum, item) => sum + item.exp, 0);

    // 3. Compute normalized percentage confidence for each class
    const probabilities = expTerms.map((item) => ({
      name: item.name,
      distance: Number(item.distance.toFixed(2)),
      confidence: Number(((item.exp / sumExp) * 100).toFixed(1)),
    }));

    // Sort highest confidence first
    probabilities.sort((a, b) => b.confidence - a.confidence);

    const top = probabilities[0];

    return {
      topGesture: top.name,
      confidence: top.confidence,
      distance: top.distance,
      allRankings: probabilities,
    };
  }

  // Export trained weights as a downloadable JSON file
  exportJSON() {
    return JSON.stringify(this.classes, null, 2);
  }
}

// Global singleton instance
export const classifierModel = new GestureClassifierModel();
