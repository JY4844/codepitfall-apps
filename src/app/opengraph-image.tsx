import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CodePitfall Mirror — VS Code & GitHub エラー即レス補助コンパニオン";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "24px",
            color: "#38bdf8",
            fontWeight: 700,
          }}
        >
          <span>Google AI Challenge 2026 • Open Source (Apache-2.0)</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: "68px", fontWeight: 800, lineHeight: 1.1 }}>
            CodePitfall Mirror
          </div>
          <div style={{ fontSize: "34px", color: "#cbd5e1", lineHeight: 1.4 }}>
            VS Code / GitHub のエラーを貼るだけ。自分の「やりがちミス DNA」と照合して 3 秒で直し方＆予防テンプレを返す無料コンパニオン
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "24px",
            color: "#94a3b8",
            borderTop: "1px solid #334155",
            paddingTop: "24px",
          }}
        >
          <span>OtayoriBaton Ultra • MachiEye Live • GitBridge</span>
          <span style={{ color: "#34d399", fontWeight: 700 }}>
            github.com/JY4844/google-ai-challenge-2026
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
