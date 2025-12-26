import { Check } from "lucide-react";
import { colorMap, type FamilyColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS: FamilyColor[] = [
  "coral",
  "teal",
  "green",
  "purple",
  "yellow",
  "pink",
  "orange",
];

interface ColorPickerProps {
  value?: FamilyColor;
  onChange: (color: FamilyColor) => void;
  usedColors?: FamilyColor[];
  error?: string;
}

export function ColorPicker({
  value,
  onChange,
  usedColors = [],
  error,
}: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 justify-center">
        {COLORS.map((color) => {
          const colors = colorMap[color];
          const isSelected = value === color;
          const isUsed = usedColors.includes(color) && !isSelected;

          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              disabled={isUsed}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all",
                colors?.bg,
                isSelected && "ring-2 ring-offset-2 ring-foreground",
                isUsed && "opacity-30 cursor-not-allowed",
                !isSelected && !isUsed && "hover:scale-110",
              )}
              aria-label={`Select ${color} color`}
            >
              {isSelected && <Check className="h-5 w-5 text-white" />}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
