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
      // Fallback to mock data if Firebase isn't configured
      setNeeds(MOCK_NEEDS);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToNeeds((data) => {
      setNeeds(data);
      setLoading(false);
    });

    if (!unsubscribe) {
      setError('Failed to subscribe to needs data.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
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
      // Fallback to mock data
      setVolunteers(MOCK_VOLUNTEERS);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToVolunteers((data) => {
      setVolunteers(data);
      setLoading(false);
    });

    if (!unsubscribe) {
      setError('Failed to subscribe to volunteers data.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { volunteers, loading, error };
}

export function useStats() {
  const { needs, loading: needsLoading } = useNeeds();
  const { volunteers, loading: volsLoading } = useVolunteers();

  const loading = needsLoading || volsLoading;

  const stats = useMemo(() => {
    if (loading && !isFirebaseConfigured()) {
      return MOCK_STATS;
    }

    const totalNeeds = needs.length;
    const activeVolunteers = volunteers.filter(v => v.availability === 'available').length;
    const resolvedToday = needs.filter(n => n.status === 'completed').length;
    
    // Average response time mock logic (could be derived from DB timestamps in a full impl)
    const avgResponseMinutes = 12;

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
