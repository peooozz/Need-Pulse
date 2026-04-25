'use client';

import { useState } from 'react';
import { MOCK_VOLUNTEERS } from '@/lib/mock-data';
import type { Volunteer, VolunteerAvailability } from '@/lib/types';
import styles from './volunteers.module.css';

const AVAILABILITY_CONFIG: Record<VolunteerAvailability, { label: string; cls: string; dot: string }> = {
  available: { label: 'Available', cls: 'badge-success', dot: '#10b981' },
  busy: { label: 'Busy', cls: 'badge-warning', dot: '#f59e0b' },
  offline: { label: 'Offline', cls: 'badge-danger', dot: '#6b7280' },
};

const SKILL_COLORS: Record<string, string> = {
  medical: '#ef4444', teaching: '#6366f1', construction: '#f59e0b',
  cooking: '#f97316', driving: '#3b82f6', logistics: '#10b981',
  sanitation: '#06b6d4', counseling: '#8b5cf6',
};

function VolunteerCard({ vol }: { vol: Volunteer }) {
  const avail = AVAILABILITY_CONFIG[vol.availability];
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>{vol.name.split(' ').map(w => w[0]).join('')}</div>
        <div className={styles.cardInfo}>
          <h3 className={styles.cardName}>{vol.name}</h3>
          <p className={styles.cardLocation}>📍 {vol.locationName}</p>
        </div>
        <span className={`badge ${avail.cls}`}>
          <span className={styles.availDot} style={{ background: avail.dot }} />
          {avail.label}
        </span>
      </div>

      <div className={styles.skills}>
        {vol.skills.map(s => (
          <span key={s} className={styles.skillTag} style={{ borderColor: SKILL_COLORS[s] || '#6b7280', color: SKILL_COLORS[s] || '#6b7280' }}>
            {s}
          </span>
        ))}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{vol.totalCompleted}</span>
          <span className={styles.statLbl}>Completed</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{vol.activeAssignments}</span>
          <span className={styles.statLbl}>Active</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>⭐ {vol.rating}</span>
          <span className={styles.statLbl}>Rating</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{vol.radius}km</span>
          <span className={styles.statLbl}>Radius</span>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.contact}>📧 {vol.email}</span>
        <span className={styles.contact}>📱 {vol.phone}</span>
      </div>
    </div>
  );
}

export default function VolunteersPage() {
  const [filter, setFilter] = useState<VolunteerAvailability | 'all'>('all');
  const vols = filter === 'all' ? MOCK_VOLUNTEERS : MOCK_VOLUNTEERS.filter(v => v.availability === filter);

  return (
    <div className={styles.volPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Volunteer Management</h1>
          <p className={styles.pageSubtitle}>
            {MOCK_VOLUNTEERS.length} registered · {MOCK_VOLUNTEERS.filter(v => v.availability === 'available').length} available now
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        {(['all', 'available', 'busy', 'offline'] as const).map((f) => {
          const count = f === 'all' ? MOCK_VOLUNTEERS.length : MOCK_VOLUNTEERS.filter(v => v.availability === f).length;
          const label = f === 'all' ? 'All' : AVAILABILITY_CONFIG[f].label;
          return (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {label} <span className={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {vols.map((vol) => (
          <VolunteerCard key={vol.id} vol={vol} />
        ))}
      </div>
    </div>
  );
}
