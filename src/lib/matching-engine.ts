/* ============================================
   NeedPulse — Volunteer Matching Engine
   Scores and ranks volunteers for a given need
   ============================================ */

import type { Need, Volunteer, NeedCategory, VolunteerSkill, GeminiExtraction } from './types';

/* ---------- Skill-to-Category Mapping ---------- */
const CATEGORY_SKILL_MAP: Record<NeedCategory, VolunteerSkill[]> = {
  medical: ['medical'],
  water: ['sanitation', 'logistics'],
  food: ['cooking', 'logistics'],
  shelter: ['construction', 'logistics'],
  education: ['teaching', 'counseling'],
  infrastructure: ['construction', 'driving'],
  other: ['logistics'],
};

/* ---------- Distance Calculation (Haversine) ---------- */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ---------- Match Score Components ---------- */

/** Skill match score (0-100) */
function skillScore(volunteer: Volunteer, category: NeedCategory): number {
  const requiredSkills = CATEGORY_SKILL_MAP[category] || [];
  if (requiredSkills.length === 0) return 50; // generic match

  const matchCount = volunteer.skills.filter(s => requiredSkills.includes(s)).length;
  return Math.min(100, (matchCount / requiredSkills.length) * 100);
}

/** Proximity score (0-100, based on distance and volunteer's radius) */
function proximityScore(
  volunteer: Volunteer,
  needLat: number,
  needLng: number
): number {
  const distance = haversineDistance(
    volunteer.location.lat, volunteer.location.lng,
    needLat, needLng
  );

  // Within volunteer's radius = high score
  if (distance <= volunteer.radius) {
    return 100 - (distance / volunteer.radius) * 30; // 70-100
  }

  // Up to 2x radius = moderate score
  if (distance <= volunteer.radius * 2) {
    return 70 - ((distance - volunteer.radius) / volunteer.radius) * 40; // 30-70
  }

  // Beyond 2x radius = low score (but still possible)
  return Math.max(0, 30 - (distance - volunteer.radius * 2) * 2);
}

/** Availability score (0-100) */
function availabilityScore(volunteer: Volunteer): number {
  if (volunteer.availability === 'available') return 100;
  if (volunteer.availability === 'busy') return 20; // might still be reachable
  return 0; // offline
}

/** Reliability score based on past performance (0-100) */
function reliabilityScore(volunteer: Volunteer): number {
  const ratingScore = (volunteer.rating / 5) * 50; // 0-50 from rating
  const completionScore = Math.min(50, volunteer.totalCompleted * 2); // 0-50 from completions
  const loadPenalty = volunteer.activeAssignments * 15; // penalty for current load
  return Math.max(0, ratingScore + completionScore - loadPenalty);
}

/* ---------- Match Result Interface ---------- */
export interface VolunteerMatch {
  volunteer: Volunteer;
  totalScore: number;
  breakdown: {
    skillMatch: number;
    proximity: number;
    availability: number;
    reliability: number;
  };
  distance: number;
  matchReason: string;
}

/* ---------- Main Matching Function ---------- */

/**
 * Rank volunteers for a given need using the weighted scoring algorithm.
 * Score = (skillMatch × 0.4) + (proximity × 0.3) + (availability × 0.2) + (reliability × 0.1)
 */
export function matchVolunteers(
  extraction: GeminiExtraction,
  volunteers: Volunteer[],
  needLocation: { lat: number; lng: number },
  topN: number = 3
): VolunteerMatch[] {
  const scores: VolunteerMatch[] = volunteers
    .filter(v => v.availability !== 'offline') // exclude offline
    .map(volunteer => {
      const skill = skillScore(volunteer, extraction.category);
      const prox = proximityScore(volunteer, needLocation.lat, needLocation.lng);
      const avail = availabilityScore(volunteer);
      const reliability = reliabilityScore(volunteer);

      const totalScore = Math.round(
        skill * 0.4 + prox * 0.3 + avail * 0.2 + reliability * 0.1
      );

      const distance = haversineDistance(
        volunteer.location.lat, volunteer.location.lng,
        needLocation.lat, needLocation.lng
      );

      // Generate human-readable match reason
      const reasons: string[] = [];
      if (skill >= 80) reasons.push(`Strong ${extraction.category} skills`);
      else if (skill >= 50) reasons.push(`Relevant skills`);
      if (distance <= volunteer.radius) reasons.push(`${Math.round(distance)}km away (within range)`);
      else reasons.push(`${Math.round(distance)}km away`);
      if (volunteer.rating >= 4.5) reasons.push(`⭐ ${volunteer.rating} rating`);
      if (volunteer.totalCompleted >= 20) reasons.push(`${volunteer.totalCompleted} missions completed`);

      return {
        volunteer,
        totalScore,
        breakdown: {
          skillMatch: Math.round(skill),
          proximity: Math.round(prox),
          availability: Math.round(avail),
          reliability: Math.round(reliability),
        },
        distance: Math.round(distance),
        matchReason: reasons.join(' · '),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  return scores.slice(0, topN);
}

/**
 * Quick-match: find the single best volunteer for a need.
 * Returns null if no suitable volunteer is found.
 */
export function findBestMatch(
  extraction: GeminiExtraction,
  volunteers: Volunteer[],
  needLocation: { lat: number; lng: number }
): VolunteerMatch | null {
  const matches = matchVolunteers(extraction, volunteers, needLocation, 1);
  return matches.length > 0 ? matches[0] : null;
}
