import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { Radius, Spacing, Border } from '../../constants/spacing';

interface CardProps extends ViewProps {
  elevated?: boolean; // uses bgElevated (default) or bgSubtle
  padding?: number;
}

export function Card({ elevated = true, padding = Spacing.md, style, children, ...props }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: elevated ? theme.bgElevated : theme.bgSubtle,
          borderRadius: Radius.lg,
          borderWidth: Border.thin,
          borderColor: theme.border,
          padding,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
