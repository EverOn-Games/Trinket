/**
 * iOS home-screen widget (v0.2 §6a) — ambient companion presence plus a
 * one-tap way in. Rendered by WidgetKit via expo-widgets ('widget'
 * directive; compiled into the widget extension, NOT the app bundle — the
 * widget runs OUT of process, so nothing here can ever take the app down.
 * No i18n runtime exists out here, so the little text is fixed EN — a
 * localization pass rides the final-art drop).
 *
 * Families:
 * - systemSmall: the companion resting; whole-widget tap → session start
 *   (widgetURL — WidgetKit allows exactly one per hierarchy).
 * - systemMedium: companion + the spec's two entries (§6a "companion plus a
 *   one-tap Brain dump entry alongside the session entry") as declarative
 *   SwiftUI Links — per-element deep links, no interaction listener, no JS
 *   routing to go wrong.
 *
 * §2 out-of-app rules, held by construction: no state exists here, so
 * nothing can show counts, streaks, history, or anything about absence.
 * Companion-agnostic glyph (§0 form-under-test); brand dark tokens inlined
 * (the widget can't import the RN theme module; the hex gate scopes to
 * src/** for exactly this reason).
 */
import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import { deepLinks } from '../src/lib/deepLinks';

const GLOW = '#F2C988';
const CREAM = '#F2E6CC';
const MUTED = '#A89A82';

type TrinketWidgetProps = object;

const companion = (
  <VStack>
    <Image systemName="pawprint.fill" size={34} modifiers={[foregroundStyle(GLOW)]} />
    <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(CREAM)]}>
      Trinket
    </Text>
  </VStack>
);

const TrinketWidget = (_props: TrinketWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack>
        {companion}
        <Spacer />
        <VStack>
          <Link destination={deepLinks.coPilot('widget')}>
            <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(CREAM)]}>
              Start a session?
            </Text>
          </Link>
          <Spacer />
          <Link destination={deepLinks.brainDump('widget')}>
            <Text modifiers={[font({ size: 14 }), foregroundStyle(MUTED)]}>Brain dump</Text>
          </Link>
        </VStack>
        <Spacer />
      </HStack>
    );
  }

  return (
    <VStack modifiers={[widgetURL(deepLinks.coPilot('widget'))]}>
      <Spacer />
      {companion}
      <Spacer />
    </VStack>
  );
};

export default createWidget('TrinketWidget', TrinketWidget);
