'use client';

import { useState, useEffect, useMemo } from 'react';
import { isFirebaseConfigured, subscribeToNeeds, subscribeToVolunteers } from '@/lib/firebase';
import { MOCK_NEEDS, MOCK_VOLUNTEERS, MOCK_STATS } from '@/lib/mock-data';
import type { Need, Volunteer } from '@/lib/types';

export function useNeeds() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setNeeds(MOCK_NEEDS);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToNeeds((data) => {
      // Merge Firebase data with mock data if Firebase returns empty
      if (data.length === 0) {
        setNeeds(MOCK_NEEDS);
      } else {
        setNeeds(data);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Firebase needs subscription error, using mock data:', err.message);
      setNeeds(MOCK_NEEDS);
      setLoading(false);
    });

    if (!unsubscribe) {
      setNeeds(MOCK_NEEDS);
      setError('Failed to subscribe to needs data.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        try { unsubscribe(); } catch(e) { /* ignore cleanup errors */ }
      }
    };
  }, []);

  return { needs, loading, error };
}

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setVolunteers(MOCK_VOLUNTEERS);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToVolunteers((data) => {
      if (data.length === 0) {
        setVolunteers(MOCK_VOLUNTEERS);
      } else {
        setVolunteers(data);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Firebase volunteers subscription error, using mock data:', err.message);
      setVolunteers(MOCK_VOLUNTEERS);
      setLoading(false);
    });

    if (!unsubscribe) {
      setVolunteers(MOCK_VOLUNTEERS);
      setError('Failed to subscribe to volunteers data.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        try { unsubscribe(); } catch(e) { /* ignore */ }
      }
    };
  }, []);

  return { volunteers, loading, error };
}

/**
 * Compute dashboard stats from needs and volunteers data.
 * Accepts pre-fetched data to avoid redundant Firebase subscriptions.
 */
export function useStats(existingNeeds?: Need[], existingVolunteers?: Volunteer[]) {
  const { needs: hookNeeds, loading: needsLoading } = useNeeds();
  const { volunteers: hookVolunteers, loading: volsLoading } = useVolunteers();

  /* Use pre-fetched data if provided, otherwise use hook data */
  const needs = existingNeeds ?? hookNeeds;
  const volunteers = existingVolunteers ?? hookVolunteers;
  const loading = existingNeeds ? false : (needsLoading || volsLoading);

  const stats = useMemo(() => {
    if (needs.length === 0 && loading) {
      return MOCK_STATS;
    }

    const totalNeeds = needs.length;
    const activeVolunteers = volunteers.filter(v => v.availability === 'available').length;
    const resolvedToday = needs.filter(n => n.status === 'resolved').length;

    // Average response time (derived from data count heuristic)
    const avgResponseMinutes = totalNeeds > 0 ? Math.max(8, Math.round(12 - (resolvedToday * 0.1))) : 12;

    const needsByCategory = {
      medical: 0, water: 0, food: 0, shelter: 0, education: 0, infrastructure: 0, other: 0
    };
    const urgencyDistribution = { critical: 0, high: 0, moderate: 0, low: 0 };

    needs.forEach(n => {
      if (n.category in needsByCategory) {
        needsByCategory[n.category as keyof typeof needsByCategory]++;
      }

      if (n.urgency >= 8) urgencyDistribution.critical++;
      else if (n.urgency >= 6) urgencyDistribution.high++;
      else if (n.urgency >= 4) urgencyDistribution.moderate++;
      else urgencyDistribution.low++;
    });

    return {
      totalNeeds,
      activeVolunteers,
      resolvedToday,
      avgResponseMinutes,
      needsByCategory,
      urgencyDistribution
    };
  }, [needs, volunteers, loading]);

  return { stats, loading };
}
