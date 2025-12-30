import React, { useState, useEffect } from "react";
import { alertsManager, AlertRule } from "../utils/alerts";
import { weatherDB } from "../utils/database";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  units: "metric" | "imperial";
  onUnitsChange: (units: "metric" | "imperial") => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  timeFormat: "12h" | "24h";
  onTimeFormatChange: (format: "12h" | "24h") => void;
}

export const SettingsPanel: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  units,
  onUnitsChange,
  theme,
  onThemeChange,
  timeFormat,
  onTimeFormatChange,
}) => {
  const [activeTab, setActiveTab] = useState<
    "general" | "alerts" | "data" | "about"
  >("general");

  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    type: "temperature",
    condition: "above",
    threshold: 30,
    enabled: true,
    locations: ["*"],
    notifyTypes: ["browser"],
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [dataRetention, setDataRetention] = useState(7);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const [
        storedAutoRefresh,
        storedRefreshInterval,
        storedDataRetention,
        storedAnimations,
        rules,
      ] = await Promise.all([
        weatherDB.getPreference("autoRefresh"),
        weatherDB.getPreference("refreshInterval"),
        weatherDB.getPreference("dataRetention"),
        weatherDB.getPreference("animationsEnabled"),
        Promise.resolve(alertsManager.getRules()),
      ]);

      setAutoRefresh(storedAutoRefresh ?? true);
      setRefreshInterval(storedRefreshInterval ?? 10);
      setDataRetention(storedDataRetention ?? 7);
      setAnimationsEnabled(storedAnimations ?? true);
      setAlertRules(rules);
      setSoundEnabled(alertsManager.isSoundEnabled());
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const savePreference = (key: string, value: any) => {
    weatherDB.savePreference(key, value).catch(console.error);
  };

  const addAlertRule = () => {
    if (!newRule.type || !newRule.condition || newRule.threshold === undefined)
      return;

    alertsManager.addRule(newRule as Omit<AlertRule, "id">);
    setAlertRules(alertsManager.getRules());
    setNewRule({
      type: "temperature",
      condition: "above",
      threshold: 30,
      enabled: true,
      locations: ["*"],
      notifyTypes: ["browser"],
    });
  };

  const toggleAlertRule = (id: string) => {
    const rule = alertRules.find((r) => r.id === id);
    if (!rule) return;
    alertsManager.updateRule(id, { enabled: !rule.enabled });
    setAlertRules(alertsManager.getRules());
  };

  const deleteAlertRule = (id: string) => {
    alertsManager.removeRule(id);
    setAlertRules(alertsManager.getRules());
  };

  const clearAllData = async () => {
    if (!confirm("Clear all stored data? This cannot be undone.")) return;
    localStorage.clear();
    await weatherDB.clearOldCache(0);
    alert("All data cleared");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          {(["general", "alerts", "data", "about"] as const).map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === "general" && (
            <>
              <h3>Display</h3>
              <button onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}>
                Theme: {theme}
              </button>

              <button onClick={() => onUnitsChange(units === "metric" ? "imperial" : "metric")}>
                Units: {units}
              </button>

              <button onClick={() => onTimeFormatChange(timeFormat === "24h" ? "12h" : "24h")}>
                Time: {timeFormat}
              </button>

              <label>
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={(e) => {
                    setAnimationsEnabled(e.target.checked);
                    savePreference("animationsEnabled", e.target.checked);
                  }}
                />
                Enable animations
              </label>
            </>
          )}

          {activeTab === "alerts" && (
            <>
              <h3>Alerts</h3>

              <label>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => {
                    setSoundEnabled(e.target.checked);
                    alertsManager.setSoundEnabled(e.target.checked);
                  }}
                />
                Notification sounds
              </label>

              <button onClick={addAlertRule}>Add Alert Rule</button>

              {alertRules.map((rule) => (
                <div key={rule.id}>
                  {rule.type} {rule.condition} {rule.threshold}
                  <button onClick={() => toggleAlertRule(rule.id)}>
                    {rule.enabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => deleteAlertRule(rule.id)}>Delete</button>
                </div>
              ))}
            </>
          )}

          {activeTab === "data" && (
            <>
              <h3>Data</h3>

              <select
                value={dataRetention}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDataRetention(v);
                  savePreference("dataRetention", v);
                }}
              >
                <option value={1}>1 day</option>
                <option value={7}>1 week</option>
                <option value={30}>1 month</option>
              </select>

              <button onClick={clearAllData}>Clear All Data</button>
            </>
          )}

          {activeTab === "about" && (
            <>
              <h3>Aman Skies</h3>
              <p>Weather forecasting app built with React + Vite</p>
              <p>Powered by OpenWeatherMap API</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
