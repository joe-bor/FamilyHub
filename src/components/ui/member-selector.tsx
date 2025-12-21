import { colorMap, familyMembers } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MemberSelectorProps {
  value: string;
  onChange: (memberId: string) => void;
  error?: boolean;
  className?: string;
}

function MemberSelector({
  value,
  onChange,
  error = false,
  className,
}: MemberSelectorProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        error && "ring-1 ring-destructive/50 rounded-lg p-1",
        className,
      )}
    >
      {familyMembers.map((member) => {
        const colors = colorMap[member.color];
        const isSelected = value === member.id;

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onChange(member.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all",
              isSelected
                ? `${colors?.bg} text-white`
                : `${colors?.light} ${colors?.text} hover:opacity-80`,
            )}
          >
            {/* FIX: White dot when selected so it doesn't blend into background */}
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                isSelected ? "bg-white/90" : colors?.bg,
              )}
            />
            {member.name}
          </button>
        );
      })}
    </div>
  );
}

export { MemberSelector };
export type { MemberSelectorProps };
