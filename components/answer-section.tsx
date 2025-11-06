import { Colors, Spacing, Typography } from '@/constants/theme';
import { markdownStyles } from '@/styles/markdown-styles';
import { Section } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface AnswerSectionProps {
  section: Section;
  isStreaming: boolean;
  onToggleCollapse: () => void;
}

export const AnswerSection = memo(function AnswerSection({
  section,
  isStreaming,
  onToggleCollapse,
}: AnswerSectionProps) {
  // Answer sections should not be collapsible (entire QA is collapsible)
  // Other sections (guideline, drug, think, etc.) can be collapsed
  const canCollapse = section.type !== 'answer' && !isStreaming && section.content.length > 0;

  // Determine if this section should have a background
  const hasBackground = section.type !== 'answer';
  const containerStyle = hasBackground 
    ? [styles.container, styles.containerWithBackground] 
    : styles.container;

  return (
    <View style={containerStyle}>
      {/* Section Header - only show for non-answer sections */}
      {section.type !== 'answer' && (
        <TouchableOpacity
          style={styles.header}
          onPress={onToggleCollapse}
          disabled={!canCollapse}
          accessibilityRole="button"
          accessibilityLabel={`${section.title} section`}
          accessibilityHint={
            canCollapse
              ? section.isCollapsed
                ? 'Tap to expand'
                : 'Tap to collapse'
              : undefined
          }
        >
          <Text style={styles.title}>{section.title}</Text>
          {canCollapse && (
            <Ionicons
              name={section.isCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={Colors.textMuted}
            />
          )}
        </TouchableOpacity>
      )}

      {/* Section Content */}
      {!section.isCollapsed && section.content && (
        <View style={styles.content}>
          <Markdown style={markdownStyles}>{section.content}</Markdown>
          {isStreaming && <View style={styles.cursor} />}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  containerWithBackground: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.chipThinking,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  title: {
    fontSize: Typography.question.fontSize - 2,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: {
    marginTop: Spacing.xs,
  },
  cursor: {
    width: 8,
    height: 20,
    backgroundColor: Colors.accent,
    marginTop: 4,
    opacity: 0.7,
  },
});

