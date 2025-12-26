import { CalendarModule } from "@/components/calendar";
import { ChoresView } from "@/components/chores-view";
import { ListsView } from "@/components/lists-view";
import { MealsView } from "@/components/meals-view";
import { OnboardingFlow } from "@/components/onboarding";
import { PhotosView } from "@/components/photos-view";
import { AppHeader, NavigationTabs, SidebarMenu } from "@/components/shared";
import {
  type ModuleType,
  useAppStore,
  useHasHydrated,
  useSetupComplete,
} from "@/stores";

function renderModule(activeModule: ModuleType) {
  switch (activeModule) {
    case "calendar":
      return <CalendarModule />;
    case "chores":
      return <ChoresView />;
    case "meals":
      return <MealsView />;
    case "lists":
      return <ListsView />;
    case "photos":
      return <PhotosView />;
    default:
      return null;
  }
}

export default function FamilyHub() {
  const activeModule = useAppStore((state) => state.activeModule);
  const hasHydrated = useHasHydrated();
  const setupComplete = useSetupComplete();

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
    return <OnboardingFlow />;
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
