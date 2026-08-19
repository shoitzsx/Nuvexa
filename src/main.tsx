import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ToastProvider } from "./components/ToastProvider";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <App />
            <ToastProvider />
          </AuthProvider>
        </MotionConfig>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
