import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PWAUpdater } from "@/components/pwa/pwa-updater";
import { QueryProvider } from "@/providers/query-provider";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-500.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <PWAUpdater />
    </QueryProvider>
  </StrictMode>,
);
