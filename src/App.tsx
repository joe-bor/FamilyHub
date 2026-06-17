import { lazy, Suspense, useEffect, useState } from "react";
import { useSetupComplete } from "@/api";
import { CalendarModule } from "@/components/calendar";
import { HomeDashboard } from "@/components/home";
import {
  AppHeader,
  LazyModule,
  MobileBottomNav,
  NavigationTabs,
  OfflineBanner,
  ScreenTransition,
  SidebarMenu,
} from "@/components/shared";
import { Toaster } from "@/components/ui/toaster";
import { useGoogleAuthReturn, useIsMobile } from "@/hooks";
import {
  type ModuleType,
  useAppStore,
  useAuthHasHydrated,
  useHasHydrated,
  useIsAuthenticated,
} from "@/stores";

// Lazy load non-primary modules for code splitting
const ChoresView = lazy(() =>
  import("@/components/chores-view").then((m) => ({ default: m.ChoresView })),
);
const MealsView = lazy(() =>
  import("@/components/meals-view").then((m) => ({ default: m.MealsView })),
);
const RecipesView = lazy(() =>
  import("@/components/recipes-view").then((m) => ({
    default: m.RecipesView,
  })),
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
const LoginFlow = lazy(() =>
  import("@/components/auth").then((m) => ({ default: m.LoginFlow })),
);

function renderModule(activeModule: ModuleType | null) {
  if (activeModule === null) {
    return <HomeDashboard />;
  }

  switch (activeModule) {
    case "calendar":
      return <CalendarModule />;
    case "chores":
      return (
        <LazyModule label="chores">
          <ChoresView />
        </LazyModule>
      );
    case "meals":
      return (
        <LazyModule label="meals">
          <MealsView />
        </LazyModule>
      );
    case "recipes":
      return (
        <LazyModule label="recipes">
          <RecipesView />
        </LazyModule>
      );
    case "lists":
      return (
        <LazyModule label="lists">
          <ListsView />
        </LazyModule>
      );
    case "photos":
      return (
        <LazyModule label="photos">
          <PhotosView />
        </LazyModule>
      );
    default:
      return null;
  }
}

function LoadingScreen() {
  return (
    <div className="h-dvh flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function FamilyHub() {
  const activeModule = useAppStore((state) => state.activeModule);
  const setActiveModule = useAppStore((state) => state.setActiveModule);
  const hasHydrated = useHasHydrated();
  const authHasHydrated = useAuthHasHydrated();
  const isAuthenticated = useIsAuthenticated();
  const setupComplete = useSetupComplete();
  const isMobile = useIsMobile();

  useGoogleAuthReturn();

  // State to toggle between login and onboarding for new users
  const [showOnboarding, setShowOnboarding] = useState(false);

  // On desktop, redirect null (home) to calendar since home is mobile-only
  useEffect(() => {
    if (!isMobile && activeModule === null) {
      setActiveModule("calendar");
    }
  }, [isMobile, activeModule, setActiveModule]);

  // Wait for both stores to hydrate from localStorage
  if (!hasHydrated || !authHasHydrated) {
    return <LoadingScreen />;
  }

  // Not authenticated: show login or onboarding
  if (!isAuthenticated) {
    if (showOnboarding) {
      return (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <OnboardingFlow />
          </Suspense>
          <Toaster />
        </>
      );
    }
    return (
      <>
        <Suspense fallback={<LoadingScreen />}>
          <LoginFlow onStartOnboarding={() => setShowOnboarding(true)} />
        </Suspense>
        <Toaster />
      </>
    );
  }

  // Authenticated but setup not complete (edge case)
  if (!setupComplete) {
    return (
      <>
        <Suspense fallback={<LoadingScreen />}>
          <OnboardingFlow />
        </Suspense>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="h-dvh flex flex-col bg-background">
        <AppHeader />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {!isMobile && <NavigationTabs />}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ScreenTransition token={activeModule} mode="fade">
              {renderModule(activeModule)}
            </ScreenTransition>
          </main>
        </div>

        <OfflineBanner />
        {isMobile && isAuthenticated && setupComplete && <MobileBottomNav />}
        <SidebarMenu />
      </div>
      <Toaster />
    </>
  );
}
