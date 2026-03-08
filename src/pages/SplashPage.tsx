import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const GITHUB_REPO = 'https://github.com/mitchleonard/daily';

const INSTALL_PROMPT = `I want to set up Daily, a habit tracker from github.com/mitchleonard/daily

Please help me:
1. Clone the repo to my computer
2. Install dependencies and run it locally (it works in local-only mode without AWS)
3. Optionally: Set up AWS Cognito for auth so I can deploy and use it across devices
4. Optionally: Deploy to Vercel or another host

Walk me through each step and wait for my input when needed.`;

function FAQItem({
  question,
  children,
  defaultOpen = false,
}: {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-base font-medium text-white hover:text-gray-200 transition-colors"
        aria-expanded={open}
      >
        <span>{question}</span>
        <span className="text-gray-500 shrink-0" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="pb-4 text-gray-400 text-sm leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

function FAQSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="px-4 py-16 md:py-24 border-t border-white/5 bg-[#0b0b0b]">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Frequently asked questions
        </h2>
        <div>
          <FAQItem question="What is Daily?">
            <p>
              Daily is a web app—it runs entirely in your browser and is hosted
              at daily.mitchleonard.com. There’s no app store download required;
              open the site in Safari, Chrome, or any browser and use it. Sign up
              once and your habits sync across your phone, tablet, and computer.
            </p>
          </FAQItem>
          <FAQItem question="How do I add Daily to my phone's home screen?">
            <p className="mb-3">
              <strong className="text-white">iOS (iPhone / iPad):</strong> Open
              daily.mitchleonard.com in Safari → tap the Share icon (square with
              arrow) → &quot;Add to Home Screen&quot; → name it &quot;Daily&quot;
              → Add.
            </p>
            <p>
              <strong className="text-white">Android:</strong> Open
              daily.mitchleonard.com in Chrome → tap the three-dot menu (⋮) →
              &quot;Add to Home screen&quot; or &quot;Install app&quot; → Add.
            </p>
            <p className="mt-3 text-gray-500">
              After adding, the icon will appear on your home screen and open
              Daily in full-screen mode, similar to a native app.
            </p>
          </FAQItem>
          <FAQItem question="What are the different tabs?">
            <p className="mb-3">
              <strong className="text-white">Grid</strong> — Your main view. See
              all habits and their completion status for the week in a grid. Tap
              to mark done (✓), double-tap to mark skipped (—).
            </p>
            <p className="mb-3">
              <strong className="text-white">Habits</strong> — Manage your list:
              add, edit, reorder, or archive habits. Set each habit&apos;s
              schedule and appearance.
            </p>
            <p className="mb-3">
              <strong className="text-white">Analytics</strong> — View
              consistency, streaks, and habit connections over time. Tap a habit
              for detailed stats.
            </p>
            <p>
              <strong className="text-white">Settings</strong> — Export or
              import data, sign out, or manage your account.
            </p>
          </FAQItem>
          <FAQItem question="What do the Analytics features mean?">
            <p className="mb-3">
              <strong className="text-white">Accomplished today</strong> — How
              many habits you&apos;ve completed today out of those scheduled for
              today.
            </p>
            <p className="mb-3">
              <strong className="text-white">Most Consistent</strong> — Your top
              habits by completion rate over the last 30 days (minimum 6
              scheduled days).
            </p>
            <p className="mb-3">
              <strong className="text-white">Needs Attention</strong> — Habits
              scheduled for today that you haven&apos;t completed yet.
            </p>
            <p className="mb-3">
              <strong className="text-white">Habit Connections</strong> —
              Correlations like &quot;On days you complete Read 20 Pages, you
              complete Meditate 65% more often.&quot; Based on the last 30 days.
              Requires at least 2 active habits.
            </p>
            <p>
              <strong className="text-white">Streaks &amp; rates</strong> —
              Streak = consecutive scheduled days completed. Rate = completed ÷
              scheduled days over 7d, 30d, or 90d.
            </p>
          </FAQItem>
          <FAQItem question="I use another habit tracker. Can I import my data?">
            <p className="mb-3">
              Yes! If you can export your data from another app, you can format
              it as JSON and import it in <strong className="text-white">Settings</strong>. Go
              to Settings → Import Data and select your JSON file.
            </p>
            <p className="mb-3">
              The JSON must include <code className="text-gray-300">schemaVersion: 1</code>, a{' '}
              <code className="text-gray-300">habits</code> array, and a{' '}
              <code className="text-gray-300">logs</code> array. Each habit needs
              id, name, icon, color, scheduleDays, startDate, and other fields.
              Each log needs habitId, date (YYYY-MM-DD), and status
              (&quot;completed&quot; or &quot;skipped&quot;).
            </p>
            <p>
              Export a backup from Daily first to see the exact format, or ask
              your current app&apos;s support if they can export in this structure.
            </p>
          </FAQItem>
          <FAQItem question="What do I need when adding a habit? How does schedule work?">
            <p className="mb-3">
              <strong className="text-white">Required:</strong> A name and icon
              (emoji). You can also set a color. Daily uses your schedule and
              start date for trend analysis.
            </p>
            <p className="mb-3">
              <strong className="text-white">Schedule / frequency:</strong> Choose how
              often the habit is due:
            </p>
            <ul className="list-disc list-inside mb-3 space-y-1">
              <li>
                <strong className="text-white">Daily</strong> — Every day
              </li>
              <li>
                <strong className="text-white">Specific days</strong> — e.g.
                Weekdays (Mon–Fri) or custom days
              </li>
              <li>
                <strong className="text-white">X× per week</strong> — Complete it
                a set number of times per week (e.g. 3×), any days you choose
              </li>
            </ul>
            <p>
              The schedule tells Daily which days count for streaks and
              completion rates, so you get accurate analytics over time.
            </p>
          </FAQItem>
          <FAQItem question="How do I build my own version?">
            <p className="mb-3">
              If you have Claude Code or Cursor, setup takes a few minutes. Paste
              this prompt:
            </p>
            <div className="relative rounded-xl overflow-hidden bg-[#1c1c1c] border border-white/10 mb-3">
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-accent-primary/90 hover:bg-accent-primary text-white text-sm font-medium transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 pr-24 overflow-x-auto text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {INSTALL_PROMPT}
              </pre>
            </div>
            <p>
              Or clone directly:{' '}
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-muted hover:text-accent-primary transition-colors"
              >
                {GITHUB_REPO}
              </a>
            </p>
          </FAQItem>
        </div>
      </div>
    </section>
  );
}

export function SplashPage() {
  const { isConfigured } = useAuth();

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      {/* Hero */}
      <header className="px-4 pt-12 pb-16 md:pt-20 md:pb-24 max-w-4xl mx-auto text-center bg-[#0b0b0b]">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
          Build the habits that shape your day.
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          A simple, visual habit tracker designed for consistency.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to="/signup"
            className="min-w-[7.5rem] px-6 py-2.5 rounded-lg bg-accent-primary text-white text-sm font-medium hover:opacity-90 transition-opacity text-center"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="min-w-[7.5rem] px-6 py-2.5 rounded-lg bg-dark-surface border border-dark-border text-white text-sm font-medium hover:bg-dark-elevated transition-colors text-center"
          >
            Sign in
          </Link>
          {!isConfigured && (
            <Link
              to="/app"
              className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Preview the app (no login)
            </Link>
          )}
        </div>
      </header>

      {/* Three phones — transparent PNG on #0b0b0b for seamless blend */}
      <section className="px-4 pb-16 md:pb-24 bg-[#0b0b0b]">
        <div className="max-w-5xl mx-auto">
          <img
            src="/splash/Daily_Mockup_3PhoneSpread_Transparent_Edited.png"
            alt="Daily app on iPhone: grid view, analytics, and habit details"
            className="w-full max-w-4xl mx-auto object-contain"
          />
        </div>
      </section>

      {/* See it in action — single full app demo video */}
      <section className="px-4 py-16 md:py-24 bg-[#0b0b0b] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            See it in action
          </h2>
          <p className="text-gray-400 text-center mb-12 md:mb-16 max-w-2xl mx-auto">
            Add habits, track on the grid, and check how it's all going.
          </p>
          <div className="rounded-2xl overflow-hidden border border-[#c0c0c0] bg-[#0b0b0b] max-w-[320px] mx-auto shadow-2xl">
            <video
              className="w-full h-auto block"
              poster="/splash/grid.png"
              autoPlay
              muted
              loop
              playsInline
              aria-label="Daily app demo: habit tracking flow"
            >
              <source src="/splash/app-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 md:py-24 border-t border-white/5 bg-[#0b0b0b]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Start building your habits
          </h2>
          <p className="text-gray-400 mb-8">
            Sign up and sync your progress across devices.
          </p>
          <Link
            to="/signup"
            className="inline-block px-5 py-2.5 rounded-lg bg-accent-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* FAQ (includes build your own version) */}
      <FAQSection />
    </div>
  );
}
