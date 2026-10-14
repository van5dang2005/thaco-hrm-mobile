import { StackActions } from '@react-navigation/native';
import { router, useNavigation, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useBookingDraft } from '../store/draftStore';

export type WizardStep = 'index' | 'time' | 'details' | 'confirm';

const hrefs: Record<WizardStep, Href> = {
  index: '/rooms/book',
  time: '/rooms/book/time',
  details: '/rooms/book/details',
  confirm: '/rooms/book/confirm',
};

/**
 * Jump to an earlier step. "Đặt nhanh" from the room calendar enters at B3, so B1/B2 may not be in
 * the stack: then the wizard restarts from that step instead of stacking a second copy of B3.
 */
export function useGoToStep() {
  const navigation = useNavigation();
  return (step: WizardStep) => {
    const inStack = navigation.getState()?.routes.some((r) => r.name === step);
    if (inStack) {
      router.dismissTo(hrefs[step]);
      return;
    }
    // Pop to the first wizard screen of this stack only (dismissAll would also pop the screen that
    // opened the wizard), then swap it for the wanted step.
    const routes = navigation.getState()?.routes.length ?? 1;
    if (routes > 1) navigation.dispatch(StackActions.popToTop());
    router.replace(hrefs[step]);
  };
}

/** Leaving the wizard from its first screen: confirm when something was typed or an edit is open. */
export function useLeaveWizard() {
  const { t } = useTranslation();
  const draft = useBookingDraft((s) => s.draft);
  const reset = useBookingDraft((s) => s.reset);
  const dirty = draft.mode === 'edit' || !!draft.content.trim() || draft.participants.length > 0 || draft.files.length > 0 || draft.links.length > 0;
  return () => {
    const leave = () => {
      reset();
      if (router.canGoBack()) router.back();
      else router.replace('/rooms');
    };
    if (!dirty) return leave();
    Alert.alert(t('booking.discardTitle'), t('booking.discardMessage'), [
      { text: t('booking.keepEditing'), style: 'cancel' },
      { text: t('booking.discard'), style: 'destructive', onPress: leave },
    ]);
  };
}
