import { Link } from "react-router-dom";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

const LAST_UPDATED = "March 9, 2026";

export default function Terms() {
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
            <FileText className="w-5 h-5 text-brand-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <p className="text-muted-foreground mb-12 leading-relaxed">
          By creating an account or using AppicraFy, you agree to these Terms of Service. Please read
          them carefully. If you do not agree, do not use the service.
        </p>

        <div className="space-y-12">
          <Section title="1. The Service">
            <p>
              AppicraFy is an AI-powered mobile app generator that creates React Native + Expo source
              code based on your text prompts. The generated code is provided to you as a ZIP file that
              you own and may use freely.
            </p>
          </Section>

          <Section title="2. Your Account">
            <ul className="list-disc list-inside space-y-2">
              <li>You must provide accurate information when registering</li>
              <li>You are responsible for keeping your account credentials secure</li>
              <li>You must be at least 16 years old to use the service</li>
              <li>You may only create one account per person</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
            </ul>
          </Section>

          <Section title="3. Plans & Billing">
            <PlanCard
              name="Free"
              price="$0"
              items={["1 app generation per month", "AI powered", "Full source code download"]}
            />
            <PlanCard
              name="Starter"
              price="$19.99/mo"
              items={["5 app generations per month", "AI powered", "Full source code download", "Mobile QR install preview"]}
            />
            <PlanCard
              name="Pro"
              price="$59.99/mo"
              items={["Unlimited app generations", "AI powered", "Full source code download", "Mobile QR install preview"]}
            />
            <p className="mt-4">
              Subscriptions are billed monthly via Paddle. Prices are in USD. By subscribing, you
              authorize Paddle to charge your payment method on a recurring basis. You may cancel at
              any time; cancellation takes effect at the end of the billing period.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree NOT to use AppicraFy to:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Generate apps that contain malware, spyware, or other harmful code</li>
              <li>Violate any applicable law or regulation</li>
              <li>Infringe intellectual property rights of third parties</li>
              <li>Attempt to reverse-engineer, scrape, or abuse our AI generation infrastructure</li>
              <li>Create fraudulent or deceptive applications</li>
              <li>Circumvent usage limits or plan restrictions</li>
            </ul>
          </Section>

          <Section title="5. Ownership of Generated Code">
            <p>
              You retain full ownership of all source code generated for you through AppicraFy. We
              grant no license claims over your generated output. You may use, modify, distribute, and
              sell the generated code without restriction.
            </p>
            <p className="mt-3">
              We may use anonymized, aggregated prompt data to improve our generation quality. We will
              never share your specific prompts or generated code with other users.
            </p>
          </Section>

          <Section title="6. Service Availability">
            <p>
              We aim for high availability but do not guarantee uninterrupted service. AI generation
              depends on third-party AI providers and may be affected by their outages. Usage limits
              reset monthly from your account creation date.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              AppicraFy is provided "as is" without warranty of any kind. We are not liable for any
              indirect, incidental, or consequential damages arising from your use of the service or
              the generated code. Our maximum liability to you is limited to the amount you paid us in
              the 12 months preceding any claim.
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              You may delete your account at any time from the Subscription page. Deletion is
              permanent and removes all your projects, usage data, and account information.
              Canceling your paid subscription downgrades you to the Free tier; your data is not deleted.
            </p>
          </Section>

          <Section title="9. Changes to These Terms">
            <p>
              We may modify these terms at any time. We will notify you via email of material changes
              at least 14 days before they take effect. Continued use of the service after changes
              constitutes acceptance.
            </p>
          </Section>

          <Section title="10. Governing Law">
            <p>
              These terms are governed by applicable law. Disputes shall be resolved through binding
              arbitration, except where prohibited by law.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For questions about these terms, please contact us through the platform.
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

function PlanCard({ name, price, items }: { name: string; price: string; items: string[] }) {
  return (
    <div className="border border-border rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm text-foreground">{name}</span>
        <span className="text-sm font-semibold text-accent">{price}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
