/**
 * Android home-screen widget (v0.2 §6a) — the RemoteViews sibling of
 * TrinketWidget.tsx, rendered by react-native-android-widget's headless
 * task (see androidWidgetTaskHandler.tsx). Same §2 rules held the same way:
 * resting presence only, nothing that can reference absence or counts, one
 * tap straight into session start via the shared deep-link contract.
 *
 * Companion-agnostic pawprint glyph drawn as text (RemoteViews has no SF
 * Symbols); brand dark tokens inlined (widgets/ is outside the src/** hex
 * gate scope by design — no theme runtime exists in the widget process).
 */
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { deepLinks } from '../src/lib/deepLinks';

const ESPRESSO = '#1A140E';
const GLOW = '#F2C988';
const CREAM = '#F2E6CC';

export function TrinketAndroidWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLinks.coPilot('widget') }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ESPRESSO,
        borderRadius: 24,
        flexDirection: 'column',
      }}
    >
      <TextWidget text="🐾" style={{ fontSize: 30, color: GLOW }} />
      <TextWidget
        text="Trinket"
        style={{ fontSize: 13, color: CREAM, fontWeight: '600', marginTop: 6 }}
      />
    </FlexWidget>
  );
}
