import { Component, type ReactNode } from "react";
import { render, screen } from "@/test/test-utils";
import { ChunkLoadErrorBoundary, isChunkLoadError } from "./lazy-module";

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

/** A child that throws the given value during render. */
function Throw({ error }: { error: unknown }): ReactNode {
  throw error;
}

afterEach(() => {
  // jsdom's navigator.onLine is sticky across tests once redefined.
  setOnLine(true);
});

describe("isChunkLoadError", () => {
  it.each([
    // Chromium
    "Failed to fetch dynamically imported module: https://app/assets/chores-view-CHEO_W4C.js",
    // Firefox
    "error loading dynamically imported module: https://app/assets/chores-view.js",
    // WebKit / Safari
    "Importing a module script failed.",
  ])("returns true for a dynamic import failure (%s)", (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it("returns true for a webpack-style ChunkLoadError by name", () => {
    const error = new Error("Loading chunk 5 failed.");
    error.name = "ChunkLoadError";
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("returns false for an unrelated runtime error", () => {
    expect(
      isChunkLoadError(
        new TypeError("Cannot read properties of undefined (reading 'map')"),
      ),
    ).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isChunkLoadError("Failed to fetch")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("ChunkLoadErrorBoundary", () => {
  // React logs every error an error boundary catches; silence it so the test
  // output stays pristine.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders its children when nothing throws", () => {
    render(
      <ChunkLoadErrorBoundary label="chores">
        <div>chores module content</div>
      </ChunkLoadErrorBoundary>,
    );
    expect(screen.getByText("chores module content")).toBeInTheDocument();
  });

  it("renders the offline empty state when a chunk fails to load offline", () => {
    setOnLine(false);
    render(
      <ChunkLoadErrorBoundary label="chores">
        <Throw
          error={
            new TypeError(
              "Failed to fetch dynamically imported module: /assets/chores-view-CHEO_W4C.js",
            )
          }
        />
      </ChunkLoadErrorBoundary>,
    );
    expect(
      screen.getByText(/haven't been saved for offline viewing yet/i),
    ).toBeInTheDocument();
  });

  it("re-throws non-chunk errors instead of masking real bugs", () => {
    // An outer boundary captures whatever ChunkLoadErrorBoundary re-throws.
    class Capture extends Component<
      { children: ReactNode },
      { caught: Error | null }
    > {
      state: { caught: Error | null } = { caught: null };
      static getDerivedStateFromError(error: Error) {
        return { caught: error };
      }
      render() {
        return this.state.caught ? (
          <div>captured: {this.state.caught.message}</div>
        ) : (
          this.props.children
        );
      }
    }

    render(
      <Capture>
        <ChunkLoadErrorBoundary label="chores">
          <Throw error={new TypeError("Cannot read properties of undefined")} />
        </ChunkLoadErrorBoundary>
      </Capture>,
    );

    expect(
      screen.getByText(/captured: Cannot read properties of undefined/i),
    ).toBeInTheDocument();
  });
});
