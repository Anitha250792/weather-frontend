import { describe, it, expect, beforeEach, vi } from "vitest";
import { alertsManager, AlertRule } from "../utils/alerts";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock Notification API
Object.defineProperty(window, "Notification", {
  value: vi.fn().mockImplementation(() => ({})),
  writable: true,
});

describe("AlertsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("addRule", () => {
    it("should add a new alert rule", () => {
      const rule: Omit<AlertRule, "id"> = {
        type: "temperature",
        condition: "above",
        threshold: 30,
        enabled: true,
        locations: ["London"],
        notifyTypes: ["browser"],
      };

      const ruleId = alertsManager.addRule(rule);

      expect(ruleId).toBeDefined();
      expect(ruleId).toMatch(/^rule_/);

      const rules = alertsManager.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject(rule);
    });

    it("should generate unique IDs for multiple rules", () => {
      const rule1: Omit<AlertRule, "id"> = {
        type: "temperature",
        condition: "above",
        threshold: 30,
        enabled: true,
        locations: ["London"],
        notifyTypes: ["browser"],
      };

      const rule2: Omit<AlertRule, "id"> = {
        type: "humidity",
        condition: "below",
        threshold: 40,
        enabled: true,
        locations: ["Paris"],
        notifyTypes: ["browser"],
      };

      const id1 = alertsManager.addRule(rule1);
      const id2 = alertsManager.addRule(rule2);

      expect(id1).not.toBe(id2);
      expect(alertsManager.getRules()).toHaveLength(2);
    });
  });

  describe("removeRule", () => {
    it("should remove an existing rule", () => {
      const rule: Omit<AlertRule, "id"> = {
        type: "temperature",
        condition: "above",
        threshold: 30,
        enabled: true,
        locations: ["London"],
        notifyTypes: ["browser"],
      };

      const ruleId = alertsManager.addRule(rule);
      expect(alertsManager.getRules()).toHaveLength(1);

      const removed = alertsManager.removeRule(ruleId);
      expect(removed).toBe(true);
      expect(alertsManager.getRules()).toHaveLength(0);
    });

    it("should return false for non-existent rule", () => {
      const removed = alertsManager.removeRule("non-existent-id");
      expect(removed).toBe(false);
    });
  });

  describe("updateRule", () => {
    it("should update an existing rule", () => {
      const rule: Omit<AlertRule, "id"> = {
        type: "temperature",
        condition: "above",
        threshold: 30,
        enabled: true,
        locations: ["London"],
        notifyTypes: ["browser"],
      };

      const ruleId = alertsManager.addRule(rule);

      const updated = alertsManager.updateRule(ruleId, {
        threshold: 35,
        enabled: false,
      });

      expect(updated).toBe(true);

      const rules = alertsManager.getRules();
      const updatedRule = rules.find((r) => r.id === ruleId);

      expect(updatedRule?.threshold).toBe(35);
      expect(updatedRule?.enabled).toBe(false);
      expect(updatedRule?.type).toBe("temperature"); // Unchanged
    });

    it("should return false for non-existent rule", () => {
      const updated = alertsManager.updateRule("non-existent-id", {
        threshold: 35,
      });
      expect(updated).toBe(false);
    });
  });

  describe("checkWeatherConditions", () => {
    beforeEach(() => {
      // Clear any existing rules
      alertsManager.getRules().forEach((rule) => {
        alertsManager.removeRule(rule.id);
      });
    });

    it("should trigger alert when temperature condition is met", () => {
      alertsManager.addRule({
        type: "temperature",
        condition: "above",
        threshold: 25,
        enabled: true,
        locations: ["*"],
        notifyTypes: ["browser"],
      });

      const weather = {
        main: { temp: 30, humidity: 60 },
        wind: { speed: 5 },
        rain: { "1h": 0 },
      };

      const alerts = alertsManager.checkWeatherConditions(weather, "London");

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe("temperature");
      expect(alerts[0].severity).toBeDefined();
      expect(alerts[0].isActive).toBe(true);
    });

    it("should not trigger alert when condition is not met", () => {
      alertsManager.addRule({
        type: "temperature",
        condition: "above",
        threshold: 35,
        enabled: true,
        locations: ["*"],
        notifyTypes: ["browser"],
      });

      const weather = {
        main: { temp: 30, humidity: 60 },
        wind: { speed: 5 },
        rain: { "1h": 0 },
      };

      const alerts = alertsManager.checkWeatherConditions(weather, "London");

      expect(alerts).toHaveLength(0);
    });

    it("should not trigger alert when rule is disabled", () => {
      alertsManager.addRule({
        type: "temperature",
        condition: "above",
        threshold: 25,
        enabled: false,
        locations: ["*"],
        notifyTypes: ["browser"],
      });

      const weather = {
        main: { temp: 30, humidity: 60 },
        wind: { speed: 5 },
        rain: { "1h": 0 },
      };

      const alerts = alertsManager.checkWeatherConditions(weather, "London");

      expect(alerts).toHaveLength(0);
    });

    it("should trigger multiple alerts for different conditions", () => {
      alertsManager.addRule({
        type: "temperature",
        condition: "above",
        threshold: 25,
        enabled: true,
        locations: ["*"],
        notifyTypes: ["browser"],
      });

      alertsManager.addRule({
        type: "humidity",
        condition: "above",
        threshold: 70,
        enabled: true,
        locations: ["*"],
        notifyTypes: ["browser"],
      });

      const weather = {
        main: { temp: 30, humidity: 80 },
        wind: { speed: 5 },
        rain: { "1h": 0 },
      };

      const alerts = alertsManager.checkWeatherConditions(weather, "London");

      expect(alerts).toHaveLength(2);
      expect(alerts.map((a) => a.type)).toContain("temperature");
      expect(alerts.map((a) => a.type)).toContain("humidity");
    });

    it("should respect location-specific rules", () => {
      alertsManager.addRule({
        type: "temperature",
        condition: "above",
        threshold: 25,
        enabled: true,
        locations: ["London"],
        notifyTypes: ["browser"],
      });

      const weather = {
        main: { temp: 30, humidity: 60 },
        wind: { speed: 5 },
        rain: { "1h": 0 },
      };

      // Should trigger for London
      const londonAlerts = alertsManager.checkWeatherConditions(
        weather,
        "London"
      );
      expect(londonAlerts).toHaveLength(1);

      // Should not trigger for Paris
      const parisAlerts = alertsManager.checkWeatherConditions(
        weather,
        "Paris"
      );
      expect(parisAlerts).toHaveLength(0);
    });
  });

  describe("acknowledgeAlert", () => {
    it("should acknowledge an alert", () => {
      alertsManager.addRule({
        type: "temperature",
        condition: "above",
        threshold: 25,
        enabled: true,
        locations: ["*"],
        notifyTypes: ["browser"],
      });

      const weather = {
        main: { temp: 30, humidity: 60 },
        wind: { speed: 5 },
        rain: { "1h": 0 },
      };

      const alerts = alertsManager.checkWeatherConditions(weather, "London");
      const alertId = alerts[0].id;

      const acknowledged = alertsManager.acknowledgeAlert(alertId);
      expect(acknowledged).toBe(true);

      const activeAlerts = alertsManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it("should return false for non-existent alert", () => {
      const acknowledged = alertsManager.acknowledgeAlert("non-existent-id");
      expect(acknowledged).toBe(false);
    });
  });

  describe("setSoundEnabled", () => {
    it("should enable/disable sound notifications", () => {
      expect(alertsManager.isSoundEnabled()).toBe(false);

      alertsManager.setSoundEnabled(true);
      expect(alertsManager.isSoundEnabled()).toBe(true);

      alertsManager.setSoundEnabled(false);
      expect(alertsManager.isSoundEnabled()).toBe(false);
    });
  });
});
