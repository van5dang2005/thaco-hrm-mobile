import {
  type AppIcon,
  ChalkboardIcon,
  CoffeeIcon,
  LaptopIcon,
  MicrophoneIcon,
  MonitorIcon,
  OrangeSliceIcon,
  PresentationIcon,
  SparkleIcon,
  VideoCameraIcon,
  WifiHighIcon,
} from '@/shared/ui/icons';

/** Services are free-text names in the back-end; pick an icon from common Vietnamese / English words. */
const rules: [RegExp, AppIcon][] = [
  [/trực tuyến|online|zoom|teams|meet|truyền hình|video|camera|hội nghị/i, VideoCameraIcon],
  [/nước|trà|cà phê|cafe|coffee|tea|water|đồ uống/i, CoffeeIcon],
  [/trái cây|hoa quả|fruit|bánh|ăn|food|tiệc/i, OrangeSliceIcon],
  [/máy chiếu|projector|trình chiếu/i, PresentationIcon],
  [/màn hình|tivi|\btv\b|monitor|screen|led/i, MonitorIcon],
  [/bảng|board|flipchart/i, ChalkboardIcon],
  [/micro|\bmic\b|âm thanh|loa|sound|speaker/i, MicrophoneIcon],
  [/wifi|internet|mạng/i, WifiHighIcon],
  [/laptop|máy tính|computer/i, LaptopIcon],
];

export function serviceIcon(name?: string | null): AppIcon {
  return rules.find(([re]) => re.test(name ?? ''))?.[1] ?? SparkleIcon;
}

/** Rooms that offer video conferencing ("Họp trực tuyến" filter). */
export const isOnlineService = (name?: string | null) => rules[0][0].test(name ?? '');
