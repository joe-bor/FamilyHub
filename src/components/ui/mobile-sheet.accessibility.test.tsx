import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { forwardRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { MobileSheet } from "./mobile-sheet";

const drawerRootProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock("vaul", () => {
  const Root = ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => {
    drawerRootProps.current = props;
    return <>{children}</>;
  };
  const Portal = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Overlay = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
    function Overlay(props, ref) {
      return <div ref={ref} {...props} />;
    },
  );
  const Content = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
    function Content(props, ref) {
      return <div ref={ref} role="dialog" data-vaul-drawer="" {...props} />;
    },
  );
  const Title = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<"h2">>(
    function Title(props, ref) {
      return <h2 ref={ref} {...props} />;
    },
  );

  return {
    Drawer: {
      Root,
      Portal,
      Overlay,
      Content,
      Title,
    },
  };
});

describe("MobileSheet accessibility", () => {
  it("keeps mounted closed drawer content out of the accessibility tree", () => {
    render(
      <MobileSheet isOpen={false} onClose={() => {}} title="Test sheet">
        <button type="button">Inside action</button>
      </MobileSheet>,
    );

    expect(document.querySelector("[data-vaul-drawer]")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Inside action" }),
    ).not.toBeInTheDocument();
  });

  it("limits full-height sheets to handle-only drawer gestures", () => {
    render(
      <MobileSheet isOpen={true} onClose={() => {}} title="Test sheet">
        <button type="button">Inside action</button>
      </MobileSheet>,
    );

    expect(drawerRootProps.current).toMatchObject({ handleOnly: true });
  });

  it("keeps half-height sheets draggable from the sheet surface", () => {
    render(
      <MobileSheet
        isOpen={true}
        onClose={() => {}}
        title="Test sheet"
        initialHeight="half"
      >
        <button type="button">Inside action</button>
      </MobileSheet>,
    );

    expect(drawerRootProps.current).toMatchObject({ handleOnly: false });
  });
});
