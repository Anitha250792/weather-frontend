import { useCallback, useState, useEffect } from "react";
import {
  CurrentWeather,
  ForecastResponse,
  AirQualityData,
  fetchCurrentByCity,
  fetchForecastByCity,
  fetchCurrentByCoords,
  fetchForecastByCoords,
  fetchAirQuality,
  OneCallResponse,
  fetchDailyByCoords,
} from "../api/weather";

export function useWeather(units: "metric" | "imperial") {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [daily, setDaily] = useState<OneCallResponse | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [city, setCity] = useState<string>("");
  const [lastCoords, setLastCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  function cacheKey(type: "current" | "forecast" | "airquality", key: string) {
    return `cache:${type}:${units}:${key.toLowerCase()}`;
  }

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        // Always fetch fresh data (API now has cache-busting built-in)
        const [c, f] = await Promise.all([
          fetchCurrentByCity(q, units),
          fetchForecastByCity(q, units),
        ]);

        // Fetch air quality + daily forecast using coordinates
        let aq: AirQualityData | null = null;
        let dly: OneCallResponse | null = null;
        try {
          aq = await fetchAirQuality(c.coord.lat, c.coord.lon);
        } catch (e) {
          console.warn("Air quality data unavailable:", e);
        }
        try {
          dly = await fetchDailyByCoords(c.coord.lat, c.coord.lon, units);
        } catch (e) {
          console.warn("Daily forecast unavailable:", e);
        }

        // Update cache with the fresh data
        localStorage.setItem(cacheKey("current", q), JSON.stringify(c));
        localStorage.setItem(cacheKey("forecast", q), JSON.stringify(f));
        if (aq) {
          localStorage.setItem(cacheKey("airquality", q), JSON.stringify(aq));
        }

        setCurrent(c);
        setForecast(f);
        setDaily(dly);
        setAirQuality(aq);
        setCity(q);
        setLastCoords(null); // Clear coords when searching by city
        localStorage.setItem("lastCity", q);
        setLastUpdated(Date.now());
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Failed to fetch weather");
      } finally {
        setLoading(false);
      }
    },
    [units]
  );

  const searchByCoords = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      setError(null);
      const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      try {
        const [c, f] = await Promise.all([
          fetchCurrentByCoords(lat, lon, units),
          fetchForecastByCoords(lat, lon, units),
        ]);

        // Fetch air quality data + daily forecast
        let aq: AirQualityData | null = null;
        let dly: OneCallResponse | null = null;
        try {
          aq = await fetchAirQuality(lat, lon);
        } catch (e) {
          console.warn("Air quality data unavailable:", e);
        }
        try {
          dly = await fetchDailyByCoords(lat, lon, units);
        } catch (e) {
          console.warn("Daily forecast unavailable:", e);
        }

        setCurrent(c);
        setForecast(f);
        setDaily(dly);
        setAirQuality(aq);
        setCity(c.name);
        setLastCoords({ lat, lon }); // Store coords for unit changes
        localStorage.setItem("lastCity", c.name);
        localStorage.setItem(cacheKey("current", key), JSON.stringify(c));
        localStorage.setItem(cacheKey("forecast", key), JSON.stringify(f));
        if (aq) {
          localStorage.setItem(cacheKey("airquality", key), JSON.stringify(aq));
        }
        setLastUpdated(Date.now());
      } catch (e: any) {
        setError(e?.response?.data?.message || "Failed to fetch weather");
      } finally {
        setLoading(false);
      }
    },
    [units]
  );

  // Set up auto refresh every 10 minutes
  useEffect(() => {
    if (!city) return;

    const refreshInterval = setInterval(() => {
      if (city) {
        search(city);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, [city, search]);

  // Refetch data when units change (but only if we already have data)
  useEffect(() => {
    if (current) {
      if (lastCoords) {
        // Re-search using coordinates
        searchByCoords(lastCoords.lat, lastCoords.lon);
      } else if (city) {
        // Re-search using city name
        search(city);
      }
    }
  }, [units]);

  return {
    current,
    forecast,
    daily,
    airQuality,
    city,
    loading,
    error,
    search,
    searchByCoords,
    lastUpdated,
  };
}
