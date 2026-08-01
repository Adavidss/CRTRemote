import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { applyTheme, settingsStore } from "./state/settings.ts";
import "./index.css";

// Applied before the first paint so a non-default theme does not flash the
// default accent on the way in.
applyTheme(settingsStore.get().theme);

const container = document.getElementById("root");
if (!container) throw new Error("CRTRemote: #root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
