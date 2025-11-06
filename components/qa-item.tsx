import { Colors, Spacing, Typography } from '@/constants/theme';
import { ProgressStep, Section } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AnswerSection } from './answer-section';
import { ProgressSteps } from './progress-steps';

interface QAItemProps {
  question: string;
  sections: Section[];
  progressSteps: ProgressStep[];
  isStreaming: boolean;
  isLast: boolean;
  shouldAutoCollapse?: boolean;
}

export const QAItem = memo(function QAItem({
  question,
  sections,
  progressSteps,
  isStreaming,
  isLast,
  shouldAutoCollapse = false,
}: QAItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => !isLast);
  const [sectionCollapseStates, setSectionCollapseStates] = useState<Map<string, boolean>>(
    new Map()
  );
  const wasLastRef = useRef(isLast);

  // Manage collapse state based on streaming status and position
  useEffect(() => {
    // Auto-collapse when new streaming starts (and this isn't the active one)
    if (shouldAutoCollapse && !isStreaming) {
      setIsCollapsed(true);
      return;
    }

    // Always expand during streaming
    if (isStreaming) {
      setIsCollapsed(false);
      return;
    }

    // Collapse when no longer the last item
    if (wasLastRef.current && !isLast) {
      setIsCollapsed(true);
    }

    // Expand if this is the last item and not streaming
    if (isLast && !isStreaming) {
      setIsCollapsed(false);
    }

    wasLastRef.current = isLast;
  }, [shouldAutoCollapse, isStreaming, isLast]);

  // Don't allow collapsing if streaming or no sections yet
  const canCollapse = !isStreaming && sections.length > 0;

  const handleToggleSectionCollapse = useCallback((sectionId: string) => {
    setSectionCollapseStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(sectionId);
      newMap.set(sectionId, !currentState);
      return newMap;
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Question row with collapse button */}
      <TouchableOpacity
        style={styles.questionRow}
        onPress={() => canCollapse && setIsCollapsed(!isCollapsed)}
        disabled={!canCollapse}
        accessibilityRole="button"
        accessibilityLabel={`Question: ${question}`}
        accessibilityHint={
          canCollapse
            ? isCollapsed
              ? 'Tap to expand answer'
              : 'Tap to collapse answer'
            : undefined
        }
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

      {/* Answer sections (hidden when collapsed) */}
      {!isCollapsed && (
        <View style={styles.answerContainer}>
          {/* Progress steps (if any) */}
          {progressSteps.length > 0 && <ProgressSteps steps={progressSteps} />}

          {/* Content sections */}
          {sections.map((section) => {
            // Use section's default collapse state or override from local state
            const isCollapsedOverride = sectionCollapseStates.get(section.id);
            const effectiveSection = {
              ...section,
              isCollapsed: isCollapsedOverride !== undefined ? isCollapsedOverride : section.isCollapsed,
            };

            return (
              <AnswerSection
                key={section.id}
                section={effectiveSection}
                isStreaming={isStreaming}
                onToggleCollapse={() => handleToggleSectionCollapse(section.id)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
});

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
});

