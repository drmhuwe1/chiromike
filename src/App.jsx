import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { isPublicPath } from '@/lib/publicRoutes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoginPage from '@/components/LoginPage';
import Layout from './components/Layout';
import CookieConsent from './components/CookieConsent';
import PWAInstallBadge from './components/PWAInstallBadge';

// Critical path — loaded eagerly (small, always needed on first render)
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import BAA from './pages/BAA';
import SLA from './pages/SLA';
import About from './pages/About';
import Contact from './pages/Contact';
import PatientIntake from './pages/PatientIntake';
import IntakeKiosk from './pages/IntakeKiosk';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';

// Heavy pages — code-split via React.lazy (jspdf, recharts, framer-motion heavy use)
// With webpack magic comments for chunk naming and optimization
const Calendar = lazy(() => import(/* webpackChunkName: "calendar" */ './pages/Calendar'));
const ClaimBuilder = lazy(() => import(/* webpackChunkName: "claim" */ './pages/ClaimBuilder'));
const SavedClaims = lazy(() => import(/* webpackChunkName: "claims" */ './pages/SavedClaims'));
const ProcedureLibrary = lazy(() => import(/* webpackChunkName: "codes" */ './pages/ProcedureLibrary'));
const DiagnosisFavorites = lazy(() => import(/* webpackChunkName: "codes" */ './pages/DiagnosisFavorites'));
const QuickTemplates = lazy(() => import(/* webpackChunkName: "templates" */ './pages/QuickTemplates'));
const Reports = lazy(() => import(/* webpackChunkName: "reports" */ './pages/Reports'));
const OfficeSettings = lazy(() => import(/* webpackChunkName: "admin" */ './pages/OfficeSettings'));
const PrintClaim = lazy(() => import(/* webpackChunkName: "print" */ './pages/PrintClaim'));
const PrintReceipt = lazy(() => import(/* webpackChunkName: "print" */ './pages/PrintReceipt'));
const CodeLibrary = lazy(() => import(/* webpackChunkName: "codes" */ './pages/CodeLibrary'));
const PatientAccount = lazy(() => import(/* webpackChunkName: "patient" */ './pages/PatientAccount'));
const BillingDashboard = lazy(() => import(/* webpackChunkName: "billing" */ './pages/BillingDashboard'));
const HelpGuide = lazy(() => import(/* webpackChunkName: "help" */ './pages/HelpGuide'));
const Compliance = lazy(() => import(/* webpackChunkName: "legal" */ './pages/Compliance'));
const SoapNotes = lazy(() => import(/* webpackChunkName: "clinical" */ './pages/SoapNotes'));
const ClinicalExamination = lazy(() => import(/* webpackChunkName: "clinical" */ './pages/ClinicalExamination'));
const ReExamination = lazy(() => import(/* webpackChunkName: "clinical" */ './pages/ReExamination'));
const FinancialReports = lazy(() => import(/* webpackChunkName: "reports" */ './pages/FinancialReports'));
const AdminStability = lazy(() => import(/* webpackChunkName: "admin" */ './pages/AdminStability'));

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();

  const isPublicRoute = isPublicPath(location.pathname);

  // Show loading spinner while checking app public settings or auth (skip for public routes)
  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors (skip for public routes)
  if (!isPublicRoute && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'user_not_authorized') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">{authError.message}</p>
            <p className="text-sm text-muted-foreground">Please contact your administrator for access.</p>
          </div>
        </div>
      );
    } else if (authError.type === 'auth_required') {
      return <LoginPage />;
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Unable to load app</h1>
          <p className="text-muted-foreground">{authError.message}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button type="button" onClick={() => navigateToLogin()}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isPublicRoute && !isAuthenticated) {
    return <LoginPage />;
  }

  // Render the main app
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>}>
    <Routes>
      {/* Public routes - no layout */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/baa" element={<BAA />} />
      <Route path="/sla" element={<SLA />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/intake" element={<PatientIntake />} />
      <Route path="/intake-kiosk" element={<IntakeKiosk />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancelled" element={<PaymentCancelled />} />
      
      {/* Protected app routes with layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/claim-builder" element={<ClaimBuilder />} />
        <Route path="/saved-claims" element={<SavedClaims />} />
        <Route path="/procedures" element={<ProcedureLibrary />} />
        <Route path="/diagnoses" element={<DiagnosisFavorites />} />
        <Route path="/templates" element={<QuickTemplates />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<OfficeSettings />} />
        <Route path="/print-claim" element={<PrintClaim />} />
        <Route path="/print-receipt" element={<PrintReceipt />} />
        <Route path="/code-library" element={<CodeLibrary />} />
        <Route path="/patient-account" element={<PatientAccount />} />
        <Route path="/billing" element={<BillingDashboard />} />
        <Route path="/guide" element={<HelpGuide />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/soap-notes" element={<SoapNotes />} />
        <Route path="/clinical-examination" element={<ClinicalExamination />} />
        <Route path="/re-examination" element={<ReExamination />} />
        <Route path="/financial-reports" element={<FinancialReports />} />
        <Route path="/admin/stability" element={<AdminStability />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <CookieConsent />
        <PWAInstallBadge />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App