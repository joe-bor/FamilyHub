import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  googleCalendarService,
  useDisconnectGoogle,
  useGoogleConnectionStatus,
  useSyncGoogleCalendar,
} from "@/api";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { GoogleCalendarPickerModal } from "./google-calendar-picker-modal";

interface GoogleCalendarSectionProps {
  memberId: string;
  memberEmail: string;
  memberName: string;
}

export function GoogleCalendarSection({
  memberId,
  memberEmail,
  memberName,
}: GoogleCalendarSectionProps) {
  const { data: statusResponse, isLoading } =
    useGoogleConnectionStatus(memberId);
  const syncMutation = useSyncGoogleCalendar();
  const disconnectMutation = useDisconnectGoogle();
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const status = statusResponse?.data;
  const isConnected = status?.connected ?? false;
  const isSyncing = syncMutation.isPending;

  const handleConnect = async () => {
    try {
      const response = await googleCalendarService.getAuthUrl(memberId);
      sessionStorage.setItem(
        "google-auth-return",
        JSON.stringify({
          memberId,
          returnTo: "member-profile",
          timestamp: Date.now(),
        }),
      );
      window.location.href = response.data.url;
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSync = () => {
    syncMutation.mutate(memberId, {
      onSuccess: () => {
        toast({
          title: "Sync started",
          description: "Your Google Calendar events are being synced.",
        });
      },
      onError: () => {
        toast({
          title: "Sync failed",
          description: "Could not sync. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(memberId, {
      onSuccess: () => {
        setShowDisconnectConfirm(false);
        toast({
          title: "Disconnected",
          description: "Google Calendar has been disconnected.",
        });
      },
      onError: () => {
        toast({
          title: "Disconnect failed",
          description: "Could not disconnect. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Google Calendar</p>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  const lastSyncedAt = status?.calendars?.[0]?.lastSyncedAt;
  const lastSyncedLabel = lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
    : "Never synced";

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Google Calendar</p>

      {!isConnected ? (
        <div className="space-y-2">
          <Button
            type="button"
            onClick={handleConnect}
            disabled={!memberEmail}
            className="w-full"
          >
            Connect Google Calendar
          </Button>
          {!memberEmail && (
            <p className="text-xs text-muted-foreground">
              Add an email address to connect Google Calendar
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-foreground">Connected</span>
          </div>
          <p className="text-xs text-muted-foreground">{lastSyncedLabel}</p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCalendarPicker(true)}
            >
              Choose Calendars
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Now"
              )}
            </Button>
          </div>

          {showDisconnectConfirm ? (
            <div className="space-y-2 p-3 border border-border rounded-md">
              <p className="text-xs text-muted-foreground">
                This will remove all synced Google events for {memberName}.
                Events created in FamilyHub are not affected.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectConfirm(false)}
                  disabled={disconnectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending
                    ? "Disconnecting..."
                    : "Confirm Disconnect"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDisconnectConfirm(true)}
              className="text-xs text-destructive hover:underline"
            >
              Disconnect
            </button>
          )}
        </div>
      )}

      <GoogleCalendarPickerModal
        open={showCalendarPicker}
        onOpenChange={setShowCalendarPicker}
        memberId={memberId}
      />
    </div>
  );
}
