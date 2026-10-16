import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { MessageSquareTextIcon, SendIcon } from '@/shared/ui/icons';
import { NoteField } from '@/shared/ui/NoteField';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { useIncomingActions } from '../hooks/useIncomingActions';
import type { IncomingDoc } from '../types';

const MAX = 500;

/** "Gửi ý kiến" of a phối hợp member to the chủ trì. */
export function OpinionSheet({ doc, meId, visible, onClose }: { doc: IncomingDoc; meId: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { sendOpinion } = useIncomingActions(meId);
  const [text, setText] = useState(doc.yKienCuaToi ?? '');

  const submit = () =>
    sendOpinion.mutate(
      { id: doc.id, yKien: text },
      {
        onSuccess: () => {
          toast.success(t('documents.opinion.sent'));
          onClose();
        },
        onError: (error) => toast.error(errorMessage(error, t)),
      },
    );

  return (
    <BottomSheet
      testID="opinion-sheet"
      visible={visible}
      onClose={onClose}
      icon={MessageSquareTextIcon}
      iconTone="brand"
      title={t('documents.opinion.title')}
      subtitle={t('documents.opinion.subtitle', { soDen: doc.soDen })}
      footer={<Button testID="opinion-submit" icon={SendIcon} label={t('documents.opinion.submit')} disabled={!text.trim()} loading={sendOpinion.isPending} onPress={submit} />}
    >
      <View className="gap-2">
        <View className="flex-row justify-end">
          <Text mono className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
            {`${text.length}/${MAX}`}
          </Text>
        </View>
        <NoteField testID="opinion-text" value={text} onChangeText={setText} maxLength={MAX} placeholder={t('documents.opinion.placeholder')} />
      </View>
    </BottomSheet>
  );
}
