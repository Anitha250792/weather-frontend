import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPrayerTimes,
  getNextPrayer,
  getCurrentPrayerWindow,
  parseTime,
  PRAYER_METHODS,
} from "../api/prayerTimes";

// Mock axios for testing
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

describe("Prayer Times API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PRAYER_METHODS", () => {
    it("should contain ISNA method with correct ID", () => {
      const isnaMethod = PRAYER_METHODS.find((method) => method.id === 2);
      expect(isnaMethod).toBeDefined();
      expect(isnaMethod?.name).toContain("Islamic Society of North America");
    });

    it("should have Montreal-appropriate default method", () => {
      const defaultMethod = PRAYER_METHODS.find((method) => method.id === 2);
      expect(defaultMethod?.description).toContain("North America");
    });
  });

  describe("parseTime", () => {
    it("should parse prayer time string correctly", () => {
      const result = parseTime("05:30");
      expect(result.getHours()).toBe(5);
      expect(result.getMinutes()).toBe(30);
    });

    it("should handle PM times correctly", () => {
      const result = parseTime("18:20");
      expect(result.getHours()).toBe(18);
      expect(result.getMinutes()).toBe(20);
    });
  });

  describe("getNextPrayer", () => {
    const mockTimings = {
      Fajr: "05:30",
      Dhuhr: "12:15",
      Asr: "15:45",
      Maghrib: "18:20",
      Isha: "19:45",
      Sunrise: "07:00",
      Sunset: "18:00",
      Midnight: "23:30",
    };

    it("should return next prayer correctly", () => {
      // Mock current time to be 10:00 AM
      const mockDate = new Date();
      mockDate.setHours(10, 0, 0, 0);
      vi.setSystemTime(mockDate);

      const result = getNextPrayer(mockTimings);
      expect(result?.name).toBe("Dhuhr");
      expect(result?.time).toBe("12:15");
    });

    it("should return Fajr for next day when current time is after Isha", () => {
      // Mock current time to be 11:00 PM
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0);
      vi.setSystemTime(mockDate);

      const result = getNextPrayer(mockTimings);
      expect(result?.name).toBe("Fajr");
      expect(result?.time).toBe("05:30");
    });
  });

  describe("getCurrentPrayerWindow", () => {
    const mockTimings = {
      Fajr: "05:30",
      Dhuhr: "12:15",
      Asr: "15:45",
      Maghrib: "18:20",
      Isha: "19:45",
      Sunrise: "07:00",
      Sunset: "18:00",
      Midnight: "23:30",
    };

    it("should return current prayer when within buffer time", () => {
      // Mock current time to be 5:25 AM (5 minutes before Fajr)
      const mockDate = new Date();
      mockDate.setHours(5, 25, 0, 0);
      vi.setSystemTime(mockDate);

      const result = getCurrentPrayerWindow(mockTimings, 15);
      expect(result?.name).toBe("Fajr");
      expect(result?.isActive).toBe(true);
    });

    it("should return null when not in any prayer window", () => {
      // Mock current time to be 10:00 AM (not near any prayer)
      const mockDate = new Date();
      mockDate.setHours(10, 0, 0, 0);
      vi.setSystemTime(mockDate);

      const result = getCurrentPrayerWindow(mockTimings, 15);
      expect(result).toBeNull();
    });
  });

  describe("fetchPrayerTimes", () => {
    it("should make API call with correct Montreal coordinates", async () => {
      const axios = await import("axios");
      const mockResponse = {
        data: {
          code: 200,
          status: "OK",
          data: {
            timings: {
              Fajr: "05:30",
              Dhuhr: "12:15",
              Asr: "15:45",
              Maghrib: "18:20",
              Isha: "19:45",
              Sunrise: "07:00",
              Sunset: "18:00",
              Midnight: "23:30",
            },
            date: {
              hijri: {
                day: "15",
                month: { en: "Safar", ar: "صفر", number: 2 },
                year: "1446",
                designation: { abbreviated: "AH", expanded: "Anno Hegirae" },
              },
            },
            meta: {
              latitude: 45.5017,
              longitude: -73.5673,
              method: { id: 2, name: "ISNA" },
            },
          },
        },
      };

      (axios.default.get as any).mockResolvedValue(mockResponse);

      // Montreal coordinates
      const result = await fetchPrayerTimes(45.5017, -73.5673, undefined, 2, 0);

      expect(axios.default.get).toHaveBeenCalledWith(
        expect.stringContaining("timings"),
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: "45.501700",
            longitude: "-73.567300",
            method: 2,
            school: 0,
          }),
        })
      );

      expect(result.data.timings.Fajr).toBe("05:30");
      expect(result.data.meta.method.id).toBe(2);
    });

    it("should handle API errors correctly", async () => {
      const axios = await import("axios");
      (axios.default.get as any).mockRejectedValue(new Error("API Error"));
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(fetchPrayerTimes(45.5017, -73.5673)).rejects.toThrow(
        "Failed to fetch prayer times: API Error"
      );
    });
  });
});
