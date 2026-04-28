'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

/* Animated counter hook */
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          tick();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
}

/* Pulse dot on the hero globe */
function PulseDot({ x, y, delay, color, size = 6 }: { x: number; y: number; delay: number; color: string; size?: number }) {
  return (
    <div className={styles.pulseDot} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }}>
      <div className={styles.pulseRing} style={{ borderColor: color, animationDelay: `${delay}s` }} />
      <div className={styles.pulseCenter} style={{ background: color, width: size, height: size }} />
    </div>
  );
}

/* Feature card data */
const FEATURES = [
  {
    icon: '💬',
    title: 'WhatsApp-First AI',
    description: 'Field workers report needs via WhatsApp in any language — voice notes, photos, or text. Gemini AI transcribes, translates, and classifies in seconds.',
    highlight: '7+ Languages',
    gradient: 'linear-gradient(135deg, #25D366, #128C7E)',
  },
  {
    icon: '🗺️',
    title: 'Heatmap Intelligence',
    description: 'Every report is geo-tagged and plotted on a live heatmap. Cluster analysis reveals patterns — so you dispatch resources where they matter most.',
    highlight: 'Real-time GPS',
    gradient: 'linear-gradient(135deg, #3b82f6, #10b981)',
  },
  {
    icon: '🚀',
    title: 'Smart Volunteer Matching',
    description: 'Our matching engine scores volunteers by skill, proximity, availability, and track record — then auto-dispatches via WhatsApp with directions.',
    highlight: '94% Match Rate',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
];

export default function LandingPage() {
  const stat1 = useCountUp(12470);
  const stat2 = useCountUp(890);
  const stat3 = useCountUp(34500);
  const stat4 = useCountUp(12);

  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { setHeroVisible(true); }, []);

  return (
    <div className={styles.landing}>
      {/* --- Nav --- */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon} style={{ background: 'transparent', boxShadow: 'none' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="logo-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0077b6" />
                    <stop offset="100%" stopColor="#00b4d8" />
                  </linearGradient>
                  <linearGradient id="logo-green" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <path d="M16 5 A 8 8 0 1 0 17 17" stroke="url(#logo-blue)" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="url(#logo-blue)" />
                <path d="M3 11 h 3 l 2 -4 l 3 8 l 2 -5 l 2 2 l 4 -4" stroke="url(#logo-blue)" />
                <polygon points="19 3 21 8 16 7" fill="url(#logo-green)" stroke="url(#logo-green)" strokeWidth="1" />
              </svg>
            </div>
            <span className={styles.logoText}>NeedPulse</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#impact">Impact</a>
            <Link href="/login" className={styles.navLoginBtn}>Sign In</Link>
            <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard →</Link>
          </div>
        </div>
      </nav>

      {/* --- Hero --- */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGrid} />

        {/* Globe visualization */}
        <div className={styles.heroGlobe}>
          <div className={styles.globeCircle}>
            <div className={styles.globeGridLines} />
            <PulseDot x={30} y={25} delay={0} color="#ef4444" size={8} />
            <PulseDot x={65} y={35} delay={0.5} color="#3b82f6" />
            <PulseDot x={45} y={55} delay={1} color="#f59e0b" size={7} />
            <PulseDot x={25} y={60} delay={1.5} color="#8b5cf6" />
            <PulseDot x={70} y={65} delay={2} color="#ef4444" size={9} />
            <PulseDot x={50} y={30} delay={2.5} color="#10b981" />
            <PulseDot x={35} y={75} delay={0.8} color="#3b82f6" size={7} />
            <PulseDot x={60} y={50} delay={1.8} color="#f59e0b" />
          </div>
        </div>

        <div className={`${styles.heroContent} ${heroVisible ? styles.heroVisible : ''}`}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            GDG Solution Challenge 2025
          </div>
          <h1 className={styles.heroTitle}>
            Turn Field Reports Into<br />
            <span className="gradient-text">Coordinated Action</span>
          </h1>
          <p className={styles.heroSubtitle}>
            WhatsApp-first AI that transforms voice notes, photos, and text in <em>any language</em> into mapped community intelligence — dispatching the right volunteers instantly.
          </p>
          <div className={styles.heroCta}>
            <Link href="/dashboard/simulator" className="btn btn-primary btn-lg">
              ⚡ Try Live Demo
            </Link>
            <Link href="/signup" className="btn btn-ghost btn-lg">
              Create Account →
            </Link>
          </div>
          <div className={styles.heroTech}>
            <span>Powered by</span>
            <div className={styles.techBadges}>
              <div className={styles.techBadge}>🤖 Gemini AI</div>
              <div className={styles.techBadge}>🔥 Firebase</div>
              <div className={styles.techBadge}>🗺️ Google Maps</div>
              <div className={styles.techBadge}>💬 WhatsApp</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Section (replaces old How It Works) --- */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>
            Why <span className="gradient-text">NeedPulse</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Three AI-powered capabilities that turn chaos into coordinated response
          </p>
          <div className={styles.featuresGrid}>
            {FEATURES.map((feat, i) => (
              <div key={i} className={styles.featureCard}>
                <div className={styles.featureIcon} style={{ background: feat.gradient }}>
                  {feat.icon}
                </div>
                <h3 className={styles.featureTitle}>{feat.title}</h3>
                <p className={styles.featureDesc}>{feat.description}</p>
                <span className={styles.featureHighlight}>{feat.highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- How It Works (compact 3-step) --- */}
      <section className={styles.howSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>
            How It <span className="gradient-text">Works</span>
          </h2>
          <div className={styles.steps}>
            <div className={`${styles.step} animate-fade-in-up`}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepIcon}>💬</div>
              <h3>Report via WhatsApp</h3>
              <p>Field workers send voice notes, photos, or text in any language — Hindi, Telugu, Tamil, Bengali, or any other.</p>
            </div>
            <div className={styles.stepConnector}>
              <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="4 4"/></svg>
            </div>
            <div className={`${styles.step} animate-fade-in-up delay-200`}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepIcon}>🧠</div>
              <h3>AI Extracts Intelligence</h3>
              <p>Gemini AI transcribes, translates, classifies urgency, and maps the need — all in seconds.</p>
            </div>
            <div className={styles.stepConnector}>
              <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="4 4"/></svg>
            </div>
            <div className={`${styles.step} animate-fade-in-up delay-400`}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepIcon}>🚀</div>
              <h3>Auto-Dispatch Volunteers</h3>
              <p>The matching engine finds the best volunteer by skill, proximity, and availability — then dispatches via WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Impact Stats --- */}
      <section id="impact" className={styles.statsSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Real-Time <span className="gradient-text-pulse">Impact</span></h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard} ref={stat1.ref}>
              <div className={styles.statNumber}>{stat1.count.toLocaleString()}</div>
              <div className={styles.statLabel}>Needs Reported</div>
              <div className={styles.statIcon}>📊</div>
            </div>
            <div className={styles.statCard} ref={stat2.ref}>
              <div className={styles.statNumber}>{stat2.count.toLocaleString()}</div>
              <div className={styles.statLabel}>Active Volunteers</div>
              <div className={styles.statIcon}>🤝</div>
            </div>
            <div className={styles.statCard} ref={stat3.ref}>
              <div className={styles.statNumber}>{stat3.count.toLocaleString()}</div>
              <div className={styles.statLabel}>Lives Impacted</div>
              <div className={styles.statIcon}>❤️</div>
            </div>
            <div className={styles.statCard} ref={stat4.ref}>
              <div className={styles.statNumber}>{stat4.count} min</div>
              <div className={styles.statLabel}>Avg Response Time</div>
              <div className={styles.statIcon}>⚡</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Testimonial --- */}
      <section className={styles.testimonialSection}>
        <div className={styles.sectionInner}>
          <div className={styles.testimonialCard}>
            <div className={styles.quoteIcon}>&ldquo;</div>
            <blockquote className={styles.quoteText}>
              NeedPulse transformed how we coordinate our flood relief operations. What used to take 4 hours of phone calls now happens in 12 minutes. Our field teams just send a WhatsApp message, and the right volunteer shows up with the right supplies.
            </blockquote>
            <div className={styles.quoteAuthor}>
              <div className={styles.quoteAvatar}>SR</div>
              <div>
                <div className={styles.quoteName}>Sanjay Raghavan</div>
                <div className={styles.quoteRole}>Operations Director, SEEDS India</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SDG Alignment --- */}
      <section className={styles.sdgSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>UN SDG <span className="gradient-text-warm">Alignment</span></h2>
          <div className={styles.sdgGrid}>
            {[
              { num: 1, title: 'No Poverty', color: '#e5243b' },
              { num: 2, title: 'Zero Hunger', color: '#dda63a' },
              { num: 3, title: 'Good Health', color: '#4c9f38' },
              { num: 6, title: 'Clean Water', color: '#26bde2' },
              { num: 10, title: 'Reduced Inequalities', color: '#dd1367' },
              { num: 11, title: 'Sustainable Cities', color: '#fd9d24' },
              { num: 17, title: 'Partnerships', color: '#19486a' },
            ].map((sdg) => (
              <div key={sdg.num} className={styles.sdgCard} style={{ borderColor: sdg.color }}>
                <div className={styles.sdgNum} style={{ background: sdg.color }}>{sdg.num}</div>
                <span>{sdg.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaGlow} />
        <h2>Ready to see it in action?</h2>
        <p>Watch NeedPulse process a real field report in under 10 seconds.</p>
        <div className={styles.ctaButtons}>
          <Link href="/dashboard/simulator" className="btn btn-primary btn-lg">
            ⚡ Launch Demo Simulator
          </Link>
          <Link href="/signup" className="btn btn-ghost btn-lg">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon} style={{ background: 'transparent', boxShadow: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 5 A 8 8 0 1 0 17 17" stroke="url(#logo-blue)" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="url(#logo-blue)" />
                <path d="M3 11 h 3 l 2 -4 l 3 8 l 2 -5 l 2 2 l 4 -4" stroke="url(#logo-blue)" />
                <polygon points="19 3 21 8 16 7" fill="url(#logo-green)" stroke="url(#logo-green)" strokeWidth="1" />
              </svg>
            </div>
            <span className={styles.logoText}>NeedPulse</span>
          </div>
          <p>Built with ❤️ for GDG Solution Challenge 2025</p>
          <div className={styles.footerLinks}>
            <Link href="/login">Sign In</Link>
            <span>·</span>
            <Link href="/signup">Sign Up</Link>
            <span>·</span>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
