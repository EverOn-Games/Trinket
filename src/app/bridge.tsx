/**
 * Standalone Bridge route (MECH-02, v0.2 spec §4: "also reachable on its own
 * when the user feels stuck between tasks"). The user summoned it, so there
 * is no offer stage — the ritual starts directly. An item pick rides the
 * existing gate-aware dumpItemId promote param into the co-pilot screen
 * (T-04-05 path), so the freemium gate stays an offer here too.
 */
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { BridgeRitual } from '@/features/bridge/BridgeRitual';
import { track } from '../analytics/analytics';
import type { DumpItem } from '../../data/types';

export default function BridgeScreen() {
  const router = useRouter();

  // Standalone nextAction:'session' records the chosen handoff — the actual
  // start (and the gate) happens in co-pilot via the promote param, exactly
  // like a brain-dump promote tap.
  const handlePickItem = (item: DumpItem) => {
    track('bridge_next', { nextAction: 'session' });
    router.replace({ pathname: '/co-pilot', params: { dumpItemId: item.id } });
  };

  const handleStarter = () => {
    track('bridge_next', { nextAction: 'starter' });
    router.replace('/starter');
  };

  const handleClose = () => {
    track('bridge_next', { nextAction: 'none' });
    router.back();
  };

  return (
    <Screen>
      <BridgeRitual onPickItem={handlePickItem} onStarter={handleStarter} onClose={handleClose} />
    </Screen>
  );
}
