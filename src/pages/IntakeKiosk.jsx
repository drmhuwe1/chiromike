import { useEffect } from 'react';
import PatientIntake from './PatientIntake';

export default function IntakeKiosk() {
  useEffect(() => {
    // Kiosk mode: prevent back navigation and hide address bar
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', () => {
      window.history.pushState(null, null, window.location.href);
    });

    // Try to enter fullscreen (some browsers allow this on kiosk tablets)
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    }

    // Disable common browser shortcuts that could navigate away
    const handleKeyDown = (e) => {
      // Prevent Alt+Left (back), Backspace, Escape, F11, etc.
      if ((e.altKey && e.key === 'ArrowLeft') || 
          e.key === 'Backspace' ||
          e.key === 'Escape' ||
          e.key === 'F11' ||
          (e.ctrlKey && e.key === 'w')) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <PatientIntake />;
}