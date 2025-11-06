import { ProgressStep, QAPair, Section } from '@/types';
import { mergeSections, parseSSENode, parseStreamingSections, parseTaggedContent } from '@/utils/content-parser';
import { useCallback, useEffect, useRef, useState } from 'react';
import EventSource from 'react-native-sse';

type ChatbotStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error';

interface ChatbotState {
  status: ChatbotStatus;
  qaHistory: QAPair[];
  currentQuestion: string;
  currentSections: Section[];
  currentProgressSteps: ProgressStep[];
  error: string | null;
  retryCount: number;
  canAsk: boolean;
  canStop: boolean;
  isBusy: boolean;
  totalQACount: number;
}

interface ChatbotActions {
  submit: (question: string) => void;
  cancel: () => void;
  reset: () => void;
}

const API_ENDPOINT = 'https://vera-assignment-api.vercel.app/api/stream';
const BATCH_UPDATE_MS = 25; // 16-33ms micro-debounce for batched UI updates
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
const MAX_QA_HISTORY = 100; // Prevent memory issues on older devices

// Mock data for initial display
const MOCK_QA_HISTORY: QAPair[] = [
  // {
  //   id: 'mock-1',
  //   question: 'What are the first-line treatments for hypertension?',
  //   answer: 'The first-line treatments for hypertension typically include:\n\n1. **Thiazide diuretics** (e.g., hydrochlorothiazide, chlorthalidone) - Often the first choice, especially for uncomplicated hypertension\n\n2. **ACE inhibitors** (e.g., lisinopril, enalapril) - Particularly beneficial for patients with diabetes or chronic kidney disease\n\n3. **Angiotensin II receptor blockers (ARBs)** (e.g., losartan, valsartan) - Alternative to ACE inhibitors, especially if ACE inhibitors cause cough\n\n4. **Calcium channel blockers** (e.g., amlodipine, nifedipine) - Effective for elderly patients and those of African descent\n\nThe choice depends on patient-specific factors including age, ethnicity, comorbidities, and contraindications. Lifestyle modifications (diet, exercise, weight loss, reduced sodium intake) should always accompany pharmacological treatment.',
  // },
  // {
  //   id: 'mock-2',
  //   question: 'How do you diagnose and manage acute appendicitis?',
  //   answer: '**Diagnosis of Acute Appendicitis:**\n\n*Clinical Assessment:*\n- Classic presentation: periumbilical pain migrating to right lower quadrant (McBurney\'s point)\n- Associated symptoms: anorexia, nausea, vomiting, low-grade fever\n- Physical exam: rebound tenderness, guarding, Rovsing\'s sign, psoas sign\n\n*Laboratory Tests:*\n- Elevated WBC count (typically 10,000-18,000/μL)\n- Elevated C-reactive protein (CRP)\n- Urinalysis to rule out UTI\n\n*Imaging:*\n- **CT scan** with IV contrast (gold standard, 95% sensitivity)\n- **Ultrasound** (preferred in children and pregnant women)\n- **MRI** (alternative in pregnancy if ultrasound inconclusive)\n\n**Management:**\n\n*Conservative:*\n- NPO (nothing by mouth)\n- IV fluids and electrolyte management\n- IV antibiotics (e.g., ceftriaxone + metronidazole)\n- Pain management\n\n*Surgical:*\n- **Appendectomy** (laparoscopic preferred over open)\n- Timing: within 24 hours of diagnosis\n- Antibiotics continued post-operatively if perforation present\n\nNote: Some uncomplicated cases may be managed with antibiotics alone, though surgery remains the definitive treatment.',
  // },
];

export function useChatbotState(): [ChatbotState, ChatbotActions] {
  const [status, setStatus] = useState<ChatbotStatus>('idle');
  const [qaHistory, setQaHistory] = useState<QAPair[]>(MOCK_QA_HISTORY);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentSections, setCurrentSections] = useState<Section[]>([]);
  const [currentProgressSteps, setCurrentProgressSteps] = useState<ProgressStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for SSE connection and pending text buffer
  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingTextRef = useRef<string>('');
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCompletingRef = useRef<boolean>(false);

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
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    isCompletingRef.current = false;
  }, []);

  // Flush pending text to sections (only parse when streaming is complete)
  const commitPendingText = useCallback((): Section[] => {
    if (!pendingTextRef.current) {
      return currentSections;
    }

    const parsedSections = parseTaggedContent(pendingTextRef.current);
    const mergedSections = mergeSections(currentSections, parsedSections);

    setCurrentSections(mergedSections);
    pendingTextRef.current = '';

    return mergedSections;
  }, [currentSections]);
  
  const resetInteraction = useCallback(() => {
    setCurrentQuestion('');
    setCurrentSections([]);
    setCurrentProgressSteps([]);
    pendingTextRef.current = '';
  }, []);

  const persistCurrentQA = useCallback(
    (sections: Section[]) => {
      if (!currentQuestion || sections.length === 0) {
        return;
      }

      setQaHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          question: currentQuestion,
          sections,
          progressSteps: currentProgressSteps,
        },
      ]);
    },
    [currentQuestion, currentProgressSteps]
  );

  // Update display during streaming without parsing tags
  const updateStreamingDisplay = useCallback(() => {
    const pendingText = pendingTextRef.current;

    if (!pendingText) {
      return;
    }

    const streamingSections = parseStreamingSections(pendingText);

    if (streamingSections.length > 0) {
      setCurrentSections(streamingSections);
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
      updateStreamingDisplay(); // Just update display, don't parse yet
      lastUpdateRef.current = Date.now();
      updateTimerRef.current = null;
    }, delay);
  }, [updateStreamingDisplay]);

  // Attempt to connect with retry logic
  const attemptConnection = useCallback(
    (question: string, attempt: number = 0) => {
      const encodedPrompt = encodeURIComponent(question);
      const url = `${API_ENDPOINT}?prompt=${encodedPrompt}`;

      try {
        const es = new EventSource(url, {
          headers: {},
          method: 'GET',
          pollingInterval: 0,
        });

        eventSourceRef.current = es;

        es.addEventListener('open', () => {
          setStatus('streaming');
          setRetryCount(0); // Reset retry count on successful connection
        });

        es.addEventListener('message', (event) => {
          if (event.data) {
            try {
              let data = event.data.trim();
              
              // Skip empty lines and SSE comments
              if (!data || data.startsWith(':')) {
                return;
              }
              
              // Strip 'data: ' prefix if present
              if (data.startsWith('data: ')) {
                data = data.substring(6).trim();
              }
              
              if (!data) return;

              if (data === '[DONE]') {
                commitPendingText();
                cleanup();
                setStatus('done');
                return;
              }
              
              const parsed = JSON.parse(data);
              
              // Check for Status signal (indicates saving, comes before Done)
              if (parsed.type === 'Status' && parsed.content?.status === 'saving') {
                commitPendingText();
                return;
              }
              
              // Check for Done signal (final completion)
              if (parsed.type === 'Done') {
                commitPendingText();
                cleanup();
                setStatus('done');
                return;
              }
              
              // Check for END signal with final answer (fallback for different API versions)
              if (parsed.type === 'END') {
                const finalAnswer = parsed.content?.outputs?.vera_answer?.value?.answer;
                if (finalAnswer) {
                  pendingTextRef.current = finalAnswer;
                }
                commitPendingText();
                cleanup();
                setStatus('done');
                return;
              }
              
              const node = parseSSENode(parsed);
              
              if (node) {
                switch (node.type) {
                  case 'STREAM':
                    if (node.content) {
                      pendingTextRef.current += node.content;
                      scheduleBatchedUpdate();
                    }
                    break;
                  
                  case 'SEARCH_STEPS':
                    setCurrentProgressSteps(node.content);
                    
                    // Check if all steps are completed - this signals the end of streaming
                    const allCompleted = node.content.every((step: ProgressStep) => 
                      step.isCompleted === true
                    );
                    
                    // If we have steps and all are completed, the stream is done
                    if (node.content.length > 0 && allCompleted && !isCompletingRef.current) {
                      isCompletingRef.current = true;
                      
                      // Give a small delay to ensure any final STREAM chunks arrive
                      completionTimeoutRef.current = setTimeout(() => {
                        if (eventSourceRef.current) {
                          commitPendingText();
                          cleanup();
                          setStatus('done');
                        }
                      }, 500);
                    }
                    break;
                }
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        });

        es.addEventListener('error', (event) => {
          cleanup();
          
          // Attempt retry if we haven't exceeded max attempts
          if (attempt < MAX_RETRY_ATTEMPTS) {
            const delay = RETRY_DELAYS[attempt];
            setRetryCount(attempt + 1);
            setError(`Connection lost. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
            
            retryTimeoutRef.current = setTimeout(() => {
              attemptConnection(question, attempt + 1);
            }, delay);
          } else {
            // Max retries exceeded
            if (pendingTextRef.current || currentSections.length > 0) {
              commitPendingText();
              setStatus('done');
              setError('Connection interrupted but partial response saved.');
            } else {
              setError('Connection failed after 3 attempts. Please try again.');
              setStatus('error');
            }
          }
        });

        es.addEventListener('close', () => {
          commitPendingText(); // Parse tags only when stream is complete
          cleanup();
          setStatus('done');
        });
      } catch {
        setError('Failed to start connection.');
        setStatus('error');
      }
    },
    [cleanup, commitPendingText, scheduleBatchedUpdate, currentSections]
  );

  // Submit question and start SSE connection
  const submit = useCallback(
    (inputQuestion: string) => {
      const trimmed = inputQuestion.trim();
      if (!trimmed) return;
      
      // Check memory limits
      if (qaHistory.length >= MAX_QA_HISTORY) {
        setError(`Maximum history limit reached (${MAX_QA_HISTORY} items). Please clear some history.`);
        return;
      }

      // Reset current state
      setError(null);
      setCurrentQuestion(trimmed);
      setCurrentSections([]);
      setCurrentProgressSteps([]);
      pendingTextRef.current = '';
      setRetryCount(0);
      isCompletingRef.current = false;
      setStatus('connecting');

      attemptConnection(trimmed, 0);
    },
    [attemptConnection, qaHistory.length]
  );

  // When status changes to 'done', add current Q&A to history
  useEffect(() => {
    if (status === 'done' && currentQuestion && currentSections.length > 0) {
      persistCurrentQA(currentSections);
      resetInteraction();
      setStatus('idle');
    }
  }, [status, currentQuestion, currentSections, persistCurrentQA, resetInteraction]);

  // Cancel current streaming
  const cancel = useCallback(() => {
    const finalSections = commitPendingText();
    cleanup();

    persistCurrentQA(finalSections);
    resetInteraction();
    setStatus('idle');
  }, [cleanup, commitPendingText, persistCurrentQA, resetInteraction]);

  // Reset to initial state
  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setQaHistory([]);
    resetInteraction();
    setError(null);
    setRetryCount(0);
  }, [cleanup, resetInteraction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Derived flags
  const canAsk = (status === 'idle' || status === 'done' || status === 'error') && qaHistory.length < MAX_QA_HISTORY;
  const canStop = status === 'streaming' || status === 'connecting';
  const isBusy = status === 'connecting' || status === 'streaming';

  const state: ChatbotState = {
    status,
    qaHistory,
    currentQuestion,
    currentSections,
    currentProgressSteps,
    error,
    retryCount,
    canAsk,
    canStop,
    isBusy,
    totalQACount: qaHistory.length,
  };

  const actions: ChatbotActions = {
    submit,
    cancel,
    reset,
  };

  return [state, actions];
}
