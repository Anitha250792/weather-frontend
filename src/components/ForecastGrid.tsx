import React, { useMemo, useState } from "react";
import { ForecastResponse, OneCallResponse } from "../api/weather";
import { format } from "date-fns";

interface Props {
  data: ForecastResponse;
  units: "metric" | "imperial";
  timeFormat?: "12h" | "24h";
  daily?: OneCallResponse | null;
}

function toLocalDateKey(tsSec: number, tzSec: number): string {
  const deviceOffsetSec = new Date().getTimezoneOffset() * 60;
  const virtualUtc = tsSec + tzSec + deviceOffsetSec;
  return format(new Date(virtualUtc * 1000), "yyyy-MM-dd");
}

function groupByDay(list: ForecastResponse["list"], tz: number) {
  const map: Record<string, typeof list> = {};
  const nowSec = Math.floor(Date.now() / 1000);
  list.forEach((item) => {
    if (item.dt < nowSec) return;
    const key = toLocalDateKey(item.dt, tz);
    map[key] = map[key] || [];
    map[key].push(item);
  });
  return map;
}

export const ForecastGrid: React.FC<Props> = ({ data, units, timeFormat = "24h", daily }) => {
  const grouped = useMemo(() => groupByDay(data.list, data.city.timezone), [data]);
  const tempUnit = units === "metric" ? "°C" : "°F";
  const windUnit = units === "metric" ? "m/s" : "mph";
  const [selected, setSelected] = useState<string | null>(null);

  const formatTime = (time: number | Date) => {
    return format(time, timeFormat === "12h" ? "h:mm aa" : "HH:mm");
  };

  const getDayWeatherSummary = (items: ForecastResponse["list"][number][], fallback?: string) => {
    if (!items.length) return fallback || "";
    const conditions = items.map((i) => i.weather[0].main.toLowerCase());
    const counts: Record<string, number> = {};
    for (const c of conditions) counts[c] = (counts[c] || 0) + 1;
    const main = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const temps = items.map((i) => i.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    const text =
      {
        clear: "Clear skies",
        clouds: "Mostly cloudy",
        rain: "Rainy conditions",
        snow: "Snowy weather",
        thunderstorm: "Thunderstorms",
        drizzle: "Light rain",
        mist: "Misty conditions",
        fog: "Foggy conditions",
      }[main] || "Mixed conditions";
    return `${text}. Temperatures from ${min}${tempUnit} to ${max}${tempUnit}.`;
  };

  const dayEntries: Array<[string, ForecastResponse["list"]]> = useMemo(() => {
    if (daily?.daily?.length) {
      const tzOff = daily.timezone_offset;
      const todayKey = toLocalDateKey(Math.floor(Date.now() / 1000), tzOff);
      const keys = daily.daily
        .map((d) => toLocalDateKey(d.dt, tzOff))
        .filter((k) => k >= todayKey);
      const uniqOrdered: string[] = [];
      for (const k of keys) if (!uniqOrdered.includes(k)) uniqOrdered.push(k);
      const firstSeven = uniqOrdered.slice(0, 7);
      return firstSeven.map((k) => [k, grouped[k] || []]) as Array<[
        string,
        ForecastResponse["list"]
      ]>;
    }
    // fallback
    const tzOff = data.city.timezone;
    const todayKey = toLocalDateKey(Math.floor(Date.now() / 1000), tzOff);
    return Object.entries(grouped).filter(([k]) => k >= todayKey).slice(0, 7);
  }, [daily, grouped, data.city.timezone]);

  const expanded = selected !== null;

  return (
    <div className={`forecast-grid ${expanded ? "expanded" : ""}`}>
      {dayEntries.map(([day, items]) => {
        let min = items.length ? Math.round(Math.min(...items.map((i) => i.main.temp))) : 0;
        let max = items.length ? Math.round(Math.max(...items.map((i) => i.main.temp))) : 0;
        let icon = items[0]?.weather?.[0]?.icon || "01d";
        let desc: string | undefined = items[0]?.weather?.[0]?.description;

        if (daily?.daily?.length) {
          const tzOff = daily.timezone_offset;
          const dly = daily.daily.find((d) => toLocalDateKey(d.dt, tzOff) === day);
          if (dly) {
            min = Math.round(dly.temp.min);
            max = Math.round(dly.temp.max);
            icon = dly.weather[0].icon;
            desc = dly.weather[0].description;
          }
        }

        const isSelected = selected === day;
        const summary = getDayWeatherSummary(items, desc ? `${desc[0].toUpperCase()}${desc.slice(1)}.` : "");

        return (
          <div
            className={`day fade-in ${isSelected ? "selected" : ""}`}
            key={day}
            onClick={() => setSelected(isSelected ? null : day)}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-label={`Forecast for ${format(new Date(day), "EEEE, MMMM d")}`}
          >
            <h4>{format(new Date(day), "EEE, MMM d")}</h4>
            <img src={`https://openweathermap.org/img/wn/${icon}.png`} alt={desc || items[0]?.weather?.[0]?.description || ""} />
            <div className="range">
              <span className="max">{max}{tempUnit}</span>
              <span className="divider"> / </span>
              <span className="min">{min}{tempUnit}</span>
            </div>
            <div className="day-summary">{summary}</div>

            {isSelected && (
              <div className="day-details">
                <h5>Hourly Forecast</h5>
                {items.length ? (
                  <ul>
                    {items.slice(0, 6).map((item, i) => {
                      const itemTime = new Date(item.dt_txt);
                      return (
                        <li key={i}>
                          <div className="hour-time">{formatTime(itemTime)}</div>
                          <div className="hour-weather">
                            <img
                              src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                              alt={item.weather[0].description}
                              className="hour-icon"
                            />
                          </div>
                          <div className="hour-temp">{Math.round(item.main.temp)}{tempUnit}</div>
                          <div className="hour-details">
                            <span title="Feels Like">Feels {Math.round(item.main.feels_like)}{tempUnit}</span>
                            <span title="Humidity">Humidity {item.main.humidity}%</span>
                            <span title="Wind">Wind {Math.round(item.wind.speed)} {windUnit}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div style={{ opacity: 0.85 }}>Hourly details are available up to 5 days ahead.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
