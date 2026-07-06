/**
 * Jest mock for react-native-android-widget (v0.2 §6a Android). RemoteViews
 * rendering and the headless task registry don't exist under Jest; the
 * entry-point registration and the widget component modules go through this
 * fake. Primitives render nothing (widget JSX is exercised on-device, not
 * in Jest — same posture as the Lottie mock's View stub).
 */

export const registerWidgetTaskHandler = jest.fn();

export const requestWidgetUpdate = jest.fn(async () => undefined);

export function FlexWidget(): null {
  return null;
}

export function TextWidget(): null {
  return null;
}

export type WidgetTaskHandlerProps = {
  widgetAction: string;
  widgetInfo: object;
  renderWidget: (widget: unknown) => void;
  clickAction?: string;
};
