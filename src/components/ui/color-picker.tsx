import { Check } from "lucide-react";
import { colorMap, type FamilyColor, familyColors } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value?: FamilyColor;
  onChange: (color: FamilyColor) => void;
  usedColors?: FamilyColor[];
  error?: string;
  /** ID for the error message element, used for aria-describedby */
  errorId?: string;
}

export function ColorPicker({
  value,
  onChange,
  usedColors = [],
  error,
  errorId = "color-picker-error",
}: ColorPickerProps) {
  return (
    <fieldset className="space-y-2 border-0 p-0 m-0">
      <legend className="sr-only">Select a color</legend>
      <div
        aria-describedby={error ? errorId : undefined}
        className="flex flex-wrap gap-3 justify-center"
      >
        {familyColors.map((color) => {
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
      {error && (
        <p id={errorId} className="text-sm text-destructive text-center">
          {error}
        </p>
      )}
    </fieldset>
  );
}
