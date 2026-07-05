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
 * DUMP-05 (≤2 taps from anywhere): unaffected by this rewrite — Home's own
 * `<Link href="/brain-dump">` (src/app/index.tsx) is untouched.
 */
import { useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { parseDumpText } from '@/features/brain-dump/parseDumpText';
import { classify } from '@/features/brain-dump/classify';
import { useTheme } from '../../theme';
import { dumpItemsRepo } from '../../data/repositories/dumpItems';
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

export default function BrainDumpScreen() {
  const { i18n } = useTranslation();

  // D-12: read directly in render, no local mirror of repo data — matches
  // co-pilot.tsx's SetupPhase `dumpItemsRepo.list()` precedent.
  const items = dumpItemsRepo.list();

  const [viewPhase, setViewPhase] = useState<'capture' | 'list'>(() =>
    items.length > 0 ? 'list' : 'capture'
  );
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
  };

  // D-12: zero items always routes to capture, whether that's the very
  // first load or (in a future plan) the moment the last item is removed.
  const showList = viewPhase === 'list' && items.length > 0;

  return (
    <Screen>
      {showList ? (
        <ListPhase items={items} onCapture={enterCapture} />
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
  const { t } = useTranslation();
  const theme = useTheme();

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
  const saveButtonStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.saveButton,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const saveLabelStyle = {
    color: theme.colors.background,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };

  const containerStyle = StyleSheet.flatten([styles.captureContainer, { gap: theme.spacing.lg }]);

  return (
    <View style={containerStyle}>
      <Text style={kickerStyle}>{t('brainDump.title')}</Text>

      <View style={{ gap: theme.spacing.sm }}>
        <Text style={headingStyle}>{t('brainDump.capture.prompt.idle')}</Text>
        <Text style={subcopyStyle}>{t('brainDump.capture.prompt.idleSub')}</Text>
      </View>

      <TextInput
        testID="brain-dump-input"
        value={draftText}
        onChangeText={onChangeText}
        placeholder={t('brainDump.capture.placeholder')}
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        textAlignVertical="top"
        style={inputStyle}
      />

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

function DumpItemRow({ item }: { item: DumpItem }) {
  const theme = useTheme();

  const rowStyle = StyleSheet.flatten([
    styles.itemRow,
    { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md },
  ]);
  const textStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };

  return (
    <View style={rowStyle}>
      <Text style={textStyle}>{item.text}</Text>
    </View>
  );
}

function ListPhase({ items, onCapture }: { items: DumpItem[]; onCapture: () => void }) {
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
      renderItem={({ item }) => <DumpItemRow item={item} />}
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
});
