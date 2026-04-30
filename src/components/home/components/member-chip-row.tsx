import { colorMap, type FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

function withOpacity(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export function MemberChipRow({
  members,
  focusedId,
  onFocusChange,
}: {
  members: FamilyMember[];
  focusedId: string | null;
  onFocusChange: (id: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto px-4 pt-3 scrollbar-hide">
      <div className="flex min-w-max gap-2 pb-1">
        {members.map((member) => {
          const colors = colorMap[member.color];
          const isFocused = focusedId === member.id;
          const isDimmed = focusedId !== null && !isFocused;

          return (
            <button
              key={member.id}
              type="button"
              aria-label={`Focus on ${member.name}'s events`}
              aria-pressed={isFocused}
              onClick={() => onFocusChange(isFocused ? null : member.id)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full p-1 transition-[opacity,transform,box-shadow] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                isFocused && "scale-[1.04]",
                isDimmed && "opacity-60",
              )}
              style={{
                boxShadow: isFocused
                  ? `0 0 0 2px ${withOpacity(colors.hex, "cc")}`
                  : undefined,
              }}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white",
                  colors.bg,
                )}
              >
                {member.name.charAt(0).toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
