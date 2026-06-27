import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, ListTodo, ShoppingCart } from "lucide-react";
import { useForm } from "react-hook-form";
import { useCreateList } from "@/api";
import { cn } from "@/lib/utils";
import type { ListCreateFormData } from "@/lib/validations";
import { listCreateSchema } from "@/lib/validations";
import { Button } from "../ui/button";
import { FormError } from "../ui/form-error";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { MobileSheet } from "../ui/mobile-sheet";

interface ListCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

const kindOptions = [
  {
    value: "grocery",
    label: "Grocery",
    description: "Customizable shopping categories with starter examples",
    icon: ShoppingCart,
  },
  {
    value: "to-do",
    label: "To-do",
    description: "Customizable planning buckets with starter examples",
    icon: ListTodo,
  },
  {
    value: "general",
    label: "General",
    description: "Flexible checklist; add categories whenever useful",
    icon: ClipboardList,
  },
] as const;

const listCreateFormId = "list-create-form";

export function ListCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: ListCreateSheetProps) {
  const form = useForm<ListCreateFormData>({
    resolver: zodResolver(listCreateSchema),
    defaultValues: { name: "", kind: "general" },
  });
  const selectedKind = form.watch("kind");
  const createList = useCreateList({
    onSuccess: (response) => {
      form.reset({ name: "", kind: "general" });
      onOpenChange(false);
      onCreated(response.data.id);
    },
  });

  return (
    <MobileSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="New List"
      initialHeight="half"
      headerRight={
        <Button
          type="submit"
          form={listCreateFormId}
          variant="ghost"
          size="sm"
          disabled={createList.isPending}
          className="px-1 text-primary hover:text-primary"
        >
          Create list
        </Button>
      }
    >
      <form
        id={listCreateFormId}
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => createList.mutate(values))}
      >
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Create list
        </button>
        <div className="space-y-2">
          <Label htmlFor="list-name">List name</Label>
          <Input id="list-name" autoComplete="off" {...form.register("name")} />
          <FormError message={form.formState.errors.name?.message} />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">
            List kind
          </legend>
          {kindOptions.map((option) => {
            const Icon = option.icon;
            const checked = selectedKind === option.value;

            return (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-16 items-start gap-3 rounded-lg border border-border p-3 transition-colors",
                  checked && "border-primary bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  value={option.value}
                  checked={checked}
                  onChange={() => form.setValue("kind", option.value)}
                  aria-label={option.label}
                  className="mt-1"
                />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="block text-sm leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
          <FormError message={form.formState.errors.kind?.message} />
        </fieldset>
      </form>
    </MobileSheet>
  );
}
