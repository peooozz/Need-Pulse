'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MOCK_NEEDS, MOCK_STATS, MOCK_ASSIGNMENTS, MOCK_VOLUNTEERS } from '@/lib/mock-data';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import type { Need } from '@/lib/types';
import styles from './overview.module.css';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatsCard({ icon, label, value, trend, color }: { icon: string; label: string; value: string; trend?: string; color: string }) {
  return (
    <div className={styles.statsCard}>
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
  return (
    <div className={styles.feedItem}>
      <div className={styles.feedItemLeft}>
        <span className={`urgency-dot ${urgencyClass}`} />
        <div>
          <div className={styles.feedItemTitle}>{need.translatedMessage}</div>
          <div className={styles.feedItemMeta}>
            <span className={`cat-badge ${cat.cssClass}`}>{cat.emoji} {cat.label}</span>
            <span className={styles.feedItemTime}>{timeAgo(need.createdAt)}</span>
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

export default function DashboardOverview() {
  const [needs, setNeeds] = useState<Need[]>([]);

  useEffect(() => {
    setNeeds(MOCK_NEEDS);
  }, []);

  const stats = MOCK_STATS;
  const recentAssignments = MOCK_ASSIGNMENTS.slice(0, 3);

  return (
    <div className={styles.overview}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Real-time community intelligence overview</p>
        </div>
        <Link href="/dashboard/simulator" className="btn btn-primary">
          ⚡ Open Simulator
        </Link>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatsCard icon="📊" label="Total Needs" value={stats.totalNeeds.toLocaleString()} trend="↑ 12%" color="#6366f1" />
        <StatsCard icon="🤝" label="Active Volunteers" value={stats.activeVolunteers.toString()} trend="↑ 5%" color="#10b981" />
        <StatsCard icon="✅" label="Resolved Today" value={stats.resolvedToday.toString()} trend="↑ 23%" color="#f59e0b" />
        <StatsCard icon="⚡" label="Avg Response" value={`${stats.avgResponseMinutes} min`} trend="↓ 3min" color="#3b82f6" />
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
            {needs.map((need) => (
              <NeedFeedItem key={need.id} need={need} />
            ))}
          </div>
          <Link href="/dashboard/needs" className={styles.viewAllLink}>
            View all needs →
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
                const vol = MOCK_VOLUNTEERS.find(v => v.id === a.volunteerId);
                const need = MOCK_NEEDS.find(n => n.id === a.needId);
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
