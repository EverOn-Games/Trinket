/**
 * Starter cue library (START-02): localized situation-cue suggestions grouped
 * by time-based, place-based, and event-based cues. Data only — each entry is
 * an i18n key resolved host-side via t(), mirroring the keyword-list-as-data
 * pattern of src/features/brain-dump/keywords.ts. The user can always type
 * their own cue instead (START-01 "pick or type"); this library only lowers
 * the blank-page cost of step 1.
 */

export type CueGroup = 'time' | 'place' | 'event';

export const CUE_GROUPS: readonly CueGroup[] = ['time', 'place', 'event'];

/** i18n keys under starter.cues.<group>.<n>; group labels at starter.cues.<group>.label */
export const CUE_LIBRARY: Readonly<Record<CueGroup, readonly string[]>> = {
  time: [
    'starter.cues.time.morningCoffee',
    'starter.cues.time.afterLunch',
    'starter.cues.time.eveningWindDown',
  ],
  place: [
    'starter.cues.place.sitAtDesk',
    'starter.cues.place.enterKitchen',
    'starter.cues.place.getHome',
  ],
  event: [
    'starter.cues.event.closeThisApp',
    'starter.cues.event.finishAShow',
    'starter.cues.event.hangUpACall',
  ],
};
