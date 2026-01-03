import { describe, expect, it } from "vitest";
import { type ModuleType, useAppStore } from "./app-store";

describe("AppStore", () => {
  // Store reset handled globally by setup.ts afterEach via resetAllStores()

  describe("initial state", () => {
    it("initializes with activeModule = 'calendar'", () => {
      expect(useAppStore.getState().activeModule).toBe("calendar");
    });

    it("initializes with isSidebarOpen = false", () => {
      expect(useAppStore.getState().isSidebarOpen).toBe(false);
    });
  });

  describe("setActiveModule", () => {
    const modules: ModuleType[] = [
      "calendar",
      "lists",
      "chores",
      "meals",
      "photos",
    ];

    it.each(modules)("sets activeModule to '%s'", (module) => {
      useAppStore.getState().setActiveModule(module);

      expect(useAppStore.getState().activeModule).toBe(module);
    });

    it("switching modules does not affect other state", () => {
      useAppStore.setState({ isSidebarOpen: true });

      useAppStore.getState().setActiveModule("meals");

      expect(useAppStore.getState().activeModule).toBe("meals");
      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });
  });

  describe("sidebar actions", () => {
    it("openSidebar sets isSidebarOpen to true", () => {
      expect(useAppStore.getState().isSidebarOpen).toBe(false);

      useAppStore.getState().openSidebar();

      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });

    it("openSidebar is idempotent when called multiple times", () => {
      useAppStore.getState().openSidebar();
      useAppStore.getState().openSidebar();
      useAppStore.getState().openSidebar();

      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });

    it("closeSidebar sets isSidebarOpen to false", () => {
      useAppStore.setState({ isSidebarOpen: true });

      useAppStore.getState().closeSidebar();

      expect(useAppStore.getState().isSidebarOpen).toBe(false);
    });

    it("closeSidebar is idempotent when called multiple times", () => {
      useAppStore.getState().closeSidebar();
      useAppStore.getState().closeSidebar();

      expect(useAppStore.getState().isSidebarOpen).toBe(false);
    });

    it("toggleSidebar toggles from false to true", () => {
      expect(useAppStore.getState().isSidebarOpen).toBe(false);

      useAppStore.getState().toggleSidebar();

      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });

    it("toggleSidebar toggles from true to false", () => {
      useAppStore.setState({ isSidebarOpen: true });

      useAppStore.getState().toggleSidebar();

      expect(useAppStore.getState().isSidebarOpen).toBe(false);
    });

    it("toggleSidebar alternates correctly on multiple calls", () => {
      expect(useAppStore.getState().isSidebarOpen).toBe(false);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarOpen).toBe(true);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarOpen).toBe(false);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });
  });

  describe("state isolation", () => {
    it("changing activeModule does not affect isSidebarOpen", () => {
      useAppStore.setState({ isSidebarOpen: true });

      useAppStore.getState().setActiveModule("photos");

      expect(useAppStore.getState().isSidebarOpen).toBe(true);
      expect(useAppStore.getState().activeModule).toBe("photos");
    });

    it("changing isSidebarOpen does not affect activeModule", () => {
      useAppStore.setState({ activeModule: "chores" });

      useAppStore.getState().toggleSidebar();

      expect(useAppStore.getState().activeModule).toBe("chores");
      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });
  });
});
