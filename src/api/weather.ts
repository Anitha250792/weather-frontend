import axios from "axios";

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";
const AIR_QUALITY_URL = "https://api.openweathermap.org/data/2.5/air_pollution";

export interface CurrentWeather {
  name: string;
  dt: number;
  timezone: number;
  coord: { lat: number; lon: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    temp_min: number;
    temp_max: number;
  };
  wind: { speed: number; deg: number };
  visibility: number;
  sys: { country: string; sunrise: number; sunset: number };
}

export interface ForecastListItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: { id: number; main: string; description: string; icon: string }[];
  wind: { speed: number; deg: number };
  visibility: number;
  dt_txt: string;
  rain?: { "3h": number };
  snow?: { "3h": number };
}

export interface ForecastResponse {
  city: {
    name: string;
    country: string;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
  list: ForecastListItem[];
}

// One Call Daily (7-day) types
export interface OneCallDaily {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: { day: number; min: number; max: number; night: number; eve: number; morn: number };
  feels_like: { day: number; night: number; eve: number; morn: number };
  pressure: number;
  humidity: number;
  wind_speed: number;
  weather: { id: number; main: string; description: string; icon: string }[];
  clouds: number;
  pop: number; // probability of precipitation
  uvi: number;
}

export interface OneCallResponse {
  timezone_offset: number;
  daily: OneCallDaily[];
}

export interface GeocodeResult {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface AirQualityData {
  coord: { lon: number; lat: number };
  list: {
    dt: number;
    main: {
      aqi: number; // Air Quality Index: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    };
    components: {
      co: number; // Carbon monoxide
      no: number; // Nitric oxide
      no2: number; // Nitrogen dioxide
      o3: number; // Ozone
      so2: number; // Sulphur dioxide
      pm2_5: number; // Fine particles matter
      pm10: number; // Coarse particulate matter
      nh3: number; // Ammonia
    };
  }[];
}

export async function fetchCurrentByCity(
  city: string,
  units: "metric" | "imperial" = "metric"
): Promise<CurrentWeather> {
  // Add cache-busting timestamp
  const timestamp = Date.now();
  const { data } = await axios.get<CurrentWeather>(`${BASE_URL}/weather`, {
    params: {
      q: city,
      appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      units,
      _t: timestamp, // Cache-busting parameter
    },
  });
  return data;
}

export async function fetchForecastByCity(
  city: string,
  units: "metric" | "imperial" = "metric"
): Promise<ForecastResponse> {
  // Add cache-busting timestamp
  const timestamp = Date.now();
  const { data } = await axios.get<ForecastResponse>(`${BASE_URL}/forecast`, {
    params: {
      q: city,
      appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      units,
      _t: timestamp, // Cache-busting parameter
    },
  });
  return data;
}

export async function fetchCurrentByCoords(
  lat: number,
  lon: number,
  units: "metric" | "imperial" = "metric"
): Promise<CurrentWeather> {
  // Add cache-busting timestamp
  const timestamp = Date.now();
  const { data } = await axios.get<CurrentWeather>(`${BASE_URL}/weather`, {
    params: {
      lat,
      lon,
      appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      units,
      _t: timestamp, // Cache-busting parameter
    },
  });
  return data;
}

export async function fetchForecastByCoords(
  lat: number,
  lon: number,
  units: "metric" | "imperial" = "metric"
): Promise<ForecastResponse> {
  // Add cache-busting timestamp
  const timestamp = Date.now();
  const { data } = await axios.get<ForecastResponse>(`${BASE_URL}/forecast`, {
    params: {
      lat,
      lon,
      appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      units,
      _t: timestamp, // Cache-busting parameter
    },
  });
  return data;
}

// 7-day daily forecast via One Call API
export async function fetchDailyByCoords(
  lat: number,
  lon: number,
  units: "metric" | "imperial" = "metric"
): Promise<OneCallResponse> {
  const timestamp = Date.now();
  const params = {
    lat,
    lon,
    units,
    exclude: "current,minutely,hourly,alerts",
    appid: import.meta.env.VITE_OPENWEATHER_API_KEY as string,
    _t: timestamp,
  } as const;

  try {
    // Try One Call 3.0 first
    const { data } = await axios.get<OneCallResponse>(
      "https://api.openweathermap.org/data/3.0/onecall",
      { params }
    );
    return data;
  } catch (err) {
    // Fallback to One Call 2.5 if 3.0 is not available on the key
    const { data } = await axios.get<OneCallResponse>(
      "https://api.openweathermap.org/data/2.5/onecall",
      { params }
    );
    return data;
  }
}

export async function geocodeCity(
  q: string,
  limit: number = 5
): Promise<GeocodeResult[]> {
  if (!q.trim()) return [];
  const { data } = await axios.get<GeocodeResult[]>(`${GEO_URL}/direct`, {
    params: { q, appid: import.meta.env.VITE_OPENWEATHER_API_KEY, limit },
  });
  return data;
}

export async function fetchAirQuality(
  lat: number,
  lon: number
): Promise<AirQualityData> {
  const timestamp = Date.now();
  const { data } = await axios.get<AirQualityData>(`${AIR_QUALITY_URL}`, {
    params: {
      lat,
      lon,
      appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      _t: timestamp,
    },
  });
  return data;
}
