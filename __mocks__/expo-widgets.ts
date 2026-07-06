/**
 * Jest mock for expo-widgets (v0.2 §6a/6b surfaces). The WidgetKit /
 * ActivityKit bindings cannot initialize under Jest's Node environment;
 * the session Live Activity seam (sessionActivity.ts) and the widget
 * definition modules go through this fake.
 *
 * Live Activity instances are recorded in `liveActivityInstances` so tests
 * can assert the start/end lifecycle; reset via jest.clearAllMocks() +
 * clearing the array in a beforeEach.
 */

export type MockLiveActivityInstance = {
  props: object;
  url?: string;
  ended: boolean;
  update: jest.Mock;
  end: jest.Mock;
};

export const liveActivityInstances: MockLiveActivityInstance[] = [];

export function createWidget(name: string, _component: unknown) {
  return {
    name,
    updateSnapshot: jest.fn(),
    updateTimeline: jest.fn(),
  };
}

export function createLiveActivity(name: string, _component: unknown) {
  return {
    name,
    start: jest.fn((props: object, url?: string) => {
      const instance: MockLiveActivityInstance = {
        props,
        url,
        ended: false,
        update: jest.fn(),
        end: jest.fn(async () => {
          instance.ended = true;
        }),
      };
      liveActivityInstances.push(instance);
      return instance;
    }),
    getInstances: jest.fn(() => liveActivityInstances.filter((i) => !i.ended)),
  };
}

export const after = jest.fn((date: Date) => ({ after: date }));
export const addUserInteractionListener = jest.fn(() => ({ remove: jest.fn() }));
export const addPushToStartTokenListener = jest.fn(() => ({ remove: jest.fn() }));
