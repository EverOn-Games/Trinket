/**
 * iOS home-screen widget (v0.2 §6a) — ambient companion presence plus a
 * one-tap way in. Rendered by WidgetKit via expo-widgets ('widget'
 * directive; compiled into the widget extension, NOT the app bundle — no
 * i18n runtime exists out here, so the only text is the brand name).
 *
 * §2 out-of-app rules, held by construction: nothing here can show counts,
 * streaks, history, badges, or anything about absence — the widget renders
 * the same resting presence no matter how long the app has been closed.
 * Companion-agnostic (§0 form-under-test): a soft glyph in the mascot-glow
 * amber, not raccoon art; final art drops into this slot when the form
 * decision lands.
 *
 * Colors are the dark brand tokens inlined (theme/tokens.ts values —
 * widgets can't import the RN theme module; the hex gate scopes to src/**
 * for exactly this reason).
 *
 * Tap → straight into session start via widgetURL (whole-widget target;
 * WidgetKit supports exactly one). The medium family adds no second tap
 * target for v1 — §10 says a single resting pose may suffice; keep the
 * gentlest possible surface until beta says more.
 */
import { Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import { deepLinks } from '../src/lib/deepLinks';

const GLOW = '#F2C988';
const CREAM = '#F2E6CC';

type TrinketWidgetProps = object;

const TrinketWidget = (_props: TrinketWidgetProps, _environment: WidgetEnvironment) => {
  'widget';
  return (
    <VStack modifiers={[widgetURL(deepLinks.coPilot('widget'))]}>
      <Spacer />
      <Image
        systemName="pawprint.fill"
        size={34}
        modifiers={[foregroundStyle(GLOW)]}
      />
      <Spacer />
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(CREAM)]}>
        Trinket
      </Text>
      <Spacer />
    </VStack>
  );
};

export default createWidget('TrinketWidget', TrinketWidget);
