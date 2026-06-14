import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PWAUpdater } from "@/components/pwa/pwa-updater";
import { startInstallPromptCapture } from "@/hooks/use-install-prompt";
import { QueryProvider } from "@/providers/query-provider";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-500.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "./index.css";
import App from "./App.tsx";

// Capture the Chromium `beforeinstallprompt` event from bootstrap — Chrome fires
// it once, early, before the sidebar (and `InstallAppRow`) ever mounts.
startInstallPromptCapture();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <PWAUpdater />
    </QueryProvider>
  </StrictMode>,
);
