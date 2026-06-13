import { isIOS, isStandalone } from "./pwa";

function mockMatchMedia(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function setUA(ua: string, maxTouchPoints = 0) {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: ua,
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints,
  });
}

describe("isStandalone", () => {
  it("is true when display-mode standalone matches", () => {
    mockMatchMedia(true);
    expect(isStandalone()).toBe(true);
  });

  it("is false in a normal browser tab", () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: undefined,
    });
    expect(isStandalone()).toBe(false);
  });

  it("is true when navigator.standalone is true (iOS installed)", () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
    expect(isStandalone()).toBe(true);
  });
});

describe("isIOS", () => {
  it("detects an iPhone user agent", () => {
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(isIOS()).toBe(true);
  });

  it("detects iPadOS reporting as Mac with touch", () => {
    setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5);
    expect(isIOS()).toBe(true);
  });

  it("is false for desktop Chrome on macOS", () => {
    setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0);
    expect(isIOS()).toBe(false);
  });
});
