import React from "react";
import {
  CurrentWeather,
  ForecastResponse,
  AirQualityData,
} from "../api/weather";
import { format } from "date-fns";

interface WeatherInsightsProps {
  current: CurrentWeather;
  forecast: ForecastResponse;
  airQuality?: AirQualityData | null;
  units: "metric" | "imperial";
  theme: "light" | "dark";
}

const WeatherInsights: React.FC<WeatherInsightsProps> = ({
  current,
  forecast,
  airQuality,
  units,
  theme,
}) => {
  // Calculate temperature trends
  const temps = forecast.list.slice(0, 8).map((item) => item.main.temp);
  const tempTrend = temps[temps.length - 1] > temps[0] ? "rising" : "falling";
  const tempChange = Math.abs(temps[temps.length - 1] - temps[0]);

  // Find max/min for today
  const today = format(new Date(), "yyyy-MM-dd");
  const todayForecast = forecast.list.filter((item) =>
    item.dt_txt.startsWith(today)
  );

  // Fallback to current day's forecast if filtered list is empty
  const validForecast =
    todayForecast.length > 0 ? todayForecast : forecast.list.slice(0, 8);

  const todayMax = Math.max(
    current.main.temp_max,
    ...validForecast.map((item) => item.main.temp_max)
  );
  const todayMin = Math.min(
    current.main.temp_min,
    ...validForecast.map((item) => item.main.temp_min)
  );

  // Calculate comfort level
  const getComfortLevel = () => {
    const temp = current.main.temp;
    const humidity = current.main.humidity;
    const wind = current.wind.speed;

    if (units === "metric") {
      // Metric comfort ranges
      if (temp >= 20 && temp <= 26 && humidity <= 60 && wind <= 15) {
        return { level: "Excellent", color: "#10b981", icon: "😊" };
      } else if (temp >= 16 && temp <= 30 && humidity <= 70) {
        return { level: "Good", color: "#84cc16", icon: "🙂" };
      } else if (temp >= 10 && temp <= 35) {
        return { level: "Fair", color: "#f59e0b", icon: "😐" };
      } else {
        return { level: "Poor", color: "#ef4444", icon: "😰" };
      }
    } else {
      // Imperial comfort ranges
      if (temp >= 68 && temp <= 78 && humidity <= 60 && wind <= 34) {
        return { level: "Excellent", color: "#10b981", icon: "😊" };
      } else if (temp >= 60 && temp <= 86 && humidity <= 70) {
        return { level: "Good", color: "#84cc16", icon: "🙂" };
      } else if (temp >= 50 && temp <= 95) {
        return { level: "Fair", color: "#f59e0b", icon: "😐" };
      } else {
        return { level: "Poor", color: "#ef4444", icon: "😰" };
      }
    }
  };

  const comfort = getComfortLevel();
  const tempUnit = units === "metric" ? "°C" : "°F";
  const speedUnit = units === "metric" ? "km/h" : "mph";

  // Generate activity recommendations
  const getActivityRecommendations = () => {
    const recommendations = [];
    const temp = current.main.temp;
    const condition = current.weather[0].main.toLowerCase();
    const wind = current.wind.speed;
    const aqi = airQuality?.list[0]?.main.aqi;

    // Temperature-based recommendations
    if (units === "metric") {
      if (temp >= 15 && temp <= 25 && !condition.includes("rain")) {
        recommendations.push({
          text: "Perfect for outdoor activities",
          icon: "🚶‍♂️",
        });
      }
      if (temp >= 20 && temp <= 30 && wind < 10) {
        recommendations.push({ text: "Great weather for picnics", icon: "🧺" });
      }
      if (temp < 5) {
        recommendations.push({
          text: "Bundle up if going outside",
          icon: "🧥",
        });
      }
    } else {
      if (temp >= 59 && temp <= 77 && !condition.includes("rain")) {
        recommendations.push({
          text: "Perfect for outdoor activities",
          icon: "🚶‍♂️",
        });
      }
      if (temp >= 68 && temp <= 86 && wind < 22) {
        recommendations.push({ text: "Great weather for picnics", icon: "🧺" });
      }
      if (temp < 41) {
        recommendations.push({
          text: "Bundle up if going outside",
          icon: "🧥",
        });
      }
    }

    // Condition-based recommendations
    if (condition.includes("rain")) {
      recommendations.push({ text: "Take an umbrella", icon: "☂️" });
    }
    if (condition.includes("sun") || condition.includes("clear")) {
      recommendations.push({ text: "Great for photography", icon: "📸" });
    }
    if (wind > (units === "metric" ? 20 : 45)) {
      recommendations.push({
        text: "Windy conditions - secure loose items",
        icon: "💨",
      });
    }

    // Air quality recommendations
    if (aqi && aqi >= 3) {
      recommendations.push({
        text: "Consider indoor activities due to air quality",
        icon: "🏠",
      });
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  };

  const recommendations = getActivityRecommendations();

  return (
    <div className="weather-insights">
      <h3 className="insights-title">
        <span className="title-icon">💡</span>
        Weather Insights
      </h3>

      <div className="insights-grid">
        {/* Comfort Level */}
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-icon">{comfort.icon}</span>
            <h4>Comfort Level</h4>
          </div>
          <div className="insight-value" style={{ color: comfort.color }}>
            {comfort.level}
          </div>
          <div className="insight-details">
            {current.main.temp.toFixed(0)}
            {tempUnit} • {current.main.humidity}% humidity
          </div>
        </div>

        {/* Temperature Trend */}
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-icon">
              {tempTrend === "rising" ? "📈" : "📉"}
            </span>
            <h4>Temperature Trend</h4>
          </div>
          <div className="insight-value">
            {tempTrend === "rising" ? "Rising" : "Falling"}
          </div>
          <div className="insight-details">
            {tempChange.toFixed(1)}
            {tempUnit} change expected
          </div>
        </div>

        {/* Today's Range */}
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-icon">🌡️</span>
            <h4>Today's Range</h4>
          </div>
          <div className="insight-value">
            {todayMax.toFixed(0)}° / {todayMin.toFixed(0)}°
          </div>
          <div className="insight-details">High / Low for today</div>
        </div>

        {/* Wind Conditions */}
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-icon">💨</span>
            <h4>Wind Conditions</h4>
          </div>
          <div className="insight-value">
            {(current.wind.speed * (units === "metric" ? 3.6 : 2.237)).toFixed(
              0
            )}{" "}
            {speedUnit}
          </div>
          <div className="insight-details">
            {current.wind.speed < (units === "metric" ? 5 : 11)
              ? "Light breeze"
              : current.wind.speed < (units === "metric" ? 15 : 34)
              ? "Moderate wind"
              : "Strong wind"}
          </div>
        </div>

        {/* Air Quality (if available) */}
        {airQuality && (
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-icon">🌬️</span>
              <h4>Air Quality</h4>
            </div>
            <div
              className="insight-value"
              style={{
                color:
                  airQuality.list[0].main.aqi <= 2
                    ? "#10b981"
                    : airQuality.list[0].main.aqi === 3
                    ? "#f59e0b"
                    : "#ef4444",
              }}
            >
              {airQuality.list[0].main.aqi <= 2
                ? "Good"
                : airQuality.list[0].main.aqi === 3
                ? "Moderate"
                : "Poor"}
            </div>
            <div className="insight-details">
              AQI: {airQuality.list[0].main.aqi}/5
            </div>
          </div>
        )}

        {/* Visibility */}
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-icon">👁️</span>
            <h4>Visibility</h4>
          </div>
          <div className="insight-value">
            {units === "metric"
              ? `${(current.visibility / 1000).toFixed(1)} km`
              : `${(current.visibility * 0.000621371).toFixed(1)} mi`}
          </div>
          <div className="insight-details">
            {current.visibility >= 10000
              ? "Excellent"
              : current.visibility >= 5000
              ? "Good"
              : current.visibility >= 1000
              ? "Moderate"
              : "Poor"}{" "}
            visibility
          </div>
        </div>
      </div>

      {/* Activity Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4 className="recommendations-title">Recommendations</h4>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <span className="rec-icon">{rec.icon}</span>
                <span className="rec-text">{rec.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherInsights;
