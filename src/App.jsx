import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoginPage from '@/components/LoginPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Calendar from './pages/Calendar';
import ClaimBuilder from './pages/ClaimBuilder';
import SavedClaims from './pages/SavedClaims';
import ProcedureLibrary from './pages/ProcedureLibrary';
import DiagnosisFavorites from './pages/DiagnosisFavorites';
import QuickTemplates from './pages/QuickTemplates';
import Reports from './pages/Reports';
import OfficeSettings from './pages/OfficeSettings';
import PrintClaim from './pages/PrintClaim';
import PrintReceipt from './pages/PrintReceipt';
import CodeLibrary from './pages/CodeLibrary';
import PatientIntake from './pages/PatientIntake';
import PatientAccount from './pages/PatientAccount';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import BillingDashboard from './pages/BillingDashboard';
import HelpGuide from './pages/HelpGuide';
import Compliance from './pages/Compliance';
import SoapNotes from './pages/SoapNotes';
import NewPatientExam from './pages/NewPatientExam';
import ReExamination from './pages/ReExamination';
import FinancialReports from './pages/FinancialReports';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Allow intake and payment routes to render without auth checks
  const isPublicRoute = window.location.pathname.startsWith('/intake') || 
                        window.location.pathname === '/payment-success' || 
                        window.location.pathname === '/payment-cancelled';

  // Show loading spinner while checking app public settings or auth (skip for public routes)
  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
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
      // Show login page for auth required
      return <LoginPage />;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Public routes - no layout */}
      <Route path="/intake" element={<PatientIntake />} />
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
        <Route path="/intake" element={<PatientIntake />} />
        <Route path="/patient-account" element={<PatientAccount />} />
        <Route path="/billing" element={<BillingDashboard />} />
        <Route path="/guide" element={<HelpGuide />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/soap-notes" element={<SoapNotes />} />
        <Route path="/new-patient-exam" element={<NewPatientExam />} />
        <Route path="/re-examination" element={<ReExamination />} />
        <Route path="/financial-reports" element={<FinancialReports />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
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
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App