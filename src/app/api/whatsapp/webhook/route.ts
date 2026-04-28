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
import { addNeed, getVolunteers } from '@/lib/firebase';
import type { Volunteer, NeedStatus } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Twilio sends data as form-urlencoded
    const formData = await request.formData();
    const body = formData.get('Body') as string || '';
    const fromPhone = formData.get('From') as string || 'Unknown';
    const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10);
    const mediaUrl = formData.get('MediaUrl0') as string;
    const mediaContentType = formData.get('MediaContentType0') as string;
    
    // Check if the user attached a WhatsApp Location
    const latitude = formData.get('Latitude') as string;
    const longitude = formData.get('Longitude') as string;

    if (body.trim().length === 0 && numMedia === 0 && !latitude) {
      return generateTwiMLResponse("Error: Received an empty message.");
    }

    let mediaData: { mimeType: string; data: string } | undefined = undefined;
    let mediaType: 'text' | 'voice' | 'image' | 'location' = latitude ? 'location' : 'text';

    // Fetch and encode Twilio Media if it's a voice note
    if (numMedia > 0 && mediaUrl && mediaContentType && mediaContentType.startsWith('audio/')) {
      mediaType = 'voice';
      try {
        const audioRes = await fetch(mediaUrl);
        if (audioRes.ok) {
          const buffer = await audioRes.arrayBuffer();
          const base64Audio = Buffer.from(buffer).toString('base64');
          mediaData = { mimeType: mediaContentType, data: base64Audio };
        }
      } catch (err) {
        console.error('Failed to fetch audio from Twilio:', err);
      }
    }

    // 2. Process via Gemini AI (supports direct multimodal audio!)
    // If it's just a location ping with no text, we can give a default string
    const reportText = latitude && !body.trim() ? "User shared their GPS location for assistance." : body.trim();
    const extraction = await processFieldReport(reportText, mediaType !== 'location' ? mediaType : 'text', mediaData);

    // Handle conversational / greeting messages early
    if (extraction.urgency === 0 && !latitude) {
      const greetingMessage = `👋 Hello! I am NeedPulse AI.\n\nPlease describe the emergency, what kind of help is needed, and your specific location so I can dispatch the right team to you.`;
      return generateTwiMLResponse(greetingMessage);
    }

    // 3. Match volunteers (using real data, fallback to mock)
    let volunteers: Volunteer[] = await getVolunteers();
    if (volunteers.length === 0) {
      volunteers = MOCK_VOLUNTEERS;
    }
    
    // Use user's real GPS if provided, else default
    const needLocation = latitude && longitude 
      ? { lat: parseFloat(latitude), lng: parseFloat(longitude) }
      : { lat: 20.5937, lng: 78.9629 };
      
    const matches = matchVolunteers(extraction, volunteers, needLocation, 3);

    // 4. Construct human-readable response message
    let responseText = `🚨 *NeedPulse AI Analysis*\n\n`;
    responseText += `*Category:* ${extraction.category.toUpperCase()}\n`;
    responseText += `*Urgency:* ${extraction.urgency}/10\n`;
    responseText += `*Summary:* ${extraction.summaryEn}\n\n`;

    if (latitude && longitude) {
      responseText += `📍 *Location Received:* https://www.google.com/maps?q=${latitude},${longitude}\n\n`;
    }

    if (matches.length > 0) {
      responseText += `✅ *Matched Volunteers:*\n`;
      matches.forEach((match, index) => {
        responseText += `${index + 1}. ${match.volunteer.name} (${match.totalScore}% match)\n   - ${match.volunteer.phone}\n`;
      });
    } else {
      responseText += `⚠️ *No volunteers matched at this time.*`;
    }

    // 5. Sync to Firebase Dashboard
    const needToSave = {
      rawMessage: body.trim() || '[Audio Report]',
      rawLanguage: extraction.detectedLanguage || 'en',
      translatedMessage: extraction.summaryEn,
      category: extraction.category,
      subcategory: extraction.subcategory || 'general',
      urgency: extraction.urgency,
      sentiment: extraction.sentiment || 'urgent',
      peopleAffected: extraction.peopleAffected || 0,
      location: needLocation,
      locationName: extraction.location || 'Unknown Location',
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      reporterPhone: fromPhone,
      reporterName: 'WhatsApp Reporter',
      status: (matches.length > 0 ? 'assigned' : 'new') as NeedStatus,
      assignedVolunteerId: matches.length > 0 ? matches[0].volunteer.id : null,
      aiConfidence: extraction.confidence || 0.8,
    };
    
    try {
      await addNeed(needToSave);
      console.log('✅ Real WhatsApp Report Synced to Dashboard!');
    } catch (dbErr) {
      console.error('Failed to sync to dashboard:', dbErr);
    }

    // 6. Return TwiML XML Response
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
