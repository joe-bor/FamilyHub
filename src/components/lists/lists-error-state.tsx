import { Button } from "../ui/button";

interface ListsErrorStateProps {
  onRetry: () => void;
}

export function ListsErrorState({ onRetry }: ListsErrorStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">
        Lists could not be loaded
      </h3>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">
        Check your connection and try again.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
