'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MOCK_ASSIGNMENTS, MOCK_VOLUNTEERS, MOCK_NEEDS } from '@/lib/mock-data';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import type { Need } from '@/lib/types';
import { useNeeds, useStats, useVolunteers } from '@/lib/hooks/useData';
import { useAuth } from '@/components/AuthContext';
import styles from './overview.module.css';

/* --- Live clock hook --- */
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* --- Animated counter hook --- */
function useCountUp(end: number, duration: number = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
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
  }, [end, duration]);
  return count;
}

/* --- Live relative time --- */
function useLiveTimeAgo(dateStr: string) {
  const [display, setDisplay] = useState('');
  const compute = useCallback(() => {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }, [dateStr]);

  useEffect(() => {
    setDisplay(compute());
    const id = setInterval(() => setDisplay(compute()), 15000);
    return () => clearInterval(id);
  }, [compute]);

  return display;
}

function StatsCard({ icon, label, value, trend, color, delay }: { icon: string; label: string; value: string; trend?: string; color: string; delay: number }) {
  return (
    <div className={styles.statsCard} style={{ animationDelay: `${delay}ms` }}>
      <div className={styles.statsCardIcon} style={{ background: `${color}15`, color }}>{icon}</div>
      <div className={styles.statsCardContent}>
        <div className={styles.statsCardValue}>{value}</div>
        <div className={styles.statsCardLabel}>{label}</div>
      </div>
      {trend && <div className={styles.statsCardTrend} style={{ color }}>{trend}</div>}
    </div>
  );
}

function NeedFeedItem({ need }: { need: Need }) {
  const cat = CATEGORY_CONFIG[need.category];
  const urgencyClass = URGENCY_CONFIG.getCssClass(need.urgency);
  const timeAgo = useLiveTimeAgo(need.createdAt);
  return (
    <div className={styles.feedItem}>
      <div className={styles.feedItemLeft}>
        <span className={`urgency-dot ${urgencyClass}`} />
        <div>
          <div className={styles.feedItemTitle}>{need.translatedMessage}</div>
          <div className={styles.feedItemMeta}>
            <span className={`cat-badge ${cat.cssClass}`}>{cat.emoji} {cat.label}</span>
            <span className={styles.feedItemTime}>{timeAgo}</span>
            <span className={styles.feedItemLoc}>📍 {need.locationName}</span>
          </div>
        </div>
      </div>
      <div className={styles.feedItemRight}>
        <div className={styles.urgencyScore} style={{ color: URGENCY_CONFIG.getColor(need.urgency) }}>
          {need.urgency}/10
        </div>
      </div>
    </div>
  );
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const clock = useLiveClock();
  const { needs, loading: needsLoading } = useNeeds();
  const { volunteers, loading: volsLoading } = useVolunteers();
  const { stats, loading: statsLoading } = useStats();

  const recentAssignments = MOCK_ASSIGNMENTS.slice(0, 3);

  /* Animated counters */
  const totalNeeds = useCountUp(stats.totalNeeds);
  const activeVols = useCountUp(stats.activeVolunteers, 800);
  const resolvedToday = useCountUp(stats.resolvedToday, 600);
  const avgResponse = useCountUp(stats.avgResponseMinutes, 500);

  const greeting = getGreeting(clock.getHours());
  const clockStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });

  return (
    <div className={styles.overview}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {greeting}, {user?.name || 'Operator'} 👋
          </h1>
          <p className={styles.pageSubtitle}>
            {dateStr} · <span className={styles.liveClock}>{clockStr} IST</span>
          </p>
        </div>
        <Link href="/dashboard/simulator" className="btn btn-primary">
          ⚡ Open Simulator
        </Link>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatsCard icon="📊" label="Total Needs" value={totalNeeds.toLocaleString()} trend="↑ 12%" color="#6366f1" delay={0} />
        <StatsCard icon="🤝" label="Active Volunteers" value={activeVols.toString()} trend="↑ 5%" color="#10b981" delay={80} />
        <StatsCard icon="✅" label="Resolved Today" value={resolvedToday.toString()} trend="↑ 23%" color="#f59e0b" delay={160} />
        <StatsCard icon="⚡" label="Avg Response" value={`${avgResponse} min`} trend="↓ 3min" color="#3b82f6" delay={240} />
      </div>

      <div className={styles.mainGrid}>
        {/* Need Feed */}
        <div className={styles.feedSection}>
          <div className={styles.sectionHeader}>
            <h2>Live Need Feed</h2>
            <span className={styles.liveIndicator}>
              <span className={styles.liveDot} /> Live
            </span>
          </div>
          <div className={styles.feedList}>
            {needs.slice(0, 8).map((need) => (
              <NeedFeedItem key={need.id} need={need} />
            ))}
          </div>
          <Link href="/dashboard/needs" className={styles.viewAllLink}>
            View all {needs.length} reports →
          </Link>
        </div>

        {/* Right column */}
        <div className={styles.rightColumn}>
          {/* Urgency Breakdown */}
          <div className={styles.breakdownCard}>
            <h3>Urgency Breakdown</h3>
            <div className={styles.urgencyBars}>
              {[
                { label: 'Critical (8-10)', value: stats.urgencyDistribution.critical, color: '#ef4444', total: stats.totalNeeds },
                { label: 'High (6-7)', value: stats.urgencyDistribution.high, color: '#f97316', total: stats.totalNeeds },
                { label: 'Moderate (4-5)', value: stats.urgencyDistribution.moderate, color: '#f59e0b', total: stats.totalNeeds },
                { label: 'Low (1-3)', value: stats.urgencyDistribution.low, color: '#10b981', total: stats.totalNeeds },
              ].map((bar) => (
                <div key={bar.label} className={styles.urgencyBarRow}>
                  <div className={styles.urgencyBarLabel}>
                    <span className={styles.urgencyBarDot} style={{ background: bar.color }} />
                    <span>{bar.label}</span>
                    <span className={styles.urgencyBarCount}>{bar.value}</span>
                  </div>
                  <div className={styles.urgencyBarTrack}>
                    <div
                      className={styles.urgencyBarFill}
                      style={{ width: `${(bar.value / bar.total) * 100}%`, background: bar.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Assignments */}
          <div className={styles.assignmentsCard}>
            <h3>Recent Dispatches</h3>
            <div className={styles.assignmentsList}>
              {recentAssignments.map((a) => {
                const vol = volunteers.find(v => v.id === a.volunteerId) || MOCK_VOLUNTEERS.find(v => v.id === a.volunteerId);
                const need = needs.find(n => n.id === a.needId) || MOCK_NEEDS.find(n => n.id === a.needId);
                if (!vol || !need) return null;
                return (
                  <div key={a.id} className={styles.assignmentItem}>
                    <div className={styles.assignmentAvatar}>{vol.name.charAt(0)}</div>
                    <div className={styles.assignmentInfo}>
                      <div className={styles.assignmentName}>{vol.name}</div>
                      <div className={styles.assignmentDetail}>{a.matchReason}</div>
                    </div>
                    <span className={`badge ${a.status === 'completed' ? 'badge-success' : a.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className={styles.categoryCard}>
            <h3>By Category</h3>
            <div className={styles.categoryGrid}>
              {(Object.entries(stats.needsByCategory) as [string, number][]).map(([cat, count]) => {
                const config = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
                return (
                  <div key={cat} className={styles.categoryItem}>
                    <span>{config.emoji}</span>
                    <span className={styles.categoryName}>{config.label}</span>
                    <span className={styles.categoryCount} style={{ color: config.color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
