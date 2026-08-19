import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AccountPage } from "./pages/AccountPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { IncomeSourcesPage } from "./pages/IncomeSourcesPage";
import { RecurringExpensesPage } from "./pages/RecurringExpensesPage";
import { CreditCardsPage } from "./pages/CreditCardsPage";
import { InstallmentsPage } from "./pages/InstallmentsPage";
import { DebtsPage } from "./pages/DebtsPage";
import { SavingsGoalsPage } from "./pages/SavingsGoalsPage";
import { FinancialProjectionPage } from "./pages/FinancialProjectionPage";
import { CalendarPage } from "./pages/CalendarPage";
import { AlertsPage } from "./pages/AlertsPage";
import { ReportsPage } from "./pages/ReportsPage";

export function App() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/dashboard" />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<PrivacyPage />} path="/privacy" />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<AccountPage />} path="/account" />
          <Route element={<IncomeSourcesPage />} path="/income-sources" />
          <Route element={<RecurringExpensesPage />} path="/recurring-expenses" />
          <Route element={<CreditCardsPage />} path="/credit-cards" />
          <Route element={<InstallmentsPage />} path="/installments" />
          <Route element={<DebtsPage />} path="/debts" />
          <Route element={<SavingsGoalsPage />} path="/savings-goals" />
          <Route element={<FinancialProjectionPage />} path="/financial-projection" />
          <Route element={<CalendarPage />} path="/calendar" />
          <Route element={<AlertsPage />} path="/alerts" />
          <Route element={<ReportsPage />} path="/reports" />
        </Route>
      </Route>
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
