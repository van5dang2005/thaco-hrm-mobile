import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, Switch, View } from 'react-native';

import { env } from '@/core/config/env';
import { setLanguage, type Language } from '@/core/i18n';
import { type BiometricKind, biometricKind, disableBiometric, isBiometricEnabled } from '@/core/session/biometric';
import { signOut } from '@/core/session/session';
import { useSessionStore } from '@/core/session/sessionStore';
import { useProfile } from '@/core/session/useMe';
import { useFontStore } from '@/core/theme/fontStore';
import { useTheme, type SchemePreference } from '@/core/theme/ThemeProvider';
import { HomeLayoutSheet } from '@/features/home/HomeLayoutSheet';
import { useHomePrefs } from '@/features/home/prefs';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { HeaderBar } from '@/shared/ui/HeaderBar';
import { HeaderPill } from '@/shared/ui/HeaderPill';
import { BuildingsIcon, CalendarDotsIcon, CircleHalfIcon, EnvelopeSimpleIcon, FingerprintIcon, MedalIcon, PackageIcon, PhoneIcon, ScanSmileyIcon, SignOutIcon, SquaresFourIcon, TextAaIcon, TranslateIcon, TreeStructureIcon } from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { ScreenShell, useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
import { Segmented } from '@/shared/ui/Segmented';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { FontSheet, useUiFontName } from './FontSheet';

/** Divider inset that lines up with row labels: padding 14 + icon 32 + gap 12. */
const ROW_INSET = 58;

function RowDivider() {
  return <View className="h-px bg-line-2" style={{ marginLeft: ROW_INSET }} />;
}

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference, colors } = useTheme();
  const { fg, sub } = useHeaderColors();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const connected = useSessionStore((s) => s.connected);
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled);
  const [biometric, setBiometric] = useState<BiometricKind>('none');
  const [refreshing, setRefreshing] = useState(false);
  const [fontSheet, setFontSheet] = useState(false);
  const [homeLayoutSheet, setHomeLayoutSheet] = useState(false);
  const homeLayout = useHomePrefs((s) => s.layout);
  const uiFont = useFontStore((s) => s.font);
  const fontName = useUiFontName();
  const language = (i18n.language === 'en' ? 'en' : 'vi') as Language;

  useEffect(() => {
    void biometricKind().then(setBiometric);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    setRefreshing(false);
  };

  const confirmSignOut = () =>
    Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);

  const biometricIcon = biometric === 'face' ? ScanSmileyIcon : FingerprintIcon;

  const header = (
    <>
      <HeaderBar title={t('profile.title')} leading="none" />
      <View className="flex-row items-center gap-3.5 px-3 pt-2">
        <View className="rounded-full border-[3px] border-white/90">
          <Avatar name={profile.fullname} uri={profile.avatarUrl} size={58} light />
        </View>
        <View className="min-w-0 flex-1 items-start gap-1">
          <Text weight="bold" numberOfLines={2} style={{ fontSize: 19, lineHeight: 24, color: fg }}>
            {profile.fullname ?? '—'}
          </Text>
          {profile.jobTitleName ? (
            <Text numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: sub }}>
              {profile.jobTitleName}
            </Text>
          ) : null}
          {profile.employeeCode ? <HeaderPill label={profile.employeeCode} /> : null}
        </View>
      </View>
    </>
  );

  return (
    <ScreenShell header={header} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Card>
        <InfoRow icon={BuildingsIcon} label={t('profile.department')} value={profile.departmentName ?? '—'} />
        <InfoRow divider icon={TreeStructureIcon} label={t('profile.unit')} value={profile.unitName ?? '—'} />
        <InfoRow divider icon={MedalIcon} label={t('profile.position')} value={profile.positionName ?? '—'} />
        <InfoRow divider icon={EnvelopeSimpleIcon} label={t('profile.email')} value={profile.email ?? '—'} />
        <InfoRow divider icon={PhoneIcon} label={t('profile.phone')} value={profile.phoneNumber || '—'} mono />
      </Card>

      <SectionTitle className="px-1 pt-1">{t('profile.settings')}</SectionTitle>
      <Card>
        <View className="gap-2.5 px-3.5 py-3">
          <View className="flex-row items-center gap-3">
            <RoundIcon icon={TranslateIcon} size={32} tone="wait" />
            <Text className="text-ink-2" style={{ fontSize: 14, lineHeight: 19 }}>{t('profile.language')}</Text>
          </View>
          <Segmented
            value={language}
            onChange={(value) => setLanguage(value)}
            options={[
              { value: 'vi', label: 'Tiếng Việt', testID: 'profile-lang-vi' },
              { value: 'en', label: 'English', testID: 'profile-lang-en' },
            ]}
          />
        </View>
        <RowDivider />
        <View className="gap-2.5 px-3.5 py-3">
          <View className="flex-row items-center gap-3">
            <RoundIcon icon={CircleHalfIcon} size={32} tone="wait" />
            <Text className="text-ink-2" style={{ fontSize: 14, lineHeight: 19 }}>{t('profile.appearance')}</Text>
          </View>
          <Segmented<SchemePreference>
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: t('profile.appearanceSystem') },
              { value: 'light', label: t('profile.appearanceLight') },
              { value: 'dark', label: t('profile.appearanceDark') },
            ]}
          />
        </View>
        <InfoRow divider testID="profile-font" icon={TextAaIcon} label={t('profile.font')} value={fontName(uiFont)} onPress={() => setFontSheet(true)} />
        <InfoRow
          divider
          testID="profile-home-layout"
          icon={SquaresFourIcon}
          label={t('home.layoutSheet.title')}
          value={t(`home.layouts.${homeLayout}.name`)}
          onPress={() => setHomeLayoutSheet(true)}
        />
        {biometric !== 'none' ? (
          <>
            <RowDivider />
            <View className="min-h-[48px] flex-row items-center gap-3 px-3.5 py-3">
              <RoundIcon icon={biometricIcon} size={32} tone="wait" />
              <View className="flex-1 gap-0.5">
                <Text className="text-ink-2" style={{ fontSize: 14, lineHeight: 19 }}>{t('profile.biometric')}</Text>
                <Text className="text-meta text-muted">{biometricOn ? t('profile.biometricOnHint') : t('profile.biometricOffHint')}</Text>
              </View>
              <Switch
                value={biometricOn}
                disabled={!biometricOn}
                onValueChange={(value) => {
                  if (!value) {
                    void disableBiometric();
                    setBiometricOn(false);
                  }
                }}
                trackColor={{ true: colors.primary, false: colors.track }}
                thumbColor="#FFFFFF"
                accessibilityLabel={t('profile.biometric')}
              />
            </View>
          </>
        ) : null}
      </Card>

      <SectionTitle className="px-1 pt-1">{t('profile.services')}</SectionTitle>
      <Card>
        {(['room', 'parcel'] as const).map((service, index) => (
          <InfoRow
            key={service}
            divider={index > 0}
            icon={service === 'room' ? CalendarDotsIcon : PackageIcon}
            iconTone={!connected[service] ? 'off' : service === 'room' ? 'wait' : 'ok'}
            label={t(`services.${service}`)}
            value={
              <StatusBadge
                kind={connected[service] ? 'ok' : 'off'}
                label={connected[service] ? t('profile.connected') : t('profile.disconnected')}
              />
            }
          />
        ))}
      </Card>

      <Button testID="profile-signout" className="mt-2" variant="danger" icon={SignOutIcon} label={t('profile.signOut')} onPress={confirmSignOut} />
      <Text mono className="text-center text-subtle" style={{ fontSize: 11, lineHeight: 15 }}>
        {t('profile.version', { version: env.appVersion })}
      </Text>
      <FontSheet visible={fontSheet} onClose={() => setFontSheet(false)} />
      <HomeLayoutSheet visible={homeLayoutSheet} onClose={() => setHomeLayoutSheet(false)} />
    </ScreenShell>
  );
}
