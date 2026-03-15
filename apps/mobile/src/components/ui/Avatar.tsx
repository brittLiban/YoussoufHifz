import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { Text } from './Text';
import { Radius } from '../../constants/spacing';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ uri, name = '', size = 40 }: AvatarProps) {
  const theme = useTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.base,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: theme.border,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.bgSubtle,
          borderColor: theme.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text
        variant="caption"
        semiBold
        color={theme.textSecondary}
        style={{ fontSize: size * 0.35, lineHeight: size * 0.45 }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
