import React, { useEffect, useState } from "react";
import { CurrentWeather } from "../api/weather";
import { format } from "date-fns";

interface Props {
  data: CurrentWeather;
  units: "metric" | "imperial";
  timeFormat?: "12h" | "24h";
}

export const CurrentWeatherCard: React.FC<Props> = ({
  data,
  units,
  timeFormat = "24h",
}) => {
  // Observation timestamp provided by API (may lag a few minutes)
  const observationTime = (data.dt + data.timezone) * 1000;
  const tempUnit = units === "metric" ? "°C" : "°F";
  const windUnit = units === "metric" ? "m/s" : "mph";
  const icon = data.weather[0]?.icon;
  const distUnit = units === "metric" ? "km" : "mi";
  const [currentUserTime, setCurrentUserTime] = useState(new Date());
  const [remoteNow, setRemoteNow] = useState(() =>
    computeRemoteNow(data.timezone)
  );

  function computeRemoteNow(tzSeconds: number) {
    // getTimezoneOffset returns minutes behind UTC (e.g. Montreal EDT = 240)
    const localOffsetMs = -new Date().getTimezoneOffset() * 60 * 1000; // convert to signed (+ for east)
    const remoteOffsetMs = tzSeconds * 1000; // API offset in seconds from UTC
    return new Date(Date.now() + (remoteOffsetMs - localOffsetMs));
  }

  // Update clocks every 30s for near‑real‑time display
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentUserTime(new Date());
      setRemoteNow(computeRemoteNow(data.timezone));
    }, 30000);
    return () => clearInterval(id);
  }, [data.timezone]);

  // Refetch remoteNow on timezone change instantly
  useEffect(() => {
    setRemoteNow(computeRemoteNow(data.timezone));
  }, [data.timezone]);

  const formatTime = (time: number | Date) =>
    format(time, timeFormat === "12h" ? "h:mm aa" : "HH:mm");

  // Calculate weather condition status text
  const getWeatherStatusText = () => {
    const { main, description } = data.weather[0];
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);

    let statusText = "";

    // Temperature context
    if (units === "metric") {
      if (temp <= 0) statusText += "Freezing conditions. ";
      else if (temp < 10) statusText += "Very cold. ";
      else if (temp < 20) statusText += "Cool. ";
      else if (temp < 26) statusText += "Pleasant. ";
      else if (temp < 30) statusText += "Warm. ";
      else statusText += "Hot. ";
    } else {
      if (temp <= 32) statusText += "Freezing conditions. ";
      else if (temp < 50) statusText += "Very cold. ";
      else if (temp < 68) statusText += "Cool. ";
      else if (temp < 79) statusText += "Pleasant. ";
      else if (temp < 86) statusText += "Warm. ";
      else statusText += "Hot. ";
    }

    // Weather condition context
    if (main === "Clear") {
      statusText += "Clear skies. Good visibility.";
    } else if (main === "Clouds") {
      statusText += description.includes("few")
        ? "Mostly clear with some clouds."
        : "Cloudy conditions.";
    } else if (main === "Rain") {
      statusText += "Rainy conditions. Consider taking an umbrella.";
    } else if (main === "Snow") {
      statusText += "Snowy conditions. Bundle up and be cautious on roads.";
    } else if (main === "Thunderstorm") {
      statusText += "Thunderstorms. Stay indoors if possible.";
    } else if (["Mist", "Fog", "Haze"].includes(main)) {
      statusText += "Reduced visibility due to " + main.toLowerCase() + ".";
    }

    return statusText;
  };

  // Calculate time of day context
  const getTimeContext = () => {
    const hour = remoteNow.getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  };

  return (
    <div className="current-card fade-in">
      <div className="header">
        <h2>
          {data.name}, {data.sys.country}
        </h2>
        <div className="time-info">
          <time>{format(remoteNow, "eeee, d MMMM yyyy")}</time>
          <time className="current-time">{formatTime(remoteNow)}</time>
        </div>
      </div>

      <div className="time-comparison">
        <div className="your-time">
          <span className="time-label">Your Time</span>
          <span className="time-value">{formatTime(currentUserTime)}</span>
        </div>
        <div className="time-separator" />
        <div className="local-time">
          <span className="time-label">Local Time in {data.name}</span>
          <span className="time-value">{formatTime(remoteNow)}</span>
        </div>
      </div>

      <div className="weather-status-text">
        <p>{getWeatherStatusText()}</p>
        <p className="time-context">
          Good {getTimeContext()}! Last observation at{" "}
          {formatTime(observationTime)} · Live time {formatTime(remoteNow)}.
        </p>
      </div>

      <div className="main">
        <div className="temp">
          {Math.round(data.main.temp)}
          {tempUnit}
        </div>
        <div className="desc">
          <img
            src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
            alt={data.weather[0].description}
          />
          <p>{data.weather[0].description}</p>
          <p className="feels-like">
            Feels like {Math.round(data.main.feels_like)}
            {tempUnit}
          </p>
        </div>
      </div>

      <div className="weather-details-section">
        <h3>Weather Details</h3>
        <ul className="metrics">
          <li title="Feels Like">
            <span className="metric-icon">🌡️</span>
            <span className="metric-name">Feels Like</span>
            <span className="metric-value">
              {Math.round(data.main.feels_like)}
              {tempUnit}
            </span>
          </li>
          <li title="Humidity">
            <span className="metric-icon">💧</span>
            <span className="metric-name">Humidity</span>
            <span className="metric-value">{data.main.humidity}%</span>
          </li>
          <li title="Wind Speed">
            <span className="metric-icon">💨</span>
            <span className="metric-name">Wind Speed</span>
            <span className="metric-value">
              {Math.round(data.wind.speed)} {windUnit}
            </span>
          </li>
          <li title="Pressure">
            <span className="metric-icon">📊</span>
            <span className="metric-name">Pressure</span>
            <span className="metric-value">{data.main.pressure} hPa</span>
          </li>
          <li title="Visibility">
            <span className="metric-icon">👁️</span>
            <span className="metric-name">Visibility</span>
            <span className="metric-value">
              {Math.round(data.visibility / 1000)} {distUnit}
            </span>
          </li>
          <li title="Sunrise">
            <span className="metric-icon">🌅</span>
            <span className="metric-name">Sunrise</span>
            <span className="metric-value">
              {formatTime((data.sys.sunrise + data.timezone) * 1000)}
            </span>
          </li>
          <li title="Sunset">
            <span className="metric-icon">🌇</span>
            <span className="metric-name">Sunset</span>
            <span className="metric-value">
              {formatTime((data.sys.sunset + data.timezone) * 1000)}
            </span>
          </li>
          <li title="Live Local Time">
            <span className="metric-icon">🕒</span>
            <span className="metric-name">Live Time</span>
            <span className="metric-value">{formatTime(remoteNow)}</span>
          </li>
          <li title="Observation Time (API dt)">
            <span className="metric-icon">⏱️</span>
            <span className="metric-name">Observed</span>
            <span className="metric-value">{formatTime(observationTime)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
