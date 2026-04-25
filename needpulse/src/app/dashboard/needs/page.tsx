'use client';

import { useState, useMemo } from 'react';
import { MOCK_NEEDS } from '@/lib/mock-data';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import type { Need, NeedCategory, NeedStatus } from '@/lib/types';
import styles from './needs.module.css';

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_CONFIG: Record<NeedStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'badge-danger' },
  assigned: { label: 'Assigned', cls: 'badge-info' },
  in_progress: { label: 'In Progress', cls: 'badge-warning' },
  resolved: { label: 'Resolved', cls: 'badge-success' },
};

export default function NeedsPage() {
  const [filterCategory, setFilterCategory] = useState<NeedCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<NeedStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'time'>('urgency');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...MOCK_NEEDS];
    if (filterCategory !== 'all') list = list.filter(n => n.category === filterCategory);
    if (filterStatus !== 'all') list = list.filter(n => n.status === filterStatus);
    list.sort((a, b) => sortBy === 'urgency' ? b.urgency - a.urgency : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [filterCategory, filterStatus, sortBy]);

  return (
    <div className={styles.needsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Needs Management</h1>
          <p className={styles.pageSubtitle}>{MOCK_NEEDS.length} total reports · {MOCK_NEEDS.filter(n => n.status === 'new').length} unassigned</p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Category</label>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as NeedCategory | 'all')}>
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as NeedStatus | 'all')}>
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Sort By</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'urgency' | 'time')}>
            <option value="urgency">Highest Urgency</option>
            <option value="time">Most Recent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Urgency</th>
              <th>Report</th>
              <th>Category</th>
              <th>Location</th>
              <th>Affected</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((need) => {
              const cat = CATEGORY_CONFIG[need.category];
              const status = STATUS_CONFIG[need.status];
              const isExpanded = expandedId === need.id;
              return (
                <tr key={need.id} className={`${styles.row} ${isExpanded ? styles.rowExpanded : ''}`} onClick={() => setExpandedId(isExpanded ? null : need.id)}>
                  <td>
                    <div className={styles.urgencyCell}>
                      <span className={`urgency-dot ${URGENCY_CONFIG.getCssClass(need.urgency)}`} />
                      <span style={{ color: URGENCY_CONFIG.getColor(need.urgency), fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{need.urgency}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.reportCell}>
                      <div className={styles.reportMsg}>{need.translatedMessage}</div>
                      {isExpanded && (
                        <div className={styles.expandedDetail}>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Original ({need.rawLanguage.toUpperCase()}):</span>
                            <span className={styles.detailValue}>{need.rawMessage}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Reporter:</span>
                            <span className={styles.detailValue}>{need.reporterName} ({need.reporterPhone})</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>AI Confidence:</span>
                            <span className={styles.detailValue}>{(need.aiConfidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Sentiment:</span>
                            <span className={`badge ${need.sentiment === 'desperate' ? 'badge-danger' : need.sentiment === 'urgent' ? 'badge-warning' : 'badge-info'}`}>{need.sentiment}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td><span className={`cat-badge ${cat.cssClass}`}>{cat.emoji} {cat.label}</span></td>
                  <td><span className={styles.locationCell}>📍 {need.locationName}</span></td>
                  <td><span className={styles.mono}>{need.peopleAffected.toLocaleString()}</span></td>
                  <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                  <td><span className={styles.timeCell}>{timeAgo(need.createdAt)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
