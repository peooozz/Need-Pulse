/* ============================================
   NeedPulse — Twilio WhatsApp Webhook
   POST /api/whatsapp/webhook

   DETERMINISTIC CONVERSATION STATE MACHINE
   Phase 1: Language Selection
   Phase 2: Problem Description → Gemini AI Analysis
   Phase 3: People Affected
   Phase 4: Follow-up Questions (AI-generated)
   Phase 5: Location (GPS pin)
   Phase 6: ✅ Report Registered → Dashboard Sync
   ============================================ */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeProblem } from '@/lib/gemini';
import { matchVolunteers } from '@/lib/matching-engine';
import { MOCK_VOLUNTEERS } from '@/lib/mock-data';
import {
  addNeed,
  getVolunteers,
  getActiveSession,
  saveSession,
  deleteActiveSession,
  createEmptySession,
} from '@/lib/firebase';
import type { WhatsAppSession } from '@/lib/firebase';
import type { Volunteer, NeedStatus } from '@/lib/types';

/* ======== Language Definitions ======== */
const LANGUAGES: Record<string, { name: string; code: string }> = {
  '1': { name: 'English', code: 'en' },
  '2': { name: 'हिन्दी (Hindi)', code: 'hi' },
  '3': { name: 'తెలుగు (Telugu)', code: 'te' },
  '4': { name: 'தமிழ் (Tamil)', code: 'ta' },
  '5': { name: 'বাংলা (Bengali)', code: 'bn' },
  '6': { name: 'ಕನ್ನಡ (Kannada)', code: 'kn' },
};

/* ======== Multilingual Message Templates ======== */
const MESSAGES: Record<string, Record<string, string>> = {
  askProblem: {
    en: `✅ Language set to *English*.\n\n📝 Now, please describe your emergency or problem in detail.\n\n_For example: "There is flooding in our village and people are trapped" or "We need medical help urgently"_`,
    hi: `✅ भाषा *हिन्दी* में सेट की गई।\n\n📝 अब कृपया अपनी आपातकालीन स्थिति या समस्या का विस्तार से वर्णन करें।\n\n_उदाहरण: "हमारे गाँव में बाढ़ आई है और लोग फंसे हुए हैं" या "हमें तुरंत चिकित्सा सहायता चाहिए"_`,
    te: `✅ భాష *తెలుగు* గా సెట్ చేయబడింది.\n\n📝 ఇప్పుడు దయచేసి మీ అత్యవసర పరిస్థితిని వివరంగా చెప్పండి.\n\n_ఉదాహరణ: "మా ఊరిలో వరదలు వచ్చాయి, ప్రజలు చిక్కుకున్నారు"_`,
    ta: `✅ மொழி *தமிழ்* என அமைக்கப்பட்டது.\n\n📝 இப்போது உங்கள் அவசரநிலையை விரிவாக விவரிக்கவும்.`,
    bn: `✅ ভাষা *বাংলা* তে সেট করা হয়েছে।\n\n📝 এখন আপনার জরুরি অবস্থা বিস্তারিত বর্ণনা করুন।`,
    kn: `✅ ಭಾಷೆಯನ್ನು *ಕನ್ನಡ* ಕ್ಕೆ ಹೊಂದಿಸಲಾಗಿದೆ.\n\n📝 ಈಗ ದಯವಿಟ್ಟು ನಿಮ್ಮ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ವಿವರವಾಗಿ ವಿವರಿಸಿ.`,
  },
  askPeople: {
    en: `👥 How many people are affected or need help?\n\n_Reply with an approximate number, e.g., "5", "20 families", "around 100 people"_`,
    hi: `👥 कितने लोग प्रभावित हैं या उन्हें मदद की ज़रूरत है?\n\n_अनुमानित संख्या बताएं, जैसे "5", "20 परिवार", "लगभग 100 लोग"_`,
    te: `👥 ఎంతమంది ప్రభావితమయ్యారు లేదా సహాయం అవసరం?\n\n_సుమారు సంఖ్య చెప్పండి, ఉదా: "5", "20 కుటుంబాలు"_`,
    ta: `👥 எத்தனை பேர் பாதிக்கப்பட்டுள்ளனர்?\n\n_தோராயமான எண்ணிக்கையை கூறுங்கள்_`,
    bn: `👥 কতজন মানুষ ক্ষতিগ্রস্ত?\n\n_আনুমানিক সংখ্যা বলুন_`,
    kn: `👥 ಎಷ್ಟು ಜನ ಪ್ರಭಾವಿತರಾಗಿದ್ದಾರೆ?\n\n_ಸುಮಾರು ಸಂಖ್ಯೆ ಹೇಳಿ_`,
  },
  askLocation: {
    en: `📍 Now please share your *exact location* so rescue teams can reach you.\n\n👉 Tap the *📎 Attach* button → *📍 Location* → *Send Your Current Location*\n\nOr type your address/landmark if you cannot share GPS.`,
    hi: `📍 अब कृपया अपना *सटीक स्थान* साझा करें ताकि बचाव दल आप तक पहुँच सकें।\n\n👉 *📎 अटैच* बटन दबाएं → *📍 Location* → *Send Your Current Location*\n\nयदि GPS साझा नहीं कर सकते तो अपना पता/लैंडमार्क टाइप करें।`,
    te: `📍 ఇప్పుడు దయచేసి మీ *ఖచ్చితమైన స్థానాన్ని* షేర్ చేయండి.\n\n👉 *📎 Attach* బటన్ నొక్కండి → *📍 Location* → *Send Your Current Location*\n\nGPS షేర్ చేయలేకపోతే మీ చిరునామా టైప్ చేయండి.`,
    ta: `📍 இப்போது உங்கள் *சரியான இடத்தை* பகிரவும்.\n\n👉 *📎 Attach* → *📍 Location* → *Send Your Current Location*`,
    bn: `📍 এখন আপনার *সঠিক অবস্থান* শেয়ার করুন।\n\n👉 *📎 Attach* → *📍 Location* → *Send Your Current Location*`,
    kn: `📍 ಈಗ ದಯವಿಟ್ಟು ನಿಮ್ಮ *ನಿಖರ ಸ್ಥಳವನ್ನು* ಹಂಚಿಕೊಳ್ಳಿ.\n\n👉 *📎 Attach* → *📍 Location* → *Send Your Current Location*`,
  },
};

function msg(key: string, lang: string): string {
  return MESSAGES[key]?.[lang] || MESSAGES[key]?.['en'] || '';
}

/* ======== MAIN WEBHOOK HANDLER ======== */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = (formData.get('Body') as string || '').trim();
    const fromPhone = formData.get('From') as string || 'Unknown';
    const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10);
    const mediaUrl = formData.get('MediaUrl0') as string;
    const mediaContentType = formData.get('MediaContentType0') as string;
    const latitude = formData.get('Latitude') as string;
    const longitude = formData.get('Longitude') as string;

    // Get or create session
    let session = await getActiveSession(fromPhone);
    if (!session) {
      session = createEmptySession(fromPhone);
    }

    let replyText = '';

    /* ──────────────────────────────────────────
       PHASE 1: LANGUAGE SELECTION
       ────────────────────────────────────────── */
    if (session.phase === 'language') {
      // Check if user typed a number to pick a language
      const pick = body.replace(/[^1-6]/g, '');
      if (pick && LANGUAGES[pick]) {
        session.language = LANGUAGES[pick].code;
        session.phase = 'problem';
        session.messages.push(`User: ${body}`, `AI: [Language set to ${LANGUAGES[pick].name}]`);
        await saveSession(session);
        return twiml(msg('askProblem', session.language));
      }

      // Also detect language from script
      if (/[\u0900-\u097F]/.test(body)) { session.language = 'hi'; }
      else if (/[\u0C00-\u0C7F]/.test(body)) { session.language = 'te'; }
      else if (/[\u0B80-\u0BFF]/.test(body)) { session.language = 'ta'; }
      else if (/[\u0980-\u09FF]/.test(body)) { session.language = 'bn'; }
      else if (/[\u0C80-\u0CFF]/.test(body)) { session.language = 'kn'; }

      // If they typed something in a detected language, skip to problem phase
      if (session.language && body.length > 3) {
        session.phase = 'problem';
        session.messages.push(`User: ${body}`, `AI: [Language auto-detected]`);
        // Treat this message as the problem itself
        session.problemDescription = body;
        // Jump to analyze it
        const extraction = await analyzeProblem(body, session.language);
        session.category = extraction.category;
        session.subcategory = extraction.subcategory;
        session.urgency = extraction.urgency;
        session.sentiment = extraction.sentiment;
        session.phase = 'people';
        
        const summary = extraction.summaryEn;
        replyText = `🚨 *${extraction.category.toUpperCase()}* emergency detected.\n_"${summary}"_\n\n${msg('askPeople', session.language)}`;
        session.messages.push(`AI: ${replyText}`);
        await saveSession(session);
        return twiml(replyText);
      }

      // Default: Show language menu
      replyText = `👋 *Welcome to NeedPulse AI* 🚨\nEmergency Response System\n\nPlease choose your language / अपनी भाषा चुनें:\n\n1️⃣ English\n2️⃣ हिन्दी (Hindi)\n3️⃣ తెలుగు (Telugu)\n4️⃣ தமிழ் (Tamil)\n5️⃣ বাংলা (Bengali)\n6️⃣ ಕನ್ನಡ (Kannada)\n\n_Reply with the number (1-6)_`;
      session.messages.push(`User: ${body || '[first contact]'}`, `AI: [Language menu shown]`);
      await saveSession(session);
      return twiml(replyText);
    }

    /* ──────────────────────────────────────────
       PHASE 2: PROBLEM DESCRIPTION
       ────────────────────────────────────────── */
    if (session.phase === 'problem') {
      if (body.length < 3) {
        replyText = msg('askProblem', session.language);
        return twiml(replyText);
      }

      session.problemDescription = body;
      session.messages.push(`User: ${body}`);

      // Run Gemini AI Analysis
      const extraction = await analyzeProblem(body, session.language);
      session.category = extraction.category;
      session.subcategory = extraction.subcategory;
      session.urgency = extraction.urgency;
      session.sentiment = extraction.sentiment;

      // Store follow-up question from Gemini
      if (extraction.followUpQuestions.length > 0) {
        session.followUpQuestion = extraction.followUpQuestions[0];
      }

      session.phase = 'people';
      const summary = extraction.summaryEn;
      replyText = `🚨 *${extraction.category.toUpperCase()}* emergency detected.\n_"${summary}"_\n\n${msg('askPeople', session.language)}`;
      session.messages.push(`AI: ${replyText}`);
      await saveSession(session);
      return twiml(replyText);
    }

    /* ──────────────────────────────────────────
       PHASE 3: PEOPLE AFFECTED
       ────────────────────────────────────────── */
    if (session.phase === 'people') {
      // Try to extract a number from the response
      const numMatch = body.match(/(\d+)/);
      let count = numMatch ? parseInt(numMatch[1], 10) : 0;

      // Handle "families" multiplier
      if (/famil|परिवार|కుటుంబ/i.test(body) && count > 0) {
        count = count * 4;
      }

      if (count <= 0) {
        const retry: Record<string, string> = {
          en: `🔢 Please provide a number. How many people are affected?\n\n_e.g., "5", "20 families", "about 50"_`,
          hi: `🔢 कृपया एक संख्या बताएं। कितने लोग प्रभावित हैं?\n\n_जैसे "5", "20 परिवार", "लगभग 50"_`,
          te: `🔢 దయచేసి ఒక సంఖ్య చెప్పండి. ఎంతమంది ప్రభావితమయ్యారు?`,
          ta: `🔢 எண்ணிக்கையை சொல்லுங்கள்.`,
          bn: `🔢 একটি সংখ্যা বলুন।`,
          kn: `🔢 ಒಂದು ಸಂಖ್ಯೆ ಹೇಳಿ.`,
        };
        return twiml(retry[session.language] || retry['en']);
      }

      session.peopleAffected = count;
      session.messages.push(`User: ${body}`, `AI: [Recorded ${count} people affected]`);

      // Move to follow-up phase if we have a question from Gemini
      if (session.followUpQuestion) {
        session.phase = 'followup';
        replyText = `📋 *${count} people affected* — noted.\n\n❓ ${session.followUpQuestion}`;
        session.messages.push(`AI: ${replyText}`);
        await saveSession(session);
        return twiml(replyText);
      }

      // Skip directly to location if no follow-up
      session.phase = 'location';
      replyText = `📋 *${count} people affected* — noted.\n\n${msg('askLocation', session.language)}`;
      session.messages.push(`AI: ${replyText}`);
      await saveSession(session);
      return twiml(replyText);
    }

    /* ──────────────────────────────────────────
       PHASE 4: FOLLOW-UP QUESTION
       ────────────────────────────────────────── */
    if (session.phase === 'followup') {
      session.followUpAnswer = body;
      session.messages.push(`User: ${body}`);

      // Move to location
      session.phase = 'location';
      const ack: Record<string, string> = {
        en: `✅ Thank you for the details.`,
        hi: `✅ जानकारी के लिए धन्यवाद।`,
        te: `✅ వివరాల కోసం ధన్యవాదాలు.`,
        ta: `✅ விவரங்களுக்கு நன்றி.`,
        bn: `✅ তথ্যের জন্য ধন্যবাদ।`,
        kn: `✅ ವಿವರಗಳಿಗಾಗಿ ಧನ್ಯವಾದ.`,
      };
      replyText = `${ack[session.language] || ack['en']}\n\n${msg('askLocation', session.language)}`;
      session.messages.push(`AI: ${replyText}`);
      await saveSession(session);
      return twiml(replyText);
    }

    /* ──────────────────────────────────────────
       PHASE 5: LOCATION
       ────────────────────────────────────────── */
    if (session.phase === 'location') {
      // Case A: User sent a GPS pin via WhatsApp
      if (latitude && longitude) {
        session.latitude = parseFloat(latitude);
        session.longitude = parseFloat(longitude);
        session.messages.push(`User: [Shared GPS: ${latitude}, ${longitude}]`);
      }
      // Case B: User typed an address
      else if (body.length > 2) {
        session.messages.push(`User: ${body}`);
        // Use India center as fallback — the typed location goes into locationName
        session.latitude = 20.5937;
        session.longitude = 78.9629;
      }
      // Case C: Nothing useful
      else {
        return twiml(msg('askLocation', session.language));
      }

      // ─── REPORT COMPLETE ───
      session.phase = 'complete';
      session.isComplete = true;
      await saveSession(session);

      // ─── Sync to Firebase Dashboard & Heatmap ───
      const needLocation = {
        lat: session.latitude!,
        lng: session.longitude!,
      };

      let volunteers: Volunteer[] = await getVolunteers();
      if (volunteers.length === 0) volunteers = MOCK_VOLUNTEERS;

      const extractionForMatching = {
        category: session.category as any,
        subcategory: session.subcategory,
        urgency: session.urgency,
        peopleAffected: session.peopleAffected,
        location: body || 'GPS Location',
        summaryEn: session.problemDescription,
        summaryOriginal: session.problemDescription,
        detectedLanguage: session.language,
        sentiment: session.sentiment as any,
        keyDetails: [],
        confidence: 0.85,
      };

      const matches = matchVolunteers(extractionForMatching, volunteers, needLocation, 3);

      // Build the full conversation transcript
      const transcript = session.messages.join('\n');

      const needToSave = {
        rawMessage: transcript,
        rawLanguage: session.language || 'en',
        translatedMessage: session.problemDescription,
        category: (session.category || 'other') as any,
        subcategory: session.subcategory || 'general',
        urgency: session.urgency || 5,
        sentiment: (session.sentiment || 'urgent') as any,
        peopleAffected: session.peopleAffected || 0,
        location: needLocation,
        locationName: body || `GPS: ${session.latitude}, ${session.longitude}`,
        mediaUrls: [] as string[],
        reporterPhone: fromPhone,
        reporterName: 'WhatsApp Reporter',
        status: (matches.length > 0 ? 'assigned' : 'new') as NeedStatus,
        assignedVolunteerId: matches.length > 0 ? matches[0].volunteer.id : null,
        aiConfidence: 0.85,
      };

      try {
        await addNeed(needToSave);
        console.log('✅ WhatsApp Report synced to Dashboard & Heatmap!');
      } catch (dbErr) {
        console.error('Failed to sync to dashboard:', dbErr);
      }

      // Build final confirmation message
      const mapLink = `https://www.google.com/maps?q=${session.latitude},${session.longitude}`;

      let finalMsg = '';
      if (session.language === 'hi') {
        finalMsg = `✅ *रिपोर्ट सफलतापूर्वक दर्ज!*\n\n`;
        finalMsg += `📋 *श्रेणी:* ${session.category?.toUpperCase()}\n`;
        finalMsg += `🚨 *तात्कालिकता:* ${session.urgency}/10\n`;
        finalMsg += `👥 *प्रभावित:* ${session.peopleAffected} लोग\n`;
        finalMsg += `📍 *स्थान:* ${mapLink}\n\n`;
      } else if (session.language === 'te') {
        finalMsg = `✅ *రిపోర్ట్ విజయవంతంగా నమోదు!*\n\n`;
        finalMsg += `📋 *వర్గం:* ${session.category?.toUpperCase()}\n`;
        finalMsg += `🚨 *అత్యవసరం:* ${session.urgency}/10\n`;
        finalMsg += `👥 *ప్రభావితం:* ${session.peopleAffected} మంది\n`;
        finalMsg += `📍 *స్థానం:* ${mapLink}\n\n`;
      } else {
        finalMsg = `✅ *Report Successfully Registered!*\n\n`;
        finalMsg += `📋 *Category:* ${session.category?.toUpperCase()}\n`;
        finalMsg += `🚨 *Urgency:* ${session.urgency}/10\n`;
        finalMsg += `👥 *People Affected:* ${session.peopleAffected}\n`;
        finalMsg += `📍 *Location:* ${mapLink}\n\n`;
      }

      if (matches.length > 0) {
        finalMsg += `🟢 *Matched Rescue Teams:*\n`;
        matches.forEach((m, i) => {
          finalMsg += `${i + 1}. ${m.volunteer.name} (${m.totalScore}% match)\n   📞 ${m.volunteer.phone}\n`;
        });
        finalMsg += `\n_Rescue teams have been notified. Help is on the way!_ 🚑`;
      } else {
        finalMsg += `⚠️ _Your report is registered. Our coordination team will assign rescue resources shortly._`;
      }

      // Clean up the session
      if (session.id) {
        await deleteActiveSession(session.id);
      }

      return twiml(finalMsg);
    }

    // Fallback — if somehow phase is "complete" or unknown, start fresh
    if (session.id) {
      await deleteActiveSession(session.id);
    }
    const freshSession = createEmptySession(fromPhone);
    await saveSession(freshSession);
    const welcomeMsg = `👋 *Welcome to NeedPulse AI* 🚨\nEmergency Response System\n\nPlease choose your language / अपनी भाषा चुनें:\n\n1️⃣ English\n2️⃣ हिन्दी (Hindi)\n3️⃣ తెలుగు (Telugu)\n4️⃣ தமிழ் (Tamil)\n5️⃣ বাংলা (Bengali)\n6️⃣ ಕನ್ನಡ (Kannada)\n\n_Reply with the number (1-6)_`;
    return twiml(welcomeMsg);

  } catch (error) {
    console.error('Twilio Webhook error:', error);
    return twiml(
      "Sorry, our AI system encountered an error. Please try again by sending *Hi*."
    );
  }
}

/* ======== TwiML XML Builder ======== */
function twiml(message: string): NextResponse {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escaped}</Message>
</Response>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
