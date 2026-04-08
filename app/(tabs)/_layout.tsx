// ============================================================
// Tab Navigator Layout — Custom tab bar with center FAB
// ============================================================
import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Shadows } from '../../src/theme/tokens';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrap, { paddingBottom: insets.bottom || 0 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const icons: Record<string, { active: keyof typeof MaterialCommunityIcons.glyphMap; inactive: keyof typeof MaterialCommunityIcons.glyphMap }> = {
            camera: { active: 'camera', inactive: 'camera-outline' },
            history: { active: 'history', inactive: 'history' },
            settings: { active: 'cog', inactive: 'cog-outline' },
          };
          const iconSet = icons[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          const iconName = isFocused ? iconSet.active : iconSet.inactive;
          const label = options?.title ?? route.name;

          return (
            <TouchableOpacity key={route.key} style={[styles.tabItem, isFocused && styles.tabItemActive]} onPress={onPress} activeOpacity={0.9}>
              <MaterialCommunityIcons name={iconName} size={18} style={[styles.tabIcon, isFocused && styles.tabIconActive]} />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="camera" options={{ title: 'Camera' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 0,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
    minHeight: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
    paddingVertical: 4,
    minHeight: 46,
    marginHorizontal: 2,
    gap: 1,
  },
  tabItemActive: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  tabIcon: {
    fontSize: 17,
    opacity: 0.62,
    color: Colors.onSurfaceVariant,
  },
  tabIconActive: {
    opacity: 1,
    color: '#0F172A',
  },
  tabLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'none',
    letterSpacing: 0,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
});
