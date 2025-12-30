import React, { useState } from "react";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { CurrentWeather } from "../api/weather";
import { PRAYER_METHODS } from "../api/prayerTimes";

interface PrayerTimesProps {
  current: CurrentWeather;
  theme: "light" | "dark";
  method?: number;
  school?: number;
  notificationsEnabled?: boolean;
}

const PrayerTimes: React.FC<PrayerTimesProps> = ({
  current,
  theme,
  method = 2,
  school = 0,
  notificationsEnabled: prayerNotificationsEnabled = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const prayerData = usePrayerTimes(
    current.coord.lat,
    current.coord.lon,
    method, // Use the method from props
    school // Use the school from props
  );

  const {
    timings,
    hijriDate,
    nextPrayer,
    currentPrayerWindow,
    loading,
    error,
    notificationsEnabled,
    toggleNotifications,
  } = prayerData;

  // Format time to 12-hour format
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Get time until next prayer in readable format
  const getTimeUntilNext = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Prayer name translations with Arabic
  const prayerNames = {
    Fajr: { en: "Fajr", ar: "الفجر", emoji: "🌅" },
    Dhuhr: { en: "Dhuhr", ar: "الظهر", emoji: "☀️" },
    Asr: { en: "Asr", ar: "العصر", emoji: "🌇" },
    Maghrib: { en: "Maghrib", ar: "المغرب", emoji: "🌆" },
    Isha: { en: "Isha", ar: "العشاء", emoji: "🌙" },
  };

  if (loading) {
    return (
      <div className="prayer-times-card">
        <div className="prayer-times-header">
          <h3>🕌 Prayer Times</h3>
        </div>
        <div className="prayer-loader">
          <div className="prayer-spinner"></div>
          <p>Loading prayer times...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prayer-times-card">
        <div className="prayer-times-header">
          <h3>🕌 Prayer Times</h3>
        </div>
        <div className="prayer-error">
          <p>Unable to load prayer times</p>
          <span className="error-detail">{error}</span>
        </div>
      </div>
    );
  }

  if (!timings) {
    return null;
  }

  const prayers = [
    { name: "Fajr", time: timings.Fajr },
    { name: "Dhuhr", time: timings.Dhuhr },
    { name: "Asr", time: timings.Asr },
    { name: "Maghrib", time: timings.Maghrib },
    { name: "Isha", time: timings.Isha },
  ];

  return (
    <div className={`prayer-times-card ${theme}`}>
      <div className="prayer-times-header">
        <div className="prayer-title">
          <h3>🕌 Prayer Times</h3>
          <span className="bismillah">بسم الله الرحمن الرحيم</span>
        </div>
        <div className="prayer-controls">
          <button
            className={`notification-toggle ${
              notificationsEnabled ? "enabled" : ""
            }`}
            onClick={toggleNotifications}
            title={
              notificationsEnabled
                ? "Disable notifications"
                : "Enable notifications"
            }
          >
            {notificationsEnabled ? "🔔" : "🔕"}
          </button>
          <button
            className="collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={
              isCollapsed ? "Expand prayer times" : "Collapse prayer times"
            }
          >
            {isCollapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="prayer-times-content">
          {hijriDate && (
            <div className="hijri-date">
              <span className="hijri-text">{hijriDate}</span>
            </div>
          )}

          {nextPrayer && (
            <div className="next-prayer-banner">
              <div className="next-prayer-info">
                <span className="next-label">Next Prayer</span>
                <div className="next-prayer-details">
                  <span className="next-name">
                    {
                      prayerNames[nextPrayer.name as keyof typeof prayerNames]
                        ?.emoji
                    }{" "}
                    {nextPrayer.name}
                  </span>
                  <span className="next-time">
                    {formatTime(nextPrayer.time)}
                  </span>
                </div>
              </div>
              <div className="countdown">
                <span className="countdown-label">in</span>
                <span className="countdown-time">
                  {getTimeUntilNext(nextPrayer.timeUntil)}
                </span>
              </div>
            </div>
          )}

          <div className="prayer-times-grid">
            {prayers.map((prayer) => {
              const prayerInfo =
                prayerNames[prayer.name as keyof typeof prayerNames];
              const isNext = nextPrayer?.name === prayer.name;
              const isCurrent = currentPrayerWindow?.name === prayer.name;

              return (
                <div
                  key={prayer.name}
                  className={`prayer-time-item ${isNext ? "next" : ""} ${
                    isCurrent ? "current" : ""
                  }`}
                >
                  <div className="prayer-name-section">
                    <span className="prayer-emoji">{prayerInfo?.emoji}</span>
                    <div className="prayer-names">
                      <span className="prayer-name-en">{prayerInfo?.en}</span>
                      <span className="prayer-name-ar">{prayerInfo?.ar}</span>
                    </div>
                  </div>
                  <div className="prayer-time">
                    {formatTime(prayer.time)}
                    {isNext && <span className="next-indicator">⏰</span>}
                    {isCurrent && <span className="current-indicator">🔴</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="prayer-info-footer">
            <div className="calculation-info">
              <span className="method-name">
                {PRAYER_METHODS.find((m) => m.id === method)?.name ||
                  "Unknown Method"}
              </span>
              <span className="location-info">📍 {current.name}</span>
            </div>
            <div className="islamic-greeting">
              <span className="greeting">السلام عليكم</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrayerTimes;
