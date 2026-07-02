/**
 * View-stub fake of lottie-react-native's `LottieView`, used exclusively under Jest.
 *
 * `LottieView` renders through native AirBnB lottie-ios/lottie-android bindings and
 * exposes an imperative ref API (`play`/`pause`/`resume`/`reset`) backed by those
 * native views — neither the native render nor the ref methods can execute inside
 * Jest's Node test environment (there is no native UI thread to render into).
 * This mock lets Mascot component/scheduler logic (state->source mapping, marker
 * playback calls, single-instance contract) be unit-tested without the real native
 * binding, by exposing the same imperative surface as `jest.fn()`s that assertions
 * can inspect. Actual on-device animation smoothness (MASC-04) must still be
 * verified separately on hardware (see 02-RESEARCH.md D-03 Android device checkpoint).
 *
 * `mockLottieRef` (added in Plan 02-04) is a module-scoped, stable jest.fn() set —
 * NOT recreated per render — so integration tests (e.g. Mascot.test.tsx's idle-
 * scheduler assertions) can import it directly and assert imperative play()/
 * pause()/resume()/reset() calls without needing access to the component-under-
 * test's internal ref (which is otherwise unreachable from outside the component).
 * Call `mockLottieRef.play.mockClear()` (etc.) between tests to avoid cross-test
 * call-count leakage, since the object persists for the whole Jest module
 * registry lifetime of a test file.
 */
import { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewProps } from 'react-native';

export type LottieViewProps = ViewProps & {
  source: unknown;
  loop?: boolean;
  autoPlay?: boolean;
  onAnimationFinish?: (isCancelled: boolean) => void;
};

export type LottieViewRef = {
  play: jest.Mock;
  pause: jest.Mock;
  resume: jest.Mock;
  reset: jest.Mock;
};

export const mockLottieRef: LottieViewRef = {
  play: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  reset: jest.fn(),
};

const LottieView = forwardRef<LottieViewRef, LottieViewProps>((props, ref) => {
  useImperativeHandle(ref, () => mockLottieRef);
  return <View testID="lottie-view-mock" {...props} />;
});

export default LottieView;
