import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { setLanguage } from '@/core/i18n';
import { useTheme } from '@/core/theme/ThemeProvider';
import { ApprovalActions } from '@/shared/ui/ApprovalActions';
import { Avatar, AvatarStack } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card, FloatingCard } from '@/shared/ui/Card';
import { FilterChip } from '@/shared/ui/Chip';
import { DateBadge } from '@/shared/ui/DateBadge';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import {
  BadgeCheckIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CoffeeIcon,
  DoorOpenIcon,
  HourglassIcon,
  InboxIcon,
  MapPinIcon,
  PackageIcon,
  PaperclipIcon,
  PencilIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { KeyValueRow } from '@/shared/ui/KeyValueRow';
import { HeaderCircles, ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { NoteField } from '@/shared/ui/NoteField';
import { NumberStepper } from '@/shared/ui/NumberStepper';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RoundIcon, type RoundIconTone } from '@/shared/ui/RoundIcon';
import { GroupTitle, SectionTitle } from '@/shared/ui/SectionTitle';
import { StatStrip } from '@/shared/ui/StatStrip';
import { BookingBadge, DelegationBadge, ParcelBadge, StatusBadge, Tag } from '@/shared/ui/StatusBadge';
import { StatusTabs } from '@/shared/ui/StatusTabs';
import { Stepper4 } from '@/shared/ui/Stepper4';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

const roundTones: RoundIconTone[] = ['brand', 'wait', 'warn', 'danger', 'ok', 'off', 'solid'];
const people = ['Trần Thu Hà', 'Nguyễn Minh Khoa', 'Lê Văn Nam', 'Phạm Hoàng Anh', 'Bùi Thanh Tùng', 'Võ Hồng Nhung'].map((name) => ({ name }));
const steps = ['Phòng', 'Giờ', 'Thông tin', 'Xác nhận'];

type Demo = 'segmented' | 'stepper' | 'large';
type ParcelTab = 'waiting' | 'overdue' | 'done' | 'cancelled';

/** Every shared component of the v3 design on one screen (dev builds only, route `/ui`). */
export function UiGalleryScreen() {
  const { scheme, preference, setPreference, colors } = useTheme();
  const { i18n } = useTranslation();
  const [demo, setDemo] = useState<Demo>('segmented');
  const [segment, setSegment] = useState<'pending' | 'done' | 'series'>('pending');
  const [side, setSide] = useState<'mine' | 'theirs'>('mine');
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState<ParcelTab>('waiting');
  const [count, setCount] = useState(8);
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);

  const header = (
    <ModuleHeader
      title="UI kit · v3"
      subtitle="THACO Chu Lai · Tòa A"
      subtitleIcon={MapPinIcon}
      onSubtitlePress={() => toast.info('Đổi khu vực')}
      right={
        <>
          <HeaderIconButton icon={SearchIcon} label="Tìm kiếm" onPress={() => toast.info('HeaderIconButton')} />
          <HeaderIconButton icon={BellIcon} label="Thông báo" badge={3} onPress={() => toast.info('badge')} />
        </>
      }
    >
      {demo === 'segmented' ? (
        <HeaderSegmented
          className=""
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'pending', label: 'Chờ duyệt', badge: 3 },
            { value: 'done', label: 'Đã xử lý', badge: 18, badgeTone: 'neutral' },
            { value: 'series', label: 'Chuỗi', badge: 2, badgeTone: 'neutral' },
          ]}
        />
      ) : demo === 'stepper' ? (
        <Stepper4 step={step} labels={steps} onStepPress={setStep} />
      ) : (
        <HeaderSegmented
          className=""
          size="lg"
          value={side}
          onChange={setSide}
          options={[
            { value: 'mine', label: 'Tôi ủy quyền', sublabel: '2 đang hiệu lực', icon: UserIcon },
            { value: 'theirs', label: 'Được ủy quyền', sublabel: '1 chờ xác nhận', icon: InboxIcon, badge: 1 },
          ]}
        />
      )}
    </ModuleHeader>
  );

  const floating = (
    <FloatingCard>
      <StatStrip
        items={[
          { key: 'pending', icon: HourglassIcon, tone: 'wait', value: 3, label: 'Chờ tôi duyệt' },
          { key: 'today', icon: CalendarIcon, tone: 'ok', value: 2, label: 'Họp hôm nay' },
          { key: 'now', icon: ClockIcon, tone: 'danger', value: '09:15', label: 'Hiện tại', emphasize: true },
        ]}
      />
    </FloatingCard>
  );

  return (
    <ModuleScreen
      header={header}
      floating={floating}
      footer={
        <>
          <Button className="flex-1" variant="danger-outline" icon={XIcon} label="Hủy phiếu" onPress={() => toast.error('danger-outline')} />
          <Button className="flex-1" icon={PencilIcon} label="Sửa phiếu" onPress={() => toast.success('Đã gửi phiếu đăng ký', 'Người duyệt cấp 1 sẽ nhận thông báo.')} />
        </>
      }
    >
      <View className="flex-row flex-wrap gap-2">
        <FilterChip label={`Theme: ${preference} (${scheme})`} onPress={() => setPreference(preference === 'system' ? 'dark' : preference === 'dark' ? 'light' : 'system')} />
        <FilterChip selected label={`Lang: ${i18n.language}`} onPress={() => setLanguage(i18n.language === 'vi' ? 'en' : 'vi')} />
        <FilterChip dropdown label="BottomSheet" onPress={() => setSheet(true)} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {(['segmented', 'stepper', 'large'] as const).map((d) => (
          <FilterChip key={d} selected={demo === d} label={`Header: ${d}`} onPress={() => setDemo(d)} />
        ))}
      </View>

      <OnBlue>
        <Stepper4 step={step} labels={steps} onStepPress={setStep} />
        <HeaderSegmented
          className=""
          size="lg"
          value={side}
          onChange={setSide}
          options={[
            { value: 'mine', label: 'Tôi ủy quyền', sublabel: '2 đang hiệu lực', icon: UserIcon },
            { value: 'theirs', label: 'Được ủy quyền', sublabel: '1 chờ xác nhận', icon: InboxIcon, badge: 1 },
          ]}
        />
        <View className="flex-row items-center gap-2">
          <HeaderIconButton icon={SearchIcon} label="tint" onPress={() => undefined} />
          <HeaderIconButton icon={PencilIcon} label="solid" variant="solid" onPress={() => undefined} />
          <HeaderIconButton icon={BellIcon} label="badge" badge={12} onPress={() => undefined} />
          <Button size="xs" variant="inverse-soft" label="Tiếp tục" onPress={() => setStep((s) => Math.min(3, s + 1))} />
        </View>
      </OnBlue>

      <Card className="overflow-visible">
        <StatusTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'waiting', label: 'Chờ nhận', count: 2, tone: 'wait' },
            { key: 'overdue', label: 'Quá hạn', count: 1, tone: 'danger', alarm: true },
            { key: 'done', label: 'Đã nhận', count: 12, tone: 'ok' },
            { key: 'cancelled', label: 'Đã hủy', count: 3, tone: 'off' },
          ]}
        />
      </Card>

      <Card className="gap-3 p-3.5">
        <View className="flex-row gap-3">
          <DateBadge weekday="T2" day="05" month="Th10" />
          <View className="min-w-0 flex-1 gap-1.5">
            <View className="flex-row flex-wrap gap-1.5">
              <View className="h-[22px] justify-center rounded-[7px] bg-primary px-2">
                <Text weight="bold" className="text-on-primary" style={{ fontSize: 11 }}>
                  Cấp 2/2 · cuối
                </Text>
              </View>
              <StatusBadge kind="warn" icon={ClockIcon} label="Còn 5 giờ" />
            </View>
            <Text weight="bold" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
              Review thiết kế ứng dụng HRM Mobile
            </Text>
            <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12 }}>
              Nguyễn Minh Khoa · Ban CNTT · 08:12
            </Text>
          </View>
        </View>
        <ApprovalActions onDetail={() => toast.info('Chi tiết')} onReject={() => toast.error('Từ chối')} onApprove={() => setSheet(true)} />
      </Card>

      <Card className="gap-3 p-4">
        <SectionTitle right="5 tones">StatusBadge</SectionTitle>
        <GroupTitle>Bưu phẩm</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          {[1, 2, 3, 5, 4].map((s) => (
            <ParcelBadge key={s} status={s} dot />
          ))}
        </View>
        <GroupTitle>Ủy quyền</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          {[5, 2, 4, 3, 1].map((s) => (
            <DelegationBadge key={s} status={s} dot />
          ))}
        </View>
        <GroupTitle>Phiếu phòng họp</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          {[1, 3, 2, 5, 4].map((s) => (
            <BookingBadge key={s} status={s} />
          ))}
          <BookingBadge status={2} live dot />
          <StatusBadge kind="warn" icon={TriangleAlertIcon} label="Trùng lịch" />
        </View>
        <GroupTitle>Tag</GroupTitle>
        <View className="flex-row flex-wrap gap-1.5">
          <Tag kind="wait" label="Chuỗi 5 buổi" />
          <Tag label="Cấp 2/2" />
          <Tag icon={UsersIcon} label="8 người" />
        </View>
      </Card>

      <Card className="gap-2.5 p-4">
        <SectionTitle>Button</SectionTitle>
        <Button size="xl" label="primary · xl 56" />
        <Button variant="success" icon={CheckIcon} label="success · lg 52" />
        <View className="flex-row gap-2">
          <Button className="flex-1" size="md" variant="danger-outline" icon={XIcon} label="danger" />
          <Button className="flex-1" size="md" variant="ghost" label="ghost" />
          <Button className="flex-1" size="md" variant="soft" label="soft" />
        </View>
        <Button size="md" variant="link" label="link" className="self-start" />
      </Card>

      <Card className="gap-3 p-4">
        <SectionTitle>RoundIcon · Avatar · ProgressBar</SectionTitle>
        <View className="flex-row flex-wrap gap-2.5">
          {roundTones.map((tone) => (
            <RoundIcon key={tone} icon={PackageIcon} tone={tone} />
          ))}
        </View>
        <View className="flex-row items-center gap-3">
          <Avatar name="Nguyễn Minh Khoa" size={44} />
          <Avatar name="Trần Thu Hà" size={36} />
          <AvatarStack size={30} people={people} max={4} />
        </View>
        <ProgressBar value={0.86} color={colors.warning} height={5} />
        <ProgressBar value={0.2} color={colors.primary} height={5} />
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

      <Banner tone="success">Được ủy quyền mặc định bởi Trần Thu Hà, hiệu lực 28/09 → 08/10.</Banner>
      <Banner tone="danger">Người này không có ủy quyền nhận bưu phẩm</Banner>
      <NoteField value={note} onChangeText={setNote} placeholder="NoteField · ghi chú (không bắt buộc)" />

      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        icon={BadgeCheckIcon}
        title="Duyệt phiếu đăng ký"
        caption="PH-2610-0183 · Cấp 2/2"
        footer={
          <View className="flex-row gap-2.5">
            <Button className="flex-1" size="xl" variant="danger-outline" icon={XIcon} label="Từ chối" onPress={() => setSheet(false)} />
            <Button className="flex-[1.7]" size="xl" variant="success" icon={CheckIcon} label="Duyệt 5 buổi" onPress={() => setSheet(false)} />
          </View>
        }
      >
        <InfoRow icon={SlidersHorizontalIcon} label="BottomSheet" value="radius 28 · handle 40×5" />
      </BottomSheet>
    </ModuleScreen>
  );
}

/** Header controls need the blue background to be judged. */
function OnBlue({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View className="gap-3 overflow-hidden rounded-[20px] p-4" style={{ backgroundColor: colors.header }}>
      <HeaderCircles />
      {children}
    </View>
  );
}
