/**
 * BACK13: PWA Offline Capabilities & Update Detector.
 */

export interface AppCapabilities {
  isOnline: boolean;
  isStandalone: boolean;
  hasWebWorker: boolean;
  hasWebAudio: boolean;
  hasTouch: boolean;
  devicePixelRatio: number;
}

export function detectAppCapabilities(): AppCapabilities {
  return {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isStandalone: typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true),
    hasWebWorker: typeof Worker !== "undefined",
    hasWebAudio: typeof AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined",
    hasTouch: typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
  };
}
