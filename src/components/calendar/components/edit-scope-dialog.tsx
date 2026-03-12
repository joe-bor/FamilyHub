import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EditScope = "this" | "all";

interface EditScopeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (scope: EditScope) => void;
  action: "edit" | "delete";
}

function EditScopeDialog({
  isOpen,
  onClose,
  onSelect,
  action,
}: EditScopeDialogProps) {
  const [scope, setScope] = useState<EditScope>("this");

  const title =
    action === "edit" ? "Edit recurring event" : "Delete recurring event";

  const handleConfirm = () => {
    onSelect(scope);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader onClose={onClose}>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="edit-scope"
              value="this"
              checked={scope === "this"}
              onChange={() => setScope("this")}
              className="accent-primary"
            />
            <span className="text-sm">This event</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="edit-scope"
              value="all"
              checked={scope === "all"}
              onChange={() => setScope("all")}
              className="accent-primary"
            />
            <span className="text-sm">All events</span>
          </label>
        </div>

        <DialogFooter>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 min-h-[48px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 min-h-[48px]"
              variant={action === "delete" ? "destructive" : "default"}
            >
              OK
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { EditScopeDialog };
export type { EditScopeDialogProps };
