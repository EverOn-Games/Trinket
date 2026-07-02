/**
 * Unit tests for useReducedStimulus — OS reduce-motion signal OR host-prop combiner.
 *
 * Mocks react-native's AccessibilityInfo (isReduceMotionEnabled + addEventListener)
 * since no native accessibility module is available under Jest.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReducedStimulus } from '../useReducedStimulus';

describe('useReducedStimulus', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false when OS reduce-motion is false and host prop is undefined', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const remove = jest.fn();
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);

    const { result } = await renderHook(() => useReducedStimulus());

    await waitFor(() => {
      expect(result.current.reducedStimulus).toBe(false);
    });
  });

  it('returns true (logical OR) when the host prop is true, even if OS reduce-motion is false', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);

    const { result } = await renderHook(() => useReducedStimulus(true));

    await waitFor(() => {
      expect(result.current.reducedStimulus).toBe(true);
    });
  });

  it('updates to true when the mocked reduceMotionChanged listener fires', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    let changeHandler: ((value: boolean) => void) | undefined;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
      _eventName: string,
      handler: (value: boolean) => void
    ) => {
      changeHandler = handler;
      return { remove: jest.fn() };
    }) as unknown as typeof AccessibilityInfo.addEventListener);

    const { result } = await renderHook(() => useReducedStimulus());

    await waitFor(() => {
      expect(result.current.reducedStimulus).toBe(false);
    });

    await act(async () => {
      changeHandler?.(true);
    });

    expect(result.current.reducedStimulus).toBe(true);
  });

  it('calls subscription.remove() on unmount', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const remove = jest.fn();
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);

    const { unmount } = await renderHook(() => useReducedStimulus());

    await unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
