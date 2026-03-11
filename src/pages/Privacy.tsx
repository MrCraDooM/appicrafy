import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

const LAST_UPDATED = "March 9, 2026";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <AppLogo size="sm" />
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-brand-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <p className="text-muted-foreground mb-12 leading-relaxed">
          AppicraFy ("we", "us", or "our") is committed to protecting your privacy. This policy explains
          what data we collect, how we use it, and your rights regarding it.
        </p>

        <div className="space-y-12">
          <Section title="1. Data We Collect">
            <p>We collect only the minimum data necessary to operate the service:</p>
            <Table
              rows={[
                ["Account info", "Email address, display name", "Authentication & account management"],
                ["Generated projects", "App source code, project name, description, file list", "Storage & re-download of your generated apps"],
                ["Usage data", "Number of generations, monthly limit, plan tier, reset date", "Enforcing plan limits & displaying usage in the dashboard"],
                ["Subscription data", "Paddle subscription ID, plan name, billing status, next billing date", "Managing your paid subscription via Paddle"],
                ["Technical logs", "Edge function execution logs (no personal content)", "Debugging & infrastructure reliability"],
              ]}
            />
            <Note>We do NOT store your payment card details. All payment processing is handled securely by <a href="https://paddle.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Paddle</a>.</Note>
          </Section>

          <Section title="2. How We Use Your Data">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Authentication</strong> — verifying your identity and keeping your session secure</li>
              <li><strong className="text-foreground">App generation</strong> — passing your prompt to an AI model and saving the result to your account</li>
              <li><strong className="text-foreground">Usage tracking</strong> — counting generations against your plan's monthly limit</li>
              <li><strong className="text-foreground">Subscription management</strong> — syncing billing events from Paddle to upgrade or downgrade your plan</li>
              <li><strong className="text-foreground">Security</strong> — detecting abuse, rate-limiting, and protecting other users</li>
            </ul>
            <Note>We do not sell, share, or rent your data to third parties for marketing purposes.</Note>
          </Section>

          <Section title="3. API Keys & Security">
            <p>
              AI generation keys are stored exclusively as
              encrypted server-side secrets and are <strong>never exposed to the frontend or client</strong>.
              All limit enforcement, generation, and billing validation happen exclusively on the backend.
            </p>
            <p className="mt-3">
              Mobile preview share links expire after <strong>24 hours</strong> and require authentication to access.
              Project ZIP downloads are only accessible to the authenticated project owner.
            </p>
          </Section>

          <Section title="4. Data Retention">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Account and project data is retained while your account is active</li>
              <li>When you delete your account, all associated data is permanently removed (see Your Rights below)</li>
              <li>Billing records may be retained by Paddle per their legal obligations</li>
              <li>Expired share tokens are automatically cleaned up periodically</li>
            </ul>
          </Section>

          <Section title="5. Third-Party Services">
            <Table
              rows={[
                ["Payment", "Payment processing & subscription management", "paddle.com/privacy"],
                [" API", "AI code generation for free-tier users", "policies.google.com/privacy"],
                ["AI", "AI code generation for paid-tier users", "openai.com/policies/privacy-policy"],
                ["Supabase", "Database, authentication & file storage", "supabase.com/privacy"],
              ]}
            />
          </Section>

          <Section title="6. Your Rights (GDPR & CCPA)">
            <p>You have the following rights over your personal data:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
              <li><strong className="text-foreground">Access</strong> — view all data we hold about you via your dashboard</li>
              <li><strong className="text-foreground">Download</strong> — export your generated projects as ZIP files at any time</li>
              <li><strong className="text-foreground">Delete projects</strong> — remove individual projects from your dashboard</li>
              <li><strong className="text-foreground">Delete account</strong> — permanently delete your account and all associated data from the Subscription page</li>
              <li><strong className="text-foreground">Cancel subscription</strong> — cancel your paid plan at any time; you will revert to the Free tier</li>
              <li><strong className="text-foreground">Correction</strong> — contact us to correct inaccurate information</li>
              <li><strong className="text-foreground">Portability</strong> — request a machine-readable export of your data by emailing us</li>
            </ul>
            <Note>EU users: you have the right to lodge a complaint with your local data protection authority.</Note>
          </Section>

          <Section title="7. Cookies">
            <p>
              AppicraFy uses a single essential cookie (session token) for authentication. We do not use
              third-party tracking, advertising, or analytics cookies. No cookie consent is required for
              essential session cookies under GDPR.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              AppicraFy is not directed at children under 16. We do not knowingly collect data from
              anyone under 16.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this policy from time to time. We will notify registered users by email of
              any material changes. The "Last updated" date at the top of this page reflects the most recent revision.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              For any privacy-related questions or data requests, contact us.
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} AppicraFy</span>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-accent/8 border border-accent/20 rounded-xl px-4 py-3 mt-4">
      <Shield className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mt-4 rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary text-left">
            <th className="px-4 py-2.5 font-semibold text-foreground">Category</th>
            <th className="px-4 py-2.5 font-semibold text-foreground">Data</th>
            <th className="px-4 py-2.5 font-semibold text-foreground">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([cat, data, purpose], i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{cat}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{data}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
