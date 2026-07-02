/**
 * Reduced-stimulus signal combiner — logical OR of the OS reduce-motion setting
 * and an explicit host-supplied prop override.
 *
 * On mount, reads `AccessibilityInfo.isReduceMotionEnabled()` (async) and
 * subscribes to the `reduceMotionChanged` event so the value updates live if the
 * user toggles the OS setting while the app is open. The subscription is removed
 * on unmount to avoid a listener leak.
 *
 * Follows i18n/useLocale.ts's named `UseXResult` return-type export convention.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export type UseReducedStimulusResult = {
  reducedStimulus: boolean;
};

export function useReducedStimulus(hostProp?: boolean): UseReducedStimulusResult {
  const [osReduceMotion, setOsReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (isMounted) setOsReduceMotion(value);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setOsReduceMotion(value);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return { reducedStimulus: osReduceMotion || Boolean(hostProp) };
}
