'use client';

import { useState, useMemo } from 'react';
import { useNeeds } from '@/lib/hooks/useData';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import type { Need, NeedCategory } from '@/lib/types';
import styles from './heatmap.module.css';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--glass-z1-bg)', borderRadius: '1rem', color: 'var(--text-tertiary)'}}>Loading map...</div>
});

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// Removed MapDot as we are using Leaflet now

export default function HeatmapPage() {
  const { needs, loading } = useNeeds();
  const [filterCategory, setFilterCategory] = useState<NeedCategory | 'all'>('all');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all');
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);

  const filtered = useMemo(() => {
    let list = [...needs];
    if (filterCategory !== 'all') list = list.filter(n => n.category === filterCategory);
    if (filterUrgency !== 'all') list = list.filter(n => URGENCY_CONFIG.getLevel(n.urgency) === filterUrgency);
    return list;
  }, [needs, filterCategory, filterUrgency]);

  if (loading) {
    return (
      <div className={styles.heatmapPage}>
        <div className={styles.topBar}>
          <h1 className={styles.title}>🗺️ Need Heatmap</h1>
        </div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)'}}>Loading map data...</div>
      </div>
    );
  }

  return (
    <div className={styles.heatmapPage}>
      {/* Filters */}
      <div className={styles.topBar}>
        <h1 className={styles.title}>🗺️ Need Heatmap</h1>
        <div className={styles.filters}>
          <select className="glass-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value as NeedCategory | 'all')}>
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
          <select className="glass-select" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value as typeof filterUrgency)}>
            <option value="all">All Urgency</option>
            <option value="critical">🔴 Critical (8-10)</option>
            <option value="high">🟠 High (6-7)</option>
            <option value="moderate">🟡 Moderate (4-5)</option>
            <option value="low">🟢 Low (1-3)</option>
          </select>
        </div>
      </div>

      <div className={styles.mapLayout}>
        {/* Interactive Map */}
        <div className={styles.mapContainer} style={{ background: 'transparent' }}>
          <LeafletMap 
            needs={filtered} 
            selectedNeedId={selectedNeed?.id || null} 
            onNeedClick={(need) => setSelectedNeed(selectedNeed?.id === need.id ? null : need)} 
          />

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Legend</div>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ef4444' }} /> Critical (8-10)</div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f97316' }} /> High (6-7)</div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Moderate (4-5)</div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#10b981' }} /> Low (1-3)</div>
            </div>
          </div>
        </div>

        {/* Detail sidebar */}
        {selectedNeed && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h3>Need Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedNeed(null)}>✕</button>
            </div>
            <div className={styles.detailContent}>
              <div className={styles.detailUrgency}>
                <span className={`urgency-dot ${URGENCY_CONFIG.getCssClass(selectedNeed.urgency)}`} />
                <span style={{ color: URGENCY_CONFIG.getColor(selectedNeed.urgency), fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>
                  {selectedNeed.urgency}/10
                </span>
                <span className={`badge ${selectedNeed.urgency >= 8 ? 'badge-danger' : selectedNeed.urgency >= 6 ? 'badge-warning' : 'badge-info'}`}>
                  {URGENCY_CONFIG.getLevel(selectedNeed.urgency).toUpperCase()}
                </span>
              </div>

              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Category</span>
                <span className={`cat-badge ${CATEGORY_CONFIG[selectedNeed.category].cssClass}`}>
                  {CATEGORY_CONFIG[selectedNeed.category].emoji} {CATEGORY_CONFIG[selectedNeed.category].label}
                </span>
              </div>

              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Report (EN)</span>
                <p className={styles.detailText}>{selectedNeed.translatedMessage}</p>
              </div>

              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Original ({selectedNeed.rawLanguage.toUpperCase()})</span>
                <p className={styles.detailText}>{selectedNeed.rawMessage}</p>
              </div>

              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Location</span>
                <p className={styles.detailText}>📍 {selectedNeed.locationName}</p>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>People Affected</span>
                  <span className={styles.detailMono}>{selectedNeed.peopleAffected.toLocaleString()}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Reported</span>
                  <span className={styles.detailMono}>{timeAgo(selectedNeed.createdAt)}</span>
                </div>
              </div>

              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Reporter</span>
                <p className={styles.detailText}>{selectedNeed.reporterName}</p>
              </div>

              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Status</span>
                <span className={`badge ${selectedNeed.status === 'resolved' ? 'badge-success' : selectedNeed.status === 'in_progress' ? 'badge-warning' : selectedNeed.status === 'assigned' ? 'badge-info' : 'badge-danger'}`}>
                  {selectedNeed.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
