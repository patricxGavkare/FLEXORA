import { gestureTruthTable } from "../utils/handLogic";

export default function BinaryPanel({ binaryCode }) {
  const labels = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

  return (
    <div
      style={{
        background: "#11151c",
        border: "1px solid #252A32",
        borderRadius: 12,
        padding: 20,
        color: "#F5F5F7",
        minWidth: 260,
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "#A1A1AA",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Binary Encoding
      </p>

      {/* Bit boxes with labels */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {binaryCode.split("").map((bit, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 18,
                background: bit === "1" ? "#2997FF" : "#1a1f27",
                border: `1px solid ${bit === "1" ? "#2997FF" : "#252A32"}`,
                color: bit === "1" ? "#fff" : "#A1A1AA",
              }}
            >
              {bit}
            </div>
            <p style={{ fontSize: 10, color: "#A1A1AA", marginTop: 4 }}>
              {labels[i]}
            </p>
          </div>
        ))}
      </div>

      <p
        style={{
          fontSize: 13,
          color: "#A1A1AA",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Truth Table
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#A1A1AA",
            fontWeight: 600,
            padding: "0 4px",
          }}
        >
          <span>Binary</span>
          <span>Gesture</span>
        </div>

        {gestureTruthTable.map((row) => {
          const isActive = row.binary === binaryCode;
          return (
            <div
              key={row.binary + row.gesture}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                padding: "6px 8px",
                borderRadius: 6,
                background: isActive ? "rgba(41,151,255,0.12)" : "transparent",
                color: isActive ? "#2997FF" : "#F5F5F7",
                fontWeight: isActive ? 700 : 400,
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{row.binary}</span>
              <span>{row.gesture}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}