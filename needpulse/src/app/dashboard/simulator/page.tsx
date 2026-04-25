'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { DEMO_SCENARIOS, MOCK_VOLUNTEERS } from '@/lib/mock-data';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import type { ChatMessage, GeminiExtraction, ProcessingStep, DemoScenario } from '@/lib/types';
import styles from './simulator.module.css';

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* Processing animation component */
function ProcessingPanel({ steps, result }: { steps: ProcessingStep[]; result: GeminiExtraction | null }) {
  return (
    <div className={styles.processingPanel}>
      <div className={styles.processingHeader}>
        <div className={styles.processingIcon}>🧠</div>
        <h3>Gemini AI Processing</h3>
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
          <h4>📋 Extracted Intelligence</h4>
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
          <div className={styles.resultDetails}>
            <span className={styles.resultLabel}>Key Details</span>
            <ul>
              {result.keyDetails.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* Volunteer match panel */
function MatchPanel({ result, scenario }: { result: GeminiExtraction; scenario: DemoScenario }) {
  const matchedVol = MOCK_VOLUNTEERS.find(v => v.availability === 'available' && v.skills.some(s =>
    (result.category === 'water' && s === 'sanitation') ||
    (result.category === 'medical' && s === 'medical') ||
    (result.category === 'food' && s === 'cooking') ||
    (result.category === 'education' && s === 'teaching') ||
    (result.category === 'shelter' && s === 'logistics')
  )) || MOCK_VOLUNTEERS[0];

  return (
    <div className={styles.matchPanel}>
      <div className={styles.matchHeader}>
        <span>🚀</span>
        <h4>Volunteer Matched!</h4>
      </div>
      <div className={styles.matchCard}>
        <div className={styles.matchAvatar}>{matchedVol.name.charAt(0)}</div>
        <div className={styles.matchInfo}>
          <div className={styles.matchName}>{matchedVol.name}</div>
          <div className={styles.matchSkills}>
            {matchedVol.skills.map(s => <span key={s} className={styles.skillTag}>{s}</span>)}
          </div>
          <div className={styles.matchMeta}>
            📍 {matchedVol.locationName} · ⭐ {matchedVol.rating} · ✅ {matchedVol.totalCompleted} completed
          </div>
        </div>
      </div>
      <div className={styles.dispatchMsg}>
        <span className={styles.waIcon}>💬</span>
        <p>WhatsApp dispatch sent: &quot;Urgent {CATEGORY_CONFIG[result.category].label.toLowerCase()} need at {scenario.locationName}. ~{result.peopleAffected} affected. <em>Tap for Google Maps directions →</em>&quot;</p>
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
  const [showMatch, setShowMatch] = useState(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  /* Simulate the AI processing pipeline */
  const simulateProcessing = useCallback(async (scenario: DemoScenario) => {
    setIsProcessing(true);
    setCurrentResult(null);
    setShowMatch(false);
    setActiveScenario(scenario);

    const mediaLabel = scenario.mediaType === 'voice' ? '🎤 Voice Note' : scenario.mediaType === 'image' ? '📷 Photo' : '💬 Text';
    const steps: ProcessingStep[] = [
      { id: '1', label: `Receiving ${mediaLabel}...`, status: 'pending' },
      { id: '2', label: scenario.mediaType === 'voice' ? 'Transcribing audio...' : scenario.mediaType === 'image' ? 'Analyzing image...' : 'Reading message...', status: 'pending' },
      { id: '3', label: 'Detecting language...', status: 'pending' },
      { id: '4', label: 'Translating to English...', status: 'pending' },
      { id: '5', label: 'Classifying need category...', status: 'pending' },
      { id: '6', label: 'Scoring urgency...', status: 'pending' },
      { id: '7', label: 'Extracting key details...', status: 'pending' },
      { id: '8', label: 'Matching volunteer...', status: 'pending' },
    ];
    setProcessingSteps([...steps]);

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      steps[i].status = 'processing';
      setProcessingSteps([...steps]);

      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
      steps[i].status = 'completed';

      if (i === 2) steps[i].detail = `Detected: ${scenario.language}`;
      if (i === 4) steps[i].detail = `→ ${CATEGORY_CONFIG[scenario.expectedResult.category].label}`;
      if (i === 5) steps[i].detail = `Score: ${scenario.expectedResult.urgency}/10`;

      setProcessingSteps([...steps]);
    }

    setCurrentResult(scenario.expectedResult);

    await new Promise(r => setTimeout(r, 800));
    setShowMatch(true);

    // Add system confirmation reply
    setMessages(prev => [...prev, {
      id: generateId(), type: 'outgoing',
      content: `✅ Report received! Category: ${CATEGORY_CONFIG[scenario.expectedResult.category].emoji} ${CATEGORY_CONFIG[scenario.expectedResult.category].label}\nUrgency: ${scenario.expectedResult.urgency}/10\nVolunteer dispatched to your area.\n\nThank you, ${scenario.senderName} 🙏`,
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
    simulateProcessing(scenario);
  }, [simulateProcessing]);

  /* Send custom message */
  const sendMessage = useCallback(() => {
    if (!inputText.trim() || isProcessing) return;
    const text = inputText.trim();
    setInputText('');

    setMessages(prev => [...prev, {
      id: generateId(), type: 'incoming',
      content: text, timestamp: formatTime(new Date()),
      senderName: 'Field Worker', mediaType: 'text',
    }]);

    // Use the first demo scenario's result as mock
    const mockScenario: DemoScenario = {
      ...DEMO_SCENARIOS[0],
      rawMessage: text,
      expectedResult: { ...DEMO_SCENARIOS[0].expectedResult, summaryEn: text },
    };
    simulateProcessing(mockScenario);
  }, [inputText, isProcessing, simulateProcessing]);

  return (
    <div className={styles.simulator}>
      <div className={styles.simHeader}>
        <div>
          <h1 className={styles.simTitle}>⚡ WhatsApp Simulator</h1>
          <p className={styles.simSubtitle}>Experience the NeedPulse AI pipeline in real-time</p>
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
              <ProcessingPanel steps={processingSteps} result={currentResult} />
              {showMatch && activeScenario && currentResult && (
                <MatchPanel result={currentResult} scenario={activeScenario} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
