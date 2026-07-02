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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.content,
          { padding: theme.spacing.lg, gap: theme.spacing.md },
          contentStyle,
        ]}
      >
        {children}
      </View>
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
