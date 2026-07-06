/**
 * App entry. expo-router provides the app tree; the one extra registration
 * is the Android widget headless task (react-native-android-widget), which
 * must be registered before the app mounts so widget renders work even when
 * the app process is cold.
 */
import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { androidWidgetTaskHandler } from './widgets/androidWidgetTaskHandler';

if (Platform.OS === 'android') {
  registerWidgetTaskHandler(androidWidgetTaskHandler);
}
