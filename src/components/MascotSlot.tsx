/**
 * MascotSlot — explicit placeholder mount point for the Phase 2 mascot module
 * (MASC-*). A themed, sized box only; Phase 2 replaces its contents with the
 * real Lottie mascot state machine (greeting/idle/presence/dozing/acknowledge).
 * The component name and this seam are the integration point Phase 2 targets
 * (see 01-CONTEXT.md code_context: "Phase 2 (Mascot) will mount into the home
 * screen's mascot area; leave an explicit slot component").
 *
 * Deliberately renders no copy of its own — any user-facing label (e.g. an
 * accessibility label) is passed in by the caller via translated text, so this
 * component never needs to own an i18n key.
 */
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';

export type MascotSlotProps = {
  accessibilityLabel?: string;
};

export function MascotSlot({ accessibilityLabel }: MascotSlotProps) {
  const theme = useTheme();

  // Flattened (never an array) — see Screen.tsx's comment on expo-router's
  // <Slot> shim rejecting array `style` props on a route's child elements.
  const slotStyle = StyleSheet.flatten([
    styles.slot,
    {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
    },
  ]);

  return (
    <View
      testID="mascot-slot"
      accessible
      accessibilityLabel={accessibilityLabel}
      style={slotStyle}
    />
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    height: 220,
    borderWidth: 1,
  },
});
