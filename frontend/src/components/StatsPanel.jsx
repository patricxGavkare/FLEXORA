export default function StatsPanel({ gesture, latency }) {
  return (
    <div
      style={{
        background: "#11151c",
        border: "1px solid #252A32",
        borderRadius: 12,
        padding: 20,
        color: "#F5F5F7",
        minWidth: 220,
      }}
    >
      <p style={{ fontSize: 13, color: "#A1A1AA", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
        Detected Gesture
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: "#2997FF" }}>
        {gesture}
      </p>

      <p style={{ fontSize: 13, color: "#A1A1AA", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
        Detection Latency
      </p>
      <p style={{ fontSize: 22, fontWeight: 700 }}>
        {latency !== null ? `${latency.toFixed(1)} ms` : "—"}
      </p>
    </div>
  );
}