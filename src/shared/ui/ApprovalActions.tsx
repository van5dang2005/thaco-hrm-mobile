import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from './Button';
import { CheckIcon, XIcon } from './icons';

type Props = {
  onDetail: () => void;
  onReject: () => void;
  onApprove: () => void;
  /** Defaults to "Duyệt". */
  approveLabel?: string;
  /** Disables both decisions while a request runs. */
  busy?: boolean;
  testID?: string;
};

/**
 * Footer of an approval card (design 5a): a #EEF2F6 rule, then "Chi tiết ›" on the left and
 * "✕ Từ chối" (danger outline) + "✓ Duyệt" (success, ≥112 wide) on the right, all 44 tall.
 */
export function ApprovalActions({ onDetail, onReject, onApprove, approveLabel, busy, testID }: Props) {
  const { t } = useTranslation();
  return (
    <View testID={testID} className="flex-row items-center gap-2 border-t border-line-2 pt-3">
      <Button testID={testID ? `${testID}-detail` : undefined} variant="link" size="md" label={t('common.detail')} onPress={onDetail} className="mr-auto" />
      <Button
        testID={testID ? `${testID}-reject` : undefined}
        variant="danger-outline"
        size="md"
        icon={XIcon}
        label={t('approvals.reject')}
        disabled={busy}
        onPress={onReject}
      />
      <Button
        testID={testID ? `${testID}-approve` : undefined}
        variant="success"
        size="md"
        icon={CheckIcon}
        label={approveLabel ?? t('approvals.approve')}
        disabled={busy}
        onPress={onApprove}
        className="min-w-[112px] px-[18px]"
      />
    </View>
  );
}
