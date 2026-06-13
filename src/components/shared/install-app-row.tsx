import { Download } from "lucide-react";
import { useState } from "react";
import { InstallInstructionsSheet } from "@/components/shared/install-instructions-sheet";
import { useInstallPrompt } from "@/hooks";
import { isStandalone } from "@/lib/pwa";

/**
 * Sidebar "Install app" row with three states:
 * - already installed/standalone -> not rendered
 * - Chromium (beforeinstallprompt available) -> one-tap install
 * - otherwise (iOS Safari, Firefox) -> opens manual instructions
 */
export function InstallAppRow() {
  // display-mode does not change within a session; read once at mount.
  const [installed] = useState(() => isStandalone());
  const { canInstall, promptInstall } = useInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);

  if (installed) return null;

  const handleClick = () => {
    if (canInstall) {
      void promptInstall();
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full min-h-11 flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Download className="h-5 w-5" />
        Install app
      </button>
      <InstallInstructionsSheet
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </>
  );
}
