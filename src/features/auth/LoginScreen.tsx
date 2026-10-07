import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, TextInput, View } from 'react-native';

import { env, loginDomains } from '@/core/config/env';
import { errorMessage } from '@/core/errors/errorMessage';
import { currentLanguage, setLanguage } from '@/core/i18n';
import { biometricKind, enableBiometric, isBiometricEnabled, readBiometricCredentials, type BiometricKind } from '@/core/session/biometric';
import { signIn } from '@/core/session/session';
import { kv, kvKeys } from '@/core/storage/kv';
import { images, WORDMARK_RATIO } from '@/shared/assets';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { HeaderBar, HeaderPillButton } from '@/shared/ui/HeaderBar';
import { EyeIcon, EyeSlashIcon, FingerprintIcon, GlobeIcon, LockIcon, ScanSmileyIcon, UserIcon } from '@/shared/ui/icons';
import { ScreenShell, useHeaderColors } from '@/shared/ui/ScreenShell';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { toast } from '@/shared/ui/Toast';

import { loginSchema, type LoginForm } from './loginSchema';

export function LoginScreen() {
  const { t } = useTranslation();
  const { fg, sub } = useHeaderColors();
  const passwordRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [biometric, setBiometric] = useState<BiometricKind>('none');
  const [busy, setBusy] = useState(false);

  const { control, handleSubmit, setValue, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      domain: kv.getString(kvKeys.lastDomain) ?? loginDomains[0],
      username: kv.getString(kvKeys.lastUsername) ?? '',
      password: '',
    },
  });
  const domain = useWatch({ control, name: 'domain' });

  useEffect(() => {
    void biometricKind().then(setBiometric);
  }, []);

  const finishSignIn = async (values: LoginForm, offerBiometric: boolean) => {
    setSubmitError(null);
    setBusy(true);
    try {
      const { failed } = await signIn(values);
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

  const fieldError = (key?: string) => (key ? t(key as 'validation.required', { max: 100 }) : undefined);

  const header = (
    <>
      <HeaderBar
        leading="none"
        right={<HeaderPillButton testID="login-language" icon={GlobeIcon} caret label={t('auth.language')} onPress={() => setLanguage(currentLanguage() === 'vi' ? 'en' : 'vi')} />}
      />
      <View className="gap-2.5 px-3 pt-6">
        <Image
          source={images.wordmark}
          style={{ height: 22, width: 22 * WORDMARK_RATIO }}
          contentFit="contain"
          accessibilityRole="image"
          accessibilityLabel="THACO"
          accessibilityIgnoresInvertColors
        />
        <Text weight="bold" accessibilityRole="header" className="mt-3.5" style={{ fontSize: 28, lineHeight: 34, color: fg }}>
          {t('auth.title')}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: sub }}>{t('auth.subtitle')}</Text>
      </View>
    </>
  );

  return (
    <ScreenShell header={header} sheetBg="surface" headerBottom={28}>
      <TextField
        testID="login-domain"
        filled
        label={t('auth.domain')}
        mono={!!domain}
        value={domain || t('auth.domainNone')}
        onPress={() => setDomainOpen(true)}
      />
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
            onSubmitEditing={handleSubmit((values) => finishSignIn(values, true))}
            error={fieldError(formState.errors.password?.message)}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={10}
              >
                <Icon icon={showPassword ? EyeSlashIcon : EyeIcon} size={20} color="subtle" />
              </Pressable>
            }
          />
        )}
      />
      <Pressable accessibilityRole="link" className="self-end py-1" hitSlop={8} onPress={() => Alert.alert(t('auth.forgotTitle'), t('auth.forgotMessage'))}>
        <Text weight="semibold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
          {t('auth.forgot')}
        </Text>
      </Pressable>

      {submitError ? (
        <Banner tone="danger" testID="login-error">
          {submitError}
        </Banner>
      ) : null}

      <View className="mt-1 flex-row gap-2.5">
        <Button
          testID="login-submit"
          className="flex-1"
          label={busy ? t('auth.signingIn') : t('auth.submit')}
          loading={busy}
          onPress={handleSubmit((values) => finishSignIn(values, true))}
        />
        {biometric !== 'none' ? (
          <Pressable
            testID="login-biometric"
            accessibilityRole="button"
            accessibilityLabel={biometric === 'face' ? t('auth.biometricFace') : t('auth.biometricFinger')}
            onPress={onBiometric}
            disabled={busy}
            className="h-[50px] w-[50px] items-center justify-center rounded-button bg-icon-ring active:opacity-70"
          >
            <Icon icon={biometric === 'face' ? ScanSmileyIcon : FingerprintIcon} size={24} color="primary-tint-text" />
          </Pressable>
        ) : null}
      </View>

      <View className="mt-7 items-center gap-1.5">
        <Text className="text-muted" style={{ fontSize: 12.5, lineHeight: 17 }}>
          {`${t('auth.needHelp')} `}
          <Text
            weight="bold"
            className="text-primary"
            style={{ fontSize: 12.5 }}
            accessibilityRole="link"
            onPress={() => (env.itSupportPhone ? void Linking.openURL(`tel:${env.itSupportPhone}`) : Alert.alert(t('auth.contactIt'), t('auth.contactItMessage')))}
          >
            {t('auth.contactIt')}
          </Text>
        </Text>
        <Text mono className="text-subtle" style={{ fontSize: 11, lineHeight: 15 }}>
          {t('auth.version', { version: env.appVersion })}
        </Text>
      </View>

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
    </ScreenShell>
  );
}
