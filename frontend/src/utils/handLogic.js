// handLogic.js
// Takes MediaPipe's 21 hand landmarks and figures out
// which fingers are bent or straight.

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// For each finger: if the fingertip is closer to the wrist
// than the middle knuckle (PIP joint) is, the finger is folded (bent).
function isBent(landmarks, tipIndex, pipIndex, wristIndex = 0) {
  const wrist = landmarks[wristIndex];
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];

  const tipToWrist = distance(tip, wrist);
  const pipToWrist = distance(pip, wrist);

  return tipToWrist < pipToWrist;
}
export function getFingerStates(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const thumbTip = landmarks[4];
  const pinkyBase = landmarks[17];
  const thumbBaseRef = landmarks[2];

  const thumbTipToPinkyBase = distance(thumbTip, pinkyBase);
  const thumbBaseToPinkyBase = distance(thumbBaseRef, pinkyBase);

  const thumbBent = thumbTipToPinkyBase < thumbBaseToPinkyBase;

  return {
    thumb: thumbBent ? "Bent" : "Straight",
    index: isBent(landmarks, 8, 6) ? "Bent" : "Straight",
    middle: isBent(landmarks, 12, 10) ? "Bent" : "Straight",
    ring: isBent(landmarks, 16, 14) ? "Bent" : "Straight",
    pinky: isBent(landmarks, 20, 18) ? "Bent" : "Straight",
  };
}


// Recognizes common hand gestures from finger states
export function getGesture(fingerStates) {
  if (!fingerStates) return "Unknown";

  const { thumb, index, middle, ring, pinky } = fingerStates;
  const allBent = [thumb, index, middle, ring, pinky].every((f) => f === "Bent");
  const allStraight = [thumb, index, middle, ring, pinky].every((f) => f === "Straight");

  if (allBent) return "Fist (Power Grip)";
  if (allStraight) return "Open Hand";

  if (index === "Straight" && middle === "Straight" && ring === "Bent" && pinky === "Bent") {
    return "Peace Sign";
  }

  if (thumb === "Straight" && index === "Bent" && middle === "Bent" && ring === "Bent" && pinky === "Bent") {
    return "Thumbs Up";
  }

  if (index === "Straight" && middle === "Bent" && ring === "Bent" && pinky === "Bent") {
    return "Pointing";
  }

  return "Mixed Grip";
}