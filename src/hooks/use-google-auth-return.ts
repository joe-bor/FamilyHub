import { useEffect } from "react";
import { toast } from "@/components/ui/toaster";
import { useAppStore } from "@/stores";

const STORAGE_KEY = "google-auth-return";
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

interface GoogleAuthReturnState {
  memberId: string;
  returnTo: string;
  timestamp: number;
}

export function useGoogleAuthReturn() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("googleConnected");
    const error = params.get("error");

    if (!success && !error) return;

    // Clean up query params
    const url = new URL(window.location.href);
    url.searchParams.delete("googleConnected");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.pathname + url.search);

    // Read and clean up return state
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);

    let returnState: GoogleAuthReturnState | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as GoogleAuthReturnState;
        if (Date.now() - parsed.timestamp < STALE_THRESHOLD_MS) {
          returnState = parsed;
        }
      } catch {
        // Ignore corrupt data
      }
    }

    if (success === "true") {
      toast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar events will appear shortly.",
      });

      if (returnState) {
        useAppStore.getState().openSidebar();
        sessionStorage.setItem("open-member-profile", returnState.memberId);
      }
    } else if (error) {
      const messages: Record<string, string> = {
        consent_denied:
          "Google Calendar access was denied. You can try again anytime.",
        token_exchange_failed:
          "Failed to connect Google Calendar. Please try again.",
      };
      toast({
        title: "Connection failed",
        description:
          messages[error] ??
          "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  }, []);
}
