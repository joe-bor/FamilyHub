import { Calendar, WifiOff } from "lucide-react";

export function CalendarErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-destructive">
        Error loading events: {message ?? "Unknown error"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function CalendarOfflineState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <WifiOff aria-hidden="true" className="size-12 opacity-50" />
      <p className="text-lg font-medium">You're offline</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function CalendarEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <Calendar aria-hidden="true" className="size-12 opacity-50" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}
