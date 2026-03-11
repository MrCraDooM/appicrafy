import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "appicrafy_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not already accepted
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Short delay so it doesn't flash on first render
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Cookie className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-sm font-semibold">We use cookies</span>
          </div>
          <button
            onClick={accept}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          We use a single essential session cookie for authentication. No tracking,
          no ads, no third-party analytics.{" "}
          <Link to="/privacy" className="text-accent hover:underline" onClick={accept}>
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={accept}
          className="w-full h-8 brand-gradient text-brand-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
