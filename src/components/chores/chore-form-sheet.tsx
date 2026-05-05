import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { ChoreFormData, ChoreFormInput } from "@/lib/validations";
import { ChoreForm } from "./chore-form";

interface ChoreFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ChoreFormData) => void;
  isPending?: boolean;
  defaultValues?: Partial<ChoreFormInput>;
}

export function ChoreFormSheet({
  isOpen,
  onClose,
  onSubmit,
  isPending = false,
  defaultValues,
}: ChoreFormSheetProps) {
  return (
    <MobileSheet isOpen={isOpen} onClose={onClose} title="New Chore">
      <ChoreForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        onCancel={onClose}
        isPending={isPending}
      />
    </MobileSheet>
  );
}

export type { ChoreFormSheetProps };
