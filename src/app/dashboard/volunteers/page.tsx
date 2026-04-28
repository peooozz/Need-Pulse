'use client';

import { useState, useMemo, useCallback } from 'react';
import { MOCK_ASSIGNMENTS } from '@/lib/mock-data';
import type { Volunteer, VolunteerAvailability } from '@/lib/types';
import { useVolunteers } from '@/lib/hooks/useData';
import styles from './volunteers.module.css';

const AVAILABILITY_CONFIG: Record<VolunteerAvailability, { label: string; cls: string; dot: string }> = {
  available: { label: 'Available', cls: 'badge-success', dot: '#10b981' },
  busy: { label: 'Busy', cls: 'badge-warning', dot: '#f59e0b' },
  offline: { label: 'Offline', cls: 'badge-danger', dot: '#6b7280' },
};

const SKILL_COLORS: Record<string, string> = {
  medical: '#ef4444', teaching: '#0077b6', construction: '#f59e0b',
  cooking: '#f97316', driving: '#3b82f6', logistics: '#10b981',
  sanitation: '#06b6d4', counseling: '#8b5cf6',
};

type SortKey = 'rating' | 'completed' | 'name';

function VolunteerCard({ vol, isExpanded, onToggle }: { vol: Volunteer; isExpanded: boolean; onToggle: () => void }) {
  const avail = AVAILABILITY_CONFIG[vol.availability];
  const recentDispatches = MOCK_ASSIGNMENTS.filter(a => a.volunteerId === vol.id);
  const [copied, setCopied] = useState('');

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    });
  }, []);

  return (
    <div className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}>
      <div className={styles.cardHeader} onClick={onToggle} role="button" tabIndex={0}>
        <div className={styles.avatar}>{vol.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
        <div className={styles.cardInfo}>
          <h3 className={styles.cardName}>{vol.name}</h3>
          {vol.organization && <p className={styles.cardOrg}>{vol.organization}</p>}
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

      {/* Expanded details */}
      {isExpanded && (
        <div className={styles.expandedSection}>
          {/* Contact Actions */}
          <div className={styles.contactActions}>
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); copyToClipboard(vol.email, 'email'); }}
              title="Copy email"
            >
              📧 {copied === 'email' ? 'Copied!' : vol.email}
            </button>
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); copyToClipboard(vol.phone, 'phone'); }}
              title="Copy phone"
            >
              📞 {copied === 'phone' ? 'Copied!' : vol.phone}
            </button>
          </div>

          {/* Recent Dispatches */}
          {recentDispatches.length > 0 && (
            <div className={styles.dispatches}>
              <span className={styles.dispatchLabel}>Recent Dispatches</span>
              {recentDispatches.map(d => (
                <div key={d.id} className={styles.dispatchItem}>
                  <span className={`badge ${d.status === 'completed' ? 'badge-success' : d.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                  <span className={styles.dispatchReason}>{d.matchReason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer — minimal view */}
      {!isExpanded && (
        <div className={styles.cardFooter}>
          <span className={styles.contact}>📧 {vol.email}</span>
          <button className={styles.expandHint} onClick={onToggle}>Details ↓</button>
        </div>
      )}
    </div>
  );
}

export default function VolunteersPage() {
  const [filter, setFilter] = useState<VolunteerAvailability | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('rating');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { volunteers, loading } = useVolunteers();

  const vols = useMemo(() => {
    let list = [...volunteers];

    /* Search */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.locationName.toLowerCase().includes(q) ||
        (v.organization && v.organization.toLowerCase().includes(q)) ||
        v.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    /* Filter */
    if (filter !== 'all') list = list.filter(v => v.availability === filter);

    /* Sort */
    list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'completed') return b.totalCompleted - a.totalCompleted;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [volunteers, filter, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className={styles.volPage}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Volunteer Network</h1>
            <p className={styles.pageSubtitle}>Loading live data...</p>
          </div>
        </div>
        <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />
      </div>
    );
  }

  return (
    <div className={styles.volPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Volunteer Network</h1>
          <p className={styles.pageSubtitle}>
            {volunteers.length} organizations registered · {volunteers.filter(v => v.availability === 'available').length} available now
          </p>
        </div>
        <span className="result-count">
          Showing {vols.length} of {volunteers.length}
        </span>
      </div>

      {/* Search + Sort */}
      <div className={styles.toolsBar}>
        <div className={`glass-search ${styles.searchWrap}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by name, location, skill..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="glass-select" value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}>
          <option value="rating">Sort: Highest Rated</option>
          <option value="completed">Sort: Most Missions</option>
          <option value="name">Sort: Name A→Z</option>
        </select>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        {(['all', 'available', 'busy', 'offline'] as const).map((f) => {
          const count = f === 'all' ? volunteers.length : volunteers.filter(v => v.availability === f).length;
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

      {/* Grid or Empty State */}
      {vols.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No organizations found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {vols.map((vol) => (
            <VolunteerCard
              key={vol.id}
              vol={vol}
              isExpanded={expandedId === vol.id}
              onToggle={() => setExpandedId(expandedId === vol.id ? null : vol.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
