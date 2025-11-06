import { Colors, Spacing, Typography } from '@/constants/theme';
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

// Markdown styles matching app theme
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    lineHeight: Typography.body.lineHeight,
  },
  heading1: {
    fontSize: Typography.question.fontSize + 2,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  heading2: {
    fontSize: Typography.question.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  heading3: {
    fontSize: Typography.body.fontSize + 1,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  heading4: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  heading5: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  heading6: {
    fontSize: Typography.body.fontSize - 1,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: Spacing.sm,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    color: Colors.textPrimary,
  },
  strong: {
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: Colors.chipIdle,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: Typography.body.fontSize - 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  code_block: {
    backgroundColor: Colors.chipIdle,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: Typography.body.fontSize - 1,
    padding: Spacing.sm,
    borderRadius: 6,
    marginVertical: Spacing.sm,
  },
  fence: {
    backgroundColor: Colors.chipIdle,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: Typography.body.fontSize - 1,
    padding: Spacing.sm,
    borderRadius: 6,
    marginVertical: Spacing.sm,
  },
  bullet_list: {
    marginVertical: Spacing.xs,
  },
  ordered_list: {
    marginVertical: Spacing.xs,
  },
  list_item: {
    marginVertical: 2,
    flexDirection: 'row',
  },
  bullet_list_icon: {
    marginLeft: 10,
    marginRight: 10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textPrimary,
    marginTop: 10,
  },
  ordered_list_icon: {
    marginLeft: 10,
    marginRight: 10,
  },
  blockquote: {
    backgroundColor: Colors.chipThinking,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginVertical: Spacing.sm,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  hr: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: Spacing.md,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    marginVertical: Spacing.sm,
  },
  thead: {
    backgroundColor: Colors.chipIdle,
  },
  tbody: {},
  th: {
    padding: Spacing.xs,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    fontWeight: '600',
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
  },
  td: {
    padding: Spacing.xs,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    flex: 1,
  },
});

