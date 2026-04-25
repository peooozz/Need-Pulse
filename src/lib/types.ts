/* NeedPulse — TypeScript Types */

export type NeedCategory = 'food' | 'water' | 'shelter' | 'medical' | 'education' | 'infrastructure' | 'other';
export type Sentiment = 'desperate' | 'urgent' | 'moderate' | 'informational';
export type NeedStatus = 'new' | 'assigned' | 'in_progress' | 'resolved';
export type VolunteerAvailability = 'available' | 'busy' | 'offline';
export type AssignmentStatus = 'dispatched' | 'accepted' | 'in_progress' | 'completed' | 'declined';
export type VolunteerSkill = 'medical' | 'teaching' | 'construction' | 'cooking' | 'driving' | 'logistics' | 'sanitation' | 'counseling';

export interface GeoPoint { lat: number; lng: number; }

export interface Need {
  id: string;
  rawMessage: string;
  rawLanguage: string;
  translatedMessage: string;
  category: NeedCategory;
  subcategory: string;
  urgency: number;
  sentiment: Sentiment;
  peopleAffected: number;
  location: GeoPoint;
  locationName: string;
  mediaUrls: string[];
  reporterPhone: string;
  reporterName: string;
  status: NeedStatus;
  assignedVolunteerId: string | null;
  aiConfidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email: string;
  skills: VolunteerSkill[];
  availability: VolunteerAvailability;
  location: GeoPoint;
  locationName: string;
  radius: number;
  activeAssignments: number;
  totalCompleted: number;
  rating: number;
  registeredAt: string;
  lastActiveAt: string;
}

export interface Assignment {
  id: string;
  needId: string;
  volunteerId: string;
  status: AssignmentStatus;
  matchScore: number;
  matchReason: string;
  dispatchedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  feedback: string | null;
}

export interface GeminiExtraction {
  category: NeedCategory;
  subcategory: string;
  urgency: number;
  peopleAffected: number;
  location: string;
  summaryEn: string;
  summaryOriginal: string;
  detectedLanguage: string;
  sentiment: Sentiment;
  keyDetails: string[];
  confidence: number;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

export interface ChatMessage {
  id: string;
  type: 'incoming' | 'outgoing' | 'system';
  content: string;
  timestamp: string;
  senderName?: string;
  mediaType?: 'text' | 'voice' | 'image';
  processingResult?: GeminiExtraction;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  language: string;
  mediaType: 'text' | 'voice' | 'image';
  rawMessage: string;
  senderName: string;
  expectedResult: GeminiExtraction;
  location: GeoPoint;
  locationName: string;
}

export interface DashboardStats {
  totalNeeds: number;
  activeVolunteers: number;
  resolvedToday: number;
  avgResponseMinutes: number;
  needsByCategory: Record<NeedCategory, number>;
  urgencyDistribution: { critical: number; high: number; moderate: number; low: number };
}

export const CATEGORY_CONFIG: Record<NeedCategory, { emoji: string; label: string; color: string; cssClass: string }> = {
  medical: { emoji: '🏥', label: 'Medical', color: '#ef4444', cssClass: 'cat-medical' },
  water: { emoji: '💧', label: 'Water', color: '#3b82f6', cssClass: 'cat-water' },
  food: { emoji: '🍲', label: 'Food', color: '#f59e0b', cssClass: 'cat-food' },
  shelter: { emoji: '🏠', label: 'Shelter', color: '#8b5cf6', cssClass: 'cat-shelter' },
  education: { emoji: '📚', label: 'Education', color: '#6366f1', cssClass: 'cat-education' },
  infrastructure: { emoji: '🏗️', label: 'Infrastructure', color: '#6b7280', cssClass: 'cat-infrastructure' },
  other: { emoji: '📋', label: 'Other', color: '#9ca3af', cssClass: 'cat-other' },
};

export const URGENCY_CONFIG = {
  getLevel: (score: number): 'critical' | 'high' | 'moderate' | 'low' => {
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'moderate';
    return 'low';
  },
  getColor: (score: number): string => {
    if (score >= 8) return '#ef4444';
    if (score >= 6) return '#f97316';
    if (score >= 4) return '#f59e0b';
    return '#10b981';
  },
  getCssClass: (score: number): string => {
    if (score >= 8) return 'urgency-critical';
    if (score >= 6) return 'urgency-high';
    if (score >= 4) return 'urgency-moderate';
    return 'urgency-low';
  },
};
