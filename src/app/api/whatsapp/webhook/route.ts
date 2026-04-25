/* ============================================
   NeedPulse — Twilio WhatsApp Webhook
   POST /api/whatsapp/webhook
   Receives a WhatsApp message from Twilio, processes via Gemini,
   matches volunteers, and returns TwiML XML response.
   ============================================ */

import { NextRequest, NextResponse } from 'next/server';
import { processFieldReport, isGeminiConfigured } from '@/lib/gemini';
import { matchVolunteers } from '@/lib/matching-engine';
import { MOCK_VOLUNTEERS } from '@/lib/mock-data';
import type { Volunteer } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Twilio sends data as form-urlencoded
    const formData = await request.formData();
    const body = formData.get('Body') as string;
    const from = formData.get('From') as string;

    if (!body || body.trim().length === 0) {
      return generateTwiMLResponse("Error: Received an empty message.");
    }

    // 2. Process via Gemini AI
    const extraction = await processFieldReport(body.trim(), 'text');

    // 3. Match volunteers (using mock data for now)
    const volunteers: Volunteer[] = MOCK_VOLUNTEERS;
    const needLocation = { lat: 20.5937, lng: 78.9629 }; // Default: center of India
    const matches = matchVolunteers(extraction, volunteers, needLocation, 3);

    // 4. Construct human-readable response message
    let responseText = `🚨 *NeedPulse AI Analysis*\n\n`;
    responseText += `*Category:* ${extraction.category.toUpperCase()}\n`;
    responseText += `*Urgency:* ${extraction.urgency}/10\n`;
    responseText += `*Summary:* ${extraction.summaryEn}\n\n`;

    if (matches.length > 0) {
      responseText += `✅ *Matched Volunteers:*\n`;
      matches.forEach((match, index) => {
        responseText += `${index + 1}. ${match.volunteer.name} (${match.totalScore}% match)\n   - ${match.volunteer.phone}\n`;
      });
    } else {
      responseText += `⚠️ *No volunteers matched at this time.*`;
    }

    // 5. Return TwiML XML Response
    return generateTwiMLResponse(responseText);

  } catch (error) {
    console.error('Twilio Webhook error:', error);
    return generateTwiMLResponse(
      "Sorry, our AI processing engine encountered an error. Please try again later."
    );
  }
}

/**
 * Helper to generate properly formatted Twilio XML (TwiML)
 */
function generateTwiMLResponse(message: string): NextResponse {
  // Wrap message in CDATA or escape XML entities to avoid parsing errors
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapedMessage}</Message>
</Response>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
