import { Route, Routes } from "react-router-dom";
import { AccessComingSoonPage } from "./pages/AccessComingSoonPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PrivacyPage } from "./pages/PrivacyPage";

export function App() {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<AccessComingSoonPage />} path="/login" />
      <Route element={<PrivacyPage />} path="/privacy" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
