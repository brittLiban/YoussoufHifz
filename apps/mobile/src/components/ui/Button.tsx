import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { Text } from './Text';
import { Radius, Spacing } from '../../constants/spacing';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  label: string;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  label,
  loading = false,
  icon,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const bg = {
    primary: theme.accentGreen,
    secondary: 'transparent',
    ghost: 'transparent',
  }[variant];

  const borderColor = {
    primary: 'transparent',
    secondary: theme.accentGreenLight,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: theme.textPrimary,
    secondary: theme.accentGreenLight,
    ghost: theme.textSecondary,
  }[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text variant="body" semiBold color={textColor}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
});
