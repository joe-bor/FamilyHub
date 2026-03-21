import { useEffect, useState } from "react";
import {
  Toast,
  type ToastActionElement,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  open: boolean;
};

let toastCount = 0;
const listeners: Array<(toasts: ToastData[]) => void> = [];
let memoryToasts: ToastData[] = [];

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return toastCount.toString();
}

function dispatch(toasts: ToastData[]) {
  memoryToasts = toasts;
  for (const listener of listeners) {
    listener(toasts);
  }
}

export function toast({
  title,
  description,
  action,
  variant,
}: Omit<ToastData, "id" | "open">) {
  const id = genId();
  const newToast: ToastData = {
    id,
    title,
    description,
    action,
    variant,
    open: true,
  };

  dispatch([newToast, ...memoryToasts].slice(0, TOAST_LIMIT));

  setTimeout(() => {
    dispatch(
      memoryToasts.map((t) => (t.id === id ? { ...t, open: false } : t)),
    );
  }, TOAST_REMOVE_DELAY);

  return id;
}

function useToastState() {
  const [toasts, setToasts] = useState<ToastData[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return toasts;
}

export function Toaster() {
  const toasts = useToastState();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, open }) => (
        <Toast key={id} open={open} variant={variant}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
