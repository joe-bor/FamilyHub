import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { colorMap, type FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  member: FamilyMember;
  onEdit: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function MemberCard({
  member,
  onEdit,
  onRemove,
  canRemove,
}: MemberCardProps) {
  const colors = colorMap[member.color];

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0",
          colors?.bg,
        )}
      >
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{member.name}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-9 w-9"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          className={cn(
            "h-9 w-9",
            canRemove
              ? "text-destructive hover:text-destructive"
              : "text-muted-foreground",
          )}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
