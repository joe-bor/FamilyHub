import { format } from "date-fns";

function getGreeting(now: Date): string {
  const hour = now.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader({
  familyName,
  now,
}: {
  familyName: string;
  now: Date;
}) {
  return (
    <div
      data-testid="dashboard-header"
      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pt-4"
    >
      <h1 className="text-sm font-medium text-foreground/70">
        {getGreeting(now)}, {familyName}
      </h1>
      <p className="text-sm text-foreground/80">{format(now, "EEEE, MMM d")}</p>
    </div>
  );
}
