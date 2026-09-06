export default function StatsPanel({ gesture, latency, avgLatency }) {
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

      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          {latency !== null ? `${latency.toFixed(1)} ms` : "—"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontSize: 10, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Avg (30 frames)
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#2997FF" }}>
            {avgLatency !== null ? `${avgLatency.toFixed(1)} ms` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}