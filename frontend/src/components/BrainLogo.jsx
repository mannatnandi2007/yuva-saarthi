import React from "react";

export default function BrainLogo({
  size = 42,
  animated = true,
  mood = "NORMAL"
}) {

  const getGlow = () => {
    switch (mood) {
      case "HAPPY":
      case "OVERJOYED":
        return "#22c55e";

      case "ANXIOUS":
        return "#f59e0b";

      case "SAD":
        return "#60a5fa";

      case "ANGRY":
        return "#ef4444";

      case "VERY_SCARED":
        return "#dc2626";

      case "LONELY":
        return "#8b5cf6";

      default:
        return "#db2777";
    }
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        background:
          "linear-gradient(135deg,#db2777,#a855f7)",

        boxShadow: `0 0 20px ${getGlow()}55`,

        animation: animated
          ? "brainPulse 2s ease-in-out infinite"
          : "none",

        flexShrink: 0,

        userSelect: "none"
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 64 64"
        fill="none"
      >
        <path
          d="M20 20
             C14 20 12 26 16 30
             C10 34 12 42 20 42
             C20 50 28 52 32 48
             C36 52 44 50 44 42
             C52 42 54 34 48 30
             C52 26 50 20 44 20
             C44 14 36 12 32 16
             C28 12 20 14 20 20Z"
          fill="white"
        />

        <path
          d="M32 16V48"
          stroke="#db2777"
          strokeWidth="2"
        />

        <path
          d="M22 24H30"
          stroke="#db2777"
          strokeWidth="2"
        />

        <path
          d="M22 32H30"
          stroke="#db2777"
          strokeWidth="2"
        />

        <path
          d="M34 24H42"
          stroke="#db2777"
          strokeWidth="2"
        />

        <path
          d="M34 32H42"
          stroke="#db2777"
          strokeWidth="2"
        />
      </svg>

      <style>
        {`
        @keyframes brainPulse{

            0%{
                transform:scale(1);
            }

            50%{
                transform:scale(1.08);
            }

            100%{
                transform:scale(1);
            }

        }
        `}
      </style>
    </div>
  );
}