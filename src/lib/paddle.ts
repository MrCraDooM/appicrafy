/**
 * Paddle Billing v2 frontend helper.
 * Client token and price IDs are loaded from the get-paddle-config edge function.
 */

declare global {
  interface Window {
    Paddle?: any;
  }
}

interface PaddleConfig {
  clientToken: string;
  starterPriceId: string;
  proPriceId: string;
}

let configCache: PaddleConfig | null = null;
let paddleInitialized = false;

async function loadPaddleConfig(): Promise<PaddleConfig> {
  if (configCache) return configCache;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/get-paddle-config`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load Paddle configuration");
  }

  configCache = await res.json();
  return configCache!;
}

async function ensurePaddleReady(): Promise<void> {
  if (paddleInitialized && window.Paddle) return;

  // Load Paddle.js script if not already loaded
  if (!window.Paddle) {
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[src*="paddle.js"]');
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Paddle.js"));
        document.head.appendChild(script);
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Paddle.js load timed out")), 10000)
      ),
    ]);
  }

  // Slight delay to ensure Paddle global is available after script load
  await new Promise((r) => setTimeout(r, 200));

  const config = await loadPaddleConfig();

  window.Paddle.Initialize({
    token: config.clientToken,
    eventCallback: (event: any) => {
      if (event.name === "checkout.completed") {
        // Redirect to success page after checkout completes
        setTimeout(() => {
          window.location.href = "/success";
        }, 1000);
      }
    },
  });

  paddleInitialized = true;
}

export async function openPaddleCheckout(
  planKey: "starter" | "pro",
  userEmail: string
): Promise<void> {
  await ensurePaddleReady();

  const config = await loadPaddleConfig();
  const priceId =
    planKey === "starter" ? config.starterPriceId : config.proPriceId;

  if (!priceId) {
    throw new Error(`No price ID configured for plan: ${planKey}`);
  }

  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: {
      email: userEmail,
    },
    customData: {
      plan: planKey,
    },
    settings: {
      displayMode: "overlay",
      theme: "dark",
      successUrl: `${window.location.origin}/success`,
    },
  });
}
