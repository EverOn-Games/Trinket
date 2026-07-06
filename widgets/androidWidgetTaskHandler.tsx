/**
 * Headless task driving the Android widget (react-native-android-widget).
 * Registered from the app entry (index.js). Every lifecycle action renders
 * the same resting-presence widget — there is deliberately no state to
 * compute (§2: a persistent surface shows the companion at rest, never
 * anything about the user's activity or absence). Clicks are handled
 * natively via OPEN_URI on the widget itself, so WIDGET_CLICK needs no
 * branch here.
 */
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { TrinketAndroidWidget } from './TrinketAndroidWidget';

export async function androidWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<TrinketAndroidWidget />);
      break;
    default:
      break;
  }
}
