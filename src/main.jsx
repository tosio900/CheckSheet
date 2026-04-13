import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { CheckSessionProvider } from "./providers/CheckSessionContext";
import { TemplateProvider } from "./providers/TemplateContext";
import ErrorBoundary from "./components/common/ErrorBoundary";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <TemplateProvider>
        <CheckSessionProvider>
          <App />
        </CheckSessionProvider>
      </TemplateProvider>
    </ErrorBoundary>
  </StrictMode>
);
