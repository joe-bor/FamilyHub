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
      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pt-5"
    >
      <h1 className="text-base leading-6 font-semibold text-foreground/75">
        {getGreeting(now)}, {familyName}
      </h1>
      <p className="text-sm leading-5 font-medium text-foreground/65">
        {format(now, "EEEE, MMM d")}
      </p>
    </div>
  );
}
