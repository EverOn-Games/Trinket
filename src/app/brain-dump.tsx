/**
 * Brain dump screen (D-04/D-05/D-06/D-07/D-12, DUMP-01, DUMP-05). A single
 * route driving a `viewPhase: 'capture' | 'list'` state machine, mirroring
 * co-pilot.tsx's flowPhase shape.
 *
 * Capture view (D-04): a single big multiline field — "dump it all out in
 * one stream" rather than add-one-then-tap-add. The in-progress text
 * auto-restores from a single MMKV draft key on mount (D-06) and is cleared
 * on Save. Tapping Save with non-blank content parses the stream into lines
 * (parseDumpText, D-07 — blank lines silently dropped), classifies each line
 * (classify, D-09/D-10), and persists one DumpItem per line via
 * dumpItemsRepo.create (D-05: nothing is persisted before Save). An
 * empty/whitespace-only Save is a silent no-op — no items, no error (D-07).
 * No voice/mic UI yet (D-01's text-core slice) — that lands in 04-06; this
 * plan reserves no special layout slot beyond what's here, per 04-03's scope.
 *
 * Grouped list view (D-12): dumpItemsRepo.list() is read directly in render
 * (no local mirror of repo data, matching co-pilot.tsx's SetupPhase
 * precedent) and grouped into the 5 fixed categories in order, with empty
 * categories omitted. A persistent capture-affordance header card is always
 * present. Zero items (initially, or if a future feature removes the last
 * one) routes straight back into the capture view rather than showing an
 * empty list — there is only one capture implementation, reused for both
 * the empty-state and the explicit "add more" entry point.
 *
 * Voice-augment (D-01/D-02/D-03, DUMP-02, 04-06): `useVoiceCapture` drives a
 * mic button that toggles native STT via `onChangeText` — the exact same
 * setter the TextInput itself uses, so final segments land as new lines in
 * the one text field with no separate transcript surface (UI-SPEC Flag 2).
 * When STT is unavailable, permission is denied, or a runtime error fires,
 * `useVoiceCapture` folds all three into a single `available === false`
 * signal (UI-SPEC Flag 9) and this file swaps the mic for one shared
 * `voiceUnavailable` caption — the text field is never affected either way.
 * The mascot maps `idle` (before/after recording) <-> `presence` (while
 * recording), `subtle` prominence (UI-SPEC Flag 1); it does not appear on
 * the list view. Real on-device Polish recognition + continuous-mode
 * segment timing are the D-02 device spike (04-VALIDATION.md Manual-Only),
 * not verified by this file's Jest coverage.
 *
 * DUMP-05 (≤2 taps from anywhere): unaffected by this rewrite — Home's own
 * `<Link href="/brain-dump">` (src/app/index.tsx) is untouched.
 *
 * Item row (D-11, D-13, D-14, D-15, DUMP-03, DUMP-04): `DumpItemRow` extends
 * the 04-03 read-only row into the full inline correction surface — a
 * tappable category chip that expands into the 5-option picker (D-11), an
 * inline text-edit that never re-suggests a category (D-13), an explicit
 * delete gated by a shame-free inline confirm (D-13 — "Delete this?" /
 * "Keep it", neutral typography, never a bare swipe), and a "Start a
 * session" promote button that pushes `/co-pilot` with `dumpItemId` (D-14
 * caller side — co-pilot.tsx itself, 04-05's job, reads the param and calls
 * beginSession; this file never creates a Session). A promoted item stays in
 * the list, quietly marked (D-15) — never a badge/count/completed treatment.
 * Only one of {picker, edit, delete} is open per row at a time. Because the
 * screen reads dumpItemsRepo.list() directly in render, any row mutation
 * bumps a parent-level counter to force a re-render (mirrors index.tsx's
 * dismissedActiveSession re-render idiom).
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Mascot } from '@/components/Mascot/Mascot';
import { parseDumpText } from '@/features/brain-dump/parseDumpText';
import { classify } from '@/features/brain-dump/classify';
import { track } from '../analytics/analytics';
import { useVoiceCapture } from '@/features/brain-dump/useVoiceCapture';
import { useTheme } from '../../theme';
import { dumpItemsRepo } from '../../data/repositories/dumpItems';
import { useRepoVersion } from '../../data/repoBus';
import { readBrainDumpDraft, writeBrainDumpDraft, clearBrainDumpDraft } from '../../data/draft';
import type { DumpItem, DumpItemCategory, Locale } from '../../data/types';

// D-12: fixed category order, empty sections omitted at render time.
const CATEGORY_ORDER: readonly DumpItemCategory[] = ['errands', 'work', 'home', 'people', 'someday'];

function groupByCategory(items: DumpItem[]): { title: DumpItemCategory; data: DumpItem[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    title: category,
    data: items.filter((item) => item.category === category),
  })).filter((section) => section.data.length > 0);
}

// Mirrors co-pilot.tsx's own formatDuration idiom (mm:ss, tabular-nums in
// the style layer) — a private, unexported helper here since the recording
// pill's duration never exceeds an hour in practice.
function formatRecordingDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function BrainDumpScreen() {
  const { i18n } = useTranslation();

  // D-12: read directly in render, no local mirror of repo data — matches
  // co-pilot.tsx's SetupPhase `dumpItemsRepo.list()` precedent. repoBus keeps
  // a mounted list live when items are created elsewhere (e.g. onboarding's
  // first task, a promote from co-pilot) — stale-screen class, device UAT.
  useRepoVersion('dumpItem');
  const items = dumpItemsRepo.list();

  const [viewPhase, setViewPhase] = useState<'capture' | 'list'>(() =>
    items.length > 0 ? 'list' : 'capture'
  );
  // Row mutations (category change, edit, delete) write straight to
  // dumpItemsRepo without going through any state mirrored here — bumping
  // this counter is the only way to force a re-render so `items` above is
  // re-read fresh (mirrors index.tsx's dismissedActiveSession re-render
  // idiom for a repo read that lives directly in the render body).
  const [, bumpItemsVersion] = useState(0);
  const handleItemsChanged = () => bumpItemsVersion((n) => n + 1);
  // D-06: seeded once from the persisted draft on mount, kept in sync on
  // every change so a force-quit mid-dump never loses in-progress text.
  const [draftText, setDraftText] = useState(() => readBrainDumpDraft());

  // T-04-03-DUP: guards a rapid double-tap Save from creating duplicate
  // items (mirrors co-pilot's isStartingSessionRef). Unlike that one-shot
  // guard, this resets every time the user re-enters capture (below) since
  // Save is a repeatable action across the lifetime of this screen, not a
  // single terminal transition.
  const isSavingRef = useRef(false);

  const enterCapture = () => {
    isSavingRef.current = false;
    setViewPhase('capture');
  };

  const handleChangeText = (next: string) => {
    setDraftText(next);
    writeBrainDumpDraft(next);
  };

  const handleSave = () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const lines = parseDumpText(draftText);
    if (lines.length === 0) {
      // D-05/D-07: empty/whitespace-only Save is a silent no-op — no items
      // created, no error shown, field left as-is.
      isSavingRef.current = false;
      return;
    }

    const locale: Locale = i18n.language === 'pl' ? 'pl' : 'en';
    for (const line of lines) {
      dumpItemsRepo.create({ text: line, category: classify(line, locale) });
    }

    clearBrainDumpDraft();
    setDraftText('');
    setViewPhase('list');
    // ANLY-01: count only — never the items themselves.
    track('brain_dump_saved', { itemCount: lines.length });
  };

  // D-12: zero items always routes to capture, whether that's the very
  // first load or (in a future plan) the moment the last item is removed.
  const showList = viewPhase === 'list' && items.length > 0;

  return (
    <Screen>
      {showList ? (
        <ListPhase items={items} onCapture={enterCapture} onItemsChanged={handleItemsChanged} />
      ) : (
        <CapturePhase draftText={draftText} onChangeText={handleChangeText} onSave={handleSave} />
      )}
    </Screen>
  );
}

function CapturePhase({
  draftText,
  onChangeText,
  onSave,
}: {
  draftText: string;
  onChangeText: (next: string) => void;
  onSave: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  const locale: Locale = i18n.language === 'pl' ? 'pl' : 'en';
  // D-01/D-03: onChangeText is the exact same setter the TextInput itself
  // uses — final segments land in the one text field, no separate
  // transcript surface (UI-SPEC Flag 2).
  const voice = useVoiceCapture(draftText, onChangeText, locale);

  // Recording-duration display (m:ss, tabular-nums). `Date.now()` is impure
  // (react-hooks/purity forbids calling it during render, even guarded), so
  // `recordingStartedAt` is only ever set from event handlers (handleMicPress
  // below) — never derived in the render body. The one real subscription —
  // the 1s interval ticking `nowTick` — lives in its own effect, calling
  // setState only inside the setInterval callback (mirrors
  // useElapsedSession.ts's tick-while-active idiom), never directly in the
  // effect body itself.
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!voice.recording) return undefined;
    const intervalId = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [voice.recording]);
  const recordingDuration = formatRecordingDuration(
    recordingStartedAt !== null ? Math.max(0, nowTick - recordingStartedAt) : 0
  );

  const handleMicPress = () => {
    if (voice.recording) {
      voice.stop();
      setRecordingStartedAt(null);
      return;
    }
    const startedAt = Date.now();
    setRecordingStartedAt(startedAt);
    setNowTick(startedAt);
    void voice.start();
  };
  const focusTextField = () => inputRef.current?.focus();

  const kickerStyle = StyleSheet.flatten([
    styles.kicker,
    { color: theme.colors.textSecondary, fontSize: theme.typography.scale.caption },
  ]);
  const headingStyle = StyleSheet.flatten([
    styles.heading,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.title },
  ]);
  const subcopyStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
  };
  const inputStyle = StyleSheet.flatten([
    styles.input,
    {
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      fontSize: theme.typography.scale.body,
    },
  ]);
  const recordingPillStyle = StyleSheet.flatten([
    styles.recordingPill,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.pill, gap: theme.spacing.xs },
  ]);
  // Typed as TextStyle (co-pilot.tsx timerStyle precedent) — `as const` on
  // fontVariant produces a readonly tuple RN's mutable FontVariant[] rejects
  // under tsc --noEmit.
  const recordingPillLabelStyle: TextStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  };
  // UI-SPEC Flag 5: a soft mascotGlow ring in addition to the accent fill
  // while actively recording — "the mascot is listening too", not a new
  // semantic color.
  const micButtonStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.micButton,
    {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.pill,
      borderWidth: voice.recording ? 3 : 0,
      borderColor: theme.colors.mascotGlow,
    },
  ]);
  const micGlyphStyle = { fontSize: theme.typography.scale.title };
  const textFallbackStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
  };
  const voiceUnavailableStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const saveButtonStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.saveButton,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const saveLabelStyle = {
    color: theme.colors.onAccent,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };

  const containerStyle = StyleSheet.flatten([styles.captureContainer, { gap: theme.spacing.lg }]);

  return (
    <View style={containerStyle}>
      <Text style={kickerStyle}>{t('brainDump.title')}</Text>

      {/* UI-SPEC Flag 1: subtle prominence, idle<->presence only (recording
          maps to presence, everything else to idle) — no 6th MascotState. */}
      <Mascot
        state={voice.recording ? 'presence' : 'idle'}
        prominence="subtle"
        accessibilityLabel={t(`mascot.accessibility.${voice.recording ? 'presence' : 'idle'}`)}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <Text style={headingStyle}>
          {t(voice.recording ? 'brainDump.capture.prompt.listening' : 'brainDump.capture.prompt.idle')}
        </Text>
        <Text style={subcopyStyle}>
          {t(voice.recording ? 'brainDump.capture.prompt.listeningSub' : 'brainDump.capture.prompt.idleSub')}
        </Text>
      </View>

      <TextInput
        ref={inputRef}
        testID="brain-dump-input"
        value={draftText}
        onChangeText={onChangeText}
        placeholder={t('brainDump.capture.placeholder')}
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        textAlignVertical="top"
        style={inputStyle}
      />

      {voice.recording && (
        <View style={recordingPillStyle} testID="brain-dump-recording-pill">
          <Text style={recordingPillLabelStyle}>
            {t('brainDump.capture.recordingLabel', { duration: recordingDuration })}
          </Text>
        </View>
      )}

      {voice.available ? (
        <View style={{ gap: theme.spacing.sm, alignItems: 'center' }}>
          <Pressable
            testID="brain-dump-mic"
            accessibilityRole="button"
            accessibilityLabel={t(voice.micLabelKey)}
            onPress={handleMicPress}
            style={micButtonStyle}
          >
            <Text style={micGlyphStyle}>🎤</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={focusTextField}>
            <Text style={textFallbackStyle}>{t('brainDump.capture.textFallback')}</Text>
          </Pressable>
        </View>
      ) : (
        // Permission denial gets its own caption (founder request, device UAT
        // 2026-07-05): says why voice is off and where it can be re-enabled —
        // offer-grammar, never an instruction or an error state.
        <Text testID="brain-dump-voice-unavailable" style={voiceUnavailableStyle}>
          {t(
            voice.permissionDenied
              ? 'brainDump.capture.voicePermissionDenied'
              : 'brainDump.capture.voiceUnavailable'
          )}
        </Text>
      )}

      <Pressable
        testID="brain-dump-save"
        accessibilityRole="button"
        onPress={onSave}
        style={saveButtonStyle}
      >
        <Text style={saveLabelStyle}>{t('brainDump.capture.save')}</Text>
      </Pressable>
    </View>
  );
}

// D-11/D-13/D-15: only one of these is active on a given row at a time.
type RowMode = 'idle' | 'picker' | 'edit' | 'delete';

function DumpItemRow({ item, onChange }: { item: DumpItem; onChange: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const [rowMode, setRowMode] = useState<RowMode>('idle');
  const [editText, setEditText] = useState(item.text);

  // T-04-04-DELDUP: guards a rapid double-tap on the confirm delete tap from
  // racing a second dumpItemsRepo.remove call; T-04-04-DUP guards the
  // promote tap against a double-navigation into /co-pilot. Neither ref is
  // shared with the other — a delete and a promote are unrelated actions on
  // the same row.
  const isDeletingRef = useRef(false);
  const isPromotingRef = useRef(false);
  // CR-02: the timeout id backing isPromotingRef's re-arm window below,
  // cleared on unmount so a stray setTimeout callback never fires against
  // an unmounted row.
  const promoteResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (promoteResetTimeoutRef.current !== null) {
        clearTimeout(promoteResetTimeoutRef.current);
      }
    };
  }, []);

  const enterEdit = () => {
    setEditText(item.text);
    setRowMode('edit');
  };
  const cancelEdit = () => {
    setEditText(item.text);
    setRowMode('idle');
  };
  const confirmEdit = () => {
    // D-13: the edit leaves the category untouched — no re-classify call.
    dumpItemsRepo.update(item.id, { text: editText });
    setRowMode('idle');
    onChange();
  };

  const selectCategory = (category: DumpItemCategory) => {
    dumpItemsRepo.update(item.id, { category });
    setRowMode('idle');
    onChange();
  };

  const confirmDelete = () => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    dumpItemsRepo.remove(item.id);
    onChange();
  };

  // D-14: this file only pushes a router param — session creation stays
  // single-sourced in co-pilot.tsx's startFromDumpItem (04-05's job). D-15:
  // re-promoting is allowed, so this guard only blocks a double-tap within
  // the same press, never a legitimate second promote later (CR-02: the
  // guard is a short time-window debounce, not a permanent latch — the row
  // stays mounted after promoting since D-15 marks rather than consumes).
  const handlePromote = () => {
    if (isPromotingRef.current) return;
    isPromotingRef.current = true;
    track('item_promoted', {});
    router.push({ pathname: '/co-pilot', params: { dumpItemId: item.id } });
    promoteResetTimeoutRef.current = setTimeout(() => {
      isPromotingRef.current = false;
    }, 800);
  };

  const rowStyle = StyleSheet.flatten([
    styles.itemRow,
    { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md, gap: theme.spacing.sm },
  ]);
  const line1Style = StyleSheet.flatten([styles.line1, { gap: theme.spacing.sm }]);
  // Flag 7: the collapsed chip is deliberately NOT accent-colored — a
  // suggestion, not a verdict.
  const collapsedChipStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.chip,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.pill },
  ]);
  const collapsedChipLabelStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
  };
  const markerStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const chipsRowStyle = StyleSheet.flatten([styles.chipsRow, { gap: theme.spacing.sm }]);
  const textStyle = {
    color: item.promotedTaskId ? theme.colors.textSecondary : theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };
  const editInputStyle = StyleSheet.flatten([
    styles.editInput,
    {
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radii.md,
      fontSize: theme.typography.scale.body,
    },
  ]);
  const footerRowStyle = StyleSheet.flatten([styles.footerRow, { gap: theme.spacing.sm }]);
  const linkLabelStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
  };
  // Flag 4: neutral typography, not a warning color — no destructive token
  // exists in theme/tokens.ts, and this stays consistent with that choice.
  const deleteHeadingStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.title,
    fontWeight: '600' as const,
  };
  const promoteButtonStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.promoteButton,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const promoteLabelStyle = {
    color: theme.colors.onAccent,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
  };

  return (
    <View style={rowStyle}>
      {rowMode === 'picker' ? (
        <View style={chipsRowStyle}>
          {CATEGORY_ORDER.map((category) => {
            const selected = category === item.category;
            const optionStyle = StyleSheet.flatten([
              styles.tapTarget,
              styles.chip,
              {
                backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceElevated,
                borderRadius: theme.radii.pill,
              },
            ]);
            const optionLabelStyle = {
              color: selected ? theme.colors.onAccent : theme.colors.textPrimary,
              fontSize: theme.typography.scale.caption,
              fontWeight: '600' as const,
            };
            return (
              <Pressable
                key={category}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => selectCategory(category)}
                style={optionStyle}
              >
                <Text style={optionLabelStyle}>{t(`brainDump.category.${category}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={line1Style}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setRowMode('picker')}
            style={collapsedChipStyle}
          >
            <Text style={collapsedChipLabelStyle}>{t(`brainDump.category.${item.category}`)}</Text>
          </Pressable>
          {item.promotedTaskId !== undefined && (
            <Text style={markerStyle}>{t('brainDump.item.promotedMarker')}</Text>
          )}
        </View>
      )}

      {rowMode === 'edit' ? (
        <TextInput
          testID={`edit-input-${item.id}`}
          value={editText}
          onChangeText={setEditText}
          multiline
          style={editInputStyle}
        />
      ) : (
        <Text style={textStyle}>{item.text}</Text>
      )}

      {rowMode === 'edit' ? (
        <View style={footerRowStyle}>
          <Pressable accessibilityRole="button" onPress={confirmEdit} style={styles.tapTarget}>
            <Text style={linkLabelStyle}>{t('brainDump.item.editDone')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={cancelEdit} style={styles.tapTarget}>
            <Text style={linkLabelStyle}>{t('brainDump.item.editCancel')}</Text>
          </Pressable>
        </View>
      ) : rowMode === 'delete' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={deleteHeadingStyle}>{t('brainDump.item.deleteConfirm.heading')}</Text>
          {/* UAT-05-01 (applies here too): confirm/cancel as pill chips so
              they read as tappable choices — affordance without alarm, no
              danger color (shame-free). */}
          <View style={footerRowStyle}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={confirmDelete}
              style={StyleSheet.flatten([
                styles.tapTarget,
                styles.chip,
                { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
              ])}
            >
              <Text
                style={{
                  color: theme.colors.onAccent,
                  fontSize: theme.typography.scale.caption,
                  fontWeight: '600' as const,
                }}
              >
                {t('brainDump.item.deleteConfirm.confirm')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setRowMode('idle')}
              style={StyleSheet.flatten([
                styles.tapTarget,
                styles.chip,
                { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.pill },
              ])}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.scale.caption,
                  fontWeight: '600' as const,
                }}
              >
                {t('brainDump.item.deleteConfirm.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={footerRowStyle}>
          <Pressable accessibilityRole="button" onPress={enterEdit} style={styles.tapTarget}>
            <Text style={linkLabelStyle}>{t('brainDump.item.edit')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setRowMode('delete')} style={styles.tapTarget}>
            <Text style={linkLabelStyle}>{t('brainDump.item.delete')}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            testID={`promote-${item.id}`}
            accessibilityRole="button"
            onPress={handlePromote}
            style={promoteButtonStyle}
          >
            <Text style={promoteLabelStyle}>{t('brainDump.item.promote')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ListPhase({
  items,
  onCapture,
  onItemsChanged,
}: {
  items: DumpItem[];
  onCapture: () => void;
  onItemsChanged: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const captureCardStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.captureCard,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.lg },
  ]);
  const captureCardLabelStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };
  const captureCardSubcopyStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const sectionHeaderStyle = StyleSheet.flatten([
    styles.sectionHeader,
    { color: theme.colors.textSecondary, fontSize: theme.typography.scale.caption },
  ]);

  const sections = groupByCategory(items);

  return (
    <SectionList
      sections={sections}
      // Belt-and-suspenders for VirtualizedList's cell-update semantics: a
      // new items array always forces cell re-evaluation, independent of the
      // memory-first repo fix (device UAT 2026-07-05).
      extraData={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ gap: theme.spacing.sm }}
      ListHeaderComponent={
        <View style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <Text style={titleStyle}>{t('brainDump.title')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onCapture}
            style={captureCardStyle}
          >
            <Text style={captureCardLabelStyle}>{t('brainDump.list.captureAffordance')}</Text>
            <Text style={captureCardSubcopyStyle}>{t('brainDump.list.captureAffordanceSub')}</Text>
          </Pressable>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text style={sectionHeaderStyle}>{t(`brainDump.category.${section.title}`)}</Text>
      )}
      renderItem={({ item }) => <DumpItemRow item={item} onChange={onItemsChanged} />}
    />
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heading: {
    fontWeight: '600',
  },
  title: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    minHeight: 160,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tapTarget: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignSelf: 'flex-start',
  },
  micButton: {
    width: 64,
    height: 64,
    alignSelf: 'center',
  },
  recordingPill: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  captureContainer: {
    flex: 1,
  },
  captureCard: {
    padding: 16,
    gap: 4,
    alignItems: 'flex-start',
  },
  sectionHeader: {
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingVertical: 8,
  },
  itemRow: {
    padding: 16,
    marginBottom: 8,
  },
  line1: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
  },
  editInput: {
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
