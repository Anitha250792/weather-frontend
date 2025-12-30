import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useWeather } from "./hooks/useWeather";

import { SearchBar } from "./components/SearchBar";
import { CurrentWeatherCard } from "./components/CurrentWeatherCard";
import { ForecastGrid } from "./components/ForecastGrid";
import WeatherCharts from "./components/WeatherCharts";
import AirQuality from "./components/AirQuality";
import WeatherInsights from "./components/WeatherInsights";
import ActivityRecommendations from "./components/ActivityRecommendations";
import PredictionCharts from "./components/PredictionCharts";

import { UnitToggle } from "./components/UnitToggle";
import { ErrorMessage } from "./components/ErrorMessage";
import { Loader } from "./components/Loader";
import { WeatherAnalytics } from "./components/WeatherAnalytics";
import { LocationManager } from "./components/LocationManager";
import { SettingsPanel } from "./components/SettingsPanel";

import { alertsManager } from "./utils/alerts";
import { weatherDB } from "./utils/database";

import "./AppLayout.css";
import "./styles/enhanced.css";
import "./styles/theme.css";
import "./styles/components.css";
import "./styles/charts.css";

export const App: React.FC = () => {
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [showHome, setShowHome] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(
    localStorage.getItem("timeFormat") === "12h" ? "12h" : "24h"
  );

  const [theme, setTheme] = useState<"light" | "dark">(
    localStorage.getItem("theme") === "light" ? "light" : "dark"
  );

  // ✅ FIX 1: Proper hook destructuring
  const {
    current,
    forecast,
    daily,
    airQuality,
    loading,
    error,
    search,
    searchByCoords,
  } = useWeather(units);

  // Load last searched city safely
  useEffect(() => {
    const last = localStorage.getItem("lastCity");
    if (last) {
      search(last);
      setShowHome(false);
    }
  }, [search]);

  // Init DB + alerts
  useEffect(() => {
    weatherDB.init().catch(console.error);
    if (current) {
      alertsManager.checkWeatherConditions(current, current.name);
    }
  }, [current]);

  // Theme persistence
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // User ID (for recommendations)
  useEffect(() => {
    const stored = localStorage.getItem("userId");
    if (stored) {
      setUserId(Number(stored));
    } else {
      const id = Math.floor(Math.random() * 1_000_000_000);
      localStorage.setItem("userId", String(id));
      setUserId(id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("timeFormat", timeFormat);
  }, [timeFormat]);

  const handleSearch = (city: string) => {
    search(city);
    setShowHome(false);
  };

  const refreshWeather = useCallback(() => {
    if (!current) return;
    setIsRefreshing(true);
    search(current.name).finally(() =>
      setTimeout(() => setIsRefreshing(false), 1000)
    );
  }, [current, search]);

  const themeClass = useMemo(() => {
    if (!current) return "theme-default";
    const main = current.weather[0]?.main?.toLowerCase();
    return `theme-${main || "default"}`;
  }, [current]);

  const gradient = theme === "dark"
    ? "linear-gradient(135deg,#0f172a,#0369a1)"
    : "linear-gradient(135deg,#fef3c7,#f97316)";

  const renderHome = () => (
    <div className="home-page">
      <h1 className="hero-title">Weather Forecast</h1>
      <SearchBar onSearch={handleSearch} />
      <button
        className="home-btn"
        onClick={() =>
          navigator.geolocation.getCurrentPosition(pos => {
            searchByCoords(pos.coords.latitude, pos.coords.longitude);
            setShowHome(false);
          })
        }
      >
        📍 Use My Location
      </button>
    </div>
  );

  return (
    <div
      className={`container ${themeClass}`}
      style={{ background: gradient }}
    >
      <header>
        <h1 className="logo" onClick={() => setShowHome(true)}>
          ☀️ Weather Forecast
        </h1>

        {!showHome && (
          <>
            <SearchBar onSearch={handleSearch} />
            <UnitToggle units={units} onChange={setUnits} />
            <button onClick={() => setShowSettings(true)}>⚙️</button>
          </>
        )}
      </header>

      <div className="content">
        {error && <ErrorMessage message={error} />}
        {loading && <Loader />}

        {showHome && !loading ? (
          renderHome()
        ) : (
          <>
            {current && (
              <CurrentWeatherCard
                data={current}
                units={units}
                timeFormat={timeFormat}
              />
            )}

            {forecast && (
              <ForecastGrid
                data={forecast}
                units={units}
                timeFormat={timeFormat}
                daily={daily}
              />
            )}

            {showCharts && forecast && (
              <WeatherCharts
                forecast={forecast.list}
                units={units}
                theme={theme}
              />
            )}

            {airQuality && <AirQuality data={airQuality} theme={theme} />}

            {current && forecast && (
              <WeatherInsights
                current={current}
                forecast={forecast}
                airQuality={airQuality}
                units={units}
                theme={theme}
              />
            )}

             {current && <PredictionCharts current={current} />}

            {current && (
              <ActivityRecommendations
                current={current}
                units={units}
                userId={userId ?? undefined}
              />
            )} 

            {showAnalytics && current && forecast && (
              <WeatherAnalytics
                currentWeather={current}
                forecast={forecast}
                units={units}
              />
            )}
          </>
        )}
      </div>

      {current && !showHome && (
        <button
          className={`refresh-btn ${isRefreshing ? "spinning" : ""}`}
          onClick={refreshWeather}
        >
          ⟳
        </button>
      )}

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        units={units}
        onUnitsChange={setUnits}
        theme={theme}
        onThemeChange={setTheme}
        timeFormat={timeFormat}
        onTimeFormatChange={setTimeFormat}
      />
    </div>
  );
};
