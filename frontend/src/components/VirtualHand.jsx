function Finger({ x, baseY, segLengths, width, bend, tilt = 0, id }) {
  const [seg1, seg2, seg3] = segLengths;
  const bendAngle = bend ? 35 : 0;

  return (
    <g transform={`rotate(${tilt}, ${x}, ${baseY})`} style={{ transition: "transform 0.15s ease" }}>
      <g transform={`rotate(${bendAngle}, ${x}, ${baseY})`} style={{ transition: "transform 0.15s ease" }}>
        {/* shadow */}
        <rect x={x - width / 2 + 2} y={baseY - seg1 + 3} width={width} height={seg1 + 4} rx={width / 2} fill="#000" opacity="0.15" />
        <rect
          x={x - width / 2}
          y={baseY - seg1}
          width={width}
          height={seg1 + 4}
          rx={width / 2}
          fill={`url(#segGrad-${id})`}
          stroke="#0D1117"
          strokeWidth="1.5"
        />
        <circle cx={x} cy={baseY - seg1} r={width / 2 - 1} fill="#B8BAC2" stroke="#0D1117" strokeWidth="1.5" />
        <circle cx={x} cy={baseY - seg1} r={width / 2 - 4} fill="none" stroke="#0D1117" strokeWidth="0.75" opacity="0.4" />

        <g transform={`rotate(${bendAngle * 1.3}, ${x}, ${baseY - seg1})`} style={{ transition: "transform 0.15s ease" }}>
          <rect x={x - width / 2 + 1.5 + 2} y={baseY - seg1 - seg2 + 3} width={width - 3} height={seg2 + 4} rx={(width - 3) / 2} fill="#000" opacity="0.15" />
          <rect
            x={x - width / 2 + 1.5}
            y={baseY - seg1 - seg2}
            width={width - 3}
            height={seg2 + 4}
            rx={(width - 3) / 2}
            fill={`url(#segGrad-${id})`}
            stroke="#0D1117"
            strokeWidth="1.5"
          />
          <circle cx={x} cy={baseY - seg1 - seg2} r={width / 2 - 3} fill="#B8BAC2" stroke="#0D1117" strokeWidth="1.5" />
          <circle cx={x} cy={baseY - seg1 - seg2} r={width / 2 - 6} fill="none" stroke="#0D1117" strokeWidth="0.75" opacity="0.4" />

          <g transform={`rotate(${bendAngle * 1.5}, ${x}, ${baseY - seg1 - seg2})`} style={{ transition: "transform 0.15s ease" }}>
            <rect x={x - width / 2 + 3 + 1.5} y={baseY - seg1 - seg2 - seg3 + 2} width={width - 6} height={seg3 + 4} rx={(width - 6) / 2} fill="#000" opacity="0.12" />
            <rect
              x={x - width / 2 + 3}
              y={baseY - seg1 - seg2 - seg3}
              width={width - 6}
              height={seg3 + 4}
              rx={(width - 6) / 2}
              fill={`url(#tipGrad-${id})`}
              stroke="#0D1117"
              strokeWidth="1.5"
            />
          </g>
        </g>
      </g>
    </g>
  );
}

export default function VirtualHand({ fingers }) {
  const state = fingers || {
    thumb: "Straight",
    index: "Straight",
    middle: "Straight",
    ring: "Straight",
    pinky: "Straight",
  };

  const isBent = (name) => state[name] === "Bent";

  const fingerDefs = [
    { id: "thumb", x: 95, baseY: 195, segLengths: [32, 26, 20], width: 26, tilt: -45 },
    { id: "index", x: 120, baseY: 148, segLengths: [42, 28, 22], width: 22, tilt: 4 },
    { id: "middle", x: 150, baseY: 148, segLengths: [50, 32, 24], width: 22, tilt: 0 },
    { id: "ring", x: 180, baseY: 148, segLengths: [44, 30, 22], width: 22, tilt: -4 },
    { id: "pinky", x: 207, baseY: 150, segLengths: [32, 22, 18], width: 18, tilt: -10 },
  ];

  return (
    <svg viewBox="0 0 300 340" style={{ width: "100%", height: "100%", maxWidth: 240 }}>
      <defs>
        {fingerDefs.map((f) => (
          <linearGradient key={f.id} id={`segGrad-${f.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#DADCE1" />
            <stop offset="45%" stopColor="#F5F5F7" />
            <stop offset="100%" stopColor="#C6C9D0" />
          </linearGradient>
        ))}
        {fingerDefs.map((f) => (
          <linearGradient key={`tip-${f.id}`} id={`tipGrad-${f.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E4E6EA" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#D2D5DB" />
          </linearGradient>
        ))}
        <linearGradient id="palmGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E3440" />
          <stop offset="60%" stopColor="#252A32" />
          <stop offset="100%" stopColor="#181C22" />
        </linearGradient>
        <filter id="dropshadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#dropshadow)">
        {/* Palm */}
        <path
          d="M85,175
             C82,240 90,285 130,300
             C160,310 190,308 210,290
             C232,268 228,220 222,175
             C219,155 200,148 180,148
             L110,148
             C95,148 87,158 85,175 Z"
          fill="url(#palmGrad)"
          stroke="#0D1117"
          strokeWidth="2"
        />
        {/* Palm accent line */}
        <path d="M95,175 Q155,195 215,175" stroke="#2997FF" strokeWidth="1.5" fill="none" opacity="0.6" />
        {/* Palm highlight */}
        <ellipse cx="130" cy="200" rx="40" ry="55" fill="#FFFFFF" opacity="0.03" />

        {fingerDefs.map((f) => (
          <Finger key={f.id} {...f} bend={isBent(f.id)} />
        ))}
      </g>
    </svg>
  );
}