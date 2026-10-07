import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { setLanguage } from '@/core/i18n';
import { useTheme } from '@/core/theme/ThemeProvider';
import { Avatar, AvatarStack } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FilterChip } from '@/shared/ui/Chip';
import { HeaderBar, HeaderIconButton, HeaderPillButton } from '@/shared/ui/HeaderBar';
import { HeaderChips } from '@/shared/ui/HeaderChips';
import { HeaderPanel } from '@/shared/ui/HeaderPanel';
import { HeaderPill, useHeaderDot } from '@/shared/ui/HeaderPill';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { HeaderStat, HeaderStatRow } from '@/shared/ui/HeaderStat';
import {
  BellIcon,
  CheckIcon,
  CoffeeIcon,
  DoorOpenIcon,
  FunnelSimpleIcon,
  PackageIcon,
  PaperclipIcon,
  PencilSimpleIcon,
  PlusIcon,
  SealCheckIcon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { KeyValueRow } from '@/shared/ui/KeyValueRow';
import { NoteField } from '@/shared/ui/NoteField';
import { NumberStepper } from '@/shared/ui/NumberStepper';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RoundIcon, type RoundIconTone } from '@/shared/ui/RoundIcon';
import { ScreenShell } from '@/shared/ui/ScreenShell';
import { Eyebrow, GroupTitle, SectionTitle } from '@/shared/ui/SectionTitle';
import { BookingBadge, DelegationBadge, ParcelBadge, StatusBadge, Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

const tones: RoundIconTone[] = ['brand', 'wait', 'warn', 'danger', 'ok', 'off', 'solid'];
const people = ['Trần Thu Hà', 'Nguyễn Minh Khoa', 'Lê Văn Nam', 'Phạm Hoàng Anh', 'Bùi Thanh Tùng', 'Võ Hồng Nhung'].map((name) => ({ name }));

/** Every shared component of the unified design on one screen (dev builds only). */
export function UiGalleryScreen() {
  const { scheme, preference, setPreference, colors } = useTheme();
  const { i18n } = useTranslation();
  const [segment, setSegment] = useState<'a' | 'b'>('a');
  const [chip, setChip] = useState('wait');
  const [count, setCount] = useState(8);
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const liveDot = useHeaderDot('live');
  const waitDot = useHeaderDot('wait');

  const header = (
    <>
      <HeaderBar
        title="UI kit · ScreenShell"
        right={
          <>
            <HeaderPillButton icon={UserCheckIcon} label="Pill" onPress={() => toast.info('HeaderPillButton')} />
            <HeaderIconButton icon={FunnelSimpleIcon} label="Filter" onPress={() => toast.info('HeaderIconButton')} />
          </>
        }
      />
      <View className="flex-row gap-1.5 px-3 pt-2">
        <HeaderPill label="Đang diễn ra" dotColor={liveDot} />
        <HeaderPill label="Chờ duyệt" dotColor={waitDot} />
        <HeaderPill label="Buổi 1/5 · Hằng tuần" />
      </View>
      <HeaderStatRow>
        <HeaderStat value={3} label="Đang chờ" />
        <HeaderStat value={1} label="Quá hạn" />
        <HeaderStat value={12} label="Đã nhận · T9" />
      </HeaderStatRow>
      <HeaderSegmented
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'a', label: 'Tôi ủy quyền' },
          { value: 'b', label: 'Được ủy quyền', badge: 1 },
        ]}
      />
      <HeaderChips
        value={chip}
        onChange={setChip}
        options={[
          { value: 'wait', label: 'Đang chờ' },
          { value: 'over', label: 'Quá hạn' },
          { value: 'done', label: 'Đã bàn giao' },
          { value: 'off', label: 'Đã hủy' },
        ]}
      />
      <HeaderPanel className="gap-2.5">
        <Text weight="semibold" style={{ color: colors['header-name'] }}>
          HeaderPanel · Hạn nhận 06/10
        </Text>
        <ProgressBar value={0.62} color={colors['header-dot-warn']} height={8} onHeader knob />
      </HeaderPanel>
    </>
  );

  return (
    <ScreenShell
      header={header}
      footer={
        <>
          <Button className="flex-1" variant="danger" label="Hủy phiếu" onPress={() => toast.error('danger')} />
          <Button className="flex-1" icon={PencilSimpleIcon} label="Sửa phiếu" onPress={() => toast.success('Đã gửi phiếu đăng ký', 'Người duyệt cấp 1 sẽ nhận thông báo.')} />
        </>
      }
    >
      <View className="flex-row flex-wrap gap-2">
        <FilterChip label={`Theme: ${preference} (${scheme})`} onPress={() => setPreference(preference === 'system' ? 'dark' : preference === 'dark' ? 'light' : 'system')} />
        <FilterChip selected label={`Lang: ${i18n.language}`} onPress={() => setLanguage(i18n.language === 'vi' ? 'en' : 'vi')} />
        <FilterChip dropdown label="BottomSheet" onPress={() => setSheet(true)} />
      </View>

      <Card className="gap-3 p-4">
        <SectionTitle right="5 kinds">StatusBadge</SectionTitle>
        <GroupTitle>Bưu phẩm</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          {[1, 2, 3, 5, 4].map((s) => (
            <ParcelBadge key={s} status={s} />
          ))}
        </View>
        <GroupTitle>Ủy quyền</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          {[5, 2, 4, 3, 1].map((s) => (
            <DelegationBadge key={s} status={s} />
          ))}
        </View>
        <GroupTitle>Phiếu phòng họp</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          {[1, 3, 2, 5, 4].map((s) => (
            <BookingBadge key={s} status={s} />
          ))}
          <BookingBadge status={2} live />
          <StatusBadge kind="warn" label="Sắp diễn ra" />
        </View>
        <GroupTitle>Tag</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          <Tag kind="wait" label="Chuỗi 5 buổi" />
          <Tag label="Cấp 2/2" />
          <Tag icon={UsersIcon} label="8 người" />
        </View>
      </Card>

      <Card className="gap-3 p-4">
        <SectionTitle>RoundIcon</SectionTitle>
        <View className="flex-row flex-wrap gap-2.5">
          {tones.map((tone) => (
            <RoundIcon key={tone} icon={PackageIcon} tone={tone} />
          ))}
        </View>
      </Card>

      <Card className="gap-2.5 p-4">
        <SectionTitle>Button</SectionTitle>
        <Button label="primary" />
        <Button variant="success" icon={CheckIcon} label="success" />
        <View className="flex-row gap-2">
          <Button className="flex-1" size="sm" variant="danger" label="danger" />
          <Button className="flex-1" size="sm" variant="ghost" label="ghost" />
          <Button className="flex-1" size="sm" variant="soft" label="soft" />
        </View>
        <Button size="sm" variant="link" icon={PlusIcon} label="link" />
      </Card>

      <Card>
        <InfoRow icon={UsersIcon} label="Người tham gia" value={<AvatarStack size={24} people={people} />} onPress={() => undefined} />
        <InfoRow divider icon={CoffeeIcon} label="Dịch vụ" value="Nước uống, Trực tuyến" />
        <InfoRow divider icon={PaperclipIcon} label="Tài liệu" value="2 tài liệu" onPress={() => undefined} />
        <InfoRow divider icon={DoorOpenIcon} iconTone="brand" label="Số người" value={<NumberStepper value={count} onChange={setCount} />} />
      </Card>

      <Card>
        <KeyValueRow label="Người gửi" value="Phạm Quốc Bảo" />
        <KeyValueRow divider label="Đơn vị nhận" value="Ban CNTT" />
        <KeyValueRow divider label="Mã vận đơn" value="0187_VTP1029447182" mono />
      </Card>

      <Card highlight className="gap-3 p-3.5">
        <View className="flex-row items-center justify-between">
          <Eyebrow>Mặc định · theo thời gian</Eyebrow>
          <DelegationBadge status={5} label="Chờ bạn xác nhận" />
        </View>
        <PersonRow person={{ id: '1', name: 'Bùi Thanh Tùng', code: 'TC-039902', department: 'Tài chính' }} size={44} strong />
        <ProgressBar value={0.44} color={colors.success} />
        <View className="flex-row gap-2">
          <Button className="flex-1" size="sm" variant="danger" label="Từ chối" />
          <Button className="flex-1" size="sm" label="Đồng ý" />
        </View>
      </Card>

      <Card className="flex-row items-center gap-3 p-4">
        <Avatar name="Nguyễn Minh Khoa" size={44} />
        <Avatar name="Trần Thu Hà" size={36} />
        <AvatarStack size={30} people={people} max={4} />
      </Card>

      <Banner tone="success">Được ủy quyền mặc định bởi Trần Thu Hà, hiệu lực 28/09 → 08/10.</Banner>
      <Banner tone="danger">Người này không có ủy quyền nhận bưu phẩm</Banner>
      <Banner tone="off">Phòng này không cho người đăng ký tự hủy sau khi duyệt.</Banner>
      <NoteField value={note} onChangeText={setNote} placeholder="NoteField · ghi chú (không bắt buộc)" />

      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        icon={SealCheckIcon}
        title="Duyệt phiếu đăng ký"
        caption="PH-2610-0183 · Cấp 2/2"
        footer={
          <View className="flex-row gap-2.5">
            <Button className="flex-1" variant="danger" icon={XIcon} label="Từ chối" onPress={() => setSheet(false)} />
            <Button className="flex-[1.4]" variant="success" icon={CheckIcon} label="Duyệt 5 buổi" onPress={() => setSheet(false)} />
          </View>
        }
      >
        <InfoRow icon={BellIcon} label="BottomSheet" value="radius 28 · handle 36×5" />
      </BottomSheet>
    </ScreenShell>
  );
}
