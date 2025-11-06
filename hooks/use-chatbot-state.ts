import { SSE_CONFIG } from '@/constants/sse-config';
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

export function useChatbotState(): [ChatbotState, ChatbotActions] {
  const [status, setStatus] = useState<ChatbotStatus>('idle');
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentSections, setCurrentSections] = useState<Section[]>([]);
  const [currentProgressSteps, setCurrentProgressSteps] = useState<ProgressStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
    const delay = Math.max(0, SSE_CONFIG.BATCH_UPDATE_MS - elapsed);

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
      const url = `${SSE_CONFIG.API_ENDPOINT}?prompt=${encodedPrompt}`;

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
                      }, SSE_CONFIG.COMPLETION_TIMEOUT_MS);
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
          if (attempt < SSE_CONFIG.MAX_RETRY_ATTEMPTS) {
            const delay = SSE_CONFIG.RETRY_DELAYS[attempt];
            setRetryCount(attempt + 1);
            setError(`Connection lost. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${SSE_CONFIG.MAX_RETRY_ATTEMPTS})`);
            
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
      if (qaHistory.length >= SSE_CONFIG.MAX_QA_HISTORY) {
        setError(`Maximum history limit reached (${SSE_CONFIG.MAX_QA_HISTORY} items). Please clear some history.`);
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
  const canAsk = (status === 'idle' || status === 'done' || status === 'error') && qaHistory.length < SSE_CONFIG.MAX_QA_HISTORY;
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
