import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PwaInstallModal } from "./PwaInstallModal";
import { PwaStepCards } from "./PwaStepCards";

// Storage mock
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

describe("PwaStepCards", () => {
  it("renders 4 steps for iOS", () => {
    render(<PwaStepCards isIos={true} />);

    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("Chia sẻ")).toBeDefined();
    expect(screen.getByText("Thêm vào MH chính")).toBeDefined();
    expect(screen.getByText("nhấn Thêm")).toBeDefined();
    expect(screen.getByText("Hoàn tất!")).toBeDefined();
  });

  it("renders 4 steps for Android", () => {
    render(<PwaStepCards isIos={false} />);

    expect(screen.getByText("Menu (⋮)")).toBeDefined();
    expect(screen.getByText("Cài đặt app")).toBeDefined();
  });
});

describe("PwaInstallModal", () => {
  beforeEach(() => {
    storageMock.clear();
  });

  it("renders when forceOpen is true and allows switching tabs, and clicking 'Đã hiểu' permanently dismisses", () => {
    const handleClose = vi.fn();
    render(<PwaInstallModal forceOpen={true} onClose={handleClose} />);

    expect(screen.getByText("Cài đặt LimArt Staff lên màn hình chính")).toBeDefined();

    // Check tabs
    const androidTab = screen.getByRole("button", { name: /Android \/ Chrome/i });
    fireEvent.click(androidTab);

    expect(screen.getByText(/Hướng dẫn trên Android/i)).toBeDefined();

    // Close button ("Đã hiểu")
    const closeBtn = screen.getByRole("button", { name: "Đã hiểu" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(storageMock.getItem("limart_staff_pwa_dismissed")).toBe("true");
  });

  it("dismisses permanently when clicking 'X' button", () => {
    const handleClose = vi.fn();
    render(<PwaInstallModal forceOpen={true} onClose={handleClose} />);

    const closeIconBtn = screen.getByRole("button", { name: "Đóng hướng dẫn" });
    fireEvent.click(closeIconBtn);

    expect(storageMock.getItem("limart_staff_pwa_dismissed")).toBe("true");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses permanently when clicking backdrop", () => {
    const handleClose = vi.fn();
    render(<PwaInstallModal forceOpen={true} onClose={handleClose} />);

    const dialogBackdrop = screen.getByRole("dialog");
    fireEvent.click(dialogBackdrop);

    expect(storageMock.getItem("limart_staff_pwa_dismissed")).toBe("true");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses permanently when clicking 'Không hiển thị lại nữa'", () => {
    const handleClose = vi.fn();
    render(<PwaInstallModal forceOpen={true} onClose={handleClose} />);

    const dismissBtn = screen.getByRole("button", { name: /Không hiển thị lại nữa/i });
    fireEvent.click(dismissBtn);

    expect(storageMock.getItem("limart_staff_pwa_dismissed")).toBe("true");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
