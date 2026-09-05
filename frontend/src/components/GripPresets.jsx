const presets = [
  { name: "Power Grip", match: "Fist (Power Grip)", desc: "All fingers closed — used for holding large objects." },
  { name: "Pinch", match: "Pointing", desc: "Index extended — used for precision grip on small items." },
  { name: "Point", match: "Pointing", desc: "Used for gesture-based selection or interaction." },
  { name: "Open Hand", match: "Open Hand", desc: "Fully extended — resting or release position." },
];

export default function GripPresets({ activeGesture }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {presets.map((p) => {
        const isActive = p.match === activeGesture;
        return (
          <div
            key={p.name}
            style={{
              background: isActive ? "rgba(41,151,255,0.12)" : "#11151c",
              border: `1px solid ${isActive ? "#2997FF" : "#252A32"}`,
              borderRadius: 10,
              padding: "12px 16px",
              transition: "all 0.2s ease",
            }}
          >
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: isActive ? "#2997FF" : "#F5F5F7" }}>
              {p.name}
            </p>
            <p style={{ fontSize: 12, color: "#A1A1AA" }}>{p.desc}</p>
          </div>
        );
      })}
    </div>
  );
}