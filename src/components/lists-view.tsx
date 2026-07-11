import { useIsLargeScreen } from "@/hooks";
import { ListsLargeScreen } from "./lists/lists-large-screen";
import { ListsMobileView } from "./lists/lists-mobile-view";

export function ListsView() {
  const isLargeScreen = useIsLargeScreen();

  return isLargeScreen ? <ListsLargeScreen /> : <ListsMobileView />;
}
