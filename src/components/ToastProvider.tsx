import { Toaster } from "sonner";
import { useTheme } from "../hooks/useTheme";

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      closeButton
      duration={4_000}
      position="top-right"
      richColors
      theme={theme}
      toastOptions={{ className: "finantrack-toast" }}
    />
  );
}