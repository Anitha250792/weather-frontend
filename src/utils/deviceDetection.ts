// Device detection utilities

export const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

export const isSafari = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes("safari") &&
    !userAgent.includes("chrome") &&
    !userAgent.includes("firefox")
  );
};

export const isIOSSafari = (): boolean => {
  return isIOS() && isSafari();
};

export const getUserAgent = (): string => {
  if (typeof window === "undefined") return "Server";

  if (isIOSSafari()) {
    return "Real Time Weather/1.0 (iOS Safari)";
  }

  return "Real Time Weather/1.0";
};
