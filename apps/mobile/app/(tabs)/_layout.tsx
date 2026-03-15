import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Spacing } from '../../src/constants/spacing';

// ── Tab bar icons (inline SVG-style paths using Text glyphs as placeholder)
// Replace with lucide-react-native icons once fonts load cleanly
function TabIcon({
  label,
  focused,
  glyph,
}: {
  label: string;
  focused: boolean;
  glyph: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.iconWrap}>
      <Text
        style={{
          fontSize: 20,
          color: focused ? theme.accentGreenLight : theme.textDisabled,
        }}
      >
        {glyph}
      </Text>
      <Text
        variant="caption"
        style={{
          fontSize: 10,
          marginTop: 2,
          color: focused ? theme.accentGreenLight : theme.textDisabled,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const theme = useTheme();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bgElevated,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: Spacing.md,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" focused={focused} glyph="⌂" />
          ),
        }}
      />
      <Tabs.Screen
        name="revision"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Revision" focused={focused} glyph="♛" />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Groups" focused={focused} glyph="◈" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Settings" focused={focused} glyph="⚙" />
          ),
        }}
      />
      {/* Hidden screens — accessible via router.push but not in tab bar */}
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="subcis" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
  },
});
