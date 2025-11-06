import { APP_CONFIG } from '@/constants/app-config';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useKeyboardVisibility } from '@/hooks/use-keyboard-visibility';
import { StyleSheet, TextInput, View } from 'react-native';
import { IconButton } from './icon-button';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  disabled: boolean;
  isStreaming: boolean;
}

export function ChatInput({ value, onChangeText, onSubmit, onCancel, disabled, isStreaming }: ChatInputProps) {
  const isKeyboardVisible = useKeyboardVisibility();
  const hasText = value.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, isKeyboardVisible && styles.inputContainerKeyboardVisible]}>
        {/* Text input */}
        <TextInput
          style={styles.input}
          placeholder="Ask a clinical question…"
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled && !isStreaming}
          returnKeyType="default"
          multiline
          maxLength={APP_CONFIG.MAX_QUESTION_LENGTH}
          accessibilityLabel="Question input"
          accessibilityHint="Enter your clinical question"
        />

        <View style={styles.iconContainer}>
          {/* Left group - Mic icon (always visible) */}
          <View style={styles.leftButtonGroup}>
            <IconButton
              icon="mic-outline"
              disabled
              accessibilityLabel="Voice input"
              accessibilityHint="Not available in this version"
            />
          </View>

          {/* Right group - Action buttons */}
          <View style={styles.rightButtonGroup}>
            {/* Voice waveform icon - shown when no text and not streaming */}
            {!hasText && !isStreaming && (
              <IconButton
                icon="pulse"
                primary
                disabled
                accessibilityLabel="Voice recording"
                accessibilityHint="Not available in this version"
              />
            )}

            {/* Send button - shown when typing */}
            {hasText && !isStreaming && (
              <IconButton
                icon="send"
                size={20}
                primary
                onPress={onSubmit}
                accessibilityLabel="Send"
                accessibilityHint="Send your question"
              />
            )}

            {/* Pause button - shown when streaming */}
            {isStreaming && (
              <IconButton
                icon="pause"
                primary
                onPress={onCancel}
                accessibilityLabel="Pause"
                accessibilityHint="Stop the current response"
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
    width: '100%',
    backgroundColor: 'white',
  },
  inputContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  inputContainerKeyboardVisible: {
    marginBottom: 24,
  },
  input: {
    width: '100%',
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    lineHeight: Typography.body.lineHeight,
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingBottom: 8,
    maxHeight: 120,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  leftButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});

