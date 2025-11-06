import botImage from '@/assets/images/bot.png';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { QAPair } from '@/types';
import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ErrorBanner } from './error-banner';
import { QAItem } from './qa-item';

// List item types
export type ListItem =
  | { type: 'error'; data: string }
  | { type: 'qa'; data: QAPair; isLast: boolean }
  | { type: 'empty'; data: null }
  | { type: 'load-more'; data: { showing: number; total: number } };

interface ChatListItemProps {
  item: ListItem;
  isBusy: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}

export const ChatListItem = memo(function ChatListItem({
  item,
  isBusy,
  onRetry,
  onLoadMore,
}: ChatListItemProps) {
  switch (item.type) {
    case 'error':
      return <ErrorBanner message={item.data} onRetry={onRetry} />;

    case 'load-more':
      return (
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity style={styles.loadMoreButton} onPress={onLoadMore}>
            <Text style={styles.loadMoreText}>
              Load older messages ({item.data.showing} of {item.data.total} shown)
            </Text>
          </TouchableOpacity>
        </View>
      );

    case 'qa':
      return (
        <QAItem
          question={item.data.question}
          sections={item.data.sections}
          progressSteps={item.data.progressSteps}
          isStreaming={item.data.id === 'current' && isBusy}
          isLast={item.isLast}
          shouldAutoCollapse={item.data.id !== 'current' && isBusy}
        />
      );

    case 'empty':
      return (
        <View style={styles.emptyState}>
          <Image source={botImage} style={styles.botImage} />
          <Text style={styles.emptyText}>Ask a clinical question to get started</Text>
        </View>
      );

    default:
      return null;
  }
});

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    minHeight: 400,
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
  loadMoreContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.chipIdle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadMoreText: {
    fontSize: Typography.chip.fontSize,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
});

