import { useCallback, useEffect, useRef, useState } from 'react';
import EventSource from 'react-native-sse';

type ChatbotStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error';

export interface QAPair {
  id: string;
  question: string;
  answer: string;
}

interface ChatbotState {
  status: ChatbotStatus;
  qaHistory: QAPair[];
  currentQuestion: string;
  currentAnswer: string;
  error: string | null;
  canAsk: boolean;
  canStop: boolean;
  isBusy: boolean;
}

interface ChatbotActions {
  submit: (question: string) => void;
  cancel: () => void;
  reset: () => void;
}

const API_ENDPOINT = 'https://vera-assignment-api.vercel.app/api/stream';
const BATCH_UPDATE_MS = 25; // 16-33ms micro-debounce for batched UI updates

// Mock data for initial display
const MOCK_QA_HISTORY: QAPair[] = [
  {
    id: 'mock-1',
    question: 'What are the first-line treatments for hypertension?',
    answer: 'The first-line treatments for hypertension typically include:\n\n1. **Thiazide diuretics** (e.g., hydrochlorothiazide, chlorthalidone) - Often the first choice, especially for uncomplicated hypertension\n\n2. **ACE inhibitors** (e.g., lisinopril, enalapril) - Particularly beneficial for patients with diabetes or chronic kidney disease\n\n3. **Angiotensin II receptor blockers (ARBs)** (e.g., losartan, valsartan) - Alternative to ACE inhibitors, especially if ACE inhibitors cause cough\n\n4. **Calcium channel blockers** (e.g., amlodipine, nifedipine) - Effective for elderly patients and those of African descent\n\nThe choice depends on patient-specific factors including age, ethnicity, comorbidities, and contraindications. Lifestyle modifications (diet, exercise, weight loss, reduced sodium intake) should always accompany pharmacological treatment.',
  },
  {
    id: 'mock-2',
    question: 'How do you diagnose and manage acute appendicitis?',
    answer: '**Diagnosis of Acute Appendicitis:**\n\n*Clinical Assessment:*\n- Classic presentation: periumbilical pain migrating to right lower quadrant (McBurney\'s point)\n- Associated symptoms: anorexia, nausea, vomiting, low-grade fever\n- Physical exam: rebound tenderness, guarding, Rovsing\'s sign, psoas sign\n\n*Laboratory Tests:*\n- Elevated WBC count (typically 10,000-18,000/μL)\n- Elevated C-reactive protein (CRP)\n- Urinalysis to rule out UTI\n\n*Imaging:*\n- **CT scan** with IV contrast (gold standard, 95% sensitivity)\n- **Ultrasound** (preferred in children and pregnant women)\n- **MRI** (alternative in pregnancy if ultrasound inconclusive)\n\n**Management:**\n\n*Conservative:*\n- NPO (nothing by mouth)\n- IV fluids and electrolyte management\n- IV antibiotics (e.g., ceftriaxone + metronidazole)\n- Pain management\n\n*Surgical:*\n- **Appendectomy** (laparoscopic preferred over open)\n- Timing: within 24 hours of diagnosis\n- Antibiotics continued post-operatively if perforation present\n\nNote: Some uncomplicated cases may be managed with antibiotics alone, though surgery remains the definitive treatment.',
  },
];

export function useChatbotState(): [ChatbotState, ChatbotActions] {
  const [status, setStatus] = useState<ChatbotStatus>('idle');
  const [qaHistory, setQaHistory] = useState<QAPair[]>(MOCK_QA_HISTORY);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for SSE connection and pending text buffer
  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingTextRef = useRef<string>('');
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Cleanup function for SSE connection
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  }, []);

  // Flush pending text to state
  const flushPendingText = useCallback(() => {
    if (pendingTextRef.current) {
      setCurrentAnswer(prev => prev + pendingTextRef.current);
      pendingTextRef.current = '';
    }
  }, []);

  // Schedule a batched UI update
  const scheduleBatchedUpdate = useCallback(() => {
    if (updateTimerRef.current) {
      return; // Update already scheduled
    }

    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    const delay = Math.max(0, BATCH_UPDATE_MS - elapsed);

    updateTimerRef.current = setTimeout(() => {
      flushPendingText();
      lastUpdateRef.current = Date.now();
      updateTimerRef.current = null;
    }, delay);
  }, [flushPendingText]);

  // Submit question and start SSE connection
  const submit = useCallback(
    (inputQuestion: string) => {
      const trimmed = inputQuestion.trim();
      if (!trimmed) return;

      // Reset current state
      setError(null);
      setCurrentQuestion(trimmed);
      setCurrentAnswer('');
      pendingTextRef.current = '';
      setStatus('connecting');

      const encodedPrompt = encodeURIComponent(trimmed);
      const url = `${API_ENDPOINT}?prompt=${encodedPrompt}`;

      try {
        const es = new EventSource(url, {
          headers: {},
          method: 'GET',
        });

        eventSourceRef.current = es;

        es.addEventListener('open', () => {
          setStatus('streaming');
        });

        es.addEventListener('message', (event) => {
          if (event.data) {
            try {
              // Parse SSE data - handle both plain JSON and data: prefixed lines
              const data = event.data.trim();
              if (data) {
                // Try parsing as JSON
                const parsed = JSON.parse(data);
                
                // Handle different response formats
                if (parsed.content) {
                  pendingTextRef.current += parsed.content;
                } else if (parsed.text) {
                  pendingTextRef.current += parsed.text;
                } else if (parsed.chunk) {
                  pendingTextRef.current += parsed.chunk;
                } else if (typeof parsed === 'string') {
                  pendingTextRef.current += parsed;
                }
                
                scheduleBatchedUpdate();
              }
            } catch {
              // Skip malformed lines (SSE allows comments and keep-alive)
              console.warn('Skipping malformed SSE line:', event.data);
            }
          }
        });

        es.addEventListener('error', (event) => {
          // Flush any pending text before error state
          flushPendingText();
          cleanup();

          // Check if we received any content
          setStatus((prevStatus) => {
            if (currentAnswer || pendingTextRef.current) {
              return 'done';
            } else {
              setError('Connection failed. Please try again.');
              return 'error';
            }
          });
        });

        es.addEventListener('close', () => {
          flushPendingText();
          cleanup();
          setStatus('done');
        });
      } catch {
        setError('Failed to start connection.');
        setStatus('error');
      }
    },
    [cleanup, flushPendingText, scheduleBatchedUpdate, currentAnswer]
  );

  // When status changes to 'done', add current Q&A to history
  useEffect(() => {
    if (status === 'done' && currentQuestion && currentAnswer) {
      const newQA: QAPair = {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: currentAnswer,
      };
      setQaHistory(prev => [...prev, newQA]);
      setCurrentQuestion('');
      setCurrentAnswer('');
      setStatus('idle');
    }
  }, [status, currentQuestion, currentAnswer]);

  // Cancel current streaming
  const cancel = useCallback(() => {
    flushPendingText();
    cleanup();
    
    // If we have partial content, add it to history before canceling
    if (currentQuestion && currentAnswer) {
      const newQA: QAPair = {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: currentAnswer,
      };
      setQaHistory(prev => [...prev, newQA]);
    }
    
    setCurrentQuestion('');
    setCurrentAnswer('');
    setStatus('idle');
  }, [cleanup, flushPendingText, currentQuestion, currentAnswer]);

  // Reset to initial state
  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setQaHistory([]);
    setCurrentQuestion('');
    setCurrentAnswer('');
    setError(null);
    pendingTextRef.current = '';
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Derived flags
  const canAsk = status === 'idle' || status === 'done' || status === 'error';
  const canStop = status === 'streaming' || status === 'connecting';
  const isBusy = status === 'connecting' || status === 'streaming';

  const state: ChatbotState = {
    status,
    qaHistory,
    currentQuestion,
    currentAnswer,
    error,
    canAsk,
    canStop,
    isBusy,
  };

  const actions: ChatbotActions = {
    submit,
    cancel,
    reset,
  };

  return [state, actions];
}
