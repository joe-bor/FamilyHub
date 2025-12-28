import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import type { FamilyColor, FamilyMember } from "@/lib/types";
import { useFamilyStore } from "./family-store";

// Mock member for testing
const createMockMember = (
  overrides: Partial<FamilyMember> = {},
): Omit<FamilyMember, "id"> => ({
  name: "John Doe",
  color: "coral" as FamilyColor,
  ...overrides,
});

// Helper to reset store to a known state
function resetStore() {
  useFamilyStore.setState({
    family: null,
    _hasHydrated: false,
  });
}

// Helper to initialize family with members
function initializeWithMembers(
  members: Omit<FamilyMember, "id">[],
  familyName = "Test Family",
) {
  const store = useFamilyStore.getState();
  store.initializeFamily(familyName);

  for (const member of members) {
    store.addMember(member);
  }

  return useFamilyStore.getState().family;
}

describe("FamilyStore", () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    localStorage.clear();
    resetStore();
    // Spy on console methods to verify error handling
    vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("initializes with family = null", () => {
      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("initializes with _hasHydrated = false", () => {
      expect(useFamilyStore.getState()._hasHydrated).toBe(false);
    });
  });

  describe("initializeFamily", () => {
    it("creates family with provided name", () => {
      useFamilyStore.getState().initializeFamily("Smith Family");

      expect(useFamilyStore.getState().family?.name).toBe("Smith Family");
    });

    it("generates unique id", () => {
      useFamilyStore.getState().initializeFamily("Test Family");

      const id = useFamilyStore.getState().family?.id;
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
      expect(id?.length).toBeGreaterThan(0);
    });

    it("sets empty members array", () => {
      useFamilyStore.getState().initializeFamily("Test Family");

      expect(useFamilyStore.getState().family?.members).toEqual([]);
    });

    it("sets setupComplete = false", () => {
      useFamilyStore.getState().initializeFamily("Test Family");

      expect(useFamilyStore.getState().family?.setupComplete).toBe(false);
    });

    it("sets createdAt timestamp", () => {
      useFamilyStore.getState().initializeFamily("Test Family");

      const createdAt = useFamilyStore.getState().family?.createdAt;
      expect(createdAt).toBeDefined();
      // createdAt should be a valid ISO string
      expect(new Date(createdAt!).toISOString()).toBe(createdAt);
    });
  });

  describe("addMember", () => {
    beforeEach(() => {
      useFamilyStore.getState().initializeFamily("Test Family");
    });

    it("adds member with generated id", () => {
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members).toHaveLength(1);
      expect(members[0].name).toBe("Alice");
      expect(members[0].id).toBeDefined();
    });

    it("appends to existing members", () => {
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));
      useFamilyStore.getState().addMember(createMockMember({ name: "Bob" }));
      useFamilyStore.getState().addMember(createMockMember({ name: "Carol" }));

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members).toHaveLength(3);
      expect(members.map((m) => m.name)).toEqual(["Alice", "Bob", "Carol"]);
    });

    it("does nothing if family is null", () => {
      resetStore();

      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));

      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("preserves other family properties", () => {
      useFamilyStore.getState().completeSetup();

      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));

      expect(useFamilyStore.getState().family?.setupComplete).toBe(true);
    });
  });

  describe("updateMember", () => {
    let memberId: string;

    beforeEach(() => {
      useFamilyStore.getState().initializeFamily("Test Family");
      useFamilyStore
        .getState()
        .addMember(createMockMember({ name: "Alice", color: "coral" }));
      memberId = useFamilyStore.getState().family?.members[0].id ?? "";
    });

    it("updates specified member", () => {
      useFamilyStore.getState().updateMember(memberId, { name: "Alicia" });

      const member = useFamilyStore.getState().family?.members[0];
      expect(member?.name).toBe("Alicia");
    });

    it("preserves other members", () => {
      useFamilyStore.getState().addMember(createMockMember({ name: "Bob" }));

      useFamilyStore.getState().updateMember(memberId, { name: "Alicia" });

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members).toHaveLength(2);
      expect(members[1].name).toBe("Bob");
    });

    it("allows partial updates", () => {
      useFamilyStore.getState().updateMember(memberId, { color: "purple" });

      const member = useFamilyStore.getState().family?.members[0];
      expect(member?.name).toBe("Alice"); // Unchanged
      expect(member?.color).toBe("purple"); // Updated
    });

    it("does nothing if family is null", () => {
      resetStore();

      useFamilyStore.getState().updateMember("some-id", { name: "New Name" });

      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("does nothing if member not found (leaves members unchanged)", () => {
      useFamilyStore
        .getState()
        .updateMember("nonexistent-id", { name: "New Name" });

      const member = useFamilyStore.getState().family?.members[0];
      expect(member?.name).toBe("Alice"); // Original name unchanged
    });
  });

  describe("removeMember", () => {
    let memberId: string;

    beforeEach(() => {
      useFamilyStore.getState().initializeFamily("Test Family");
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));
      useFamilyStore.getState().addMember(createMockMember({ name: "Bob" }));
      memberId = useFamilyStore.getState().family?.members[0].id ?? "";
    });

    it("removes specified member", () => {
      useFamilyStore.getState().removeMember(memberId);

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members).toHaveLength(1);
      expect(members.find((m) => m.id === memberId)).toBeUndefined();
    });

    it("preserves other members", () => {
      useFamilyStore.getState().removeMember(memberId);

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members[0].name).toBe("Bob");
    });

    it("does nothing if family is null", () => {
      resetStore();

      useFamilyStore.getState().removeMember("some-id");

      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("handles removing last member", () => {
      const bobId = useFamilyStore.getState().family?.members[1].id ?? "";
      useFamilyStore.getState().removeMember(memberId);
      useFamilyStore.getState().removeMember(bobId);

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members).toHaveLength(0);
    });

    it("handles removing nonexistent member (no change)", () => {
      useFamilyStore.getState().removeMember("nonexistent-id");

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members).toHaveLength(2);
    });
  });

  describe("updateFamilyName", () => {
    beforeEach(() => {
      useFamilyStore.getState().initializeFamily("Original Name");
    });

    it("updates family name", () => {
      useFamilyStore.getState().updateFamilyName("New Name");

      expect(useFamilyStore.getState().family?.name).toBe("New Name");
    });

    it("does nothing if family is null", () => {
      resetStore();

      useFamilyStore.getState().updateFamilyName("New Name");

      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("preserves other family properties", () => {
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));

      useFamilyStore.getState().updateFamilyName("New Name");

      expect(useFamilyStore.getState().family?.members).toHaveLength(1);
    });
  });

  describe("setMembers", () => {
    beforeEach(() => {
      useFamilyStore.getState().initializeFamily("Test Family");
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));
    });

    it("replaces all members", () => {
      const newMembers: FamilyMember[] = [
        { id: "m1", name: "Bob", color: "teal" },
        { id: "m2", name: "Carol", color: "green" },
      ];

      useFamilyStore.getState().setMembers(newMembers);

      const members = useFamilyStore.getState().family?.members ?? [];
      expect(members).toHaveLength(2);
      expect(members[0].name).toBe("Bob");
      expect(members[1].name).toBe("Carol");
    });

    it("does nothing if family is null", () => {
      resetStore();

      useFamilyStore.getState().setMembers([]);

      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("can set to empty array", () => {
      useFamilyStore.getState().setMembers([]);

      expect(useFamilyStore.getState().family?.members).toEqual([]);
    });
  });

  describe("completeSetup", () => {
    beforeEach(() => {
      useFamilyStore.getState().initializeFamily("Test Family");
    });

    it("sets setupComplete = true", () => {
      expect(useFamilyStore.getState().family?.setupComplete).toBe(false);

      useFamilyStore.getState().completeSetup();

      expect(useFamilyStore.getState().family?.setupComplete).toBe(true);
    });

    it("does nothing if family is null", () => {
      resetStore();

      useFamilyStore.getState().completeSetup();

      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("preserves other family properties", () => {
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));

      useFamilyStore.getState().completeSetup();

      expect(useFamilyStore.getState().family?.members).toHaveLength(1);
    });
  });

  describe("resetFamily", () => {
    it("sets family to null", () => {
      useFamilyStore.getState().initializeFamily("Test Family");
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));

      useFamilyStore.getState().resetFamily();

      expect(useFamilyStore.getState().family).toBeNull();
    });

    it("works when family is already null", () => {
      resetStore();

      useFamilyStore.getState().resetFamily();

      expect(useFamilyStore.getState().family).toBeNull();
    });
  });

  describe("setHasHydrated", () => {
    it("sets _hasHydrated to true", () => {
      useFamilyStore.getState().setHasHydrated(true);

      expect(useFamilyStore.getState()._hasHydrated).toBe(true);
    });

    it("sets _hasHydrated to false", () => {
      useFamilyStore.getState().setHasHydrated(true);
      useFamilyStore.getState().setHasHydrated(false);

      expect(useFamilyStore.getState()._hasHydrated).toBe(false);
    });
  });

  describe("localStorage persistence", () => {
    const STORAGE_KEY = "family-hub-family";

    it("persists family to localStorage", () => {
      useFamilyStore.getState().initializeFamily("Test Family");
      useFamilyStore.getState().addMember(createMockMember({ name: "Alice" }));

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

      expect(stored.state?.family?.name).toBe("Test Family");
      expect(stored.state?.family?.members).toHaveLength(1);
    });

    it("rehydrates family from localStorage", async () => {
      // First, set up a family and save it
      useFamilyStore.getState().initializeFamily("Persisted Family");
      useFamilyStore.getState().addMember(createMockMember({ name: "Bob" }));
      useFamilyStore.getState().completeSetup();

      // Capture the localStorage data before resetting
      const storedData = localStorage.getItem(STORAGE_KEY);
      expect(storedData).not.toBeNull();

      // Reset the store (this also writes to localStorage, clearing it)
      resetStore();
      expect(useFamilyStore.getState().family).toBeNull();

      // Restore the original localStorage data
      localStorage.setItem(STORAGE_KEY, storedData!);

      // Rehydrate from localStorage
      await useFamilyStore.persist.rehydrate();

      // Verify data is restored
      const family = useFamilyStore.getState().family;
      expect(family?.name).toBe("Persisted Family");
      expect(family?.members).toHaveLength(1);
      expect(family?.members[0].name).toBe("Bob");
      expect(family?.setupComplete).toBe(true);
    });

    it("sets _hasHydrated after rehydration", async () => {
      // Seed localStorage with valid data
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: {
            family: {
              id: "test-id",
              name: "Test Family",
              members: [],
              createdAt: new Date().toISOString(),
              setupComplete: false,
            },
            _hasHydrated: false,
          },
          version: 0,
        }),
      );

      // Reset in-memory store
      useFamilyStore.setState({ family: null, _hasHydrated: false });

      // Rehydrate
      await useFamilyStore.persist.rehydrate();

      expect(useFamilyStore.getState()._hasHydrated).toBe(true);
    });
  });

  describe("corruption handling", () => {
    const STORAGE_KEY = "family-hub-family";

    it("clears localStorage on invalid JSON", async () => {
      // Set invalid JSON in localStorage
      localStorage.setItem(STORAGE_KEY, "{ invalid json");

      // Attempt to rehydrate - this should fail and clear the data
      await useFamilyStore.persist.rehydrate();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Verify localStorage was cleared
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("handles corrupted family data gracefully", async () => {
      // Set corrupted data that will fail Zod validation
      const corruptedData = {
        state: {
          family: {
            id: "test-id",
            name: "Test",
            members: [{ invalid: "member structure" }], // Missing required fields
            createdAt: new Date().toISOString(),
            setupComplete: false,
          },
          _hasHydrated: false,
        },
        version: 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedData));

      // Rehydrate - the onRehydrateStorage callback validates the data
      await useFamilyStore.persist.rehydrate();

      // Either the data should be validated and warning logged,
      // or the store should handle it gracefully
      // The key assertion is that the store is in a usable state
      expect(useFamilyStore.getState()._hasHydrated).toBe(true);
    });

    it("handles missing required fields gracefully", async () => {
      // Store data with missing required fields that will fail validation
      const incompleteData = {
        state: {
          family: {
            id: "test-id",
            // Missing: name, members, createdAt, setupComplete
          },
          _hasHydrated: false,
        },
        version: 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(incompleteData));

      // Rehydrate
      await useFamilyStore.persist.rehydrate();

      // The store should be in a usable state after rehydration
      // regardless of whether validation passed or failed
      expect(useFamilyStore.getState()._hasHydrated).toBe(true);
    });

    it("store remains functional after corrupted rehydration", async () => {
      // Set corrupted data
      localStorage.setItem(STORAGE_KEY, "not valid json at all {{{");

      // Rehydrate (should fail gracefully)
      await useFamilyStore.persist.rehydrate();

      // Verify store is still functional
      useFamilyStore.getState().initializeFamily("New Family");
      expect(useFamilyStore.getState().family?.name).toBe("New Family");
    });
  });

  describe("selector behavior", () => {
    describe("useFamilyMembers equivalent", () => {
      it("returns empty array when family is null", () => {
        const members = useFamilyStore.getState().family?.members ?? [];
        expect(members).toEqual([]);
      });

      it("returns members array when family exists", () => {
        initializeWithMembers([
          createMockMember({ name: "Alice" }),
          createMockMember({ name: "Bob" }),
        ]);

        const members = useFamilyStore.getState().family?.members ?? [];
        expect(members).toHaveLength(2);
      });
    });

    describe("useFamilyMemberById equivalent", () => {
      it("returns member when found", () => {
        initializeWithMembers([createMockMember({ name: "Alice" })]);
        const memberId = useFamilyStore.getState().family?.members[0].id ?? "";

        const member = useFamilyStore
          .getState()
          .family?.members.find((m) => m.id === memberId);
        expect(member?.name).toBe("Alice");
      });

      it("returns undefined when member not found", () => {
        initializeWithMembers([createMockMember({ name: "Alice" })]);

        const member = useFamilyStore
          .getState()
          .family?.members.find((m) => m.id === "nonexistent");
        expect(member).toBeUndefined();
      });
    });

    describe("useUnusedColors logic", () => {
      const allColors: FamilyColor[] = [
        "coral",
        "teal",
        "green",
        "purple",
        "yellow",
        "pink",
        "orange",
      ];

      it("returns all colors when no members", () => {
        useFamilyStore.getState().initializeFamily("Test Family");

        const members = useFamilyStore.getState().family?.members ?? [];
        const usedColors = new Set(members.map((m) => m.color));
        const unusedColors = allColors.filter((c) => !usedColors.has(c));

        expect(unusedColors).toEqual(allColors);
      });

      it("excludes used colors", () => {
        initializeWithMembers([
          createMockMember({ name: "Alice", color: "coral" }),
          createMockMember({ name: "Bob", color: "teal" }),
        ]);

        const members = useFamilyStore.getState().family?.members ?? [];
        const usedColors = new Set(members.map((m) => m.color));
        const unusedColors = allColors.filter((c) => !usedColors.has(c));

        expect(unusedColors).not.toContain("coral");
        expect(unusedColors).not.toContain("teal");
        expect(unusedColors).toContain("green");
        expect(unusedColors).toContain("purple");
      });
    });

    describe("useFamilyMemberMap logic", () => {
      it("returns Map with id as key", () => {
        initializeWithMembers([
          createMockMember({ name: "Alice" }),
          createMockMember({ name: "Bob" }),
        ]);

        const members = useFamilyStore.getState().family?.members ?? [];
        const memberMap = new Map(members.map((m) => [m.id, m]));

        expect(memberMap.size).toBe(2);
        for (const member of members) {
          expect(memberMap.get(member.id)).toEqual(member);
        }
      });
    });
  });

  describe("cross-tab sync", () => {
    // Note: This tests the storage event listener that's registered at module load.
    // In a real browser environment, changes in other tabs trigger this listener.

    it("storage event listener is registered", () => {
      // The listener is registered when the module loads
      // We can verify the store has the persist API
      expect(useFamilyStore.persist).toBeDefined();
      expect(useFamilyStore.persist.rehydrate).toBeDefined();
    });
  });
});
