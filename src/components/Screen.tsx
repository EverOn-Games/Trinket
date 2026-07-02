/**
 * Screen — the shared themed screen container (D-01/D-02, FND-04).
 *
 * Every route renders inside this component so the dark earthy background and
 * safe-area handling come from `theme/` tokens only — no per-screen ad hoc
 * background colors or hex literals. Uses `SafeAreaView` from
 * react-native-safe-area-context (ships with the SDK 56 template) so content
 * respects notches/home indicators on real devices.
 */
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

export type ScreenProps = PropsWithChildren<{
  contentStyle?: ViewStyle;
}>;

export function Screen({ children, contentStyle }: ScreenProps) {
  const theme = useTheme();

  // Flattened (never an array): expo-router's internal <Slot> shim throws when
  // a route's root child receives an array `style` prop (see
  // node_modules/expo-router/build/ui/Slot.js) — every screen renders inside
  // this container, so it must always pass a single merged style object.
  const safeAreaStyle = StyleSheet.flatten([
    styles.safeArea,
    { backgroundColor: theme.colors.background },
  ]);
  const innerStyle = StyleSheet.flatten([
    styles.content,
    { padding: theme.spacing.lg, gap: theme.spacing.md },
    contentStyle,
  ]);

  return (
    <SafeAreaView style={safeAreaStyle}>
      <View style={innerStyle}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
