import { useIsMobile } from "@/hooks";
import { LargeHomeDashboard } from "./large-home-dashboard";
import { MobileHomeDashboard } from "./mobile-home-dashboard";

export function HomeDashboard({ nowOverride }: { nowOverride?: Date } = {}) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <MobileHomeDashboard nowOverride={nowOverride} />
  ) : (
    <LargeHomeDashboard nowOverride={nowOverride} />
  );
}
