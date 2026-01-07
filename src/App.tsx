import { lazy, Suspense, useEffect } from "react";
import { useSetupComplete } from "@/api";
import { CalendarModule } from "@/components/calendar";
import { HomeDashboard } from "@/components/home";
import { AppHeader, NavigationTabs, SidebarMenu } from "@/components/shared";
import { useIsMobile } from "@/hooks";
import { type ModuleType, useAppStore, useHasHydrated } from "@/stores";

// Lazy load non-primary modules for code splitting
const ChoresView = lazy(() =>
  import("@/components/chores-view").then((m) => ({ default: m.ChoresView })),
);
const MealsView = lazy(() =>
  import("@/components/meals-view").then((m) => ({ default: m.MealsView })),
);
const ListsView = lazy(() =>
  import("@/components/lists-view").then((m) => ({ default: m.ListsView })),
);
const PhotosView = lazy(() =>
  import("@/components/photos-view").then((m) => ({ default: m.PhotosView })),
);
const OnboardingFlow = lazy(() =>
  import("@/components/onboarding").then((m) => ({
    default: m.OnboardingFlow,
  })),
);

function ModuleLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

function renderModule(activeModule: ModuleType | null) {
  if (activeModule === null) {
    return <HomeDashboard />;
  }

  switch (activeModule) {
    case "calendar":
      return <CalendarModule />;
    case "chores":
      return (
        <Suspense fallback={<ModuleLoader />}>
          <ChoresView />
        </Suspense>
      );
    case "meals":
      return (
        <Suspense fallback={<ModuleLoader />}>
          <MealsView />
        </Suspense>
      );
    case "lists":
      return (
        <Suspense fallback={<ModuleLoader />}>
          <ListsView />
        </Suspense>
      );
    case "photos":
      return (
        <Suspense fallback={<ModuleLoader />}>
          <PhotosView />
        </Suspense>
      );
    default:
      return null;
  }
}

export default function FamilyHub() {
  const activeModule = useAppStore((state) => state.activeModule);
  const setActiveModule = useAppStore((state) => state.setActiveModule);
  const hasHydrated = useHasHydrated();
  const setupComplete = useSetupComplete();
  const isMobile = useIsMobile();

  // On desktop, redirect null (home) to calendar since home is mobile-only
  useEffect(() => {
    if (!isMobile && activeModule === null) {
      setActiveModule("calendar");
    }
  }, [isMobile, activeModule, setActiveModule]);

  // Wait for store to hydrate from localStorage
  if (!hasHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show onboarding if setup not complete
  if (!setupComplete) {
    return (
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center bg-background">
            <div className="animate-pulse text-muted-foreground">
              Loading...
            </div>
          </div>
        }
      >
        <OnboardingFlow />
      </Suspense>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />

      <div className="flex-1 flex overflow-hidden">
        <NavigationTabs />
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderModule(activeModule)}
        </main>
      </div>

      <SidebarMenu />
    </div>
  );
}
