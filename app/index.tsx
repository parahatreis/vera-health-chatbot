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
  const hasManuallyScrolledRef = useRef<boolean>(false);
  const lastContentOffsetRef = useRef<number>(0);
  const isAutoScrollingRef = useRef<boolean>(false);

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

  // Auto-scroll when sections update (only if user hasn't manually scrolled)
  useEffect(() => {
    if ((state.currentSections.length > 0 || state.qaHistory.length > 0) && !hasManuallyScrolledRef.current) {
      setTimeout(() => {
        isAutoScrollingRef.current = true;
        flashListRef.current?.scrollToEnd({ animated: true });
        // Reset the auto-scrolling flag after animation completes
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 500);
      }, 100);
    }
  }, [state.currentSections, state.qaHistory.length]);

  // Reset manual scroll flag when new question starts or streaming finishes
  useEffect(() => {
    if (state.status === 'connecting' || state.status === 'idle') {
      hasManuallyScrolledRef.current = false;
    }
  }, [state.status]);

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

  // Handle scroll events to detect manual scrolling
  const handleScroll = (event: any) => {
    // Ignore scroll events during auto-scrolling
    if (isAutoScrollingRef.current) {
      lastContentOffsetRef.current = event.nativeEvent.contentOffset.y;
      return;
    }

    const {
      contentOffset,
      contentSize,
      layoutMeasurement,
    } = event.nativeEvent;

    const currentOffset = contentOffset.y;
    const scrollDelta = Math.abs(currentOffset - lastContentOffsetRef.current);
    
    // Consider it manual scroll if the user scrolled more than 10 pixels
    if (scrollDelta > 10) {
      hasManuallyScrolledRef.current = true;
    }
    
    const visibleBottom = currentOffset + layoutMeasurement.height;
    const remaining = contentSize.height - visibleBottom;
    const isAtBottom = remaining <= 32;

    if (isAtBottom) {
      hasManuallyScrolledRef.current = false;

      if (state.isBusy) {
        flashListRef.current?.scrollToEnd({ animated: true });
      }
    }

    lastContentOffsetRef.current = currentOffset;
  };
  
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
          keyExtractor={(item) => {
            if (item.type === 'qa') return item.data.id;
            if (item.type === 'error') return 'error';
            if (item.type === 'load-more') return 'load-more';
            return 'empty';
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
