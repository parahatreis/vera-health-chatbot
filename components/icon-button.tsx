import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  primary?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  size = 24,
  color,
  onPress,
  disabled = false,
  primary = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: IconButtonProps) {
  const buttonColor = color || (primary ? Colors.accentText : Colors.primary);

  return (
    <TouchableOpacity
      style={[styles.button, primary && styles.primaryButton, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Ionicons name={icon} size={size} color={buttonColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
});

