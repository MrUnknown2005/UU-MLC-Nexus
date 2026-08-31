import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.jsx";
import { ToastProvider } from "./components/ui/ToastProvider.jsx";
import { ConfirmProvider } from "./components/ui/ConfirmProvider.jsx";
import { PrivacyPolicyProvider } from "./components/legal/PrivacyPolicyProvider.jsx";
import { initTheme } from "./lib/theme.js";

/*
  Ordering matters here.

  ErrorBoundary is outermost so a crash inside a provider still renders the
  recovery screen. ToastProvider wraps ConfirmProvider because a confirm
  handler routinely reports its outcome with a toast, and never the reverse.
  PrivacyPolicyProvider sits innermost: nothing depends on it, it just needs to
  be above <App/> so the policy opens from any screen.
*/
initTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <PrivacyPolicyProvider>
            <App />
          </PrivacyPolicyProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
