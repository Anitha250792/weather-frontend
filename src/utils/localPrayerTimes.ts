// Simple local prayer times calculation as fallback
import { PrayerTimings } from "../api/prayerTimes";

interface SunTime {
  hour: number;
  minute: number;
}

/**
 * Calculate approximate prayer times locally (fallback when API fails)
 * This is a simplified calculation and may not be as accurate as the API
 */
export function calculateLocalPrayerTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): PrayerTimings {
  const dayOfYear = getDayOfYear(date);
  const { sunrise, sunset } = calculateSunTimes(latitude, longitude, dayOfYear);

  // Approximate prayer times based on sun position
  const fajr = addMinutesToTime(sunrise, -90); // 1.5 hours before sunrise
  const dhuhr = calculateSolarNoon(longitude, dayOfYear);
  const asr = calculateAsr(dhuhr, latitude, dayOfYear);
  const maghrib = addMinutesToTime(sunset, 5); // 5 minutes after sunset
  const isha = addMinutesToTime(sunset, 90); // 1.5 hours after sunset

  return {
    Fajr: formatTime(fajr),
    Sunrise: formatTime(sunrise),
    Dhuhr: formatTime(dhuhr),
    Asr: formatTime(asr),
    Sunset: formatTime(sunset),
    Maghrib: formatTime(maghrib),
    Isha: formatTime(isha),
    Midnight: formatTime(addMinutesToTime(maghrib, 360)), // 6 hours after maghrib
  };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calculateSunTimes(
  latitude: number,
  longitude: number,
  dayOfYear: number
): { sunrise: SunTime; sunset: SunTime } {
  // Simplified sun time calculation
  const P = Math.asin(0.39795 * Math.cos(0.017214 * (dayOfYear - 81)));
  const argument = -Math.tan((latitude * Math.PI) / 180) * Math.tan(P);

  let hourAngle = 0;
  if (Math.abs(argument) <= 1) {
    hourAngle = Math.acos(argument);
  } else {
    // Polar day/night - use default values
    hourAngle = Math.PI / 2;
  }

  const decimalTime = 12 - (4 * (longitude + Math_degrees(hourAngle))) / 60;
  const sunrise = decimalTimeToHourMinute(decimalTime);
  const sunset = decimalTimeToHourMinute(24 - decimalTime);

  return { sunrise, sunset };
}

function calculateSolarNoon(longitude: number, dayOfYear: number): SunTime {
  // Simple solar noon calculation
  const timeCorrection = 4 * longitude;
  const equationOfTime = 4 * (longitude - 15 * Math.round(longitude / 15));
  const solarNoon = 12 - timeCorrection / 60 - equationOfTime / 60;

  return decimalTimeToHourMinute(solarNoon);
}

function calculateAsr(
  dhuhr: SunTime,
  latitude: number,
  dayOfYear: number
): SunTime {
  // Simplified Asr calculation (shadow length = object length + shadow at dhuhr)
  // This adds approximately 3-4 hours to Dhuhr
  return addMinutesToTime(dhuhr, 210); // 3.5 hours after Dhuhr
}

function decimalTimeToHourMinute(decimalTime: number): SunTime {
  const hours = Math.floor(decimalTime);
  const minutes = Math.round((decimalTime - hours) * 60);

  return {
    hour: hours >= 0 ? hours % 24 : (24 + hours) % 24,
    minute: Math.max(0, Math.min(59, minutes)),
  };
}

function addMinutesToTime(time: SunTime, minutes: number): SunTime {
  const totalMinutes = time.hour * 60 + time.minute + minutes;
  return {
    hour: Math.floor(totalMinutes / 60) % 24,
    minute: totalMinutes % 60,
  };
}

function formatTime(time: SunTime): string {
  return `${time.hour.toString().padStart(2, "0")}:${time.minute
    .toString()
    .padStart(2, "0")}`;
}

function Math_degrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Get approximate prayer times with city name for common locations
 */
export function getApproximatePrayerTimes(
  cityName: string,
  latitude: number,
  longitude: number
): PrayerTimings {
  const times = calculateLocalPrayerTimes(latitude, longitude);

  // Store in localStorage for future offline use
  const cacheKey = `local_prayer_times_${latitude.toFixed(
    3
  )}_${longitude.toFixed(3)}_${new Date().toDateString()}`;
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      times,
      cityName,
      calculatedAt: new Date().toISOString(),
      note: "Calculated locally - may be less accurate than API",
    })
  );

  return times;
}
