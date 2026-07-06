/**
 * iOS Live Activity (v0.2 §6b) — the companion's presence on the Lock
 * Screen / Dynamic Island while a Co-pilot session runs. A direct extension
 * of the async body double: the presence persists while the phone is down.
 *
 * §6b rules, held by construction:
 * - Elapsed time is a SwiftUI timer text (dateStyle 'timer' counting up
 *   from startedAt) — presence, never a countdown, and it ticks with ZERO
 *   activity updates (no update-budget churn).
 * - No idle-shaming state exists: the layout has exactly one form,
 *   companion + elapsed, regardless of how long the session runs.
 * - Ends when the session ends (src/features/surfaces/sessionActivity.ts
 *   owns the lifecycle; orphans are swept at cold launch).
 *
 * Companion-agnostic glyph (§0), brand colors inlined (see TrinketWidget).
 * Task label is the user's OWN wording, shown only on their own lock screen
 * — same posture as Starter's self-worded notifications.
 */
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

const GLOW = '#F2C988';
const CREAM = '#F2E6CC';
const ESPRESSO = '#1A140E';

export type SessionActivityProps = {
  /** Epoch ms the session started — drives the self-ticking elapsed text. */
  startedAt: number;
  /** The user's own task wording; empty string when the session is open-ended. */
  taskLabel: string;
};

const TrinketSessionActivity = (
  props: SessionActivityProps,
  _environment: LiveActivityEnvironment
) => {
  'widget';
  const elapsed = (size: number) => (
    <Text
      date={new Date(props.startedAt)}
      dateStyle="timer"
      modifiers={[font({ size, weight: 'medium' }), foregroundStyle(CREAM)]}
    />
  );
  const paw = <Image systemName="pawprint.fill" size={20} modifiers={[foregroundStyle(GLOW)]} />;

  return {
    banner: (
      <HStack modifiers={[activityBackgroundTint(ESPRESSO)]}>
        {paw}
        <VStack>
          {props.taskLabel.length > 0 ? (
            <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(CREAM)]}>
              {props.taskLabel}
            </Text>
          ) : null}
          {elapsed(16)}
        </VStack>
        <Spacer />
      </HStack>
    ),
    compactLeading: paw,
    compactTrailing: elapsed(13),
    minimal: paw,
    expandedLeading: paw,
    expandedTrailing: elapsed(15),
    expandedBottom:
      props.taskLabel.length > 0 ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(CREAM)]}>{props.taskLabel}</Text>
      ) : (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(CREAM)]}>Trinket</Text>
      ),
  };
};

export default createLiveActivity('TrinketSessionActivity', TrinketSessionActivity);
