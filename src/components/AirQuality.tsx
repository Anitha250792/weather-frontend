import React from "react";
import { AirQualityData } from "../api/weather";

interface AirQualityProps {
  data: AirQualityData;
  theme: "light" | "dark";
}

const AirQuality: React.FC<AirQualityProps> = ({ data, theme }) => {
  if (!data.list || data.list.length === 0) {
    return null;
  }

  const currentAQ = data.list[0];

  const getAQILevel = (
    aqi: number
  ): { level: string; color: string; description: string } => {
    switch (aqi) {
      case 1:
        return {
          level: "Good",
          color: "#10b981",
          description:
            "Air quality is excellent. Ideal for all outdoor activities.",
        };
      case 2:
        return {
          level: "Fair",
          color: "#84cc16",
          description: "Air quality is acceptable for most people.",
        };
      case 3:
        return {
          level: "Moderate",
          color: "#f59e0b",
          description: "Sensitive individuals may experience minor issues.",
        };
      case 4:
        return {
          level: "Poor",
          color: "#ef4444",
          description:
            "Everyone may experience health effects. Limit outdoor activities.",
        };
      case 5:
        return {
          level: "Very Poor",
          color: "#7c3aed",
          description:
            "Health alert. Everyone should avoid outdoor activities.",
        };
      default:
        return {
          level: "Unknown",
          color: "#6b7280",
          description: "Air quality data unavailable.",
        };
    }
  };

  const aqiInfo = getAQILevel(currentAQ.main.aqi);

  const pollutants = [
    {
      name: "PM2.5",
      value: currentAQ.components.pm2_5,
      unit: "μg/m³",
      icon: "🫁",
    },
    {
      name: "PM10",
      value: currentAQ.components.pm10,
      unit: "μg/m³",
      icon: "💨",
    },
    { name: "O₃", value: currentAQ.components.o3, unit: "μg/m³", icon: "☀️" },
    { name: "NO₂", value: currentAQ.components.no2, unit: "μg/m³", icon: "🏭" },
    { name: "SO₂", value: currentAQ.components.so2, unit: "μg/m³", icon: "🔥" },
    { name: "CO", value: currentAQ.components.co, unit: "μg/m³", icon: "🚗" },
  ];

  return (
    <div className="air-quality-card">
      <div className="air-quality-header">
        <h3 className="air-quality-title">
          <span className="title-icon">🌬️</span>
          Air Quality Index
        </h3>
        <div className="aqi-badge" style={{ backgroundColor: aqiInfo.color }}>
          {currentAQ.main.aqi}/5
        </div>
      </div>

      <div className="aqi-main">
        <div className="aqi-level">
          <div className="aqi-circle" style={{ borderColor: aqiInfo.color }}>
            <span className="aqi-number" style={{ color: aqiInfo.color }}>
              {currentAQ.main.aqi}
            </span>
          </div>
          <div className="aqi-info">
            <div className="aqi-status" style={{ color: aqiInfo.color }}>
              {aqiInfo.level}
            </div>
            <div className="aqi-description">{aqiInfo.description}</div>
          </div>
        </div>
      </div>

      <div className="pollutants-grid">
        {pollutants.map((pollutant) => (
          <div key={pollutant.name} className="pollutant-item">
            <div className="pollutant-icon">{pollutant.icon}</div>
            <div className="pollutant-info">
              <div className="pollutant-name">{pollutant.name}</div>
              <div className="pollutant-value">
                {pollutant.value.toFixed(1)} {pollutant.unit}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="air-quality-footer">
        <div className="health-recommendations">
          <h4>Health Recommendations</h4>
          <div className="recommendations">
            {currentAQ.main.aqi <= 2 && (
              <div className="recommendation good">
                <span>✅</span> Great time for outdoor activities
              </div>
            )}
            {currentAQ.main.aqi === 3 && (
              <div className="recommendation moderate">
                <span>⚠️</span> Consider reducing prolonged outdoor activities
              </div>
            )}
            {currentAQ.main.aqi >= 4 && (
              <>
                <div className="recommendation poor">
                  <span>🚫</span> Avoid outdoor exercise
                </div>
                <div className="recommendation poor">
                  <span>😷</span> Consider wearing a mask outdoors
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirQuality;
