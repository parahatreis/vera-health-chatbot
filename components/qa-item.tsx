import { Colors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QAItemProps {
  question: string;
  answer: string;
  isStreaming: boolean;
  isLast: boolean;
}

export function QAItem({ question, answer, isStreaming, isLast }: QAItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't allow collapsing if streaming or no answer yet
  const canCollapse = !isStreaming && answer.length > 0;

  return (
    <View style={styles.container}>
      {/* Question row with collapse button */}
      <TouchableOpacity
        style={styles.questionRow}
        onPress={() => canCollapse && setIsCollapsed(!isCollapsed)}
        disabled={!canCollapse}
        accessibilityRole="button"
        accessibilityLabel={`Question: ${question}`}
        accessibilityHint={canCollapse ? (isCollapsed ? 'Tap to expand answer' : 'Tap to collapse answer') : undefined}
      >
        <Text style={styles.questionText} numberOfLines={isCollapsed ? 1 : undefined}>
          {question}
        </Text>
        {canCollapse && (
          <Ionicons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={Colors.textMuted}
            style={styles.chevron}
          />
        )}
      </TouchableOpacity>

      {/* Answer (hidden when collapsed) */}
      {!isCollapsed && answer && (
        <View style={styles.answerContainer}>
          <Text
            style={styles.answerText}
            accessibilityRole="text"
            accessibilityLabel="Answer"
            accessibilityLiveRegion={isStreaming ? 'polite' : 'none'}
          >
            {answer}
          </Text>
          {isStreaming && <View style={styles.cursor} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  questionText: {
    flex: 1,
    fontSize: Typography.question.fontSize,
    fontWeight: Typography.question.fontWeight,
    color: Colors.textPrimary,
    lineHeight: Typography.question.lineHeight,
  },
  chevron: {
    marginLeft: Spacing.xs,
    marginTop: 2,
  },
  answerContainer: {
    marginTop: Spacing.md,
  },
  answerText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    lineHeight: Typography.body.lineHeight,
  },
  cursor: {
    width: 8,
    height: 20,
    backgroundColor: Colors.accent,
    marginTop: 4,
    opacity: 0.7,
  },
});

