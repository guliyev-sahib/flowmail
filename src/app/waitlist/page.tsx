"use client";

import { useEffect, useState } from "react";

/**
 * Phase-0 marketing landing page. Speaks to three audiences at once:
 * store owners (revenue + cost), developers (open source + stack), and the
 * privacy-minded (own your data). Its job is still one thing: capture emails.
 */

function WaitlistForm({ id }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: id ?? "landing" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="notice" role="status">
        🎉 You&apos;re on the list — we&apos;ll email you when the beta opens.
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@store.com"
        aria-label="Email address"
      />
      <button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "…" : "Join the waitlist"}
      </button>
      {state === "error" && (
        <p className="err">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}

function WaitlistCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/waitlist/count")
      .then((r) => r.json())
      .then((d) => setN(typeof d.count === "number" ? d.count : null))
      .catch(() => {});
  }, []);
  // Honest social proof: only show once the number actually means something.
  if (n === null || n < 15) return null;
  return <p className="count">🔥 {n}+ stores already on the waitlist</p>;
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function RoiCalculator() {
  const [orders, setOrders] = useState(300);
  const [aov, setAov] = useState(60);

  // Model (transparent assumptions): ~70% of carts are abandoned, so completed
  // orders are ~30% of carts. A solid abandoned-cart flow recovers ~10% of the
  // abandoned ones.
  const carts = orders / 0.3;
  const abandoned = carts * 0.7;
  const recoveredOrders = abandoned * 0.1;
  const monthly = recoveredOrders * aov;
  const yearly = monthly * 12;

  return (
    <div className="calc">
      <div className="calc-inputs">
        <label>
          <span>
            Monthly orders: <strong>{orders.toLocaleString()}</strong>
          </span>
          <input
            type="range"
            min={10}
            max={3000}
            step={10}
            value={orders}
            onChange={(e) => setOrders(Number(e.target.value))}
          />
        </label>
        <label>
          <span>
            Average order value: <strong>{money(aov)}</strong>
          </span>
          <input
            type="range"
            min={10}
            max={400}
            step={5}
            value={aov}
            onChange={(e) => setAov(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="calc-out">
        <div className="calc-out-label">Revenue you could recover</div>
        <div className="calc-monthly">{money(monthly)}<span>/mo</span></div>
        <div className="calc-yearly">≈ {money(yearly)} per year</div>
        <a className="price-cta" href="#join-final">
          Start recovering it →
        </a>
      </div>
    </div>
  );
}

const features = [
  {
    icon: "🛒",
    title: "Abandoned cart recovery",
    body: "Multi-step flows that bring shoppers back — with the exact items they left, dynamic discounts, and smart timing. The single highest-ROI email in e-commerce.",
  },
  {
    icon: "👋",
    title: "Welcome & post-purchase",
    body: "Greet new subscribers, onboard first-time buyers, and turn one order into two with automated post-purchase sequences.",
  },
  {
    icon: "🔁",
    title: "Win-back",
    body: "Automatically re-engage customers who&apos;ve gone quiet before you lose them for good.",
  },
  {
    icon: "🎯",
    title: "Real segmentation",
    body: "Target by total spend, order count, tags, and behavior — not just a flat list. Send the right message to the right people.",
  },
  {
    icon: "🔒",
    title: "You own your data",
    body: "Self-host it and your customer data never leaves your servers. No third party, no vendor lock-in, GDPR-friendly by design.",
  },
  {
    icon: "💸",
    title: "Flat cost, not per-contact",
    body: "Pay for a server and an SMTP provider — not a bill that balloons every time your list grows. Growth stops being punished.",
  },
];

const steps = [
  {
    n: "1",
    title: "Connect your store",
    body: "Install the Shopify app. Flowmail securely syncs customers, orders, and cart activity in real time via webhooks.",
  },
  {
    n: "2",
    title: "Turn on your flows",
    body: "Abandoned cart, welcome, win-back — enabled with sensible defaults. Customize timing, copy, and design when you want.",
  },
  {
    n: "3",
    title: "Recover revenue on autopilot",
    body: "Emails send themselves, suppress on purchase or unsubscribe, and every recovered order shows up on your dashboard.",
  },
];

const faqs = [
  {
    q: "Is it really free?",
    a: "The core is open source (AGPL-3.0) and free to self-host forever — you only pay for your own server and email sending. A managed Flowmail Cloud (we host it, handle deliverability) will be a paid option for those who don&apos;t want to run it themselves.",
  },
  {
    q: "How is this different from Klaviyo?",
    a: "Klaviyo is powerful but its price scales with your subscriber count, and your data lives on their servers. Flowmail gives you the money-making e-commerce automations at a flat, predictable cost — and you can keep everything on your own infrastructure.",
  },
  {
    q: "How is it different from Listmonk or Mautic?",
    a: "Listmonk is a great newsletter sender but has no Shopify integration or e-commerce flows. Mautic is a heavy, general-purpose automation suite. Flowmail is purpose-built for Shopify e-commerce automations and stays lightweight.",
  },
  {
    q: "What do I need to run it myself?",
    a: "A small server with Node.js, Postgres, and Redis (there&apos;s a docker-compose to make this trivial), plus any SMTP provider for sending. If that sounds like too much, join the waitlist for the managed Cloud.",
  },
  {
    q: "What&apos;s the current status?",
    a: "Pre-alpha and moving fast. The abandoned-cart engine works end-to-end today. Join the waitlist to get early access and help shape what gets built next.",
  },
];

export default function Waitlist() {
  return (
    <div className="page">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <span className="brand">✉️ Flowmail</span>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a
              href="https://github.com/guliyev-sahib/flowmail"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a className="nav-cta" href="#join">
              Join waitlist
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="badge">OPEN SOURCE · SELF-HOSTED · SHOPIFY-NATIVE</span>
            <h1>
              Shopify email flows <span className="hl">without the Klaviyo bill.</span>
            </h1>
            <p className="lead">
              Abandoned cart, welcome, and win-back automations — the emails that
              actually make money — built Shopify-first, open source, and
              self-hostable for the cost of an SMTP provider. Own your data. Stop
              paying more just because your list grew.
            </p>
            <div id="join">
              <WaitlistForm id="hero" />
            </div>
            <WaitlistCount />
            <p className="microcopy">
              Free to self-host (AGPL-3.0) · No spam · Unsubscribe anytime
            </p>
          </div>

          <div className="hero-card" aria-hidden="true">
            <div className="mock-header">
              <span className="dot r" />
              <span className="dot y" />
              <span className="dot g" />
              <span className="mock-title">Abandoned cart · recovered</span>
            </div>
            <div className="mock-body">
              <div className="stat-row">
                <div className="stat">
                  <div className="stat-num">1,284</div>
                  <div className="stat-label">Carts seen</div>
                </div>
                <div className="stat">
                  <div className="stat-num">312</div>
                  <div className="stat-label">Recovered</div>
                </div>
                <div className="stat">
                  <div className="stat-num accent">$18,940</div>
                  <div className="stat-label">Revenue back</div>
                </div>
              </div>
              <div className="mock-mail">
                <div className="mock-mail-top">
                  <strong>You left something behind</strong>
                  <span className="pill">Sent · Opened</span>
                </div>
                <div className="mock-item">
                  <div className="thumb" />
                  <div>
                    <div className="mi-title">Blue Cap</div>
                    <div className="mi-sub">Qty 1 · $20.00</div>
                  </div>
                </div>
                <div className="mock-btn">Complete your order →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCE STRIP */}
      <section className="strip">
        <div className="wrap strip-grid">
          <div>
            <strong>For store owners</strong>
            <span>Recover lost sales at a flat, predictable cost.</span>
          </div>
          <div>
            <strong>For developers</strong>
            <span>Next.js · Postgres · Redis. Fork it, self-host it, extend it.</span>
          </div>
          <div>
            <strong>For the privacy-minded</strong>
            <span>Your customer data stays on your own servers.</span>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section">
        <div className="wrap narrow center">
          <h2>The &ldquo;Klaviyo tax&rdquo; on growing stores</h2>
          <p className="section-lead">
            Email is the highest-ROI channel in e-commerce — around{" "}
            <strong>70% of carts are abandoned</strong> (industry average), and a
            good flow wins a chunk of them back. But the tools that do it well
            punish you for succeeding.
          </p>
          <div className="problem-grid">
            <div className="problem">
              <span>📈</span>
              <h3>Bills that scale with your list</h3>
              <p>The more subscribers you earn, the more you pay — every month, forever.</p>
            </div>
            <div className="problem">
              <span>🔗</span>
              <h3>Your data on someone else&apos;s servers</h3>
              <p>Customer data locked into a vendor, hosted wherever they choose.</p>
            </div>
            <div className="problem">
              <span>🧩</span>
              <h3>Open-source gaps</h3>
              <p>Listmonk is newsletter-only; Mautic is heavy. Nobody covers Shopify flows.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section alt">
        <div className="wrap">
          <div className="center">
            <h2>Everything you actually need to sell more</h2>
            <p className="section-lead">
              The money-making automations, minus the per-contact pricing.
            </p>
          </div>
          <div className="feat-grid">
            {features.map((f) => (
              <div className="feat" key={f.title}>
                <span className="feat-icon">{f.icon}</span>
                <h3 dangerouslySetInnerHTML={{ __html: f.title }} />
                <p dangerouslySetInnerHTML={{ __html: f.body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section">
        <div className="wrap">
          <div className="center">
            <h2>Live in minutes, working while you sleep</h2>
          </div>
          <div className="steps">
            {steps.map((s) => (
              <div className="step" key={s.n}>
                <div className="step-n">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="section alt">
        <div className="wrap narrow center">
          <span className="badge">💰 REVENUE CALCULATOR</span>
          <h2>See what you&apos;re leaving on the table</h2>
          <p className="section-lead">
            Most abandoned carts never come back on their own. Drag the sliders to
            estimate what an abandoned-cart flow could recover for your store.
          </p>
          <RoiCalculator />
          <p className="microcopy">
            Estimate only. Assumes ~70% cart abandonment (industry average) and a
            ~10% recovery rate from a well-run flow.
          </p>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="section">
        <div className="wrap narrow">
          <div className="center">
            <h2>How Flowmail compares</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className="hot">Flowmail</th>
                  <th>Klaviyo</th>
                  <th>Listmonk</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Shopify-native flows</td>
                  <td className="hot">✅</td>
                  <td>✅</td>
                  <td>❌</td>
                </tr>
                <tr>
                  <td>Abandoned cart / win-back</td>
                  <td className="hot">✅</td>
                  <td>✅</td>
                  <td>❌</td>
                </tr>
                <tr>
                  <td>Self-hostable</td>
                  <td className="hot">✅</td>
                  <td>❌</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td>Own your data</td>
                  <td className="hot">✅</td>
                  <td>❌</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td>Pricing</td>
                  <td className="hot">Flat</td>
                  <td>Per contact</td>
                  <td>Free</td>
                </tr>
                <tr>
                  <td>Open source</td>
                  <td className="hot">✅ AGPL</td>
                  <td>❌</td>
                  <td>✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="section">
        <div className="wrap">
          <div className="center">
            <h2>Simple, honest pricing</h2>
            <p className="section-lead">Run it yourself for free, or let us host it.</p>
          </div>
          <div className="price-grid">
            <div className="price">
              <h3>Self-hosted</h3>
              <div className="price-num">Free</div>
              <p className="price-sub">Open source, AGPL-3.0</p>
              <ul>
                <li>✓ All flows &amp; segmentation</li>
                <li>✓ Your infrastructure, your data</li>
                <li>✓ Bring your own SMTP</li>
                <li>✓ Community support</li>
              </ul>
              <a className="price-cta ghost" href="https://github.com/guliyev-sahib/flowmail" target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </div>
            <div className="price featured">
              <span className="tag">Coming soon</span>
              <h3>Flowmail Cloud</h3>
              <div className="price-num">
                Waitlist<span className="price-per"> pricing TBA</span>
              </div>
              <p className="price-sub">We host it. You just sell.</p>
              <ul>
                <li>✓ Managed hosting &amp; upgrades</li>
                <li>✓ High-deliverability sending</li>
                <li>✓ One-click Shopify connect</li>
                <li>✓ Priority support</li>
              </ul>
              <a className="price-cta" href="#join-final">
                Join the waitlist
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* OPEN SOURCE */}
      <section className="section alt">
        <div className="wrap narrow center">
          <span className="badge">MIT-friendly to self-host · AGPL-3.0 core</span>
          <h2>Built in the open</h2>
          <p className="section-lead">
            Flowmail is open source. Read every line, fork it, self-host it, or
            contribute. Next.js + TypeScript, Postgres + Prisma, Redis + BullMQ,
            MJML emails. No black boxes around your customer data.
          </p>
          <a className="price-cta ghost" href="https://github.com/guliyev-sahib/flowmail" target="_blank" rel="noreferrer">
            ⭐ Star it on GitHub
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="wrap narrow">
          <div className="center">
            <h2>Questions</h2>
          </div>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary dangerouslySetInnerHTML={{ __html: f.q }} />
                <p dangerouslySetInnerHTML={{ __html: f.a }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta">
        <div className="wrap narrow center">
          <h2>Stop renting your email. Own it.</h2>
          <p className="section-lead light">
            Join the waitlist for early access and Flowmail Cloud.
          </p>
          <div id="join-final" className="cta-form">
            <WaitlistForm id="footer" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="wrap footer-inner">
          <span>✉️ Flowmail — open-source Shopify email automation.</span>
          <a href="https://github.com/guliyev-sahib/flowmail" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        :root {
          --ink: #0f172a;
          --muted: #475569;
          --line: #e2e8f0;
          --bg: #ffffff;
          --soft: #f8fafc;
          --accent: #4f46e5;
          --accent-2: #7c3aed;
        }
        * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
            Helvetica, Arial, sans-serif;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        a {
          color: inherit;
          text-decoration: none;
        }
        .wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .narrow {
          max-width: 760px;
        }
        .center {
          text-align: center;
        }
        h1 {
          font-size: clamp(34px, 5.2vw, 56px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin: 16px 0 18px;
        }
        h2 {
          font-size: clamp(26px, 3.4vw, 38px);
          line-height: 1.15;
          letter-spacing: -0.01em;
          margin: 0 0 14px;
        }
        h3 {
          font-size: 18px;
          margin: 0 0 8px;
        }
        .badge {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.6px;
          color: var(--accent);
          background: #eef2ff;
          padding: 6px 12px;
          border-radius: 999px;
        }
        .hl {
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .lead {
          font-size: 18px;
          color: var(--muted);
          margin: 0 0 24px;
        }
        .section-lead {
          font-size: 17px;
          color: var(--muted);
          margin: 0 auto 28px;
          max-width: 640px;
        }
        .section-lead.light {
          color: #c7d2fe;
        }
        .microcopy {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 12px;
        }

        /* NAV */
        .nav {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
        }
        .brand {
          font-weight: 800;
          font-size: 18px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 22px;
          font-size: 14px;
          color: var(--muted);
        }
        .nav-links a:hover {
          color: var(--ink);
        }
        .nav-cta {
          background: var(--ink);
          color: #fff !important;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 600;
        }
        .nav-cta:hover {
          background: #1e293b;
        }

        /* HERO */
        .hero {
          padding: 64px 0 40px;
          background: radial-gradient(
            1200px 400px at 70% -10%,
            #eef2ff 0%,
            transparent 60%
          );
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
        }
        .form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          max-width: 460px;
        }
        .form input {
          flex: 1 1 220px;
          padding: 14px 16px;
          font-size: 16px;
          border: 1px solid var(--line);
          border-radius: 10px;
          outline: none;
        }
        .form input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px #e0e7ff;
        }
        .form button {
          padding: 14px 22px;
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          background: var(--ink);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.05s ease, background 0.2s ease;
        }
        .form button:hover {
          background: var(--accent);
        }
        .form button:active {
          transform: translateY(1px);
        }
        .form .err {
          color: #b91c1c;
          width: 100%;
          margin: 4px 0 0;
          font-size: 14px;
        }
        .notice {
          max-width: 460px;
          padding: 18px 20px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 12px;
          color: #065f46;
          font-weight: 500;
        }

        .count {
          margin-top: 14px;
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
        }

        /* CALCULATOR */
        .calc {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 28px;
          text-align: left;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 24px 48px -30px rgba(15, 23, 42, 0.25);
        }
        .calc-inputs {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 22px;
        }
        .calc-inputs label {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 14px;
          color: var(--muted);
        }
        .calc-inputs strong {
          color: var(--ink);
        }
        .calc-inputs input[type="range"] {
          width: 100%;
          accent-color: var(--accent);
        }
        .calc-out {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .calc-out-label {
          font-size: 13px;
          color: #e0e7ff;
        }
        .calc-monthly {
          font-size: 40px;
          font-weight: 800;
          line-height: 1.1;
        }
        .calc-monthly span {
          font-size: 16px;
          font-weight: 600;
          color: #e0e7ff;
        }
        .calc-yearly {
          font-size: 14px;
          color: #e0e7ff;
          margin-bottom: 16px;
        }
        .calc-out .price-cta {
          background: #fff;
          color: var(--accent) !important;
        }
        .calc-out .price-cta:hover {
          background: #eef2ff;
        }

        /* HERO CARD */
        .hero-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 30px 60px -30px rgba(15, 23, 42, 0.25);
          overflow: hidden;
        }
        .mock-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
          background: var(--soft);
        }
        .dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot.r {
          background: #f87171;
        }
        .dot.y {
          background: #fbbf24;
        }
        .dot.g {
          background: #34d399;
        }
        .mock-title {
          margin-left: 8px;
          font-size: 12px;
          color: var(--muted);
        }
        .mock-body {
          padding: 18px;
        }
        .stat-row {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .stat {
          flex: 1;
          background: var(--soft);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
        }
        .stat-num {
          font-size: 20px;
          font-weight: 800;
        }
        .stat-num.accent {
          color: var(--accent);
        }
        .stat-label {
          font-size: 11px;
          color: var(--muted);
        }
        .mock-mail {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px;
        }
        .mock-mail-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .pill {
          font-size: 10px;
          font-weight: 700;
          color: var(--accent);
          background: #eef2ff;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .mock-item {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
        }
        .thumb {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: linear-gradient(135deg, #c7d2fe, #a5b4fc);
        }
        .mi-title {
          font-weight: 600;
          font-size: 14px;
        }
        .mi-sub {
          font-size: 12px;
          color: var(--muted);
        }
        .mock-btn {
          text-align: center;
          background: var(--ink);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 10px;
          border-radius: 8px;
        }

        /* STRIP */
        .strip {
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          background: var(--soft);
        }
        .strip-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          padding: 22px 20px;
        }
        .strip-grid div {
          display: flex;
          flex-direction: column;
        }
        .strip-grid strong {
          font-size: 14px;
        }
        .strip-grid span {
          font-size: 13px;
          color: var(--muted);
        }

        /* SECTIONS */
        .section {
          padding: 72px 0;
        }
        .section.alt {
          background: var(--soft);
        }

        .problem-grid,
        .feat-grid {
          display: grid;
          gap: 20px;
        }
        .problem-grid {
          grid-template-columns: repeat(3, 1fr);
          margin-top: 32px;
        }
        .problem {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 22px;
          text-align: left;
        }
        .problem span {
          font-size: 24px;
        }
        .problem h3 {
          margin-top: 10px;
        }
        .problem p {
          color: var(--muted);
          margin: 0;
          font-size: 14px;
        }

        .feat-grid {
          grid-template-columns: repeat(3, 1fr);
          margin-top: 36px;
        }
        .feat {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 24px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .feat:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px -24px rgba(15, 23, 42, 0.3);
        }
        .feat-icon {
          font-size: 26px;
        }
        .feat h3 {
          margin-top: 12px;
        }
        .feat p {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
        }

        /* STEPS */
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 36px;
        }
        .step {
          text-align: center;
          padding: 8px;
        }
        .step-n {
          width: 44px;
          height: 44px;
          margin: 0 auto 14px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--ink);
          color: #fff;
          font-weight: 800;
        }
        .step p {
          color: var(--muted);
          font-size: 14px;
        }

        /* TABLE */
        .table-wrap {
          overflow-x: auto;
          margin-top: 24px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          min-width: 520px;
        }
        th,
        td {
          padding: 14px 16px;
          text-align: center;
          border-bottom: 1px solid var(--line);
          font-size: 14px;
        }
        th {
          font-size: 13px;
          color: var(--muted);
          background: var(--soft);
        }
        td:first-child,
        th:first-child {
          text-align: left;
          font-weight: 600;
        }
        .hot {
          background: #eef2ff;
          font-weight: 700;
          color: var(--accent);
        }

        /* PRICING */
        .price-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 36px;
          max-width: 780px;
          margin-left: auto;
          margin-right: auto;
        }
        .price {
          position: relative;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 28px;
        }
        .price.featured {
          border-color: var(--accent);
          box-shadow: 0 24px 48px -28px rgba(79, 70, 229, 0.5);
        }
        .tag {
          position: absolute;
          top: -12px;
          right: 20px;
          background: var(--accent);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .price-num {
          font-size: 34px;
          font-weight: 800;
          margin: 6px 0 2px;
        }
        .price-per {
          font-size: 14px;
          font-weight: 500;
          color: var(--muted);
        }
        .price-sub {
          color: var(--muted);
          font-size: 14px;
          margin: 0 0 16px;
        }
        .price ul {
          list-style: none;
          padding: 0;
          margin: 0 0 22px;
        }
        .price li {
          padding: 7px 0;
          font-size: 14px;
          border-bottom: 1px dashed var(--line);
        }
        .price-cta {
          display: block;
          text-align: center;
          background: var(--ink);
          color: #fff !important;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
        }
        .price-cta:hover {
          background: var(--accent);
        }
        .price-cta.ghost {
          background: #fff;
          color: var(--ink) !important;
          border: 1px solid var(--line);
        }
        .price-cta.ghost:hover {
          border-color: var(--accent);
          color: var(--accent) !important;
        }

        /* FAQ */
        .faq {
          margin-top: 24px;
        }
        .faq details {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 4px 18px;
          margin-bottom: 12px;
        }
        .faq summary {
          cursor: pointer;
          font-weight: 600;
          padding: 14px 0;
          list-style: none;
        }
        .faq summary::-webkit-details-marker {
          display: none;
        }
        .faq summary::after {
          content: "+";
          float: right;
          color: var(--accent);
          font-weight: 700;
        }
        .faq details[open] summary::after {
          content: "–";
        }
        .faq p {
          color: var(--muted);
          font-size: 14px;
          margin: 0 0 14px;
        }

        /* CTA */
        .cta {
          padding: 80px 0;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
        }
        .cta h2 {
          color: #fff;
        }
        .cta-form {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }
        .cta .form {
          margin: 0 auto;
        }
        .cta .form button {
          background: #fff;
          color: var(--accent);
        }
        .cta .form button:hover {
          background: #eef2ff;
        }

        /* FOOTER */
        .footer {
          border-top: 1px solid var(--line);
          padding: 24px 0;
          font-size: 14px;
          color: var(--muted);
        }
        .footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer a:hover {
          color: var(--ink);
        }

        /* RESPONSIVE */
        @media (max-width: 860px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }
          .hero-card {
            order: -1;
          }
          .problem-grid,
          .feat-grid,
          .steps,
          .price-grid,
          .strip-grid,
          .calc {
            grid-template-columns: 1fr;
          }
          .nav-links a:not(.nav-cta) {
            display: none;
          }
        }
      `,
        }}
      />
    </div>
  );
}
