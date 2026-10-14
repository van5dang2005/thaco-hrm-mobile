import {
  type AppIcon,
  PresentationIcon,
  CoffeeIcon,
  LaptopIcon,
  MicIcon,
  MonitorIcon,
  CitrusIcon,
  ProjectorIcon,
  SparklesIcon,
  VideoIcon,
  WifiIcon,
} from '@/shared/ui/icons';

/** Services are free-text names in the back-end; pick an icon from common Vietnamese / English words. */
const rules: [RegExp, AppIcon][] = [
  [/trực tuyến|online|zoom|teams|meet|truyền hình|video|camera|hội nghị/i, VideoIcon],
  [/nước|trà|cà phê|cafe|coffee|tea|water|đồ uống/i, CoffeeIcon],
  [/trái cây|hoa quả|fruit|bánh|ăn|food|tiệc/i, CitrusIcon],
  [/máy chiếu|projector|trình chiếu/i, ProjectorIcon],
  [/màn hình|tivi|\btv\b|monitor|screen|led/i, MonitorIcon],
  [/bảng|board|flipchart/i, PresentationIcon],
  [/micro|\bmic\b|âm thanh|loa|sound|speaker/i, MicIcon],
  [/wifi|internet|mạng/i, WifiIcon],
  [/laptop|máy tính|computer/i, LaptopIcon],
];

export function serviceIcon(name?: string | null): AppIcon {
  return rules.find(([re]) => re.test(name ?? ''))?.[1] ?? SparklesIcon;
}

/** Rooms that offer video conferencing ("Họp trực tuyến" filter). */
export const isOnlineService = (name?: string | null) => rules[0][0].test(name ?? '');
