import { Colors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={20} color={Colors.danger} />
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          accessibilityHint="Try sending the question again"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    borderRadius: 8,
    padding: Spacing.sm,
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: Spacing.sm,
    paddingTop: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  retryButton: {
    marginLeft: Spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.danger,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: Typography.chip.fontSize,
    fontWeight: Typography.chip.fontWeight,
    color: '#FFFFFF',
  },
});

