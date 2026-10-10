import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// In-memory mock for localStorage in Node 22 / JSDOM
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: storageMock,
  writable: true,
  configurable: true,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });

  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
}

import {
  isPwaStandalone,
  isMobileDevice,
  getMobilePlatform,
  triggerPwaInstallPrompt,
  usePwaInstallPrompt,
  STORAGE_KEY_DISMISSED,
  PWA_OPEN_PROMPT_EVENT,
  BeforeInstallPromptEvent,
} from "./usePwaInstallPrompt";

describe("PWA Install Prompt Helpers & Hook", () => {
  const originalUserAgent = window.navigator.userAgent;

  beforeEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(window.navigator, "standalone", {
      value: undefined,
      configurable: true,
    });
  });

  describe("isPwaStandalone", () => {
    it("should return false by default in jsdom", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      expect(isPwaStandalone()).toBe(false);
    });

    it("should detect display-mode standalone", () => {
      vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(isPwaStandalone()).toBe(true);
    });

    it("should detect iOS navigator.standalone", () => {
      Object.defineProperty(window.navigator, "standalone", {
        value: true,
        configurable: true,
      });

      expect(isPwaStandalone()).toBe(true);

      Object.defineProperty(window.navigator, "standalone", {
        value: undefined,
        configurable: true,
      });
    });
  });

  describe("isMobileDevice & getMobilePlatform", () => {
    it("should identify iPhone as iOS mobile", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);
      expect(getMobilePlatform()).toBe("ios");
    });

    it("should identify Android as android mobile", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);
      expect(getMobilePlatform()).toBe("android");
    });

    it("should identify desktop browser as other", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        configurable: true,
      });
      window.innerWidth = 1200;

      expect(getMobilePlatform()).toBe("other");
    });
  });

  describe("triggerPwaInstallPrompt", () => {
    it("should dispatch PWA_OPEN_PROMPT_EVENT", () => {
      const listener = vi.fn();
      window.addEventListener(PWA_OPEN_PROMPT_EVENT, listener);

      triggerPwaInstallPrompt();

      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(PWA_OPEN_PROMPT_EVENT, listener);
    });
  });

  describe("usePwaInstallPrompt hook", () => {
    it("should open via manual trigger even if dismissed previously", () => {
      localStorage.setItem(STORAGE_KEY_DISMISSED, "true");

      const { result } = renderHook(() => usePwaInstallPrompt(0));
      expect(result.current.isOpen).toBe(false);

      act(() => {
        triggerPwaInstallPrompt();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isOpen).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY_DISMISSED)).toBe("true");
    });

    it("should permanently dismiss and update localStorage when closeModal() is called", () => {
      const { result } = renderHook(() => usePwaInstallPrompt(0));

      act(() => {
        result.current.openModal();
      });
      expect(result.current.isOpen).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY_DISMISSED)).toBeNull();

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isOpen).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY_DISMISSED)).toBe("true");
    });

    it("should permanently dismiss and update localStorage when dismissPermanently() is called", () => {
      const { result } = renderHook(() => usePwaInstallPrompt(0));

      act(() => {
        result.current.openModal();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.dismissPermanently();
      });

      expect(result.current.isOpen).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY_DISMISSED)).toBe("true");
    });

    it("should auto-open on mobile when not dismissed, and never auto-open once dismissed", () => {
      vi.useFakeTimers();
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        configurable: true,
      });

      // 1. First-time visit: not dismissed
      const { result: firstVisit } = renderHook(() => usePwaInstallPrompt(2500));
      expect(firstVisit.current.isOpen).toBe(false);

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(firstVisit.current.isOpen).toBe(true);

      // Close modal (e.g. user clicked "Đã hiểu" or "X")
      act(() => {
        firstVisit.current.closeModal();
      });
      expect(firstVisit.current.isOpen).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY_DISMISSED)).toBe("true");

      // 2. Second visit: already dismissed
      const { result: secondVisit } = renderHook(() => usePwaInstallPrompt(2500));
      expect(secondVisit.current.isOpen).toBe(false);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      // MUST NOT auto-open again
      expect(secondVisit.current.isOpen).toBe(false);

      // But manual trigger from ProfileView MUST still work
      act(() => {
        triggerPwaInstallPrompt();
      });
      expect(secondVisit.current.isOpen).toBe(true);

      vi.useRealTimers();
    });

    it("should handle beforeinstallprompt event and triggerNativeInstall", async () => {
      const { result } = renderHook(() => usePwaInstallPrompt(0));

      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event("beforeinstallprompt") as BeforeInstallPromptEvent;
      mockEvent.prompt = mockPrompt;
      mockEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      expect(result.current.canInstallNative).toBe(true);

      act(() => {
        result.current.openModal();
      });
      expect(result.current.isOpen).toBe(true);

      await act(async () => {
        await result.current.triggerNativeInstall();
      });

      expect(mockPrompt).toHaveBeenCalledTimes(1);
      expect(result.current.isOpen).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY_DISMISSED)).toBe("true");
    });
  });
});
