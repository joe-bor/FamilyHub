import { AppHeader, NavigationTabs, SidebarMenu } from "@/components/shared"
import { CalendarModule } from "@/components/calendar"
import { ChoresView } from "@/components/chores-view"
import { MealsView } from "@/components/meals-view"
import { ListsView } from "@/components/lists-view"
import { PhotosView } from "@/components/photos-view"
import { useAppStore, type ModuleType } from "@/stores"

function renderModule(activeModule: ModuleType) {
  switch (activeModule) {
    case "calendar":
      return <CalendarModule />
    case "chores":
      return <ChoresView />
    case "meals":
      return <MealsView />
    case "lists":
      return <ListsView />
    case "photos":
      return <PhotosView />
    default:
      return null
  }
}

export default function FamilyHub() {
  const activeModule = useAppStore((state) => state.activeModule)

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
  )
}
