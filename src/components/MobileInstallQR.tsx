import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileInstallQRProps {
  projectId: string;
  projectName: string;
  session: { access_token: string } | null;
  snackId?: string | null;
}

export function MobileInstallQR({ projectName, session, snackId }: MobileInstallQRProps) {
  const [open, setOpen] = useState(false);

  const qrUrl = snackId ? `${window.location.origin}/preview/${snackId}` : null;
  const snackUrl = snackId ? `https://snack.expo.dev/${snackId}` : null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 rounded-lg text-xs gap-1.5"
        onClick={() => setOpen(true)}
        disabled={!session || !snackId}
        title="Scan QR to open on your phone"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Test on Phone</span>
      </Button>

      {open && snackUrl && qrUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 brand-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">Test on Your Phone</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{projectName}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center px-5 py-6 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <QRCodeSVG
                  value={qrUrl}
                  size={180}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#0f0f11"
                />
              </div>

              <p className="text-xs text-center text-muted-foreground leading-relaxed max-w-[240px]">
                Scan to run the app live — then <strong className="text-foreground">install it on your home screen</strong> with no App Store needed.
              </p>

              {/* Steps */}
              <div className="w-full space-y-2">
                {[
                  { step: "1", text: <>Scan with your <strong>camera app</strong> — app opens in browser</> },
                  { step: "2", text: <><strong>iPhone:</strong> tap Share → "Add to Home Screen"</> },
                  { step: "3", text: <><strong>Android:</strong> tap browser menu → "Install App"</> },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3 p-3 bg-secondary/60 rounded-xl">
                    <div className="w-5 h-5 rounded-full brand-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-white">{step}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
