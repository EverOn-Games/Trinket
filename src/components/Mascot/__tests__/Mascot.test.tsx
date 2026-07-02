/**
 * Contract tests for <Mascot /> (MASC-01, MASC-02 integration, MASC-04, V5).
 *
 * Written RED-first (Phase 1 precedent) — this file exists before Mascot.tsx and
 * pins the six required behaviors from 02-04-PLAN.md's Task 1 <behavior> block:
 * state->asset mapping, single-persistent-LottieView, one-shot completion,
 * idle micro-behavior integration, hidden-prominence degradation, and the
 * unknown-state clamp (V5/T-02-05).
 *
 * Renders wrap in ThemeProvider (Mascot calls useTheme()) and every render/
 * rerender call is awaited — @testing-library/react-native v14's render() is
 * async (see src/app/__tests__/screens.test.tsx's precedent comment).
 *
 * AccessibilityInfo is mocked in every test (mirrors useReducedStimulus.test.ts's
 * precedent) because the real native module isn't available under Jest's Node
 * environment and an unmocked isReduceMotionEnabled() Promise would reject
 * rather than resolve, producing an unhandled rejection.
 *
 * The idle-scheduler integration test asserts against `mockLottieRef`, a
 * stable module-scoped export added to __mocks__/lottie-react-native.tsx
 * (Rule 3 deviation — the mock's original per-render `jest.fn()` factory
 * made ref-level assertions unreachable from test code; see SUMMARY.md).
 *
 * `mockLottieRef` is imported via the bare `'lottie-react-native'` specifier
 * (require + type-only import of the mock's shape), NOT a relative path into
 * __mocks__/ — importing the mock file by its literal relative path resolves
 * to a *separate* module instance from the one Jest's automock machinery
 * hands to Mascot.tsx's `import LottieView from 'lottie-react-native'`,
 * silently splitting the two into different LottieView/mockLottieRef object
 * identities (confirmed empirically: relative-path import causes the mocked
 * LottieView to stop rendering any children at all, everywhere in the file).
 * The bare specifier guarantees both call sites resolve to the same instance.
 */
import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { ThemeProvider } from '../../../../theme';
import { Mascot } from '../Mascot';
import type { MascotState } from '../types';
import type { LottieViewRef } from '../../../../__mocks__/lottie-react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- bare specifier required so this resolves to the SAME automocked module instance Mascot.tsx uses (see doc comment above)
const { mockLottieRef } = require('lottie-react-native') as { mockLottieRef: LottieViewRef };

// eslint-disable-next-line @typescript-eslint/no-require-imports -- static JSON require, mirrors markers.test.ts precedent
const mascotGreetingAsset = require('../../../../assets/mascot/mascot_greeting.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mascotIdleAsset = require('../../../../assets/mascot/mascot_idle.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mascotPresenceAsset = require('../../../../assets/mascot/mascot_presence.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mascotDozingAsset = require('../../../../assets/mascot/mascot_dozing.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mascotAcknowledgeAsset = require('../../../../assets/mascot/mascot_acknowledge.json');

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<
      typeof AccessibilityInfo.addEventListener
    >);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('<Mascot /> state -> asset mapping (MASC-01)', () => {
  const STATE_ASSET_PAIRS: [MascotState, unknown][] = [
    ['greeting', mascotGreetingAsset],
    ['idle', mascotIdleAsset],
    ['presence', mascotPresenceAsset],
    ['dozing', mascotDozingAsset],
    ['acknowledge', mascotAcknowledgeAsset],
  ];

  it.each(STATE_ASSET_PAIRS)(
    'renders the matching mascot_<state>.json as the LottieView source for state=%s',
    async (state, expectedAsset) => {
      const { getByTestId } = await render(
        <ThemeProvider>
          <Mascot state={state} accessibilityLabel="label" />
        </ThemeProvider>
      );

      expect(getByTestId('lottie-view-mock').props.source).toEqual(expectedAsset);
    }
  );
});

describe('<Mascot /> single persistent LottieView (MASC-04)', () => {
  it('never renders more than one lottie-view-mock node across rapid state changes', async () => {
    const states: MascotState[] = ['greeting', 'idle', 'presence', 'dozing', 'acknowledge', 'idle'];

    const { queryAllByTestId, rerender } = await render(
      <ThemeProvider>
        <Mascot state={states[0]} accessibilityLabel="label" />
      </ThemeProvider>
    );
    expect(queryAllByTestId('lottie-view-mock')).toHaveLength(1);

    for (const state of states.slice(1)) {
      await rerender(
        <ThemeProvider>
          <Mascot state={state} accessibilityLabel="label" />
        </ThemeProvider>
      );
      expect(queryAllByTestId('lottie-view-mock')).toHaveLength(1);
    }
  });

  it('keeps the SAME lottie-view-mock instance mounted across hidden<->visible prominence toggles (WR-03)', async () => {
    // 'hidden' marks its wrapper importantForAccessibility="no-hide-descendants"
    // (correctly excluding it from the real accessibility tree), which also
    // makes RNTL v14's default queries skip it — so hidden-prominence
    // assertions below opt back in via { includeHiddenElements: true } to
    // confirm the (still-mounted) node underneath.
    const { queryAllByTestId, getByTestId, rerender } = await render(
      <ThemeProvider>
        <Mascot state="idle" prominence="prominent" accessibilityLabel="label" />
      </ThemeProvider>
    );
    expect(queryAllByTestId('lottie-view-mock')).toHaveLength(1);
    const initialInstance = getByTestId('lottie-view-mock');

    // Toggling to 'hidden' must NOT unmount/remount the LottieView — the
    // module's single-persistent-instance contract (MASC-04) covers
    // prominence toggles too, not just state transitions.
    await rerender(
      <ThemeProvider>
        <Mascot state="idle" prominence="hidden" accessibilityLabel="label" />
      </ThemeProvider>
    );
    expect(queryAllByTestId('lottie-view-mock', { includeHiddenElements: true })).toHaveLength(1);
    expect(getByTestId('lottie-view-mock', { includeHiddenElements: true })).toBe(initialInstance);

    await rerender(
      <ThemeProvider>
        <Mascot state="idle" prominence="subtle" accessibilityLabel="label" />
      </ThemeProvider>
    );
    expect(queryAllByTestId('lottie-view-mock')).toHaveLength(1);
    expect(getByTestId('lottie-view-mock')).toBe(initialInstance);
  });
});

describe('<Mascot /> one-shot completion (MASC-01)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires onStateAnimationComplete("greeting") exactly once after the greeting asset finishes', async () => {
    const onComplete = jest.fn();
    await render(
      <ThemeProvider>
        <Mascot state="greeting" accessibilityLabel="label" onStateAnimationComplete={onComplete} />
      </ThemeProvider>
    );

    // mascot_greeting.json: op=72, fr=30 -> 2400ms duration.
    await act(async () => {
      jest.advanceTimersByTime(2400);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('greeting');
  });

  it('fires onStateAnimationComplete("acknowledge") exactly once after the acknowledge asset finishes', async () => {
    const onComplete = jest.fn();
    await render(
      <ThemeProvider>
        <Mascot state="acknowledge" accessibilityLabel="label" onStateAnimationComplete={onComplete} />
      </ThemeProvider>
    );

    // mascot_acknowledge.json: op=45, fr=30 -> 1500ms duration.
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('acknowledge');
  });
});

describe('<Mascot /> idle micro-behavior integration (MASC-02)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockLottieRef.play.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls the mocked LottieView ref play() with an idle marker frame range after the interval elapses', async () => {
    await render(
      <ThemeProvider>
        <Mascot state="idle" accessibilityLabel="label" />
      </ThemeProvider>
    );

    // Normal (non-reduced-stimulus) interval is uniformly [4000, 9000)ms —
    // advancing by the full upper bound guarantees at least one fire.
    await act(async () => {
      jest.advanceTimersByTime(9000);
    });

    expect(mockLottieRef.play).toHaveBeenCalled();
    const [startFrame, endFrame] = mockLottieRef.play.mock.calls[0] as [number, number];
    const validRanges = [
      [60, 74], // blink
      [140, 170], // glance
      [230, 280], // postureShift
    ];
    expect(validRanges).toContainEqual([startFrame, endFrame]);
  });
});

describe('<Mascot /> hidden prominence (MASC-04, WR-03)', () => {
  it('renders nothing visible (zero size, opacity 0, not accessible) but keeps the LottieView mounted, and still accepts state changes without error', async () => {
    const { getByTestId, queryAllByTestId, rerender } = await render(
      <ThemeProvider>
        <Mascot state="idle" prominence="hidden" accessibilityLabel="label" />
      </ThemeProvider>
    );

    // WR-03: 'hidden' must NOT unmount the LottieView (that would break the
    // single-persistent-instance contract) — it stays mounted but visually
    // hidden via zero-size/opacity-0 styling on its wrapper, and excluded
    // from the accessibility tree (importantForAccessibility="no-hide-
    // descendants"), which is also why the query below opts into
    // { includeHiddenElements: true } to reach the still-mounted node.
    expect(queryAllByTestId('lottie-view-mock', { includeHiddenElements: true })).toHaveLength(1);
    const wrapper = getByTestId('lottie-view-mock', { includeHiddenElements: true }).parent;
    const flattenedStyle = StyleSheet.flatten(wrapper?.props.style);
    expect(flattenedStyle).toMatchObject({ width: 0, height: 0, opacity: 0 });
    expect(wrapper?.props.accessible).toBe(false);

    await rerender(
      <ThemeProvider>
        <Mascot state="presence" prominence="hidden" accessibilityLabel="label" />
      </ThemeProvider>
    );

    expect(queryAllByTestId('lottie-view-mock', { includeHiddenElements: true })).toHaveLength(1);
  });
});

describe('<Mascot /> unknown state clamp (V5, T-02-05)', () => {
  it('renders the idle asset when passed an unrecognized state value', async () => {
    const badState = 'unknown-state' as unknown as MascotState;

    const { getByTestId } = await render(
      <ThemeProvider>
        <Mascot state={badState} accessibilityLabel="label" />
      </ThemeProvider>
    );

    expect(getByTestId('lottie-view-mock').props.source).toEqual(mascotIdleAsset);
  });
});
