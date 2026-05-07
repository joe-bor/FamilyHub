import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCreateListItem, useUpdateListItem } from "@/api";
import type { ListDetail, ListItem } from "@/lib/types";
import type { ListItemFormData } from "@/lib/validations";
import { listItemSchema } from "@/lib/validations";
import { Button } from "../ui/button";
import { FormError } from "../ui/form-error";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { MobileSheet } from "../ui/mobile-sheet";

interface ListItemSheetProps {
  open: boolean;
  mode: "create" | "edit";
  list: ListDetail;
  item: ListItem | null;
  onOpenChange: (open: boolean) => void;
}

const listItemFormId = "list-item-form";

export function ListItemSheet({
  open,
  mode,
  list,
  item,
  onOpenChange,
}: ListItemSheetProps) {
  const form = useForm<ListItemFormData>({
    resolver: zodResolver(listItemSchema),
    defaultValues: {
      text: item?.text ?? "",
      categoryId: item?.categoryId ?? null,
    },
  });
  const createItem = useCreateListItem(list.id);
  const updateItem = useUpdateListItem(list.id);
  const categoryId = form.watch("categoryId") ?? "";
  const supportsCategories = list.kind !== "general";

  useEffect(() => {
    if (open) {
      form.reset({
        text: item?.text ?? "",
        categoryId: item?.categoryId ?? null,
      });
    }
  }, [form, item, open]);

  const isPending = createItem.isPending || updateItem.isPending;

  function submit(values: ListItemFormData) {
    if (mode === "edit" && item) {
      updateItem.mutate(
        {
          itemId: item.id,
          request: {
            text: values.text,
            completed: item.completed,
            categoryId: values.categoryId ?? null,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
      return;
    }

    createItem.mutate(
      {
        text: values.text,
        categoryId: values.categoryId ?? null,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <MobileSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={mode === "edit" ? "Edit Item" : "Add Item"}
      headerRight={
        <Button
          type="submit"
          form={listItemFormId}
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="px-1 text-primary hover:text-primary"
        >
          Save item
        </Button>
      }
    >
      <form
        id={listItemFormId}
        className="space-y-5"
        onSubmit={form.handleSubmit(submit)}
      >
        <div className="space-y-2">
          <Label htmlFor="item-text">Item text</Label>
          <Input id="item-text" autoComplete="off" {...form.register("text")} />
          <FormError message={form.formState.errors.text?.message} />
        </div>

        {supportsCategories && (
          <div className="space-y-2">
            <Label htmlFor="item-category">Category</Label>
            <select
              id="item-category"
              value={categoryId}
              onChange={(event) =>
                form.setValue("categoryId", event.target.value || null)
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] leading-5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Uncategorized</option>
              {list.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FormError message={form.formState.errors.categoryId?.message} />
          </div>
        )}
      </form>
    </MobileSheet>
  );
}
