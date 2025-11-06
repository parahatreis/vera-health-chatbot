import { Colors, Spacing, Typography } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const markdownStyles = StyleSheet.create({
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

