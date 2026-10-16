import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { cn } from '@/shared/lib/cn';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Divider } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, LockIcon, PlusIcon, SearchIcon, Share2Icon, XIcon } from '@/shared/ui/icons';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { toast } from '@/shared/ui/Toast';

import { useDocumentPeople } from '../hooks/useDocumentPeople';
import { useSharedActions } from '../hooks/useSharedActions';
import type { DocPerson, ShareGrant, SharedDoc, SharePermissions } from '../types';
import { matchesQuery } from '../utils/text';
import { DEFAULT_GRANT, grantable, grantedList, isLocked, normalize, PERMISSIONS, toggleGrant, type Permission } from '../utils/sharing';
import { DocPersonLine } from './DocPersonLine';

const MAX_RESULTS = 8;

function matches(person: DocPerson, query: string) {
  return matchesQuery(query, person.name, person.code, person.unit, person.position);
}

/**
 * "Chia sẻ tiếp" (8i): pick colleagues and give each Xem / Tải / Chia sẻ within what I hold myself; people who
 * already have the document are listed read-only ("Giữ nguyên").
 */
export function ShareSheet({ doc, meId, visible, onClose }: { doc: SharedDoc; meId: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const people = useDocumentPeople(visible);
  const { share } = useSharedActions();
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<ShareGrant[]>([]);
  const mine = grantable(doc.quyen);
  const rights = grantedList(mine).map((key) => t(`documents.perm.${key}`)).join(', ');

  const taken = useMemo(() => new Set([meId, ...doc.daChiaSe.map((g) => g.person.id), ...added.map((g) => g.person.id)]), [meId, doc.daChiaSe, added]);
  const results = query.trim() ? (people.data ?? []).filter((p) => !taken.has(p.id) && matches(p, query)).slice(0, MAX_RESULTS) : [];

  const add = (person: DocPerson) => {
    setAdded((list) => [...list, { person, quyen: normalize({ ...DEFAULT_GRANT, xem: mine.xem }) }]);
    setQuery('');
    // Back to the whole sheet: the new row and its permissions sit under the keyboard otherwise.
    Keyboard.dismiss();
  };
  const toggle = (personId: string, key: Permission) =>
    setAdded((list) => list.map((g) => (g.person.id === personId ? { ...g, quyen: toggleGrant(g.quyen, key, doc.quyen) } : g)));
  const remove = (personId: string) => setAdded((list) => list.filter((g) => g.person.id !== personId));

  const close = () => {
    setAdded([]);
    setQuery('');
    onClose();
  };

  const submit = () =>
    share.mutate(
      { id: doc.id, grants: added },
      {
        onSuccess: () => {
          toast.success(t('documents.share.done', { count: added.length }));
          close();
        },
        onError: (error) => toast.error(errorMessage(error, t)),
      },
    );

  return (
    <BottomSheet
      testID="share-sheet"
      visible={visible}
      onClose={share.isPending ? () => undefined : close}
      icon={Share2Icon}
      iconTone="brand"
      title={t('documents.share.title')}
      subtitle={t('documents.share.subtitle', { soHieu: doc.soHieu, rights })}
      scrollable
      footer={
        <Button
          testID="share-submit"
          icon={Share2Icon}
          label={added.length ? t('documents.share.submit', { count: added.length }) : t('documents.share.submitNone')}
          disabled={!added.length}
          loading={share.isPending}
          onPress={submit}
        />
      }
    >
      <TextField testID="share-search" leftIcon={SearchIcon} value={query} onChangeText={setQuery} placeholder={t('documents.share.search')} autoCorrect={false} returnKeyType="search" />

      {!mine.tai ? (
        <Banner tone="info" testID="share-no-download">
          {t('documents.share.noDownload')}
        </Banner>
      ) : null}

      {query.trim() ? (
        <View className="rounded-[16px] bg-panel px-3 py-1">
          {people.isLoading ? (
            <View className="gap-2 py-3">
              <Skeleton height={36} />
              <Skeleton height={36} />
            </View>
          ) : results.length ? (
            results.map((person, i) => (
              <View key={person.id}>
                {i > 0 ? <Divider inset={48} /> : null}
                <Pressable testID={`share-pick-${person.code}`} accessibilityRole="button" accessibilityLabel={t('documents.share.add', { name: person.name })} onPress={() => add(person)} className="py-1.5 active:opacity-70">
                  <DocPersonLine person={person} trailing={<Icon icon={PlusIcon} size={18} color="primary" weight="bold" />} />
                </Pressable>
              </View>
            ))
          ) : (
            <Text className="py-3 text-center text-muted" style={{ fontSize: 13, lineHeight: 18 }}>
              {t('documents.noPeople')}
            </Text>
          )}
        </View>
      ) : null}

      <View className="gap-2">
        <Text weight="semibold" style={{ fontSize: 13.5, lineHeight: 18 }}>
          {t('documents.share.added', { count: added.length })}
        </Text>
        {added.length ? (
          added.map((grant) => (
            <View key={grant.person.id} className="gap-2.5 rounded-[16px] border border-line p-3" testID={`share-added-${grant.person.code}`}>
              <DocPersonLine
                person={grant.person}
                trailing={
                  <Pressable accessibilityRole="button" accessibilityLabel={t('documents.share.remove', { name: grant.person.name })} onPress={() => remove(grant.person.id)} hitSlop={8} className="h-11 w-11 items-center justify-center rounded-[12px] active:bg-panel">
                    <Icon icon={XIcon} size={16} weight="bold" color="muted" />
                  </Pressable>
                }
              />
              <View className="flex-row gap-2">
                {PERMISSIONS.map((key) => (
                  <PermissionToggle key={key} label={t(`documents.perm.${key}`)} on={grant.quyen[key]} locked={isLocked(grant.quyen, key, doc.quyen)} onPress={() => toggle(grant.person.id, key)} testID={`share-${grant.person.code}-${key}`} />
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text className="text-muted" style={{ fontSize: 13, lineHeight: 18 }}>
            {t('documents.share.addHint')}
          </Text>
        )}
      </View>

      {doc.daChiaSe.length ? (
        <View className="gap-1">
          <View className="flex-row items-baseline justify-between">
            <Text weight="semibold" style={{ fontSize: 13.5, lineHeight: 18 }}>
              {t('documents.share.existing', { count: doc.daChiaSe.length })}
            </Text>
            <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
              {t('documents.share.keep')}
            </Text>
          </View>
          {doc.daChiaSe.map((grant, i) => (
            <View key={grant.person.id}>
              {i > 0 ? <Divider inset={48} /> : null}
              <View className="py-1.5">
                <DocPersonLine
                  person={grant.person}
                  trailing={
                    <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
                      {permissionText(grant.quyen, t)}
                    </Text>
                  }
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </BottomSheet>
  );
}

function permissionText(p: SharePermissions, t: (key: `documents.perm.${Permission}`) => string) {
  return grantedList(p).map((key) => t(`documents.perm.${key}`)).join(' · ');
}

/** One permission switch of a recipient: on = primary tint + tick; locked (above my own rights, or view kept on) = grey with a lock. */
function PermissionToggle({ label, on, locked, onPress, testID }: { label: string; on: boolean; locked: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled: locked }}
      disabled={locked}
      onPress={onPress}
      className={cn(
        'h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-[12px]',
        on ? 'border-[1.5px] border-primary bg-primary-tint' : 'border border-input-border',
        locked && !on && 'border-0 bg-disabled',
      )}
    >
      <Icon icon={locked && !on ? LockIcon : on ? CheckIcon : PlusIcon} size={14} weight="bold" color={locked && !on ? 'disabled-text' : on ? 'primary-tint-text' : 'muted'} />
      <Text weight="semibold" className={locked && !on ? 'text-disabled-text' : on ? 'text-primary-tint-text' : 'text-ink-2'} style={{ fontSize: 13, lineHeight: 17 }}>
        {label}
      </Text>
    </Pressable>
  );
}
