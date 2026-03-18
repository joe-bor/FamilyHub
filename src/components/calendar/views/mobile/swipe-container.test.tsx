import { fireEvent, render, screen } from "@/test/test-utils";
import { SwipeContainer } from "./swipe-container";

describe("SwipeContainer", () => {
  it("renders children", () => {
    render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("calls onSwipeLeft when swiping left beyond threshold", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 200, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 100, clientY: 305 }],
    });

    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  it("calls onSwipeRight when swiping right beyond threshold", () => {
    const onSwipeRight = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={onSwipeRight}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 100, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 200, clientY: 305 }],
    });

    expect(onSwipeRight).toHaveBeenCalledOnce();
  });

  it("ignores swipes shorter than 50px threshold", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 200, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 170, clientY: 305 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores swipes starting within 20px of left screen edge", () => {
    const onSwipeRight = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={onSwipeRight}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 10, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 150, clientY: 305 }],
    });

    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("ignores swipes starting within 20px of right screen edge", () => {
    const onSwipeLeft = vi.fn();
    // window.innerWidth defaults to 1024 in jsdom
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 1015, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 900, clientY: 305 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores vertical swipes (deltaY > deltaX)", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 130, clientY: 300 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("applies touch-action: pan-y style", () => {
    const { container } = render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    // jsdom does not surface touch-action via getComputedStyle, so we check the
    // element's inline style property directly instead of toHaveStyle().
    expect((container.firstChild as HTMLElement).style.touchAction).toBe(
      "pan-y",
    );
  });
});
