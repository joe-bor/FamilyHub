import { describe, expect, it } from "vitest";
import { useBackStack } from "./back-stack-store";

describe("useBackStack", () => {
  it("peek returns undefined when empty", () => {
    expect(useBackStack.getState().peek()).toBeUndefined();
  });

  it("register returns unique ids and peek returns the most recent (LIFO)", () => {
    const a = () => {};
    const b = () => {};
    const idA = useBackStack.getState().register(a);
    const idB = useBackStack.getState().register(b);
    expect(idA).not.toBe(idB);
    expect(useBackStack.getState().peek()?.handler).toBe(b);
  });

  it("unregister by id restores the previous top", () => {
    const a = () => {};
    const b = () => {};
    useBackStack.getState().register(a);
    const idB = useBackStack.getState().register(b);
    useBackStack.getState().unregister(idB);
    expect(useBackStack.getState().peek()?.handler).toBe(a);
  });
});
