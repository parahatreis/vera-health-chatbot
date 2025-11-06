import { Colors, Spacing, Typography } from '@/constants/theme';
import { ProgressStep } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface ProgressStepsProps {
  steps: ProgressStep[];
}

export function ProgressSteps({ steps }: ProgressStepsProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        // Use explicit isCompleted field if available, otherwise derive from position
        const isCompleted = step.isCompleted === true;
        const isPending = !step.isActive && !step.isCompleted;

        return (
          <View key={`step-${index}`} style={styles.stepRow}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              {isCompleted && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
              {step.isActive && (
                <ActivityIndicator size="small" color={Colors.primary} />
              )}
              {isPending && (
                <View style={styles.pendingDot} />
              )}
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.stepText,
                  step.isActive && styles.stepTextActive,
                  isCompleted && styles.stepTextCompleted,
                ]}
              >
                {step.text}
              </Text>
              {step.extraInfo && (
                <Text style={styles.extraInfo}>{step.extraInfo}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.chipThinking,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: Spacing.xs / 2,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
    opacity: 0.4,
  },
  textContainer: {
    flex: 1,
    paddingTop: 2,
  },
  stepText: {
    fontSize: Typography.body.fontSize - 1,
    color: Colors.textMuted,
    lineHeight: Typography.body.lineHeight,
  },
  stepTextActive: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  stepTextCompleted: {
    color: Colors.textMuted,
  },
  extraInfo: {
    fontSize: Typography.chip.fontSize,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

