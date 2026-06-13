import { MobileSheet } from "@/components/ui/mobile-sheet";
import { isIOS } from "@/lib/pwa";

interface InstallInstructionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Manual install instructions for browsers that never fire
 * `beforeinstallprompt` (iOS Safari, Firefox). Platform-specific copy.
 */
export function InstallInstructionsSheet({
  isOpen,
  onClose,
}: InstallInstructionsSheetProps) {
  const ios = isIOS();

  return (
    <MobileSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Install Family Hub"
      initialHeight="half"
    >
      <div className="space-y-4 px-4 pb-6 text-sm text-foreground">
        <p className="text-muted-foreground">
          Add Family Hub to your home screen so it opens like an app.
        </p>
        {ios ? (
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Tap the <span className="font-semibold">Share</span> button in
              Safari's toolbar.
            </li>
            <li>
              Choose <span className="font-semibold">Add to Home Screen</span>.
            </li>
            <li>
              Tap <span className="font-semibold">Add</span> — Family Hub
              appears on your home screen.
            </li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-2 pl-5">
            <li>Open your browser menu (⋮ or ☰).</li>
            <li>
              Choose <span className="font-semibold">Install</span> or{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </li>
            <li>Confirm to add Family Hub to your home screen.</li>
          </ol>
        )}
      </div>
    </MobileSheet>
  );
}
