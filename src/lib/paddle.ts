/**
 * Paddle Billing v2 checkout helper.
 * Uses server-side transaction creation — no Paddle.js overlay, no domain whitelist needed.
 */

export async function openPaddleCheckout(
  planKey: "starter" | "pro",
  _userEmail: string,
  accessToken: string
): Promise<void> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/create-checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ planKey }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to create checkout");
  }

  if (!data.checkoutUrl) {
    throw new Error("No checkout URL returned");
  }

  // Redirect to Paddle hosted checkout — no domain whitelist needed
  window.location.href = data.checkoutUrl;
}
