/**
 * Phase 1 Theme - Colors, Spacing & Typography
 * Based on 8-point grid system for consistent mobile UI
 */

import { Platform } from 'react-native';

// Phase 1 Colors
export const Colors = {
  primary: '#486081',
  // Backgrounds
  background: '#F6F7F9', // Near-white cool gray
  
  // Text
  textPrimary: '#0C1A24',
  textMuted: '#697586',
  
  // Chip backgrounds
  chipIdle: '#E8EAED',
  chipThinking: '#EEF3FF',
  
  // Accent & Actions
  accent: '#0C1A24', // Brand navy (for backwards compatibility)
  accentText: '#FFFFFF',
  danger: '#DC2626',
  
  // Borders
  border: '#E1E4E8',
  borderLight: '#F0F1F3',
};

// 8-point grid spacing system
export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Specific use cases
  screenHorizontal: 16,
  questionTopMargin: 8,
  chipTopMargin: 6,
  composerVerticalPadding: 12,
  blockGap: 16,
};

// Typography scales
export const Typography = {
  question: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  chip: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  button: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
