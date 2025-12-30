import React from "react";

interface UVIndexProps {
  uvIndex: number;
  theme: "light" | "dark";
}

const UVIndex: React.FC<UVIndexProps> = ({ uvIndex, theme }) => {
  const getUVLevel = (
    uv: number
  ): {
    level: string;
    color: string;
    description: string;
    recommendation: string;
  } => {
    if (uv <= 2) {
      return {
        level: "Low",
        color: "#10b981",
        description: "Minimal risk from UV rays",
        recommendation: "No protection needed",
      };
    } else if (uv <= 5) {
      return {
        level: "Moderate",
        color: "#f59e0b",
        description: "Moderate risk of harm",
        recommendation: "Stay in shade during midday",
      };
    } else if (uv <= 7) {
      return {
        level: "High",
        color: "#ef4444",
        description: "High risk of harm",
        recommendation: "Use sunscreen and protective clothing",
      };
    } else if (uv <= 10) {
      return {
        level: "Very High",
        color: "#8b5cf6",
        description: "Very high risk of harm",
        recommendation: "Take all precautions",
      };
    } else {
      return {
        level: "Extreme",
        color: "#dc2626",
        description: "Extreme risk of harm",
        recommendation: "Avoid being outside",
      };
    }
  };

  const uvInfo = getUVLevel(uvIndex);

  return (
    <div className="uv-index-card">
      <div className="uv-header">
        <h3 className="uv-title">
          <span className="title-icon">☀️</span>
          UV Index
        </h3>
        <div className="uv-badge" style={{ backgroundColor: uvInfo.color }}>
          {uvIndex.toFixed(1)}
        </div>
      </div>

      <div className="uv-main">
        <div className="uv-meter">
          <div className="uv-scale">
            {[...Array(11)].map((_, i) => (
              <div
                key={i}
                className={`uv-segment ${i <= uvIndex ? "active" : ""}`}
                style={{
                  backgroundColor:
                    i <= uvIndex ? uvInfo.color : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
          <div className="uv-labels">
            <span>0</span>
            <span>5</span>
            <span>11+</span>
          </div>
        </div>

        <div className="uv-info">
          <div className="uv-level" style={{ color: uvInfo.color }}>
            {uvInfo.level}
          </div>
          <div className="uv-description">{uvInfo.description}</div>
          <div className="uv-recommendation">💡 {uvInfo.recommendation}</div>
        </div>
      </div>
    </div>
  );
};

export default UVIndex;
