import { createMMKV } from 'react-native-mmkv';

describe('jest harness smoke test', () => {
  it('round-trips a value through the mocked MMKV instance', () => {
    const storage = createMMKV({ id: 'harness-smoke-test' });

    storage.set('greeting', 'hello');
    expect(storage.getString('greeting')).toBe('hello');

    storage.remove('greeting');
    expect(storage.getString('greeting')).toBeUndefined();
  });

  it('keeps distinct instance ids independent', () => {
    const a = createMMKV({ id: 'harness-smoke-a' });
    const b = createMMKV({ id: 'harness-smoke-b' });

    a.set('key', 'from-a');

    expect(a.getString('key')).toBe('from-a');
    expect(b.getString('key')).toBeUndefined();
  });

  it('returns the same store for repeated createMMKV calls with the same id', () => {
    const first = createMMKV({ id: 'harness-smoke-shared' });
    first.set('shared', 'value');

    const second = createMMKV({ id: 'harness-smoke-shared' });
    expect(second.getString('shared')).toBe('value');
  });
});
