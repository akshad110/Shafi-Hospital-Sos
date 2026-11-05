import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionGate } from './session'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { PageSkeleton } from '../components/ui/States'

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const FindSosPage = lazy(() => import('../features/find-sos/FindSosPage'))
const CreateRequestPage = lazy(() => import('../features/staffing-requests/CreateRequestPage'))
const ApplicationsPage = lazy(() => import('../features/applications/ApplicationsPage'))
const ShiftsPage = lazy(() => import('../features/shifts/ShiftsPage'))
const WorkersPage = lazy(() => import('../features/workers/WorkersPage'))
const AttendancePage = lazy(() => import('../features/attendance/AttendancePage'))
const ContractPage = lazy(() => import('../features/attendance/ContractPage'))
const SubscriptionPage = lazy(() => import('../features/subscriptions/SubscriptionPage'))
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage'))
const ProfilePage = lazy(() => import('../features/hospital-profile/ProfilePage'))
const HelpPage = lazy(() => import('../features/settings/HelpPage'))

function Screen({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <SessionGate login={<AuthRoutes />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Screen><DashboardPage /></Screen>} />
          <Route path="/find" element={<Screen><FindSosPage /></Screen>} />
          <Route path="/requests/new" element={<Screen><CreateRequestPage /></Screen>} />
          <Route path="/applications" element={<Screen><ApplicationsPage /></Screen>} />
          <Route path="/shifts" element={<Screen><ShiftsPage /></Screen>} />
          <Route path="/workers" element={<Screen><WorkersPage /></Screen>} />
          <Route path="/attendance" element={<Screen><AttendancePage /></Screen>} />
          <Route path="/attendance/:id" element={<Screen><ContractPage /></Screen>} />
          <Route path="/subscription" element={<Screen><SubscriptionPage /></Screen>} />
          <Route path="/notifications" element={<Screen><NotificationsPage /></Screen>} />
          <Route path="/profile" element={<Screen><ProfilePage /></Screen>} />
          <Route path="/help" element={<Screen><HelpPage /></Screen>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SessionGate>
  )
}

function AuthRoutes() {
  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<LoginPage />} />
    </Routes>
  )
}
