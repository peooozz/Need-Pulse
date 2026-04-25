'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { DEMO_SCENARIOS, MOCK_VOLUNTEERS } from '@/lib/mock-data';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import { matchVolunteers, type VolunteerMatch } from '@/lib/matching-engine';
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

    // Complete step 5 & 6 with real results
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

    // Add system confirmation reply
    const cat = CATEGORY_CONFIG[extraction.category];
    setMessages(prev => [...prev, {
      id: generateId(), type: 'outgoing',
      content: `✅ Report received! Category: ${cat.emoji} ${cat.label}\nUrgency: ${extraction.urgency}/10\n${matches.length > 0 ? `Volunteer ${matches[0].volunteer.name} dispatched to your area.` : 'Finding available volunteer...'}\n\nThank you 🙏`,
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
  const sendMessage = useCallback(() => {
    if (!inputText.trim() || isProcessing) return;
    const text = inputText.trim();
    setInputText('');

    setMessages(prev => [...prev, {
      id: generateId(), type: 'incoming',
      content: text, timestamp: formatTime(new Date()),
      senderName: 'Field Worker', mediaType: 'text',
    }]);

    // Process via real API (no scenario fallback — true AI processing)
    processMessage(text, 'text', null);
  }, [inputText, isProcessing, processMessage]);

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
            <div className={styles.waHeaderAvatar}>NP</div>
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
            <input
              type="text"
              placeholder="Type a message in any language..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isProcessing}
            />
            <button className={styles.sendBtn} onClick={sendMessage} disabled={isProcessing}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
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
