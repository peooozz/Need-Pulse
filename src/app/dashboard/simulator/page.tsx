'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MOCK_VOLUNTEERS, DEMO_SCENARIOS } from '@/lib/mock-data';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import { matchVolunteers, type VolunteerMatch } from '@/lib/matching-engine';
import { addNeed } from '@/lib/firebase';
import type { NeedStatus } from '@/lib/types';
import type { ChatMessage, GeminiExtraction, ProcessingStep, DemoScenario } from '@/lib/types';
import type { ProcessResponse } from '@/app/api/process/route';
import styles from './simulator.module.css';

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* Processing animation component */
function ProcessingPanel({
  steps,
  result,
  usedRealAI,
  processingTimeMs,
}: {
  steps: ProcessingStep[];
  result: GeminiExtraction | null;
  usedRealAI: boolean;
  processingTimeMs: number | null;
}) {
  return (
    <div className={styles.processingPanel}>
      <div className={styles.processingHeader}>
        <div className={styles.processingIcon}>🧠</div>
        <h3>Gemini AI Processing</h3>
        {result && (
          <span className={styles.aiBadge} data-real={usedRealAI}>
            {usedRealAI ? '✨ Real AI' : '🔄 Mock'}
          </span>
        )}
      </div>
      <div className={styles.processingSteps}>
        {steps.map((step) => (
          <div key={step.id} className={`${styles.processingStep} ${styles[`step_${step.status}`]}`}>
            <div className={styles.stepIndicator}>
              {step.status === 'completed' && '✅'}
              {step.status === 'processing' && <span className={styles.spinner} />}
              {step.status === 'pending' && <span className={styles.pendingDot} />}
              {step.status === 'error' && '❌'}
            </div>
            <div className={styles.stepContent}>
              <span className={styles.stepLabel}>{step.label}</span>
              {step.detail && <span className={styles.stepDetail}>{step.detail}</span>}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div className={styles.resultPanel}>
          <div className={styles.resultHead}>
            <h4>📋 Extracted Intelligence</h4>
            {processingTimeMs !== null && (
              <span className={styles.timing}>⚡ {processingTimeMs}ms</span>
            )}
          </div>
          <div className={styles.resultGrid}>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Category</span>
              <span className={`cat-badge ${CATEGORY_CONFIG[result.category].cssClass}`}>
                {CATEGORY_CONFIG[result.category].emoji} {CATEGORY_CONFIG[result.category].label}
              </span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Urgency</span>
              <span className={styles.resultUrgency} style={{ color: URGENCY_CONFIG.getColor(result.urgency) }}>
                {result.urgency}/10 — {URGENCY_CONFIG.getLevel(result.urgency).toUpperCase()}
              </span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>People Affected</span>
              <span>~{result.peopleAffected.toLocaleString()}</span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Language</span>
              <span>{result.detectedLanguage.toUpperCase()}</span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Sentiment</span>
              <span className={`badge ${result.sentiment === 'desperate' ? 'badge-danger' : result.sentiment === 'urgent' ? 'badge-warning' : 'badge-info'}`}>
                {result.sentiment}
              </span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Confidence</span>
              <span>{(result.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className={styles.resultSummary}>
            <span className={styles.resultLabel}>Summary (EN)</span>
            <p>{result.summaryEn}</p>
          </div>
          {result.keyDetails && result.keyDetails.length > 0 && (
            <div className={styles.resultDetails}>
              <span className={styles.resultLabel}>Key Details</span>
              <ul>
                {result.keyDetails.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Volunteer match panel — now shows scored results from matching engine */
function MatchPanel({
  matches,
  extraction,
  locationName,
}: {
  matches: VolunteerMatch[];
  extraction: GeminiExtraction;
  locationName: string;
}) {
  const bestMatch = matches[0];
  if (!bestMatch) return null;

  return (
    <div className={styles.matchPanel}>
      <div className={styles.matchHeader}>
        <span>🚀</span>
        <h4>Volunteer Matched!</h4>
        <span className={styles.matchScore}>Score: {bestMatch.totalScore}/100</span>
      </div>

      {/* Best match */}
      <div className={styles.matchCard}>
        <div className={styles.matchAvatar}>{bestMatch.volunteer.name.charAt(0)}</div>
        <div className={styles.matchInfo}>
          <div className={styles.matchName}>{bestMatch.volunteer.name}</div>
          <div className={styles.matchSkills}>
            {bestMatch.volunteer.skills.map(s => <span key={s} className={styles.skillTag}>{s}</span>)}
          </div>
          <div className={styles.matchMeta}>
            📍 {bestMatch.volunteer.locationName} · {bestMatch.distance}km away · ⭐ {bestMatch.volunteer.rating} · ✅ {bestMatch.volunteer.totalCompleted} completed
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className={styles.scoreBreakdown}>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>Skill Match</span>
          <div className={styles.scoreBar}>
            <div className={styles.scoreBarFill} style={{ width: `${bestMatch.breakdown.skillMatch}%`, background: 'var(--accent-primary)' }} />
          </div>
          <span className={styles.scoreValue}>{bestMatch.breakdown.skillMatch}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>Proximity</span>
          <div className={styles.scoreBar}>
            <div className={styles.scoreBarFill} style={{ width: `${bestMatch.breakdown.proximity}%`, background: 'var(--accent-success)' }} />
          </div>
          <span className={styles.scoreValue}>{bestMatch.breakdown.proximity}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>Availability</span>
          <div className={styles.scoreBar}>
            <div className={styles.scoreBarFill} style={{ width: `${bestMatch.breakdown.availability}%`, background: 'var(--accent-info)' }} />
          </div>
          <span className={styles.scoreValue}>{bestMatch.breakdown.availability}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>Reliability</span>
          <div className={styles.scoreBar}>
            <div className={styles.scoreBarFill} style={{ width: `${bestMatch.breakdown.reliability}%`, background: 'var(--accent-warning)' }} />
          </div>
          <span className={styles.scoreValue}>{bestMatch.breakdown.reliability}%</span>
        </div>
      </div>

      {/* Other candidates */}
      {matches.length > 1 && (
        <div className={styles.otherMatches}>
          <span className={styles.resultLabel}>Other Candidates</span>
          {matches.slice(1).map((m) => (
            <div key={m.volunteer.id} className={styles.otherMatchRow}>
              <span className={styles.otherMatchName}>{m.volunteer.name}</span>
              <span className={styles.otherMatchScore}>{m.totalScore}/100</span>
              <span className={styles.otherMatchDist}>{m.distance}km</span>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch message */}
      <div className={styles.dispatchMsg}>
        <span className={styles.waIcon}>💬</span>
        <p>WhatsApp dispatch sent: &quot;Urgent {CATEGORY_CONFIG[extraction.category].label.toLowerCase()} need at {locationName}. ~{extraction.peopleAffected} affected. <em>Tap for Google Maps directions →</em>&quot;</p>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [currentResult, setCurrentResult] = useState<GeminiExtraction | null>(null);
  const [currentMatches, setCurrentMatches] = useState<VolunteerMatch[]>([]);
  const [showMatch, setShowMatch] = useState(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [usedRealAI, setUsedRealAI] = useState(false);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'real' | 'mock'>('checking');
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  /* Check API status on mount */
  useEffect(() => {
    fetch('/api/process')
      .then(r => r.json())
      .then(data => setApiStatus(data.geminiConfigured ? 'real' : 'mock'))
      .catch(() => setApiStatus('mock'));
  }, []);

  /* Animate the processing steps with real or mock AI */
  const processMessage = useCallback(async (
    message: string,
    mediaType: 'text' | 'voice' | 'image',
    scenario: DemoScenario | null,
    location?: { lat: number; lng: number }
  ) => {
    setIsProcessing(true);
    setCurrentResult(null);
    setCurrentMatches([]);
    setShowMatch(false);
    setUsedRealAI(false);
    setProcessingTimeMs(null);
    setActiveScenario(scenario);

    const mediaLabel = mediaType === 'voice' ? '🎤 Voice Note' : mediaType === 'image' ? '📷 Photo' : '💬 Text';
    const steps: ProcessingStep[] = [
      { id: '1', label: `Receiving ${mediaLabel}...`, status: 'pending' },
      { id: '2', label: mediaType === 'voice' ? 'Transcribing audio...' : mediaType === 'image' ? 'Analyzing image...' : 'Reading message...', status: 'pending' },
      { id: '3', label: 'Detecting language...', status: 'pending' },
      { id: '4', label: 'Translating to English...', status: 'pending' },
      { id: '5', label: 'Classifying need category...', status: 'pending' },
      { id: '6', label: 'Scoring urgency...', status: 'pending' },
      { id: '7', label: 'Extracting key details...', status: 'pending' },
      { id: '8', label: 'Matching volunteer...', status: 'pending' },
    ];
    setProcessingSteps([...steps]);

    // Start the API call in parallel with the animation
    const apiPromise = fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mediaType,
        senderName: scenario?.senderName || 'Field Worker',
        location: location || scenario?.location || { lat: 20.5937, lng: 78.9629 },
      }),
    }).then(r => r.json()) as Promise<ProcessResponse>;

    // Animate steps 1–6 while API processes
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
      steps[i].status = 'processing';
      setProcessingSteps([...steps]);

      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
      steps[i].status = 'completed';
      setProcessingSteps([...steps]);
    }

    // Wait for API result
    let extraction: GeminiExtraction;
    let matches: VolunteerMatch[];
    let wasRealAI = false;
    let timeMs = 0;

    try {
      const apiResult = await apiPromise;
      if (apiResult.success && apiResult.extraction) {
        extraction = apiResult.extraction;
        matches = apiResult.matches || [];
        wasRealAI = apiResult.usedRealAI;
        timeMs = apiResult.processingTimeMs;
      } else {
        // Fall back to demo scenario if available
        extraction = scenario?.expectedResult || {
          category: 'other', subcategory: 'general', urgency: 5,
          peopleAffected: 50, location: 'Unknown',
          summaryEn: message, summaryOriginal: message,
          detectedLanguage: 'en', sentiment: 'moderate',
          keyDetails: [message], confidence: 0.5,
        };
        matches = matchVolunteers(extraction, MOCK_VOLUNTEERS, scenario?.location || { lat: 20.5937, lng: 78.9629 }, 3);
      }
    } catch {
      // Network error — use scenario fallback
      extraction = scenario?.expectedResult || {
        category: 'other', subcategory: 'general', urgency: 5,
        peopleAffected: 50, location: 'Unknown',
        summaryEn: message, summaryOriginal: message,
        detectedLanguage: 'en', sentiment: 'moderate',
        keyDetails: [message], confidence: 0.5,
      };
      matches = matchVolunteers(extraction, MOCK_VOLUNTEERS, scenario?.location || { lat: 20.5937, lng: 78.9629 }, 3);
    }

    // Handle Conversational / Greeting Messages
    if (extraction.urgency === 0) {
      steps[4].detail = `→ Conversational`;
      steps[5].detail = `Score: 0/10`;
      steps[6].status = 'completed';
      steps[6].detail = `Greeting detected`;
      steps[7].status = 'completed';
      steps[7].detail = `N/A`;
      setProcessingSteps([...steps]);

      setUsedRealAI(wasRealAI);
      setProcessingTimeMs(timeMs);
      
      setMessages(prev => [...prev, {
        id: generateId(), type: 'outgoing',
        content: `👋 Hello! I am NeedPulse AI. Please describe the situation, what kind of help is needed, and any specific location details so I can dispatch the right team to you.`,
        timestamp: formatTime(new Date()),
      }]);

      setIsProcessing(false);
      return;
    }

    // Complete step 5 & 6 with real results for emergencies
    steps[4].detail = `→ ${CATEGORY_CONFIG[extraction.category].label}`;
    steps[5].detail = `Score: ${extraction.urgency}/10`;
    setProcessingSteps([...steps]);

    // Animate step 7
    await new Promise(r => setTimeout(r, 300));
    steps[6].status = 'processing';
    setProcessingSteps([...steps]);
    await new Promise(r => setTimeout(r, 300));
    steps[6].status = 'completed';
    steps[6].detail = `${extraction.keyDetails.length} details found`;
    setProcessingSteps([...steps]);

    // Set the extraction result
    setCurrentResult(extraction);
    setUsedRealAI(wasRealAI);
    setProcessingTimeMs(timeMs);

    // Animate step 8 (matching)
    await new Promise(r => setTimeout(r, 400));
    steps[7].status = 'processing';
    setProcessingSteps([...steps]);
    await new Promise(r => setTimeout(r, 500));
    steps[7].status = 'completed';
    steps[7].detail = matches.length > 0 ? `${matches[0].volunteer.name} (${matches[0].totalScore}/100)` : 'No match found';
    setProcessingSteps([...steps]);

    // Show match panel
    setCurrentMatches(matches);
    await new Promise(r => setTimeout(r, 600));
    setShowMatch(true);

    // Save to Firebase Database
    if (wasRealAI) {
      const needToSave = {
        rawMessage: message,
        rawLanguage: extraction.detectedLanguage,
        translatedMessage: extraction.summaryEn,
        category: extraction.category,
        subcategory: extraction.subcategory,
        urgency: extraction.urgency,
        sentiment: extraction.sentiment,
        peopleAffected: extraction.peopleAffected,
        location: scenario?.location || { lat: 20.5937, lng: 78.9629 },
        locationName: extraction.location || 'Unknown Location',
        mediaUrls: [],
        reporterPhone: '+91****0000',
        reporterName: 'Field Worker',
        status: (matches.length > 0 ? 'assigned' : 'new') as NeedStatus,
        assignedVolunteerId: matches.length > 0 ? matches[0].volunteer.id : null,
        aiConfidence: extraction.confidence,
      };
      await addNeed(needToSave);
    }

    // Add system confirmation reply
    const cat = CATEGORY_CONFIG[extraction.category];
    const dispatchTime = new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nearbyLoc = extraction.location || scenario?.locationName || 'your reported area';
    const finalLoc = location || scenario?.location || { lat: 20.5937, lng: 78.9629 };
    const mapsLink = `https://www.google.com/maps?q=${finalLoc.lat},${finalLoc.lng}`;
    
    setMessages(prev => [...prev, {
      id: generateId(), type: 'outgoing',
      content: `✅ Report received!\n\n📋 Details:\n• Category: ${cat.emoji} ${cat.label}\n• Urgency: ${extraction.urgency}/10\n• Exact Location: ${nearbyLoc}\n• Est. Dispatch Time: ${dispatchTime}\n• 🗺️ Map: ${mapsLink}\n\n${matches.length > 0 ? `🚀 Volunteer ${matches[0].volunteer.name} from ${matches[0].volunteer.organization || 'our network'} is mobilizing and en route.` : '🔄 Finding nearest available volunteer...'}\n\nThank you 🙏`,
      timestamp: formatTime(new Date()),
    }]);

    setIsProcessing(false);
  }, []);

  /* Run a demo scenario */
  const runScenario = useCallback((scenario: DemoScenario) => {
    const icon = scenario.mediaType === 'voice' ? '🎤 ' : scenario.mediaType === 'image' ? '📷 ' : '';
    setMessages(prev => [...prev, {
      id: generateId(), type: 'incoming',
      content: `${icon}${scenario.rawMessage}`,
      timestamp: formatTime(new Date()),
      senderName: scenario.senderName,
      mediaType: scenario.mediaType,
    }]);
    processMessage(scenario.rawMessage, scenario.mediaType, scenario, scenario.location);
  }, [processMessage]);

  /* Send custom message — now calls real AI! */
  const sendMessage = useCallback((overrideText?: string, isVoice: boolean = false) => {
    const text = overrideText || inputText.trim();
    if (!text || isProcessing) return;
    if (!overrideText) setInputText('');

    setMessages(prev => [...prev, {
      id: generateId(), type: 'incoming',
      content: isVoice ? `🎤 [Voice Note]: ${text}` : text, timestamp: formatTime(new Date()),
      senderName: 'Field Worker', mediaType: isVoice ? 'voice' : 'text',
    }]);

    // Attempt to get real location before sending to AI
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          processMessage(text, isVoice ? 'voice' : 'text', null, loc);
        },
        (error) => {
          console.warn('Geolocation failed or denied, using fallback location', error);
          processMessage(text, isVoice ? 'voice' : 'text', null);
        },
        { timeout: 5000 }
      );
    } else {
      processMessage(text, isVoice ? 'voice' : 'text', null);
    }
  }, [inputText, isProcessing, processMessage]);

  const toggleRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isRecording) {
      // It will stop automatically on SpeechRecognition.stop() or when it stops hearing
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    
    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      sendMessage(speechResult, true);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => setIsRecording(false);

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  }, [isRecording, sendMessage]);

  return (
    <div className={styles.simulator}>
      <div className={styles.simHeader}>
        <div>
          <h1 className={styles.simTitle}>⚡ WhatsApp Simulator</h1>
          <p className={styles.simSubtitle}>Experience the NeedPulse AI pipeline in real-time</p>
        </div>
        <div className={styles.apiStatusBadge} data-status={apiStatus}>
          {apiStatus === 'checking' ? '⏳ Checking API...' : apiStatus === 'real' ? '✨ Gemini AI Connected' : '🔄 Mock AI (add GEMINI_API_KEY)'}
        </div>
      </div>

      {/* Scenario buttons */}
      <div className={styles.scenarios}>
        <span className={styles.scenarioLabel}>Demo Scenarios:</span>
        {DEMO_SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={styles.scenarioBtn}
            onClick={() => runScenario(s)}
            disabled={isProcessing}
          >
            {s.mediaType === 'voice' ? '🎤' : s.mediaType === 'image' ? '📷' : '💬'} {s.title}
          </button>
        ))}
      </div>

      <div className={styles.splitView}>
        {/* WhatsApp Chat */}
        <div className={styles.chatPane}>
          <div className={styles.waHeader}>
            <div className={styles.waHeaderAvatar}>
              <img src="/logo.png" alt="NP" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain' }} />
            </div>
            <div>
              <div className={styles.waHeaderName}>NeedPulse Bot</div>
              <div className={styles.waHeaderStatus}>online</div>
            </div>
          </div>

          <div className={styles.chatArea}>
            {messages.length === 0 && (
              <div className={styles.chatEmpty}>
                <p>👋 Select a demo scenario above or type a message below</p>
                <p className={styles.chatEmptySub}>Try sending a community need report in any language</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`${styles.bubble} ${styles[`bubble_${msg.type}`]}`}>
                {msg.senderName && msg.type === 'incoming' && (
                  <div className={styles.bubbleSender}>{msg.senderName}</div>
                )}
                <div className={styles.bubbleText}>{msg.content}</div>
                <div className={styles.bubbleTime}>{msg.timestamp}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className={styles.chatInput}>
            <button className={styles.waInputIcon} title="Emoji">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </button>
            <button className={styles.waInputIcon} title="Attach">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input
              type="text"
              placeholder={isRecording ? "Listening..." : "Type a message in any language..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isProcessing || isRecording}
            />
            {inputText.trim() || isRecording ? (
              <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={isProcessing}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            ) : (
              <button 
                className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`} 
                onClick={toggleRecording} 
                disabled={isProcessing}
                title="Record Voice Note"
              >
                {isRecording ? '🔴' : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
              </button>
            )}
          </div>
        </div>

        {/* AI Processing Panel */}
        <div className={styles.aiPane}>
          {processingSteps.length === 0 ? (
            <div className={styles.aiEmpty}>
              <div className={styles.aiEmptyIcon}>🧠</div>
              <h3>AI Processing Pipeline</h3>
              <p>Send a message or run a scenario to see Gemini AI extract intelligence in real-time</p>
            </div>
          ) : (
            <>
              <ProcessingPanel
                steps={processingSteps}
                result={currentResult}
                usedRealAI={usedRealAI}
                processingTimeMs={processingTimeMs}
              />
              {showMatch && currentResult && (
                <MatchPanel
                  matches={currentMatches}
                  extraction={currentResult}
                  locationName={activeScenario?.locationName || 'reported location'}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
