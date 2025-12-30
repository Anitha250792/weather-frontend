import { useEffect, useState } from "react";
import { getLatestWeather, LatestWeather } from "../api/ai";

export default function LatestWeatherCard() {
  const [weather, setWeather] = useState<LatestWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLatestWeather()
      .then((list) => {
        if (list.length > 0) {
          setWeather(list[0]); // latest record
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load weather data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading weather… 🌤️</p>;
  if (error) return <p>{error}</p>;
  if (!weather) return <p>No weather data available</p>;

  return (
    <div style={card}>
      <h2>📍 {weather.location_name}</h2>
      <p>🌡️ {weather.temperature}°C</p>
      <p>💧 Humidity: {weather.humidity}%</p>
      {weather.pressure && <p>🔽 Pressure: {weather.pressure}</p>}
    </div>
  );
}

const card: React.CSSProperties = {
  padding: "20px",
  borderRadius: "14px",
  background: "#ecfeff",
  width: "280px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
};
