/**
 * iOS Safari Debugging Utilities
 * Provides enhanced logging and error tracking specifically for iOS Safari
 */

import { isIOSSafari } from "./deviceDetection";

interface IOSDebugLog {
  timestamp: string;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
  data?: any;
}

class IOSDebugger {
  private logs: IOSDebugLog[] = [];
  private maxLogs = 100;
  private isEnabled = false;

  constructor() {
    this.isEnabled =
      isIOSSafari() || localStorage.getItem("debug-mode") === "true";
    if (this.isEnabled) {
      console.log("🔧 iOS Debugger enabled");
      this.setupGlobalErrorHandlers();
    }
  }

  private setupGlobalErrorHandlers() {
    // Capture all console errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      this.log("error", "console", args.join(" "), args);
      originalError.apply(console, args);
    };

    // Capture unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.log("error", "promise", `Unhandled rejection: ${event.reason}`, {
        reason: event.reason,
        promise: event.promise,
      });
    });

    // Capture network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url] = args;
      const startTime = Date.now();

      try {
        this.log("info", "network", `Starting fetch: ${url}`);
        const response = await originalFetch.apply(window, args);
        const duration = Date.now() - startTime;

        if (response.ok) {
          this.log("info", "network", `Fetch success: ${url} (${duration}ms)`, {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
          });
        } else {
          this.log(
            "warn",
            "network",
            `Fetch failed: ${url} - ${response.status} (${duration}ms)`,
            {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
            }
          );
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.log("error", "network", `Fetch error: ${url} (${duration}ms)`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    };
  }

  log(
    level: IOSDebugLog["level"],
    category: string,
    message: string,
    data?: any
  ) {
    if (!this.isEnabled) return;

    const logEntry: IOSDebugLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem(
        "ios-debug-logs",
        JSON.stringify(this.logs.slice(-20))
      ); // Keep last 20 in localStorage
    } catch (e) {
      // localStorage might be full
    }

    // Also log to console with emoji prefixes for easy filtering
    const emoji = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
    console.log(`${emoji} [${category}] ${message}`, data || "");
  }

  getLogs(): IOSDebugLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem("ios-debug-logs");
    console.log("🧹 Debug logs cleared");
  }

  exportLogs(): string {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      connection: (navigator as any).connection,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    return JSON.stringify(
      {
        deviceInfo,
        logs: this.logs,
      },
      null,
      2
    );
  }

  // Method to get debug info as a formatted string for easy sharing
  getDebugInfo(): string {
    const recent = this.logs.slice(-10);
    let output = "🔧 iOS Debug Report\n";
    output += `Generated: ${new Date().toLocaleString()}\n`;
    output += `Device: ${navigator.platform} - ${navigator.userAgent}\n`;
    output += `Online: ${navigator.onLine}\n\n`;

    output += "📋 Recent Logs:\n";
    recent.forEach((log) => {
      const emoji =
        log.level === "error" ? "❌" : log.level === "warn" ? "⚠️" : "ℹ️";
      output += `${emoji} [${new Date(log.timestamp).toLocaleTimeString()}] ${
        log.category
      }: ${log.message}\n`;
      if (log.data) {
        output += `   Data: ${JSON.stringify(log.data, null, 2).slice(
          0,
          200
        )}...\n`;
      }
    });

    return output;
  }

  // Enable/disable debugging
  enable() {
    this.isEnabled = true;
    localStorage.setItem("debug-mode", "true");
    console.log("🔧 iOS Debugger enabled manually");
  }

  disable() {
    this.isEnabled = false;
    localStorage.removeItem("debug-mode");
    console.log("🔧 iOS Debugger disabled");
  }
}

// Create global instance
export const iosDebugger = new IOSDebugger();

// Expose to window for manual debugging in console
if (typeof window !== "undefined") {
  (window as any).iosDebugger = iosDebugger;
}

// Helper functions for specific debugging scenarios
export const debugPrayerTimes = {
  logApiCall: (url: string, params: any) => {
    iosDebugger.log(
      "info",
      "prayer-api",
      `Calling prayer times API: ${url}`,
      params
    );
  },

  logApiSuccess: (data: any) => {
    iosDebugger.log("info", "prayer-api", "Prayer times API success", {
      hasData: !!data,
      timingsCount: data?.data?.timings
        ? Object.keys(data.data.timings).length
        : 0,
      timestamp: data?.data?.date?.timestamp,
    });
  },

  logApiError: (error: any) => {
    iosDebugger.log("error", "prayer-api", "Prayer times API error", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      stack: error?.stack,
    });
  },

  logFallback: (reason: string) => {
    iosDebugger.log(
      "warn",
      "prayer-fallback",
      `Using fallback prayer times: ${reason}`
    );
  },
};

export default iosDebugger;
