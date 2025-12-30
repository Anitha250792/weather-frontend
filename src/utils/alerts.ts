/**
 * Weather alerts and notifications system
 * Monitors weather conditions and provides user alerts
 */

export interface WeatherAlert {
  id: string;
  type: "temperature" | "rain" | "wind" | "humidity" | "air_quality";
  severity: "low" | "moderate" | "high" | "extreme";
  title: string;
  description: string;
  location: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  acknowledged: boolean;
}

export interface AlertRule {
  id: string;
  type: "temperature" | "rain" | "wind" | "humidity";
  condition: "above" | "below" | "equals";
  threshold: number;
  enabled: boolean;
  locations: string[];
  notifyTypes: ("browser" | "sound")[];
}

class AlertsManager {
  private alerts: WeatherAlert[] = [];
  private rules: AlertRule[] = [];
  private soundEnabled = false;
  private notificationPermission: NotificationPermission = "default";

  constructor() {
    this.loadPersistedData();
    this.requestNotificationPermission();
  }

  async requestNotificationPermission(): Promise<void> {
    if ("Notification" in window) {
      this.notificationPermission = await Notification.requestPermission();
    }
  }

  private loadPersistedData(): void {
    try {
      const storedAlerts = localStorage.getItem("weatherAlerts");
      const storedRules = localStorage.getItem("alertRules");
      const soundSetting = localStorage.getItem("alertSoundEnabled");

      if (storedAlerts) {
        this.alerts = JSON.parse(storedAlerts);
      }
      if (storedRules) {
        this.rules = JSON.parse(storedRules);
      }
      this.soundEnabled = soundSetting === "true";
    } catch (error) {
      console.error("Failed to load persisted alert data:", error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem("weatherAlerts", JSON.stringify(this.alerts));
      localStorage.setItem("alertRules", JSON.stringify(this.rules));
      localStorage.setItem("alertSoundEnabled", String(this.soundEnabled));
    } catch (error) {
      console.error("Failed to save alert data:", error);
    }
  }

  addRule(rule: Omit<AlertRule, "id">): string {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.rules.push(newRule);
    this.saveToStorage();
    return newRule.id;
  }

  removeRule(id: string): boolean {
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index !== -1) {
      this.rules.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.find((r) => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  checkWeatherConditions(
    currentWeather: any,
    location: string
  ): WeatherAlert[] {
    const newAlerts: WeatherAlert[] = [];

    this.rules
      .filter(
        (rule) =>
          rule.enabled &&
          (rule.locations.includes(location) || rule.locations.includes("*"))
      )
      .forEach((rule) => {
        const alert = this.evaluateRule(rule, currentWeather, location);
        if (alert) {
          newAlerts.push(alert);
        }
      });

    // Add new alerts and update existing ones
    newAlerts.forEach((newAlert) => {
      const existingIndex = this.alerts.findIndex(
        (alert) =>
          alert.type === newAlert.type && alert.location === newAlert.location
      );

      if (existingIndex !== -1) {
        this.alerts[existingIndex] = newAlert;
      } else {
        this.alerts.push(newAlert);
        this.triggerNotification(newAlert);
      }
    });

    // Mark alerts as inactive if conditions no longer meet
    this.alerts.forEach((alert) => {
      if (
        !newAlerts.some(
          (na) => na.type === alert.type && na.location === alert.location
        )
      ) {
        alert.isActive = false;
        alert.endTime = Date.now();
      }
    });

    this.saveToStorage();
    return this.alerts.filter((alert) => alert.isActive);
  }

  private evaluateRule(
    rule: AlertRule,
    weather: any,
    location: string
  ): WeatherAlert | null {
    let currentValue: number;
    let unit: string;

    switch (rule.type) {
      case "temperature":
        currentValue = weather.main.temp;
        unit = "°";
        break;
      case "humidity":
        currentValue = weather.main.humidity;
        unit = "%";
        break;
      case "wind":
        currentValue = weather.wind.speed;
        unit = " m/s";
        break;
      case "rain":
        currentValue = weather.rain?.["1h"] || 0;
        unit = "mm";
        break;
      default:
        return null;
    }

    const conditionMet = this.checkCondition(
      rule.condition,
      currentValue,
      rule.threshold
    );

    if (conditionMet) {
      const severity = this.calculateSeverity(
        rule.type,
        currentValue,
        rule.threshold
      );

      return {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: rule.type,
        severity,
        title: this.generateAlertTitle(rule.type, severity),
        description: this.generateAlertDescription(
          rule.type,
          currentValue,
          unit,
          rule.condition,
          rule.threshold
        ),
        location,
        startTime: Date.now(),
        isActive: true,
        acknowledged: false,
      };
    }

    return null;
  }

  private checkCondition(
    condition: "above" | "below" | "equals",
    current: number,
    threshold: number
  ): boolean {
    switch (condition) {
      case "above":
        return current > threshold;
      case "below":
        return current < threshold;
      case "equals":
        return Math.abs(current - threshold) < 0.1;
      default:
        return false;
    }
  }

  private calculateSeverity(
    type: string,
    current: number,
    threshold: number
  ): "low" | "moderate" | "high" | "extreme" {
    const difference = Math.abs(current - threshold);

    // Define severity thresholds based on alert type
    const severityThresholds = {
      temperature: { moderate: 5, high: 10, extreme: 15 },
      humidity: { moderate: 20, high: 40, extreme: 60 },
      wind: { moderate: 5, high: 15, extreme: 25 },
      rain: { moderate: 2, high: 10, extreme: 25 },
    };

    const thresholds =
      severityThresholds[type as keyof typeof severityThresholds] ||
      severityThresholds.temperature;

    if (difference >= thresholds.extreme) return "extreme";
    if (difference >= thresholds.high) return "high";
    if (difference >= thresholds.moderate) return "moderate";
    return "low";
  }

  private generateAlertTitle(type: string, severity: string): string {
    const titles = {
      temperature: {
        low: "Temperature Alert",
        moderate: "Temperature Warning",
        high: "Extreme Temperature",
        extreme: "Dangerous Temperature",
      },
      humidity: {
        low: "Humidity Alert",
        moderate: "Humidity Warning",
        high: "High Humidity",
        extreme: "Extreme Humidity",
      },
      wind: {
        low: "Wind Alert",
        moderate: "Strong Winds",
        high: "High Wind Warning",
        extreme: "Dangerous Winds",
      },
      rain: {
        low: "Rain Alert",
        moderate: "Heavy Rain",
        high: "Severe Rain Warning",
        extreme: "Extreme Rainfall",
      },
    };

    return (
      titles[type as keyof typeof titles]?.[
        severity as keyof typeof titles.temperature
      ] || "Weather Alert"
    );
  }

  private generateAlertDescription(
    type: string,
    current: number,
    unit: string,
    condition: string,
    threshold: number
  ): string {
    return `Current ${type} is ${current.toFixed(
      1
    )}${unit}, which is ${condition} the threshold of ${threshold}${unit}`;
  }

  private triggerNotification(alert: WeatherAlert): void {
    // Browser notification
    if (this.notificationPermission === "granted") {
      new Notification(alert.title, {
        body: alert.description,
        icon: "/weather-icon.png",
        badge: "/weather-badge.png",
        tag: alert.id,
        requireInteraction: alert.severity === "extreme",
      });
    }

    // Sound notification
    if (this.soundEnabled) {
      this.playNotificationSound(alert.severity);
    }
  }

  private playNotificationSound(severity: string): void {
    const audio = new Audio();

    // Different sounds for different severities
    switch (severity) {
      case "extreme":
        audio.src = "/sounds/alert-extreme.mp3";
        break;
      case "high":
        audio.src = "/sounds/alert-high.mp3";
        break;
      default:
        audio.src = "/sounds/alert-normal.mp3";
        break;
    }

    audio.volume = 0.5;
    audio.play().catch((error) => {
      console.warn("Could not play notification sound:", error);
    });
  }

  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getActiveAlerts(): WeatherAlert[] {
    return this.alerts.filter((alert) => alert.isActive && !alert.acknowledged);
  }

  getAllAlerts(): WeatherAlert[] {
    return [...this.alerts];
  }

  getRules(): AlertRule[] {
    return [...this.rules];
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.saveToStorage();
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  clearOldAlerts(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter((alert) => alert.startTime > cutoff);
    this.saveToStorage();
  }
}

export const alertsManager = new AlertsManager();
