import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the SDK's built-in Google login which redirects to the OAuth flow
      await base44.auth.redirectToLogin(window.location.href);
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <header className="py-4 px-6 border-b border-border bg-card/50">
        <nav aria-label="Site navigation" className="max-w-4xl mx-auto flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium justify-end">
          <a href="/about" className="text-muted-foreground hover:text-primary transition-colors">About</a>
          <a href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy</a>
          <a href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms</a>
          <a href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
        </nav>
      </header>
      <main id="main-content" className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">ChiroMike</h1>
            <p className="text-muted-foreground">Practice Management System</p>
          </div>

          {/* Logo/Icon */}
          <div className="flex justify-center">
            <img src="https://media.base44.com/images/public/69dbc37eaf437642fe866557/b98a22851_ChatGPTImageApr13202611_09_56PM.png" alt="ChiroMike Logo" className="h-24 w-auto" />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white"/>
                </svg>
                Login
              </>
            )}
          </Button>

          {/* Footer Info */}
          <div className="text-center space-y-2 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Sign in with your authorized account
            </p>
            <p className="text-xs text-muted-foreground">
              For access, contact your administrator
            </p>
            <p className="text-xs text-muted-foreground">
              <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
              {" · "}
              <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure access for authorized practitioners
        </p>
      </div>
      </main>
      <footer className="py-4 px-6 border-t border-border bg-card/50 text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} Huwe Chiropractic — ChiroMike &nbsp;·&nbsp;
        <a href="/privacy" className="hover:underline">Privacy</a> &nbsp;·&nbsp;
        <a href="/terms" className="hover:underline">Terms</a>
      </footer>
    </div>
  );
}