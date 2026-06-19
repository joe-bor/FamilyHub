import { Bell, LocateFixed, Palette, Vibrate, X } from "lucide-react";
import { useState } from "react";
import { useFamilyData, useUpdateFamily } from "@/api";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Label } from "@/components/ui/label";
import { ResponsiveFormDialog } from "@/components/ui/responsive-form-dialog";
import { Switch } from "@/components/ui/switch";
import { canVibrate } from "@/lib/haptics";
import { type HapticCategory, useHapticsPreference } from "@/stores";

/**
 * Curated US zones offered in the timezone select. The family's current zone
 * is appended when it is not in this list, so non-US families always see
 * their stored value.
 */
const CURATED_TIMEZONES: ReadonlyArray<{ id: string; label: string }> = [
  { id: "America/New_York", label: "Eastern — America/New_York" },
  { id: "America/Chicago", label: "Central — America/Chicago" },
  { id: "America/Denver", label: "Mountain — America/Denver" },
  { id: "America/Phoenix", label: "Arizona — America/Phoenix" },
  { id: "America/Los_Angeles", label: "Pacific — America/Los_Angeles" },
  { id: "America/Anchorage", label: "Alaska — America/Anchorage" },
  { id: "Pacific/Honolulu", label: "Hawaii — Pacific/Honolulu" },
];

const COMING_SOON_ROWS = [
  { icon: Bell, label: "Notifications" },
  { icon: Palette, label: "Appearance" },
] as const;

const SUB_TOGGLES: ReadonlyArray<{ key: HapticCategory; label: string }> = [
  { key: "taps", label: "Taps" },
  { key: "completions", label: "Completions" },
  { key: "back", label: "Back" },
];

interface PreferencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Family-wide app preferences: the BE-backed family timezone plus disabled
 * roadmap stubs. Family Settings owns "who we are"; this surface owns "how
 * the app behaves".
 */
export function PreferencesSheet({
  open,
  onOpenChange,
}: PreferencesSheetProps) {
  const family = useFamilyData();
  // Shown straight from GET /family — undefined (no default) until it loads.
  const timezone = family?.timezone;

  const [saveError, setSaveError] = useState<string | null>(null);
  const updateFamilyMutation = useUpdateFamily({
    onError: (error) => setSaveError(error.message),
  });

  const hapticsSupported = canVibrate();
  const hapticsEnabled = useHapticsPreference((s) => s.enabled);
  const hapticCategories = useHapticsPreference((s) => s.categories);
  const setHapticsEnabled = useHapticsPreference((s) => s.setEnabled);
  const setHapticCategory = useHapticsPreference((s) => s.setCategory);

  const saveTimezone = (zone: string) => {
    if (!zone || zone === timezone) return;
    setSaveError(null);
    updateFamilyMutation.mutate({ timezone: zone });
  };

  const useDeviceTimezone = () => {
    saveTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  };

  const zoneOptions =
    timezone && !CURATED_TIMEZONES.some((tz) => tz.id === timezone)
      ? [...CURATED_TIMEZONES, { id: timezone, label: timezone }]
      : CURATED_TIMEZONES;

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Preferences"
      initialHeight="full"
      dialogClassName="max-w-lg max-h-[90dvh] overflow-y-auto"
      titleClassName="text-xl"
      desktopHeaderRight={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      }
    >
      <div className="space-y-8 py-4">
        {/* Family Timezone Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Family Timezone
          </h3>
          <div className="space-y-2">
            <Label htmlFor="family-timezone">Family timezone</Label>
            <select
              id="family-timezone"
              value={timezone ?? ""}
              onChange={(event) => saveTimezone(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-[15px] leading-5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {timezone === undefined && (
                <option value="" disabled>
                  Loading timezone…
                </option>
              )}
              {zoneOptions.map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.label}
                </option>
              ))}
            </select>
            <FormError message={saveError ?? undefined} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useDeviceTimezone}
            className="gap-2"
          >
            <LocateFixed className="h-4 w-4" />
            Use this device's timezone
          </Button>
        </section>

        {/* Haptics Section (capability-gated: hidden on iOS/desktop) */}
        {hapticsSupported && (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Haptics
            </h3>
            <Label
              htmlFor="haptics-master"
              className="flex min-h-11 items-center justify-between gap-3 font-medium"
            >
              <span className="flex items-center gap-2">
                <Vibrate className="h-4 w-4" />
                Enable haptics
              </span>
              <Switch
                id="haptics-master"
                aria-label="Enable haptics"
                checked={hapticsEnabled}
                onCheckedChange={setHapticsEnabled}
              />
            </Label>
            {hapticsEnabled && (
              <div className="space-y-1 pl-6">
                {SUB_TOGGLES.map(({ key, label }) => (
                  <Label
                    key={key}
                    htmlFor={`haptics-${key}`}
                    className="flex min-h-11 items-center justify-between gap-3 font-normal text-muted-foreground"
                  >
                    {label}
                    <Switch
                      id={`haptics-${key}`}
                      aria-label={label}
                      checked={hapticCategories[key]}
                      onCheckedChange={(on) => setHapticCategory(key, on)}
                    />
                  </Label>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Coming Soon Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Coming Soon
          </h3>
          <div className="space-y-1">
            {COMING_SOON_ROWS.map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.label}
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="w-full min-h-11 flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
                >
                  <Icon className="h-5 w-5" />
                  {row.label}
                  <span className="ml-auto text-xs font-normal rounded-full border border-border px-2 py-0.5">
                    Coming soon
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </ResponsiveFormDialog>
  );
}
