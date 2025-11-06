import { ChatInput } from '@/components/chat-input';
import { ChatListItem, ListItem } from '@/components/chat-list-item';
import { APP_CONFIG } from '@/constants/app-config';
import { Colors, Spacing } from '@/constants/theme';
import { useAccessibilityAnnouncements } from '@/hooks/use-accessibility-announcements';
import { useChatbotState } from '@/hooks/use-chatbot-state';
import { FlashList, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatbotScreen() {
  const [state, actions] = useChatbotState();
  const [inputValue, setInputValue] = useState('');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState<number>(APP_CONFIG.VISIBLE_HISTORY_INITIAL);
  const flashListRef = useRef<FlashListRef<ListItem>>(null);
  const hasManuallyScrolledRef = useRef<boolean>(false);
  const lastContentOffsetRef = useRef<number>(0);
  const isAutoScrollingRef = useRef<boolean>(false);

  // Rate-limited accessibility announcements
  const announce = useAccessibilityAnnouncements();

  // Announce status changes
  useEffect(() => {
    if (state.status === 'streaming') {
      announce('Streaming started');
    } else if (state.status === 'done') {
      announce('Streaming finished');
    } else if (state.status === 'error' && state.error) {
      announce(`Error: ${state.error}`);
    }
  }, [state.status, state.error, announce]);

  // Announce new content
  useEffect(() => {
    if (state.currentSections.length > 0 && state.status === 'streaming') {
      announce('New content received');
    }
  }, [state.currentSections, state.status, announce]);

  // Auto-scroll when sections update (only if user hasn't manually scrolled)
  useEffect(() => {
    if ((state.currentSections.length > 0 || state.qaHistory.length > 0) && !hasManuallyScrolledRef.current) {
      setTimeout(() => {
        isAutoScrollingRef.current = true;
        flashListRef.current?.scrollToEnd({ animated: true });
        // Reset the auto-scrolling flag after animation completes
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, APP_CONFIG.AUTO_SCROLL_ANIMATION_MS);
      }, APP_CONFIG.AUTO_SCROLL_DELAY_MS);
    }
  }, [state.currentSections, state.qaHistory.length]);

  // Reset manual scroll flag when new question starts or streaming finishes
  useEffect(() => {
    if (state.status === 'connecting' || state.status === 'idle') {
      hasManuallyScrolledRef.current = false;
    }
  }, [state.status]);

  // Load more messages handler
  const handleLoadMore = useCallback(() => {
    setVisibleHistoryCount(prev => Math.min(prev + APP_CONFIG.LOAD_MORE_INCREMENT, state.qaHistory.length));
  }, [state.qaHistory.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || !state.canAsk) return;

    actions.submit(trimmed);
    setInputValue('');
  }, [inputValue, state.canAsk, actions]);

  // Retry handler
  const handleRetry = useCallback(() => {
    if (state.currentQuestion) {
      actions.submit(state.currentQuestion);
    }
  }, [state.currentQuestion, actions]);

  const hasContent = state.qaHistory.length > 0 || state.currentQuestion;
  
  // Prepare list data with memoization for performance
  const listData = useMemo<ListItem[]>(() => {
    if (!hasContent) {
      return [{ type: 'empty', data: null }];
    }
    
    const totalHistory = state.qaHistory.length;
    const visibleHistory = state.qaHistory.slice(-visibleHistoryCount);
    
    return [
      // Error banner (conditional)
      ...(state.error ? [{ type: 'error', data: state.error } as ListItem] : []),
      
      // Load more button (conditional)
      ...(totalHistory > visibleHistoryCount ? [{
        type: 'load-more',
        data: { showing: visibleHistoryCount, total: totalHistory },
      } as ListItem] : []),
      
      // Historical Q&A pairs
      ...visibleHistory.map((qa, index) => ({
        type: 'qa',
        data: qa,
        isLast: index === visibleHistory.length - 1 && !state.currentQuestion,
      } as ListItem)),
      
      // Current streaming Q&A (conditional)
      ...(state.currentQuestion ? [{
        type: 'qa',
        data: {
          id: 'current',
          question: state.currentQuestion,
          sections: state.currentSections,
          progressSteps: state.currentProgressSteps,
        },
        isLast: true,
      } as ListItem] : []),
    ];
  }, [
    hasContent,
    state.error,
    state.qaHistory,
    state.currentQuestion,
    state.currentSections,
    state.currentProgressSteps,
    visibleHistoryCount,
  ]);
  
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
    
    // Consider it manual scroll if the user scrolled more than threshold
    if (scrollDelta > APP_CONFIG.SCROLL_THRESHOLD_PX) {
      hasManuallyScrolledRef.current = true;
    }
    
    const visibleBottom = currentOffset + layoutMeasurement.height;
    const remaining = contentSize.height - visibleBottom;
    const isAtBottom = remaining <= APP_CONFIG.SCROLL_BOTTOM_THRESHOLD_PX;

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
