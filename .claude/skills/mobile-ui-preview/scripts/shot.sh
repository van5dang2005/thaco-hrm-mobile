#!/usr/bin/env bash
# Chụp màn hình app THACO E-Sign đang chạy trên iOS Simulator (ưu tiên) hoặc Android emulator,
# thu nhỏ còn cạnh dài 1000px (ảnh gốc ~1206x2622 tốn token mà không rõ hơn), in ra đường dẫn ảnh.
#
# Dùng: shot.sh [route] [thư-mục-lưu]
#   shot.sh                       → chụp màn đang mở
#   shot.sh documents             → mở exp+thaco-esign://documents rồi chụp
#   shot.sh gate-pass-detail/123  → mở chi tiết phiếu 123 rồi chụp
set -euo pipefail

ROUTE="${1:-}"
OUT_DIR="${2:-${TMPDIR:-/tmp}}"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
# Scheme của development build — có trên cả iOS lẫn Android (com.thaco.esign:// chỉ có trên iOS).
SCHEME="exp+thaco-esign"
OUT="$OUT_DIR/ui-$(date +%H%M%S).png"

if xcrun simctl list devices booted 2>/dev/null | grep -q "(Booted)"; then
  PLATFORM=ios
elif [ -x "$ADB" ] && "$ADB" devices | awk 'NR>1 && $2=="device"{f=1} END{exit !f}'; then
  PLATFORM=android
else
  echo "Không có iOS Simulator hay Android emulator nào đang chạy." >&2
  exit 2
fi

if [ -n "$ROUTE" ]; then
  URL="$SCHEME://${ROUTE#/}"
  if [ "$PLATFORM" = ios ]; then
    xcrun simctl openurl booted "$URL"
  else
    "$ADB" shell am start -a android.intent.action.VIEW -d "$URL" >/dev/null
  fi
  sleep 3 # chờ điều hướng + gọi API xong
fi

if [ "$PLATFORM" = ios ]; then
  xcrun simctl io booted screenshot "$OUT" >/dev/null 2>&1
else
  "$ADB" exec-out screencap -p >"$OUT"
fi
sips -Z 1000 "$OUT" >/dev/null
echo "$OUT"
