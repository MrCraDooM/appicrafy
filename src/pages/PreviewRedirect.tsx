import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function PreviewRedirect() {
  const { snackId } = useParams<{ snackId: string }>();
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const snackUrl = snackId
    ? `https://snack.expo.dev/${snackId}?platform=web&preview=true&theme=dark`
    : null;

  useEffect(() => {
    // Detect if already installed as standalone
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone) return; // already installed, no banner needed

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    setShowBanner(true);

    const dismissTimeout = setTimeout(() => setShowBanner(false), 12000);
    return () => clearTimeout(dismissTimeout);
  }, []);

  if (!snackId) return null;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#000" }}>
      {/* Install banner */}
      {showBanner && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          background: "linear-gradient(135deg,#6C63FF,#a78bfa)",
          padding: "10px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span style={{ fontSize: 20 }}>📲</span>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: 0 }}>Install this app</p>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, margin: 0 }}>
                {isIOS
                  ? "Tap the Share button → \"Add to Home Screen\""
                  : "Tap the browser menu → \"Install App\" or \"Add to Home Screen\""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Snack iframe fullscreen */}
      <iframe
        src={snackUrl!}
        style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
        allow="accelerometer; camera; gyroscope; microphone"
        title="App Preview"
      />
    </div>
  );
}
