import { colorMap, type FamilyColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "w-5 h-5 text-[8px]",
  md: "w-6 h-6 text-[9px]",
  lg: "w-8 h-8 text-xs",
} as const;

interface MemberAvatarProps {
  name: string;
  color: FamilyColor;
  size?: keyof typeof sizeClasses;
  variant?: "filled" | "ring";
  className?: string;
}

export function MemberAvatar({
  name,
  color,
  size = "md",
  variant = "filled",
  className,
}: MemberAvatarProps) {
  const colors = colorMap[color];
  const initial = name.charAt(0).toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold shrink-0",
        sizeClasses[size],
        variant === "filled"
          ? `${colors.bg} text-white`
          : `border-2 bg-transparent ${colors.text}`,
        className,
      )}
      style={
        variant === "ring"
          ? {
              borderColor: colors.bg.match(/#[0-9a-fA-F]{6}/)?.[0] ?? "",
            }
          : undefined
      }
    >
      {initial}
    </span>
  );
}
