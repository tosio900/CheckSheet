import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { CheckSessionProvider } from "./providers/CheckSessionContext";
import ErrorBoundary from "./components/common/ErrorBoundary";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <CheckSessionProvider>
        <App />
      </CheckSessionProvider>
    </ErrorBoundary>
  </StrictMode>
);
