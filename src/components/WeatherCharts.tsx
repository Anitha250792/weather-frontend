import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { ForecastListItem } from "../api/weather";

interface WeatherChartsProps {
  forecast: ForecastListItem[];
  units: "metric" | "imperial";
  theme: "light" | "dark";
}

interface ChartData {
  time: string;
  datetime: Date;
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  rain?: number;
  condition: string;
}

const WeatherCharts: React.FC<WeatherChartsProps> = ({
  forecast,
  units,
  theme,
}) => {
  // Prepare chart data from forecast
  const chartData: ChartData[] = forecast.slice(0, 24).map((item) => ({
    time: format(new Date(item.dt * 1000), "HH:mm"),
    datetime: new Date(item.dt * 1000),
    temp: Math.round(item.main.temp),
    feels_like: Math.round(item.main.feels_like),
    humidity: item.main.humidity,
    pressure: item.main.pressure,
    wind_speed: Math.round(
      item.wind.speed * (units === "imperial" ? 2.237 : 3.6)
    ), // Convert to mph/kmh
    rain: item.rain?.["3h"] || 0,
    condition: item.weather[0].main,
  }));

  // Daily aggregated data for 5-day trends
  const dailyData = forecast
    .reduce((acc: any[], item) => {
      const date = format(new Date(item.dt * 1000), "MMM dd");
      const existing = acc.find((d) => d.date === date);

      if (existing) {
        existing.temps.push(item.main.temp);
        existing.humidity.push(item.main.humidity);
        existing.pressure.push(item.main.pressure);
      } else {
        acc.push({
          date,
          temps: [item.main.temp],
          humidity: [item.main.humidity],
          pressure: [item.main.pressure],
        });
      }

      return acc;
    }, [])
    .slice(0, 5)
    .map((day) => ({
      date: day.date,
      temp_max: Math.round(Math.max(...day.temps)),
      temp_min: Math.round(Math.min(...day.temps)),
      avg_humidity: Math.round(
        day.humidity.reduce((a: number, b: number) => a + b, 0) /
          day.humidity.length
      ),
      avg_pressure: Math.round(
        day.pressure.reduce((a: number, b: number) => a + b, 0) /
          day.pressure.length
      ),
    }));

  // Weather condition distribution
  const conditionCounts = forecast
    .slice(0, 24)
    .reduce((acc: Record<string, number>, item) => {
      const condition = item.weather[0].main;
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {});

  const conditionData = Object.entries(conditionCounts).map(
    ([condition, count]) => ({
      condition,
      count,
      percentage: Math.round((count / 24) * 100),
    })
  );

  // Theme colors
  const colors = {
    primary: theme === "dark" ? "#60a5fa" : "#3b82f6",
    secondary: theme === "dark" ? "#34d399" : "#10b981",
    accent: theme === "dark" ? "#f59e0b" : "#d97706",
    text: theme === "dark" ? "#e5e7eb" : "#374151",
    grid: theme === "dark" ? "#374151" : "#d1d5db",
    background: theme === "dark" ? "#1f2937" : "#ffffff",
  };

  const tempUnit = units === "metric" ? "°C" : "°F";
  const speedUnit = units === "metric" ? "km/h" : "mph";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p
              key={index}
              className="tooltip-value"
              style={{ color: pld.color }}
            >
              {pld.name}: {pld.value}
              {pld.dataKey === "temp" || pld.dataKey === "feels_like"
                ? tempUnit
                : pld.dataKey === "humidity"
                ? "%"
                : pld.dataKey === "pressure"
                ? " hPa"
                : pld.dataKey === "wind_speed"
                ? ` ${speedUnit}`
                : ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="weather-charts">
      <div className="charts-grid">
        {/* 24-Hour Temperature Trend */}
        <div className="chart-container">
          <h3 className="chart-title">24-Hour Temperature Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="time"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                label={{
                  value: tempUnit,
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: colors.text },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="temp"
                stroke={colors.primary}
                strokeWidth={3}
                dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                name="Temperature"
              />
              <Line
                type="monotone"
                dataKey="feels_like"
                stroke={colors.secondary}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Feels Like"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 5-Day Temperature Range */}
        <div className="chart-container">
          <h3 className="chart-title">5-Day Temperature Range</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="date"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                label={{
                  value: tempUnit,
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: colors.text },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="temp_max"
                stackId="1"
                stroke={colors.accent}
                fill={`${colors.accent}40`}
                name="Max Temperature"
              />
              <Area
                type="monotone"
                dataKey="temp_min"
                stackId="1"
                stroke={colors.primary}
                fill={`${colors.primary}40`}
                name="Min Temperature"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Humidity & Pressure */}
        <div className="chart-container">
          <h3 className="chart-title">Humidity & Atmospheric Pressure</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="time"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                yAxisId="humidity"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                label={{
                  value: "Humidity (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: colors.text },
                }}
              />
              <YAxis
                yAxisId="pressure"
                orientation="right"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                label={{
                  value: "Pressure (hPa)",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: "middle", fill: colors.text },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                yAxisId="humidity"
                type="monotone"
                dataKey="humidity"
                stroke={colors.secondary}
                strokeWidth={2}
                dot={{ fill: colors.secondary, strokeWidth: 2, r: 3 }}
                name="Humidity"
              />
              <Line
                yAxisId="pressure"
                type="monotone"
                dataKey="pressure"
                stroke={colors.accent}
                strokeWidth={2}
                dot={{ fill: colors.accent, strokeWidth: 2, r: 3 }}
                name="Pressure"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Wind Speed */}
        <div className="chart-container">
          <h3 className="chart-title">Wind Speed Forecast</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="time"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                label={{
                  value: speedUnit,
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: colors.text },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="wind_speed"
                fill={colors.primary}
                name="Wind Speed"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weather Conditions Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">24h Weather Conditions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={conditionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="count"
                label={({ condition, percentage }) =>
                  `${condition} ${percentage}%`
                }
              >
                {conditionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      [
                        colors.primary,
                        colors.secondary,
                        colors.accent,
                        "#8b5cf6",
                        "#ef4444",
                      ][index % 5]
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Averages */}
        <div className="chart-container">
          <h3 className="chart-title">5-Day Humidity & Pressure Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="date"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                yAxisId="humidity"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                label={{
                  value: "Humidity (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: colors.text },
                }}
              />
              <YAxis
                yAxisId="pressure"
                orientation="right"
                tick={{ fill: colors.text, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                label={{
                  value: "Pressure (hPa)",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: "middle", fill: colors.text },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                yAxisId="humidity"
                type="monotone"
                dataKey="avg_humidity"
                stroke={colors.secondary}
                strokeWidth={3}
                dot={{ fill: colors.secondary, strokeWidth: 2, r: 5 }}
                name="Avg Humidity"
              />
              <Line
                yAxisId="pressure"
                type="monotone"
                dataKey="avg_pressure"
                stroke={colors.accent}
                strokeWidth={3}
                dot={{ fill: colors.accent, strokeWidth: 2, r: 5 }}
                name="Avg Pressure"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WeatherCharts;
