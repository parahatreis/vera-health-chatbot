import { ChatInput } from '@/components/chat-input';
import { ChatListItem, ListItem } from '@/components/chat-list-item';
import { Colors, Spacing } from '@/constants/theme';
import { useChatbotState } from '@/hooks/use-chatbot-state';
import { QAPair } from '@/types';
import { FlashList, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatbotScreen() {
  const [state, actions] = useChatbotState();
  const [inputValue, setInputValue] = useState('');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(50);
  const flashListRef = useRef<FlashListRef<ListItem>>(null);
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
    if (state.currentSections.length > 0 && state.status === 'streaming') {
      announce('New content received');
    }
  }, [state.currentSections, state.status]);

  // Auto-scroll when sections update
  useEffect(() => {
    if (state.currentSections.length > 0 || state.qaHistory.length > 0) {
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [state.currentSections, state.qaHistory.length]);

  // Load more messages handler
  const handleLoadMore = () => {
    setVisibleHistoryCount(prev => Math.min(prev + 25, state.qaHistory.length));
  };

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
  
  // Prepare list data
  const listData: ListItem[] = [];
  
  if (!hasContent) {
    listData.push({ type: 'empty', data: null });
  } else {
    // Add error banner if present
    if (state.error) {
      listData.push({ type: 'error', data: state.error });
    }
    
    // Add "Load more" button if we have hidden messages
    const totalHistory = state.qaHistory.length;
    if (totalHistory > visibleHistoryCount) {
      listData.push({
        type: 'load-more',
        data: { showing: visibleHistoryCount, total: totalHistory },
      });
    }
    
    // Add visible historical Q&A pairs
    const visibleHistory = state.qaHistory.slice(-visibleHistoryCount);
    visibleHistory.forEach((qa, index) => {
      listData.push({
        type: 'qa',
        data: qa,
        isLast: index === visibleHistory.length - 1 && !state.currentQuestion,
      });
    });
    
    // Add current streaming Q&A if present
    if (state.currentQuestion) {
      const currentQA: QAPair = {
        id: 'current',
        question: state.currentQuestion,
        sections: state.currentSections,
        progressSteps: state.currentProgressSteps,
      };
      listData.push({
        type: 'qa',
        data: currentQA,
        isLast: true,
      });
    }
  }
  
  const renderItem: ListRenderItem<ListItem> = ({ item }) => (
    <ChatListItem
      item={item}
      isBusy={state.isBusy}
      onRetry={handleRetry}
      onLoadMore={handleLoadMore}
    />
  );
  
  const getItemType = (item: ListItem) => item.type;
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Q&A List with FlashList */}
        <FlashList
          ref={flashListRef}
          data={listData}
          renderItem={renderItem}
          getItemType={getItemType}
          keyExtractor={(item, index) => {
            if (item.type === 'qa') return item.data.id;
            if (item.type === 'error') return 'error';
            if (item.type === 'load-more') return 'load-more';
            return 'empty';
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />

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
  listContent: {
    paddingBottom: Spacing.md,
  },
});
