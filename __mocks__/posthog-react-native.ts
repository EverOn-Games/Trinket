/**
 * Jest mock for posthog-react-native (Phase 8 / ANLY-02). The native client
 * (device/file-system peers, network transport) cannot initialize under Jest's
 * Node environment, so the analytics transport wiring (posthog.ts) goes through
 * this fake. Mirrors the manual-mock precedent of __mocks__/lottie-react-native.tsx.
 *
 * Every constructed client is recorded in `posthogInstances` with the exact
 * (apiKey, options) it was built with and a call-inspectable `capture` fn, so
 * tests can assert the EU host / autocapture-off / replay-off posture and that
 * events forward through. Reset the array in a test's beforeEach.
 */

type PostHogOptionsLike = {
  host?: string;
  captureAppLifecycleEvents?: boolean;
  enableSessionReplay?: boolean;
};

export const posthogInstances: Array<{
  apiKey: string;
  options: PostHogOptionsLike | undefined;
  capture: jest.Mock;
}> = [];

export default class PostHog {
  apiKey: string;
  options: PostHogOptionsLike | undefined;
  capture: jest.Mock;

  constructor(apiKey: string, options?: PostHogOptionsLike) {
    this.apiKey = apiKey;
    this.options = options;
    this.capture = jest.fn();
    posthogInstances.push(this);
  }
}
