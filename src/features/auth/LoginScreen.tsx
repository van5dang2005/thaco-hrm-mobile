import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env, loginDomains } from '@/core/config/env';
import { errorMessage } from '@/core/errors/errorMessage';
import { currentLanguage, setLanguage } from '@/core/i18n';
import { biometricKind, enableBiometric, isBiometricEnabled, readBiometricCredentials, type BiometricKind } from '@/core/session/biometric';
import { signIn } from '@/core/session/session';
import { kv, kvKeys } from '@/core/storage/kv';
import { useTheme } from '@/core/theme/ThemeProvider';
import { images, WORDMARK_RATIO } from '@/shared/assets';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import {
  type AppIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleQuestionMarkIcon,
  DoorOpenIcon,
  EyeIcon,
  EyeOffIcon,
  FingerprintPatternIcon,
  GlobeIcon,
  LockIcon,
  PackageIcon,
  ScanFaceIcon,
  ServerIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from '@/shared/ui/icons';
import { onBlue, useHeaderColors } from '@/shared/ui/ScreenShell';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { shadows } from '@/shared/ui/shadows';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { toast } from '@/shared/ui/Toast';

import { LoginHeaderArt } from './LoginHeaderArt';
import { loginSchema, type LoginForm } from './loginSchema';

/** "Ghi nhớ đăng nhập" is on unless the user turned it off. */
const rememberedByDefault = () => kv.getBoolean(kvKeys.rememberLogin) !== false;

/** Đăng nhập (6a): blue header with the portal title, a white form card over it, a security note and the footer. */
export function LoginScreen() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const { bg, fg, text3 } = useHeaderColors();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [biometric, setBiometric] = useState<BiometricKind>('none');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(rememberedByDefault);

  const { control, handleSubmit, setValue, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      domain: kv.getString(kvKeys.lastDomain) ?? loginDomains[0],
      username: rememberedByDefault() ? (kv.getString(kvKeys.rememberedUsername) ?? kv.getString(kvKeys.lastUsername) ?? '') : '',
      password: '',
    },
  });
  const domain = useWatch({ control, name: 'domain' });

  useEffect(() => {
    void biometricKind().then(setBiometric);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(scheme === 'dark' ? 'light' : 'dark');
    }, [scheme]),
  );

  const finishSignIn = async (values: LoginForm, offerBiometric: boolean) => {
    setSubmitError(null);
    setBusy(true);
    try {
      const { failed } = await signIn(values);
      kv.set(kvKeys.rememberLogin, remember);
      if (remember) kv.set(kvKeys.rememberedUsername, values.username.trim());
      else kv.remove(kvKeys.rememberedUsername);
      failed.forEach(({ service }) => toast.info(t('auth.partial', { service: t(`services.${service}`) })));
      if (offerBiometric && biometric !== 'none' && !isBiometricEnabled()) {
        Alert.alert(t('auth.enableBiometricTitle'), t('auth.enableBiometricMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('auth.enableBiometricAccept'), onPress: () => void enableBiometric(values, t('auth.biometricPrompt')).catch(() => undefined) },
        ]);
      }
    } catch (error) {
      setSubmitError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const onBiometric = async () => {
    if (!isBiometricEnabled()) {
      Alert.alert(t('auth.title'), t('auth.biometricUnavailable'));
      return;
    }
    try {
      const credentials = await readBiometricCredentials(t('auth.biometricPrompt'));
      if (credentials) await finishSignIn(credentials, false);
    } catch {
      // User cancelled the biometric prompt.
    }
  };

  const contactIt = () => (env.itSupportPhone ? void Linking.openURL(`tel:${env.itSupportPhone}`) : Alert.alert(t('auth.contactIt'), t('auth.contactItMessage')));
  const fieldError = (key?: string) => (key ? t(key as 'validation.required', { max: 100 }) : undefined);
  const submit = handleSubmit((values) => finishSignIn(values, true));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) }} bounces={false}>
        {/* Header */}
        <View className="overflow-hidden" style={{ backgroundColor: bg, paddingTop: insets.top + 14, paddingHorizontal: 22, paddingBottom: 96 }}>
          <LoginHeaderArt />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3" accessibilityRole="header" accessibilityLabel="THACO HRM">
              <Image source={images.wordmark} style={{ height: 20, width: 20 * WORDMARK_RATIO }} contentFit="contain" accessibilityIgnoresInvertColors />
              <View className="h-4 w-px" style={{ backgroundColor: onBlue(0.35) }} />
              <Text weight="bold" style={{ fontSize: 12, lineHeight: 15, letterSpacing: 1.7, color: '#CFE0F1' }}>
                HRM
              </Text>
            </View>
            <Pressable
              testID="login-language"
              accessibilityRole="button"
              accessibilityLabel={t('auth.language')}
              onPress={() => setLanguage(currentLanguage() === 'vi' ? 'en' : 'vi')}
              hitSlop={6}
              className="h-[34px] flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70"
              style={{ backgroundColor: onBlue(0.14), borderWidth: 1, borderColor: onBlue(0.18) }}
            >
              <Icon icon={GlobeIcon} size={15} rawColor={fg} />
              <Text weight="bold" style={{ fontSize: 12.5, lineHeight: 16, color: fg }}>
                {t('auth.languageShort')}
              </Text>
              <Icon icon={ChevronDownIcon} size={13} weight="bold" rawColor={fg} />
            </Pressable>
          </View>

          <Text weight="semibold" className="mt-10" style={{ fontSize: 13, lineHeight: 17, color: text3 }}>
            {t('auth.portal')}
          </Text>
          <Text weight="bold" accessibilityRole="header" className="mt-2" style={{ fontSize: 34, lineHeight: 41, letterSpacing: -0.8, color: fg }}>
            {t('auth.headline')}
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <HeaderChip icon={DoorOpenIcon} label={t('auth.chips.rooms')} />
            <HeaderChip icon={PackageIcon} label={t('auth.chips.parcels')} />
            <HeaderChip icon={UsersIcon} label={t('auth.chips.hr')} />
          </View>
        </View>

        {/* Form card */}
        <View className="mx-4 gap-3.5 rounded-[24px] bg-elevated p-[18px]" style={[shadows.card, { marginTop: -62 }]}>
          <Pressable
            testID="login-domain"
            accessibilityRole="button"
            accessibilityLabel={`${t('auth.domain')}: ${domain || t('auth.domainNone')}. ${t('auth.change')}`}
            onPress={() => setDomainOpen(true)}
            className="min-h-[56px] flex-row items-center gap-3 rounded-[14px] bg-panel px-3 active:opacity-80"
          >
            <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-elevated">
              <Icon icon={ServerIcon} size={16} color="ink-2" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-muted" style={{ fontSize: 11, lineHeight: 14 }}>
                {t('auth.domain')}
              </Text>
              <Text mono={!!domain} weight="medium" numberOfLines={1} className="text-ink" style={{ fontSize: 14, lineHeight: 19 }}>
                {domain || t('auth.domainNone')}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text weight="semibold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
                {t('auth.change')}
              </Text>
              <Icon icon={ChevronDownIcon} size={14} weight="bold" color="primary" />
            </View>
          </Pressable>

          <Controller
            control={control}
            name="username"
            render={({ field }) => (
              <TextField
                testID="login-username"
                filled
                leftIcon={UserIcon}
                label={t('auth.username')}
                placeholder={domain ? t('auth.usernamePlaceholder') : t('auth.employeeCodePlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={fieldError(formState.errors.username?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                ref={passwordRef}
                testID="login-password"
                filled
                leftIcon={LockIcon}
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={submit}
                error={fieldError(formState.errors.password?.message)}
                right={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                  >
                    <Icon icon={showPassword ? EyeOffIcon : EyeIcon} size={20} color="subtle" />
                  </Pressable>
                }
              />
            )}
          />

          <View className="flex-row items-center justify-between">
            <Pressable
              testID="login-remember"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: remember }}
              onPress={() => setRemember((v) => !v)}
              hitSlop={8}
              className="min-h-[36px] flex-row items-center gap-2 active:opacity-70"
            >
              <View
                className="h-5 w-5 items-center justify-center rounded-[6px]"
                style={remember ? { backgroundColor: colors.primary } : { borderWidth: 1.5, borderColor: colors['line-strong'], backgroundColor: colors.elevated }}
              >
                {remember ? <Icon icon={CheckIcon} size={13} weight="bold" color="on-primary" /> : null}
              </View>
              <Text className="text-ink-2" style={{ fontSize: 13, lineHeight: 17 }}>
                {t('auth.remember')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => Alert.alert(t('auth.forgotTitle'), t('auth.forgotMessage'))} className="active:opacity-60">
              <Text weight="semibold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
                {t('auth.forgot')}
              </Text>
            </Pressable>
          </View>

          {submitError ? (
            <Banner tone="danger" testID="login-error">
              {submitError}
            </Banner>
          ) : null}

          <View className="flex-row gap-2.5">
            <Button
              testID="login-submit"
              className="h-[54px] flex-1"
              label={busy ? t('auth.signingIn') : t('auth.submit')}
              loading={busy}
              onPress={submit}
              trailing={busy ? undefined : <Icon icon={ArrowRightIcon} size={18} weight="bold" color="on-primary" />}
            />
            {biometric !== 'none' ? (
              <Pressable
                testID="login-biometric"
                accessibilityRole="button"
                accessibilityLabel={biometric === 'face' ? t('auth.biometricFace') : t('auth.biometricFinger')}
                onPress={onBiometric}
                className="h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-elevated active:opacity-70"
                style={{ borderWidth: 1.5, borderColor: colors['input-border'] }}
              >
                <Icon icon={biometric === 'face' ? ScanFaceIcon : FingerprintPatternIcon} size={24} color="primary" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Security note */}
        <View className="mx-4 mt-3 flex-row items-start gap-3 rounded-[16px] bg-elevated p-3">
          <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-success-tint">
            <Icon icon={ShieldCheckIcon} size={16} color="success" />
          </View>
          <Text className="flex-1 text-ink-2" style={{ fontSize: 12.5, lineHeight: 18 }}>
            {t('auth.securityNote')}
          </Text>
        </View>

        {/* Footer */}
        <View className="mt-auto flex-row items-center justify-between px-5 pt-8">
          <Text mono className="text-subtle" style={{ fontSize: 11, lineHeight: 15 }}>
            {t('auth.footer', { version: env.appVersion, year: new Date().getFullYear() })}
          </Text>
          <Pressable testID="login-it-support" accessibilityRole="link" onPress={contactIt} hitSlop={8} className="flex-row items-center gap-1 active:opacity-60">
            <Icon icon={CircleQuestionMarkIcon} size={15} color="primary" />
            <Text weight="semibold" className="text-primary" style={{ fontSize: 12.5, lineHeight: 16 }}>
              {t('auth.itSupport')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SelectSheet
        testID="login-domain-sheet"
        visible={domainOpen}
        onClose={() => setDomainOpen(false)}
        title={t('auth.chooseDomain')}
        mono
        value={domain}
        options={loginDomains.map((value) => ({ value, label: value ? `@${value}` : t('auth.domainNone') }))}
        onSelect={(value) => setValue('domain', value)}
      />
    </KeyboardAvoidingView>
  );
}

/** Module chip on the header: Phòng họp · Bưu phẩm · Nhân sự. */
function HeaderChip({ icon, label }: { icon: AppIcon; label: string }) {
  const { soft } = useHeaderColors();
  return (
    <View className="h-[30px] flex-row items-center gap-1.5 rounded-[10px] px-2.5" style={{ backgroundColor: onBlue(0.08), borderWidth: 1, borderColor: onBlue(0.18) }}>
      <Icon icon={icon} size={13} rawColor={soft} />
      <Text weight="semibold" style={{ fontSize: 12, lineHeight: 15, color: soft }}>
        {label}
      </Text>
    </View>
  );
}
