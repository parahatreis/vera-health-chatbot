import botImage from '@/assets/images/bot.png';
import { ChatInput } from '@/components/chat-input';
import { ErrorBanner } from '@/components/error-banner';
import { QAItem } from '@/components/qa-item';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useChatbotState } from '@/hooks/use-chatbot-state';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatbotScreen() {
  const [state, actions] = useChatbotState();
  const [inputValue, setInputValue] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const lastAnnouncementRef = useRef<number>(0);

  // Rate-limited accessibility announcements (max 1/second)
  const announce = (message: string) => {
    const now = Date.now();
    if (now - lastAnnouncementRef.current >= 1000) {
      AccessibilityInfo.announceForAccessibility(message);
      lastAnnouncementRef.current = now;
    }
  };

  // Announce status changes
  useEffect(() => {
    if (state.status === 'streaming') {
      announce('Streaming started');
    } else if (state.status === 'done') {
      announce('Streaming finished');
    } else if (state.status === 'error' && state.error) {
      announce(`Error: ${state.error}`);
    }
  }, [state.status, state.error]);

  // Announce new content
  useEffect(() => {
    if (state.currentAnswer && state.status === 'streaming') {
      announce('New content received');
    }
  }, [state.currentAnswer, state.status]);

  // Auto-scroll when answer updates
  useEffect(() => {
    if (state.currentAnswer || state.qaHistory.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [state.currentAnswer, state.qaHistory.length]);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !state.canAsk) return;

    actions.submit(trimmed);
    setInputValue('');
  };

  // Retry handler
  const handleRetry = () => {
    if (state.currentQuestion) {
      actions.submit(state.currentQuestion);
    }
  };

  const hasContent = state.qaHistory.length > 0 || state.currentQuestion;
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Q&A List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          accessibilityRole="scrollbar"
          accessibilityLabel="Question and answer history"
        >
          {/* Error Banner */}
          {state.error && <ErrorBanner message={state.error} onRetry={handleRetry} />}

          {/* Historical Q&A pairs */}
          {state.qaHistory.map((qa, index) => (
            <QAItem
              key={qa.id}
              question={qa.question}
              answer={qa.answer}
              isStreaming={false}
              isLast={index === state.qaHistory.length - 1 && !state.currentQuestion}
            />
          ))}

          {/* Current streaming Q&A */}
          {state.currentQuestion && (
            <QAItem
              question={state.currentQuestion}
              answer={state.currentAnswer}
              isStreaming={state.isBusy}
              isLast={true}
            />
          )}

          {/* Empty state */}
          {!hasContent && (
            <View style={styles.emptyState}>
              <Image source={botImage} style={styles.botImage} />
              <Text style={styles.emptyText}>Ask a clinical question to get started</Text>
            </View>
          )}
        </ScrollView>

        {/* Chat Input */}
        <ChatInput
          value={inputValue}
          onChangeText={setInputValue}
          onSubmit={handleSubmit}
          onCancel={actions.cancel}
          disabled={!state.canAsk}
          isStreaming={state.isBusy}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  botImage: {
    width: 100,
    height: 100,
  },
});
