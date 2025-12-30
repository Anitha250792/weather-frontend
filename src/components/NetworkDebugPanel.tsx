import React, { useState, useEffect } from "react";
import { isIOSSafari } from "../utils/deviceDetection";

interface NetworkTest {
  name: string;
  url: string;
  status: "pending" | "success" | "error";
  details: string;
  timestamp: string;
}

interface ConsoleLog {
  timestamp: string;
  level: "log" | "warn" | "error";
  message: string;
  data?: any;
}

interface NetworkDebugPanelProps {
  latitude?: number;
  longitude?: number;
}

const NetworkDebugPanel: React.FC<NetworkDebugPanelProps> = ({
  latitude,
  longitude,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tests, setTests] = useState<NetworkTest[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);

  useEffect(() => {
    // Gather device information
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      connection:
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection,
      isIOSSafari: isIOSSafari(),
      timestamp: new Date().toISOString(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      protocol: window.location.protocol,
      host: window.location.host,
    };
    setDeviceInfo(info);

    // Capture console logs for debugging
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      setConsoleLogs((prev) => [
        ...prev.slice(-19),
        {
          timestamp: new Date().toISOString(),
          level: "log",
          message,
          data:
            args.length === 1 && typeof args[0] === "object"
              ? args[0]
              : undefined,
        },
      ]);

      originalLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      setConsoleLogs((prev) => [
        ...prev.slice(-19),
        {
          timestamp: new Date().toISOString(),
          level: "warn",
          message,
          data:
            args.length === 1 && typeof args[0] === "object"
              ? args[0]
              : undefined,
        },
      ]);

      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      setConsoleLogs((prev) => [
        ...prev.slice(-19),
        {
          timestamp: new Date().toISOString(),
          level: "error",
          message,
          data:
            args.length === 1 && typeof args[0] === "object"
              ? args[0]
              : undefined,
        },
      ]);

      originalError.apply(console, args);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const runNetworkTests = async () => {
    if (!latitude || !longitude) {
      alert("Location not available for testing");
      return;
    }

    setTests([]);
    const newTests: NetworkTest[] = [];

    // Test 1: Simple HTTP test
    const addTest = (name: string, url: string) => {
      const test: NetworkTest = {
        name,
        url,
        status: "pending",
        details: "Starting test...",
        timestamp: new Date().toISOString(),
      };
      newTests.push(test);
      setTests([...newTests]);
      return test;
    };

    // Test 1: Basic connectivity
    const connectivityTest = addTest(
      "Basic Connectivity",
      "https://httpbin.org/get"
    );
    try {
      const response = await fetch("https://httpbin.org/get", {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        connectivityTest.status = "success";
        connectivityTest.details = `✅ Basic internet connectivity works (${response.status})`;
      } else {
        connectivityTest.status = "error";
        connectivityTest.details = `❌ HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      connectivityTest.status = "error";
      connectivityTest.details = `❌ ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
    setTests([...newTests]);

    // Test 2: Aladhan API direct
    const aladhanUrl = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2&school=0`;
    const aladhanTest = addTest("Aladhan API (Fetch)", aladhanUrl);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(aladhanUrl, {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        aladhanTest.status = "success";
        aladhanTest.details = `✅ Aladhan API works! Got prayer times: ${JSON.stringify(
          data.data?.timings,
          null,
          2
        )}`;
      } else {
        aladhanTest.status = "error";
        aladhanTest.details = `❌ HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      aladhanTest.status = "error";
      aladhanTest.details = `❌ ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
    setTests([...newTests]);

    // Test 3: Axios test
    const axiosTest = addTest("Aladhan API (Axios)", aladhanUrl);
    try {
      const axios = (await import("axios")).default;
      const response = await axios.get(aladhanUrl, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      axiosTest.status = "success";
      axiosTest.details = `✅ Axios works! Status: ${
        response.status
      }, Data keys: ${Object.keys(response.data || {})}`;
    } catch (error: any) {
      axiosTest.status = "error";
      axiosTest.details = `❌ Axios error: ${
        error.response?.status || "No response"
      } - ${error.message || error}`;
    }
    setTests([...newTests]);

    // Test 4: CORS preflight test
    const corsTest = addTest("CORS Preflight Test", aladhanUrl);
    try {
      const response = await fetch(aladhanUrl, {
        method: "OPTIONS",
        mode: "cors",
        headers: {
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Content-Type",
        },
      });

      corsTest.status = "success";
      corsTest.details = `✅ CORS preflight OK (${
        response.status
      }). Headers: ${JSON.stringify(
        Object.fromEntries(response.headers.entries())
      )}`;
    } catch (error) {
      corsTest.status = "error";
      corsTest.details = `❌ CORS preflight failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
    setTests([...newTests]);
  };

  const testPrayerTimesFlow = async () => {
    if (!latitude || !longitude) {
      alert("Location not available for prayer times test");
      return;
    }

    console.log("🧪 Manual prayer times test started by user");
    console.log("📍 Location:", { latitude, longitude });

    try {
      // Import the actual function from your app
      const { fetchPrayerTimes } = await import("../api/prayerTimes");
      console.log("🔄 Calling fetchPrayerTimes directly...");

      const result = await fetchPrayerTimes(latitude, longitude);
      console.log("✅ Prayer times test result:", result);

      if (result.data?.timings) {
        console.log(
          "✅ Prayer times received:",
          Object.keys(result.data.timings)
        );
        alert(
          `✅ Prayer times test SUCCESS! Got ${
            Object.keys(result.data.timings).length
          } prayer times.`
        );
      } else {
        console.error("❌ No timings in result:", result);
        alert("❌ Prayer times test failed - no timings in response");
      }
    } catch (error) {
      console.error("❌ Prayer times test error:", error);
      alert(
        `❌ Prayer times test ERROR: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  if (!isVisible) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
        }}
      >
        <button
          onClick={() => setIsVisible(true)}
          style={{
            backgroundColor: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: "20px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          🔧 Debug Network
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.9)",
        color: "white",
        zIndex: 10000,
        overflow: "auto",
        padding: "20px",
        fontSize: "12px",
        fontFamily: "monospace",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2>🔧 Network Debug Panel</h2>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              backgroundColor: "#FF3B30",
              color: "white",
              border: "none",
              borderRadius: "15px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h3>📱 Device Information</h3>
          {deviceInfo.isIOSSafari && (
            <div
              style={{
                backgroundColor: "#FF3B30",
                color: "white",
                padding: "10px 15px",
                borderRadius: "8px",
                marginBottom: "15px",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              🚨 iOS Safari Detected - Special handling enabled!
            </div>
          )}
          <div
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              padding: "15px",
              borderRadius: "8px",
              whiteSpace: "pre-wrap",
              fontSize: "11px",
            }}
          >
            {JSON.stringify(deviceInfo, null, 2)}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={runNetworkTests}
            disabled={!latitude || !longitude}
            style={{
              backgroundColor: "#34C759",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            🚀 Run Network Tests
          </button>

          <button
            onClick={testPrayerTimesFlow}
            disabled={!latitude || !longitude}
            style={{
              backgroundColor: "#007AFF",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            🕌 Test Prayer Times
          </button>

          <br />
          <span style={{ fontSize: "12px", color: "#999" }}>
            Location:{" "}
            {latitude
              ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}`
              : "Not available"}
          </span>
        </div>

        <div>
          <h3>🧪 Test Results</h3>
          {tests.length === 0 ? (
            <p style={{ color: "#999" }}>
              No tests run yet. Click "Run Network Tests" above.
            </p>
          ) : (
            tests.map((test, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  border: `2px solid ${
                    test.status === "success"
                      ? "#34C759"
                      : test.status === "error"
                      ? "#FF3B30"
                      : "#999"
                  }`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <strong>{test.name}</strong>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      backgroundColor:
                        test.status === "success"
                          ? "#34C759"
                          : test.status === "error"
                          ? "#FF3B30"
                          : "#999",
                    }}
                  >
                    {test.status.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#ccc",
                    marginBottom: "8px",
                  }}
                >
                  {test.url}
                </div>
                <div style={{ fontSize: "11px", whiteSpace: "pre-wrap" }}>
                  {test.details}
                </div>
                <div
                  style={{ fontSize: "10px", color: "#999", marginTop: "8px" }}
                >
                  {new Date(test.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: "30px" }}>
          <h3>📋 Live Console Logs</h3>
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "15px",
              maxHeight: "300px",
              overflowY: "auto",
              fontSize: "10px",
              fontFamily: "monospace",
            }}
          >
            {consoleLogs.length === 0 ? (
              <p style={{ color: "#999", margin: "0" }}>
                Waiting for console activity...
              </p>
            ) : (
              consoleLogs.slice(-10).map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "8px",
                    padding: "5px",
                    borderRadius: "4px",
                    backgroundColor:
                      log.level === "error"
                        ? "rgba(255,59,48,0.2)"
                        : log.level === "warn"
                        ? "rgba(255,149,0,0.2)"
                        : "rgba(52,199,89,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        color:
                          log.level === "error"
                            ? "#FF3B30"
                            : log.level === "warn"
                            ? "#FF9500"
                            : "#34C759",
                        fontWeight: "bold",
                      }}
                    >
                      {log.level === "error"
                        ? "❌"
                        : log.level === "warn"
                        ? "⚠️"
                        : "ℹ️"}{" "}
                      {log.level.toUpperCase()}
                    </span>
                    <span style={{ color: "#999", fontSize: "9px" }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: "#fff", wordBreak: "break-word" }}>
                    {log.message}
                  </div>
                  {log.data && (
                    <div
                      style={{
                        color: "#ccc",
                        fontSize: "9px",
                        marginTop: "4px",
                        maxHeight: "100px",
                        overflow: "auto",
                      }}
                    >
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: "10px", fontSize: "9px", color: "#666" }}>
            📱 Shows last 10 console messages in real-time • Prayer times debug
            info will appear here
          </div>
        </div>

        <div style={{ marginTop: "30px", fontSize: "10px", color: "#666" }}>
          💡 <strong>Instructions:</strong>
          <br />
          1. Make sure you have location permission enabled
          <br />
          2. Run the network tests above
          <br />
          3. Screenshot or copy the results
          <br />
          4. Share with developer for debugging
        </div>
      </div>
    </div>
  );
};

export default NetworkDebugPanel;
