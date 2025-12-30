import React, { useState, useEffect, useMemo } from "react";
import { CurrentWeather, ForecastResponse } from "../api/weather";

interface WeatherStats {
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  avgHumidity: number;
  totalRainfall: number;
  maxWindSpeed: number;
  mostCommonCondition: string;
  temperatureTrend: "rising" | "falling" | "stable";
  comfortIndex: number;
}

interface AnalyticsProps {
  currentWeather: CurrentWeather | null;
  forecast: ForecastResponse | null;
  units: "metric" | "imperial";
}

export const WeatherAnalytics: React.FC<AnalyticsProps> = ({
  currentWeather,
  forecast,
  units,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<"24h" | "3d" | "5d">(
    "24h"
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const stats = useMemo(() => {
    if (!forecast) return null;

    const periodHours =
      selectedPeriod === "24h" ? 24 : selectedPeriod === "3d" ? 72 : 120;
    const relevantData = forecast.list.slice(0, Math.ceil(periodHours / 3));

    return calculateWeatherStats(relevantData, units);
  }, [forecast, selectedPeriod, units]);

  const chartData = useMemo(() => {
    if (!forecast) return null;
    return generateChartData(forecast.list.slice(0, 16), selectedPeriod);
  }, [forecast, selectedPeriod]);

  if (!currentWeather || !forecast || !stats) {
    return (
      <div className="analytics-container">
        <div className="analytics-placeholder">
          <h3>📊 Weather Analytics</h3>
          <p>Search for a location to view detailed weather analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h3>📊 Weather Analytics</h3>
        <div className="period-selector">
          {(["24h", "3d", "5d"] as const).map((period) => (
            <button
              key={period}
              className={`period-btn ${
                selectedPeriod === period ? "active" : ""
              }`}
              onClick={() => setSelectedPeriod(period)}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-icon">🌡️</div>
          <div className="stat-content">
            <h4>Temperature Range</h4>
            <div className="stat-value">
              {stats.minTemp.toFixed(1)}° - {stats.maxTemp.toFixed(1)}°
            </div>
            <div className="stat-subtitle">
              Avg: {stats.avgTemp.toFixed(1)}°{units === "metric" ? "C" : "F"}
            </div>
            <div className="trend-indicator">
              <span className={`trend trend-${stats.temperatureTrend}`}>
                {stats.temperatureTrend === "rising"
                  ? "📈"
                  : stats.temperatureTrend === "falling"
                  ? "📉"
                  : "➡️"}
                {stats.temperatureTrend}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💧</div>
          <div className="stat-content">
            <h4>Humidity</h4>
            <div className="stat-value">{stats.avgHumidity.toFixed(0)}%</div>
            <div className="comfort-indicator">
              <div className="comfort-bar">
                <div
                  className="comfort-fill"
                  style={{ width: `${stats.comfortIndex}%` }}
                />
              </div>
              <span>Comfort: {getComfortLevel(stats.comfortIndex)}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌧️</div>
          <div className="stat-content">
            <h4>Precipitation</h4>
            <div className="stat-value">
              {stats.totalRainfall.toFixed(1)}{" "}
              {units === "metric" ? "mm" : "in"}
            </div>
            <div className="stat-subtitle">
              {getRainfallCategory(stats.totalRainfall, units)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💨</div>
          <div className="stat-content">
            <h4>Wind Speed</h4>
            <div className="stat-value">
              {stats.maxWindSpeed.toFixed(1)}{" "}
              {units === "metric" ? "m/s" : "mph"}
            </div>
            <div className="stat-subtitle">Peak speed</div>
          </div>
        </div>

        <div className="stat-card wide">
          <div className="stat-icon">☀️</div>
          <div className="stat-content">
            <h4>Dominant Condition</h4>
            <div className="stat-value">{stats.mostCommonCondition}</div>
            <div className="condition-breakdown">
              {getConditionBreakdown(forecast.list.slice(0, 16))}
            </div>
          </div>
        </div>
      </div>

      <button
        className="toggle-advanced"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? "Hide" : "Show"} Advanced Analytics
      </button>

      {showAdvanced && (
        <div className="advanced-analytics">
          <div className="chart-container">
            <h4>Temperature Trend</h4>
            <TemperatureTrendChart
              data={chartData?.temperature || []}
              units={units}
            />
          </div>

          <div className="chart-container">
            <h4>Humidity & Pressure</h4>
            <HumidityPressureChart data={chartData?.humidity || []} />
          </div>

          <div className="detailed-forecast">
            <h4>Hourly Breakdown</h4>
            <HourlyBreakdown
              forecast={forecast.list.slice(0, 8)}
              units={units}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function calculateWeatherStats(
  data: any[],
  units: "metric" | "imperial"
): WeatherStats {
  const temps = data.map((item) => item.main.temp);
  const humidity = data.map((item) => item.main.humidity);
  const rainfall = data.reduce(
    (sum, item) => sum + (item.rain?.["3h"] || 0),
    0
  );
  const windSpeeds = data.map((item) => item.wind.speed);
  const conditions = data.map((item) => item.weather[0].main);

  // Temperature statistics
  const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);

  // Humidity statistics
  const avgHumidity = humidity.reduce((sum, h) => sum + h, 0) / humidity.length;

  // Wind statistics
  const maxWindSpeed = Math.max(...windSpeeds);

  // Most common condition
  const conditionCounts = conditions.reduce((acc, condition) => {
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonCondition = Object.entries(conditionCounts).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0][0];

  // Temperature trend
  const firstHalf = temps.slice(0, Math.floor(temps.length / 2));
  const secondHalf = temps.slice(Math.floor(temps.length / 2));
  const firstAvg =
    firstHalf.reduce((sum, temp) => sum + temp, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, temp) => sum + temp, 0) / secondHalf.length;

  const tempDiff = secondAvg - firstAvg;
  const temperatureTrend =
    Math.abs(tempDiff) < 1 ? "stable" : tempDiff > 0 ? "rising" : "falling";

  // Comfort index (based on temperature and humidity)
  const comfortIndex = calculateComfortIndex(avgTemp, avgHumidity, units);

  return {
    avgTemp,
    maxTemp,
    minTemp,
    avgHumidity,
    totalRainfall: rainfall,
    maxWindSpeed,
    mostCommonCondition,
    temperatureTrend,
    comfortIndex,
  };
}

function calculateComfortIndex(
  temp: number,
  humidity: number,
  units: "metric" | "imperial"
): number {
  // Convert to Celsius if needed
  const tempC = units === "imperial" ? ((temp - 32) * 5) / 9 : temp;

  // Ideal temperature range: 20-24°C, ideal humidity: 40-60%
  const tempScore = Math.max(0, 100 - Math.abs(tempC - 22) * 10);
  const humidityScore = Math.max(0, 100 - Math.abs(humidity - 50) * 2);

  return (tempScore + humidityScore) / 2;
}

function getComfortLevel(index: number): string {
  if (index >= 80) return "Excellent";
  if (index >= 60) return "Good";
  if (index >= 40) return "Fair";
  if (index >= 20) return "Poor";
  return "Uncomfortable";
}

function getRainfallCategory(
  rainfall: number,
  units: "metric" | "imperial"
): string {
  const threshold = units === "metric" ? [2, 10, 25] : [0.08, 0.4, 1];

  if (rainfall === 0) return "No rain";
  if (rainfall < threshold[0]) return "Light rain";
  if (rainfall < threshold[1]) return "Moderate rain";
  if (rainfall < threshold[2]) return "Heavy rain";
  return "Extreme rainfall";
}

function getConditionBreakdown(data: any[]) {
  const conditions = data.map((item) => item.weather[0].main);
  const counts = conditions.reduce((acc, condition) => {
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([condition, count]) => (
      <span key={condition} className="condition-item">
        {condition}: {Math.round(((count as number) / data.length) * 100)}%
      </span>
    ));
}

function generateChartData(data: any[], period: string) {
  return {
    temperature: data.map((item, index) => ({
      x: index,
      y: item.main.temp,
      time: new Date(item.dt * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    humidity: data.map((item, index) => ({
      x: index,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      time: new Date(item.dt * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
  };
}

// Simple chart components
const TemperatureTrendChart: React.FC<{ data: any[]; units: string }> = ({
  data,
  units,
}) => (
  <div className="simple-chart">
    {data.map((point, index) => (
      <div
        key={index}
        className="chart-point"
        title={`${point.time}: ${point.y.toFixed(1)}°`}
      >
        <div
          className="temp-bar"
          style={{
            height: `${Math.max(
              10,
              (point.y / Math.max(...data.map((d) => d.y))) * 100
            )}px`,
          }}
        />
        <span className="chart-label">{point.time}</span>
      </div>
    ))}
  </div>
);

const HumidityPressureChart: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="dual-chart">
    <div className="chart-row">
      <span>Humidity</span>
      {data.map((point, index) => (
        <div
          key={`h-${index}`}
          className="mini-bar"
          title={`${point.humidity}%`}
        >
          <div
            style={{ height: `${point.humidity}%` }}
            className="humidity-fill"
          />
        </div>
      ))}
    </div>
    <div className="chart-row">
      <span>Pressure</span>
      {data.map((point, index) => (
        <div
          key={`p-${index}`}
          className="mini-bar"
          title={`${point.pressure} hPa`}
        >
          <div
            style={{
              height: `${Math.max(10, ((point.pressure - 900) / 200) * 100)}%`,
            }}
            className="pressure-fill"
          />
        </div>
      ))}
    </div>
  </div>
);

const HourlyBreakdown: React.FC<{ forecast: any[]; units: string }> = ({
  forecast,
  units,
}) => (
  <div className="hourly-breakdown">
    {forecast.map((item, index) => (
      <div key={index} className="hourly-item">
        <div className="hour-time">
          {new Date(item.dt * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <img
          src={`https://openweathermap.org/img/w/${item.weather[0].icon}.png`}
          alt=""
        />
        <div className="hour-temp">{item.main.temp.toFixed(0)}°</div>
        <div className="hour-details">
          <span>💧 {item.main.humidity}%</span>
          <span>
            💨 {item.wind.speed.toFixed(1)}
            {units === "metric" ? "m/s" : "mph"}
          </span>
        </div>
      </div>
    ))}
  </div>
);
