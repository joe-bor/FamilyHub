import { FloatingActionButton } from "@/components/shared";

interface AddEventButtonProps {
  onClick: () => void;
}

export function AddEventButton({ onClick }: AddEventButtonProps) {
  return <FloatingActionButton onClick={onClick} label="Add event" />;
}
