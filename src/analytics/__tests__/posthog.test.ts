/**
 * PostHog EU transport tests (ANLY-02). Env-gated by EXPO_PUBLIC_POSTHOG_API_KEY:
 *  - No key → initPostHogTransport() wires nothing; track() stays a no-op.
 *  - Key present → an EU-hosted client is constructed with autocapture and
 *    session replay OFF, and allowlisted events forward through it (still
 *    content-stripped by track()'s guard on the way out).
 *
 * posthog-react-native is mocked (__mocks__/posthog-react-native.ts); every
 * constructed client is recorded in `posthogInstances`. Each case reloads the
 * modules with a controlled env key so the module-load-time key read is fresh.
 */

const KEY = 'phc_testposthogprojectkey';

type PosthogMock = typeof import('../../../__mocks__/posthog-react-native');

function setup(key?: string): {
  posthogInstances: PosthogMock['posthogInstances'];
  initPostHogTransport: typeof import('../posthog').initPostHogTransport;
  POSTHOG_EU_HOST: string;
  track: typeof import('../analytics').track;
} {
  jest.resetModules();
  if (key === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  else process.env.EXPO_PUBLIC_POSTHOG_API_KEY = key;

  const { posthogInstances } = require('posthog-react-native') as PosthogMock;
  const { initPostHogTransport, POSTHOG_EU_HOST } =
    require('../posthog') as typeof import('../posthog');
  const { track } = require('../analytics') as typeof import('../analytics');

  return { posthogInstances, initPostHogTransport, POSTHOG_EU_HOST, track };
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
});

describe('initPostHogTransport — no key', () => {
  it('constructs no client and leaves track() a silent no-op', () => {
    const { posthogInstances, initPostHogTransport, track } = setup();
    initPostHogTransport();
    expect(posthogInstances).toHaveLength(0);
    expect(() => track('app_opened', { coldLaunch: true })).not.toThrow();
  });
});

describe('initPostHogTransport — key present', () => {
  it('constructs an EU-hosted client with autocapture and session replay off', () => {
    const { posthogInstances, initPostHogTransport, POSTHOG_EU_HOST } = setup(KEY);
    initPostHogTransport();

    expect(POSTHOG_EU_HOST).toBe('https://eu.i.posthog.com');
    expect(posthogInstances).toHaveLength(1);
    expect(posthogInstances[0].apiKey).toBe(KEY);
    expect(posthogInstances[0].options).toEqual({
      host: 'https://eu.i.posthog.com',
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
    });
  });

  it('forwards allowlisted events to the client', () => {
    const { posthogInstances, initPostHogTransport, track } = setup(KEY);
    initPostHogTransport();

    track('session_started', { source: 'dump' });

    expect(posthogInstances[0].capture).toHaveBeenCalledWith('session_started', {
      source: 'dump',
    });
  });

  it('still strips smuggled content on the way to the client', () => {
    const { posthogInstances, initPostHogTransport, track } = setup(KEY);
    initPostHogTransport();

    (track as unknown as (e: string, p: object) => void)('brain_dump_saved', {
      itemCount: 2,
      text: 'call the clinic about the thing',
    });

    expect(posthogInstances[0].capture).toHaveBeenCalledWith('brain_dump_saved', {
      itemCount: 2,
    });
  });
});
