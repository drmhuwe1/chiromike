import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
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
import BillingDashboard from './pages/BillingDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
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
        <Route path="/billing" element={<BillingDashboard />} />
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