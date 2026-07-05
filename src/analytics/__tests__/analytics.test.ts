/**
 * Analytics allowlist tests (ANLY-01): disabled-by-default, typed allowlist,
 * and the runtime no-content guard beneath the type layer.
 */
import { setAnalyticsTransport, track, type AnalyticsTransport } from '../analytics';
import { ALLOWED_EVENT_NAMES } from '../events';

describe('track() — ANLY-01 allowlist + no-content guard', () => {
  afterEach(() => {
    setAnalyticsTransport(null);
  });

  it('is a silent no-op with no transport wired (no key → nothing leaves)', () => {
    expect(() => track('app_opened', { coldLaunch: true })).not.toThrow();
  });

  it('sends allowlisted events with structural properties', () => {
    const sent: Array<{ event: string; props: Record<string, unknown> }> = [];
    const transport: AnalyticsTransport = (event, props) => sent.push({ event, props });
    setAnalyticsTransport(transport);

    track('session_started', { source: 'dump' });
    track('session_completed', { durationMs: 1500000, moodGiven: false });

    expect(sent).toEqual([
      { event: 'session_started', props: { source: 'dump' } },
      { event: 'session_completed', props: { durationMs: 1500000, moodGiven: false } },
    ]);
  });

  it('drops an event whose name is not in the allowlist (cast past the types)', () => {
    const sent: string[] = [];
    setAnalyticsTransport((event) => sent.push(event));

    // A future call site casting its way past TS must still be stopped.
    (track as unknown as (e: string, p: object) => void)('user_typed_text', {
      durationMs: 1,
    });

    expect(sent).toEqual([]);
  });

  it('strips free-form string values — user content is structurally unshippable', () => {
    const sent: Array<Record<string, unknown>> = [];
    setAnalyticsTransport((_event, props) => sent.push(props));

    (track as unknown as (e: string, p: object) => void)('brain_dump_saved', {
      itemCount: 3,
      // A hostile/buggy call site smuggling content in:
      text: 'call the therapist about the thing',
      nested: { secret: 'data' },
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ itemCount: 3 }); // content + objects gone
  });

  it('keeps only closed enum tokens among strings', () => {
    const sent: Array<Record<string, unknown>> = [];
    setAnalyticsTransport((_event, props) => sent.push(props));

    track('reminder_scheduled', { dayChosen: 'tomorrow' });
    expect(sent[0]).toEqual({ dayChosen: 'tomorrow' });
  });

  it('the allowlist itself contains no content-shaped events', () => {
    // Names are behavioral verbs, never content nouns; this guards the list
    // against drive-by additions like "task_text_entered".
    for (const name of ALLOWED_EVENT_NAMES) {
      expect(name).toMatch(/^[a-z_]+$/);
      expect(name).not.toMatch(/text|content|label|transcript|cue|title/);
    }
  });
});
