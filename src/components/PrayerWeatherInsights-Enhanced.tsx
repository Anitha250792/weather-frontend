import React, { useMemo, useState } from "react";
import { CurrentWeather } from "../api/weather";
import { PrayerTimings } from "../api/prayerTimes";
import {
  getWeatherContextualQuote,
  getPrayerContextualQuote,
  getTimeBasedQuote,
  IslamicQuote,
  getAlternativeContextualQuote,
} from "../data/islamicQuotes";

interface PrayerWeatherInsightsProps {
  current: CurrentWeather;
  timings: PrayerTimings | null;
  nextPrayer: { name: string; time: string; timeUntil: number } | null;
  theme: "light" | "dark";
  cityName?: string;
}

const PrayerWeatherInsights: React.FC<PrayerWeatherInsightsProps> = ({
  current,
  timings,
  nextPrayer,
  theme,
  cityName = "your location",
}) => {
  // State for quote refresh functionality
  const [currentQuote, setCurrentQuote] = useState<IslamicQuote | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get weather emoji based on condition
  const getWeatherEmoji = (
    weatherCode: string,
    isDay: boolean = true
  ): string => {
    const weatherEmojis: { [key: string]: string } = {
      "01d": "☀️",
      "01n": "🌙",
      "02d": "⛅",
      "02n": "☁️",
      "03d": "☁️",
      "03n": "☁️",
      "04d": "☁️",
      "04n": "☁️",
      "09d": "🌧️",
      "09n": "🌧️",
      "10d": "🌦️",
      "10n": "🌧️",
      "11d": "⛈️",
      "11n": "⛈️",
      "13d": "❄️",
      "13n": "❄️",
      "50d": "🌫️",
      "50n": "🌫️",
    };
    return weatherEmojis[weatherCode] || "🌤️";
  };

  // Enhanced daily quote based on location, weather, prayer times, and temperature
  const dailyQuote: IslamicQuote = useMemo(() => {
    const weatherMain = current.weather[0].main;
    const currentHour = new Date().getHours();
    const temperature = current.main.temp;
    const humidity = current.main.humidity;

    // Enhanced time-based themes considering local prayer times
    const timeBasedThemes = [];

    if (currentHour >= 4 && currentHour < 7) {
      timeBasedThemes.push("dawn", "fajr", "morning", "new_beginning");
    } else if (currentHour >= 7 && currentHour < 12) {
      timeBasedThemes.push("morning", "work", "blessing", "gratitude");
    } else if (currentHour >= 12 && currentHour < 15) {
      timeBasedThemes.push("midday", "dhuhr", "sustenance", "strength");
    } else if (currentHour >= 15 && currentHour < 18) {
      timeBasedThemes.push("afternoon", "asr", "reflection", "contemplation");
    } else if (currentHour >= 18 && currentHour < 21) {
      timeBasedThemes.push("evening", "maghrib", "gratitude", "reflection");
    } else {
      timeBasedThemes.push("night", "isha", "rest", "peace", "contemplation");
    }

    // Get contextual quote with enhanced parameters
    const quote = getWeatherContextualQuote(
      weatherMain,
      timeBasedThemes,
      nextPrayer?.name,
      cityName,
      temperature,
      humidity
    );

    // Set the current quote for refresh functionality
    if (!currentQuote || refreshKey > 0) {
      setCurrentQuote(quote);
    }

    return currentQuote || quote;
  }, [
    current.weather,
    current.main.temp,
    current.main.humidity,
    nextPrayer,
    cityName,
    refreshKey,
  ]);

  // Function to refresh quote
  const refreshQuote = () => {
    if (currentQuote) {
      const newQuote = getAlternativeContextualQuote(
        current.weather[0].main,
        [],
        nextPrayer?.name,
        cityName,
        current.main.temp,
        current.main.humidity,
        currentQuote.text
      );
      setCurrentQuote(newQuote);
      setRefreshKey((prev) => prev + 1);
    }
  };

  // If prayer times failed to load, show weather-only guidance with enhanced quotes
  if (!timings) {
    return (
      <div className={`prayer-weather-insights ${theme}`}>
        <div className="insights-header">
          <div className="prayer-title">
            <h3>
              <span className="title-icon">🕌</span>
              Weather Guidance
              <span className="location-badge">{cityName}</span>
            </h3>
          </div>
          <div
            className="bismillah"
            data-tooltip="In the name of Allah, the Most Gracious, the Most Merciful"
          >
            ✨ Islamic wisdom meets weather wisdom • الحكمة الإسلامية
          </div>
        </div>

        <div
          className="weather-summary-banner"
          data-weather={current.weather[0].main.toLowerCase()}
        >
          <div className="weather-info">
            <div className="weather-icon-large">
              {getWeatherEmoji(current.weather[0].icon)}
            </div>
            <div className="weather-details">
              <span className="weather-label">Current Conditions</span>
              <div className="weather-value">
                <span className="temp-value">
                  {Math.round(current.main.temp)}°C
                </span>
                <span className="condition-text">
                  {current.weather[0].description.charAt(0).toUpperCase() +
                    current.weather[0].description.slice(1)}
                </span>
              </div>
              <div className="weather-meta">
                <span className="humidity">💧 {current.main.humidity}%</span>
                <span className="wind">
                  🌬️ {Math.round(current.wind.speed)} km/h
                </span>
              </div>
            </div>
          </div>

          <div className="prayer-info">
            <div className="prayer-icon">🕐</div>
            <div className="prayer-details">
              <span className="prayer-label">Prayer Guidance</span>
              <div className="prayer-status">
                ⚠️ Unable to load prayer times
              </div>
              <div className="prayer-fallback">
                Using approximate times (network unavailable)
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Daily Islamic Quote with Location/Weather Context */}
        <div className="daily-quote interactive-card">
          <div className="quote-header">
            <span className="quote-icon">📖</span>
            <h4>Daily Reflection</h4>
            <div className="quote-controls">
              <span className={`quote-badge ${dailyQuote.category}`}>
                {dailyQuote.category === "quran"
                  ? "Holy Quran"
                  : "Authentic Hadith"}
              </span>
              <button
                className="quote-refresh-btn"
                onClick={refreshQuote}
                title="Get a different reflection for the same context"
                type="button"
              >
                🔄
              </button>
            </div>
          </div>
          <div className="quote-content">
            {dailyQuote.textArabic && (
              <div className="quote-arabic">
                <p>{dailyQuote.textArabic}</p>
              </div>
            )}
            <div className="quote-text">
              <p>"{dailyQuote.text}"</p>
            </div>
            <div className="quote-source">
              <span className="source-icon">✨</span>
              <cite>— {dailyQuote.source}</cite>
              <div className="source-details">{dailyQuote.sourceDetails}</div>
              <div className="context-info">
                <small>
                  📍 {cityName} • 🌤️ {current.weather[0].description} • 🌡️{" "}
                  {Math.round(current.main.temp)}°C
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Continue with the rest of the component if prayer times are available...
  // [Rest of the existing component logic would go here]

  return (
    <div className={`prayer-weather-insights ${theme}`}>
      <div className="insights-header">
        <div className="prayer-title">
          <h3>
            <span className="title-icon">🕌</span>
            Prayer & Weather Insights
            <span className="location-badge">{cityName}</span>
          </h3>
        </div>
        <div
          className="bismillah"
          data-tooltip="In the name of Allah, the Most Gracious, the Most Merciful"
        >
          ✨ Islamic wisdom meets weather wisdom • الحكمة الإسلامية
        </div>
      </div>

      {/* Weather Summary Banner */}
      <div
        className="weather-summary-banner"
        data-weather={current.weather[0].main.toLowerCase()}
      >
        <div className="weather-info">
          <div className="weather-icon-large">
            {getWeatherEmoji(current.weather[0].icon)}
          </div>
          <div className="weather-details">
            <span className="weather-label">Current Conditions</span>
            <div className="weather-value">
              <span className="temp-value">
                {Math.round(current.main.temp)}°C
              </span>
              <span className="condition-text">
                {current.weather[0].description.charAt(0).toUpperCase() +
                  current.weather[0].description.slice(1)}
              </span>
            </div>
            <div className="weather-meta">
              <span className="humidity">💧 {current.main.humidity}%</span>
              <span className="wind">
                🌬️ {Math.round(current.wind.speed)} km/h
              </span>
            </div>
          </div>
        </div>

        <div className="prayer-info">
          <div className="prayer-icon">🕐</div>
          <div className="prayer-details">
            <span className="prayer-label">Next Prayer</span>
            {nextPrayer ? (
              <>
                <div className="prayer-name">{nextPrayer.name}</div>
                <div className="prayer-time">{nextPrayer.time}</div>
                <div className="time-remaining">
                  in {Math.floor(nextPrayer.timeUntil / 60)}h{" "}
                  {nextPrayer.timeUntil % 60}m
                </div>
              </>
            ) : (
              <div className="prayer-status">Loading prayer times...</div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Daily Islamic Quote with Location/Weather/Prayer Context */}
      <div className="daily-quote interactive-card">
        <div className="quote-header">
          <span className="quote-icon">📖</span>
          <h4>Daily Reflection</h4>
          <div className="quote-controls">
            <span className={`quote-badge ${dailyQuote.category}`}>
              {dailyQuote.category === "quran"
                ? "Holy Quran"
                : "Authentic Hadith"}
            </span>
            <button
              className="quote-refresh-btn"
              onClick={refreshQuote}
              title="Get a different reflection for the same context"
              type="button"
            >
              🔄
            </button>
          </div>
        </div>
        <div className="quote-content">
          {dailyQuote.textArabic && (
            <div className="quote-arabic">
              <p>{dailyQuote.textArabic}</p>
            </div>
          )}
          <div className="quote-text">
            <p>"{dailyQuote.text}"</p>
          </div>
          <div className="quote-source">
            <span className="source-icon">✨</span>
            <cite>— {dailyQuote.source}</cite>
            <div className="source-details">{dailyQuote.sourceDetails}</div>
            <div className="context-info">
              <small>
                📍 {cityName} • 🌤️ {current.weather[0].description} • 🌡️{" "}
                {Math.round(current.main.temp)}°C{" "}
                {nextPrayer ? `• 🕌 Next: ${nextPrayer.name}` : ""}
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerWeatherInsights;
