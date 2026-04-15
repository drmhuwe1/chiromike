import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie_consent");
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg p-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <p className="text-sm text-muted-foreground flex-1">
          This site uses essential cookies for authentication and session management.{" "}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
          {" · "}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
        </p>
        <Button size="sm" onClick={accept} className="shrink-0">Accept</Button>
      </div>
    </div>
  );
}