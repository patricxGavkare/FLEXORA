export default function VirtualHand({ fingers }) {
  // Default to all straight if no data yet
  const state = fingers || {
    thumb: "Straight",
    index: "Straight",
    middle: "Straight",
    ring: "Straight",
    pinky: "Straight",
  };

  // Rotation angle applied when a finger is bent
  const bendAngle = (fingerName) => (state[fingerName] === "Bent" ? 55 : 0);

  return (
    <svg
      viewBox="0 0 300 320"
      style={{ width: "100%", height: "100%", maxWidth: 260 }}
    >
      {/* Palm */}
      <rect x="90" y="150" width="120" height="140" rx="30" fill="#252A32" stroke="#2997FF" strokeWidth="2" />

      {/* Thumb */}
      <g transform={`rotate(${-bendAngle("thumb")}, 95, 200)`}>
        <rect x="55" y="180" width="45" height="35" rx="16" fill="#2997FF" />
      </g>

      {/* Index */}
      <g transform={`rotate(${bendAngle("index")}, 115, 150)`}>
        <rect x="100" y="60" width="30" height="95" rx="14" fill="#F5F5F7" />
      </g>

      {/* Middle */}
      <g transform={`rotate(${bendAngle("middle")}, 150, 150)`}>
        <rect x="135" y="40" width="30" height="115" rx="14" fill="#F5F5F7" />
      </g>

      {/* Ring */}
      <g transform={`rotate(${bendAngle("ring")}, 185, 150)`}>
        <rect x="170" y="55" width="30" height="100" rx="14" fill="#F5F5F7" />
      </g>

      {/* Pinky */}
      <g transform={`rotate(${bendAngle("pinky")}, 215, 150)`}>
        <rect x="200" y="75" width="26" height="80" rx="12" fill="#F5F5F7" />
      </g>
    </svg>
  );
}