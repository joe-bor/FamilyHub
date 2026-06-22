interface StateLineProps {
  choresRemaining: number;
  dinnerTitle: string | null;
}

export function StateLine({ choresRemaining, dinnerTitle }: StateLineProps) {
  const segments: string[] = [];
  if (choresRemaining > 0) {
    segments.push(
      `${choresRemaining} chore${choresRemaining === 1 ? "" : "s"} left today`,
    );
  }
  if (dinnerTitle) segments.push(`${dinnerTitle} tonight`);
  if (segments.length === 0) return null;

  return (
    <p className="px-4 pt-2 text-sm text-muted-foreground">
      {segments.join(" · ")}
    </p>
  );
}
