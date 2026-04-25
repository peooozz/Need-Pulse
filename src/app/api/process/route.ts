/* ============================================
   NeedPulse — AI Processing API Route
   POST /api/process
   Receives a field report, processes via Gemini,
   matches volunteers, and returns results.
   ============================================ */

import { NextRequest, NextResponse } from 'next/server';
import { processFieldReport, isGeminiConfigured } from '@/lib/gemini';
import { matchVolunteers, type VolunteerMatch } from '@/lib/matching-engine';
import { MOCK_VOLUNTEERS } from '@/lib/mock-data';
import type { Volunteer, GeminiExtraction } from '@/lib/types';

export interface ProcessRequest {
  message: string;
  mediaType?: 'text' | 'voice' | 'image';
  senderName?: string;
  location?: { lat: number; lng: number };
}

export interface ProcessResponse {
  success: boolean;
  usedRealAI: boolean;
  extraction: GeminiExtraction;
  matches: VolunteerMatch[];
  processingTimeMs: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as ProcessRequest;

    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    /* Step 1: Process via Gemini AI (or smart mock fallback) */
    const extraction = await processFieldReport(
      body.message.trim(),
      body.mediaType || 'text'
    );

    /* Step 2: Get volunteers (from Firestore or mock) */
    // TODO: Replace with Firestore query when Firebase is configured
    const volunteers: Volunteer[] = MOCK_VOLUNTEERS;

    /* Step 3: Match volunteers */
    const needLocation = body.location || { lat: 20.5937, lng: 78.9629 }; // Default: center of India
    const matches = matchVolunteers(extraction, volunteers, needLocation, 3);

    /* Step 4: Return results */
    const response: ProcessResponse = {
      success: true,
      usedRealAI: isGeminiConfigured(),
      extraction,
      matches,
      processingTimeMs: Date.now() - startTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        usedRealAI: false,
        extraction: null,
        matches: [],
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/* Health check */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    geminiConfigured: isGeminiConfigured(),
    timestamp: new Date().toISOString(),
  });
}
