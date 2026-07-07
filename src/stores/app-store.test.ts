import { beforeEach, describe, expect, it } from "vitest";
import { type MealType, type ModuleType, useAppStore } from "./app-store";

describe("AppStore", () => {
  // Store reset handled globally by setup.ts afterEach via resetAllStores()

  describe("initial state", () => {
    it("initializes with activeModule = null (home dashboard)", () => {
      expect(useAppStore.getState().activeModule).toBe(null);
    });

    it("initializes with isSidebarOpen = false", () => {
      expect(useAppStore.getState().isSidebarOpen).toBe(false);
    });

    it("initializes handoff drafts as null", () => {
      expect(useAppStore.getState().mealPlacementDraft).toBe(null);
      expect(useAppStore.getState().recipeCreationDraft).toBe(null);
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

    it("sets activeModule to null (home dashboard)", () => {
      useAppStore.getState().setActiveModule("calendar");
      useAppStore.getState().setActiveModule(null);

      expect(useAppStore.getState().activeModule).toBe(null);
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

  describe("navigation intents", () => {
    beforeEach(() => {
      useAppStore.setState({
        listDetailIntent: null,
        calendarFocusDate: null,
        calendarEventIntent: null,
        mealSlotIntent: null,
        activeModule: null,
      });
    });
    it("openListDetail sets the intent + switches to lists, and consume returns then clears it", () => {
      useAppStore.getState().openListDetail("l1");
      expect(useAppStore.getState().activeModule).toBe("lists");
      expect(useAppStore.getState().consumeListDetailIntent()).toBe("l1");
      expect(useAppStore.getState().consumeListDetailIntent()).toBeNull();
    });
    it("focusCalendarDate sets the date + switches to calendar, and consume returns then clears it", () => {
      useAppStore.getState().focusCalendarDate("2026-07-15");
      expect(useAppStore.getState().activeModule).toBe("calendar");
      expect(useAppStore.getState().consumeCalendarFocusDate()).toBe(
        "2026-07-15",
      );
      expect(useAppStore.getState().consumeCalendarFocusDate()).toBeNull();
    });

    it("openCalendarEvent stores event focus data and switches to calendar", () => {
      useAppStore.getState().openCalendarEvent({
        date: "2026-07-15",
        eventKey: "event-123",
      });

      expect(useAppStore.getState().activeModule).toBe("calendar");
      expect(useAppStore.getState().calendarEventIntent).toEqual({
        date: "2026-07-15",
        eventKey: "event-123",
      });

      useAppStore.getState().clearCalendarEventIntent();
      expect(useAppStore.getState().calendarEventIntent).toBeNull();
    });

    it("focusMealSlot stores a meal slot intent and switches to meals", () => {
      useAppStore.getState().focusMealSlot({
        weekStartDate: "2026-07-12",
        dayIndex: 2,
        mealType: "dinner",
      });

      expect(useAppStore.getState().activeModule).toBe("meals");
      expect(useAppStore.getState().consumeMealSlotIntent()).toEqual({
        weekStartDate: "2026-07-12",
        dayIndex: 2,
        mealType: "dinner",
      });
      expect(useAppStore.getState().consumeMealSlotIntent()).toBeNull();
    });

    it("focusMealSlot clears a pending meal placement draft to avoid competing dialog state", () => {
      useAppStore.getState().startMealPlacementFromRecipe({
        recipeId: "recipe-123",
        requestedAtWeekStartDate: "2026-06-07",
        source: { kind: "recipes-library" },
      });
      expect(useAppStore.getState().mealPlacementDraft).not.toBeNull();

      useAppStore.getState().focusMealSlot({
        weekStartDate: "2026-07-12",
        dayIndex: 2,
        mealType: "dinner",
      });

      expect(useAppStore.getState().mealPlacementDraft).toBeNull();
    });
  });

  describe("recipe and meals handoff drafts", () => {
    const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];

    it.each(
      mealTypes,
    )("starts meal placement from a recipe with lowercase meal type sample '%s'", (mealType) => {
      useAppStore.getState().startMealPlacementFromRecipe({
        recipeId: "recipe-123",
        requestedAtWeekStartDate: "2026-06-07",
        source: {
          kind: "meals-slot",
          dayIndex: 2,
          mealType,
        },
      });

      expect(useAppStore.getState().activeModule).toBe("meals");
      expect(useAppStore.getState().mealPlacementDraft).toEqual({
        recipeId: "recipe-123",
        requestedAtWeekStartDate: "2026-06-07",
        source: {
          kind: "meals-slot",
          dayIndex: 2,
          mealType,
        },
      });
    });

    it("consumes the meal placement draft and clears it", () => {
      useAppStore.getState().startMealPlacementFromRecipe({
        recipeId: "recipe-123",
        requestedAtWeekStartDate: "2026-06-07",
        source: { kind: "recipes-library" },
      });

      const consumed = useAppStore.getState().consumeMealPlacementDraft();

      expect(consumed).toEqual({
        recipeId: "recipe-123",
        requestedAtWeekStartDate: "2026-06-07",
        source: { kind: "recipes-library" },
      });
      expect(useAppStore.getState().mealPlacementDraft).toBe(null);
    });

    it("starts recipe creation from a meal slot and switches to recipes", () => {
      useAppStore.getState().startRecipeCreationFromMealSlot({
        requestedAtWeekStartDate: "2026-06-07",
        dayIndex: 4,
        mealType: "dinner",
        typedTitle: "Taco bowls",
      });

      expect(useAppStore.getState().activeModule).toBe("recipes");
      expect(useAppStore.getState().recipeCreationDraft).toEqual({
        requestedAtWeekStartDate: "2026-06-07",
        dayIndex: 4,
        mealType: "dinner",
        typedTitle: "Taco bowls",
      });
    });

    it("consumes the recipe creation draft and clears it", () => {
      useAppStore.getState().startRecipeCreationFromMealSlot({
        requestedAtWeekStartDate: "2026-06-07",
        dayIndex: 1,
        mealType: "lunch",
        typedTitle: "Chicken wraps",
      });

      const consumed = useAppStore.getState().consumeRecipeCreationDraft();

      expect(consumed).toEqual({
        requestedAtWeekStartDate: "2026-06-07",
        dayIndex: 1,
        mealType: "lunch",
        typedTitle: "Chicken wraps",
      });
      expect(useAppStore.getState().recipeCreationDraft).toBe(null);
    });
  });

  describe("idle return blockers", () => {
    it("tracks explicit idle-return blockers by key", () => {
      useAppStore.getState().setIdleReturnBlocked("meals-planning", true);
      expect(useAppStore.getState().idleReturnBlockers).toEqual({
        "meals-planning": true,
      });

      useAppStore.getState().setIdleReturnBlocked("meals-planning", false);
      expect(useAppStore.getState().idleReturnBlockers).toEqual({});
    });
  });
});
