import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { Text } from './Text';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Spacing, Border } from '../../constants/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean; // show password toggle button
  leftIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  secureToggle,
  leftIcon,
  style,
  secureTextEntry,
  ...props
}: InputProps) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="caption" secondary style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.bgSubtle,
            borderColor: error ? theme.error : theme.border,
            borderRadius: Radius.md,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: theme.textPrimary,
              fontFamily: FontFamily.sansRegular,
              fontSize: FontSize.body,
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={theme.textDisabled}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="caption" secondary>
              {hidden ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text variant="caption" color={theme.error} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  label: {
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Border.thin,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  input: {
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  toggle: {
    paddingLeft: Spacing.sm,
  },
  error: {
    marginTop: 2,
  },
});
