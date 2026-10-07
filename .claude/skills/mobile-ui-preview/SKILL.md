---
name: mobile-ui-preview
description: Tự chụp màn hình app THACO E-Sign đang chạy trên iOS Simulator hoặc Android emulator để nhìn kết quả thật sau khi sửa giao diện, soi lỗi (tràn chữ, lệch hàng, sai màu, bị che) và đối chiếu với màn web tương ứng. Dùng skill này sau mỗi lần sửa UI trong thaco-e-sign-mobile (màn hình, component, màu, khoảng cách, badge, bottom sheet) trước khi báo là xong, và khi người dùng nói "xem thử", "chụp màn hình", "kiểm tra giao diện", "nhìn có ổn không", "so với web", "bị lệch", "bị tràn chữ" — kể cả khi họ không nhắc tới simulator.
---

# Xem giao diện mobile bằng ảnh chụp simulator

Viết UI mà không nhìn thì không phát hiện được chữ tiếng Việt dài bị tràn, hàng bị lệch, phần tử bị notch hay bàn phím che. Một ảnh chụp chỉ mất vài giây, và bắt được những lỗi mà typecheck không bao giờ thấy.

## Thông số môi trường (kiểm ngày 25/09/2026)

- App trên simulator là **development build** (có `expo-dev-client`), không phải Expo Go. Bundle id `com.thaco.esign`.
- Scheme dùng được trên cả 2 nền tảng: `exp+thaco-esign://`. Scheme `com.thaco.esign://` chỉ có trên iOS.
- Simulator đã cài app:
  - iPhone 17 Pro, iOS 26.3: `F5435F54-C454-4EF7-BB0D-2B4F4D0C21AD` (dùng mặc định)
  - iPhone 16 Pro, iOS 18.1: `8D0382E2-BF26-4F42-B088-309DD4FBE355`
  - Các iPad có `THACO.app` là app khác, bỏ qua.
- Android: AVD `Pixel_10_Pro_Fold`. `adb` nằm ở `~/Library/Android/sdk/platform-tools/adb` (không có trong PATH). Chưa kiểm chứng app đã được cài trên emulator này chưa.
- Metro: `curl -s localhost:8081/status` trả `packager-status:running` nếu đang chạy.

## Quy trình

1. **Xem trạng thái hiện tại.** Người dùng thường đã chạy sẵn Metro và simulator, đừng khởi động thêm bản thứ hai.
   ```bash
   xcrun simctl list devices booted
   ~/Library/Android/sdk/platform-tools/adb devices
   curl -s --max-time 2 localhost:8081/status
   ```
2. **Metro chưa chạy**: chạy nền `npx expo start` trong `thaco-e-sign-mobile`. Không dùng `npm run dev`, vì lệnh đó kèm `-c` xoá cache và build lại rất lâu. Chỉ để một Metro trên cổng 8081.
3. **Chưa có simulator nào bật**: bật iPhone 17 Pro rồi mở app nối vào Metro.
   ```bash
   xcrun simctl boot F5435F54-C454-4EF7-BB0D-2B4F4D0C21AD && open -a Simulator
   xcrun simctl bootstatus F5435F54-C454-4EF7-BB0D-2B4F4D0C21AD -b
   xcrun simctl openurl booted "exp+thaco-esign://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
   ```
   Lần đầu tải bundle mất khoảng 5–10 giây. Chụp thử, nếu ảnh vẫn là màn trắng hoặc màn chờ thì đợi thêm rồi chụp lại. Ghi nhớ là mình đã tự bật simulator: khi xong việc, tắt lại bằng `xcrun simctl shutdown <id>`, trừ khi người dùng muốn giữ.
   Android: `adb reverse tcp:8081 tcp:8081`, sau đó `adb shell am start -a android.intent.action.VIEW -d "exp+thaco-esign://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"`.
4. **Đi tới màn cần xem và chụp** bằng script đi kèm. Script tự chọn iOS hoặc Android, mở deep link, chờ 3 giây, chụp, thu nhỏ còn 1000px rồi in đường dẫn ảnh:
   ```bash
   bash <thư-mục-skill>/scripts/shot.sh <route> <scratchpad-dir>
   ```
   `<thư-mục-skill>` là "Base directory" được báo khi skill nạp, hiện là `Thaco-Esign/.claude/skills/mobile-ui-preview`.
   Sau đó mở ảnh bằng Read. Luôn lưu ảnh vào thư mục scratchpad, vì ảnh chứa dữ liệu thật (tên người, hồ sơ).
   - Route là đường dẫn file trong `thaco-e-sign-mobile/app/`, bỏ nhóm trong ngoặc: `app/(tabs)/documents.tsx` → `documents`, `app/(tabs)/gate-pass.tsx` → `gate-pass`, `app/document-detail/[id].tsx` → `document-detail/<id>`, `app/gate-pass-detail/[id].tsx` → `gate-pass-detail/<id>`. Để trống route thì chụp màn đang mở.
   - Đã kiểm chứng trên iOS: `documents` và `gate-pass` mở đúng màn.
   - Sau khi lưu file code, Fast Refresh cần 1–2 giây. Chụp quá sớm sẽ thấy bản cũ.
   - Màn nằm sau thao tác bấm (bottom sheet, modal, tab con, form nhiều bước) thì deep link không tới được. Khi đó nhờ người dùng mở sẵn màn đó trên simulator, rồi chạy `shot.sh` không kèm route.
5. **Soi ảnh** theo danh sách sau, chỉ kết luận những gì thực sự nhìn thấy:
   - Chữ bị cắt, tràn, xuống dòng xấu. Chú ý tên hồ sơ, tên người, tên đơn vị dài.
   - Hàng lệch, khoảng cách hoặc bo góc không khớp với phần còn lại của màn.
   - Màu lạc tông so với quy chuẩn trong skill `thaco-mobile-ui`.
   - Phần tử bị notch, Dynamic Island, home indicator, thanh tab dưới hay nút QR nổi ở giữa che mất.
   - Nếu vừa sửa phần xử lý trạng thái rỗng, đang tải hay lỗi thì kiểm cả các trạng thái đó.
   Thấy lỗi thì sửa rồi chụp lại. Khi báo cáo, nói rõ đã chụp màn nào và thấy gì. Nếu không chụp được thì nói thẳng là chưa nhìn được.
6. **So với web** khi màn đó bám theo web: nếu phiên có công cụ trình duyệt (Claude in Chrome hoặc trình duyệt tích hợp), mở trang web tương ứng để chụp. Không có thì nhờ người dùng gửi ảnh màn web. Code web nằm ở `thaco-e-sign-fe/apps/e-sign`.

## Không được làm

- **Không bấm các nút làm đổi dữ liệu thật** (Phê duyệt, Từ chối, Trả lại, Thu hồi, Ký, Tạo mới, Xoá) để "đi tới" một màn. App trên simulator đăng nhập bằng tài khoản thật và gọi backend thật.
- **Không tự nhập tài khoản, mật khẩu, PIN hay OTP.** Nếu ảnh chụp ra màn đăng nhập, màn nhập PIN, hoặc modal bắt thiết lập PIN/chữ ký/cập nhật (`ForcePinSetupModal`, `ForceSignatureSetupModal`, `ForceUpdateModal`), hãy dừng lại và nhờ người dùng tự xử lý trên simulator, rồi chụp lại.
- **Không build lại native** (`npx expo run:ios`, `eas build`) chỉ để xem giao diện. Nếu bản cài trên simulator quá cũ và không chạy được bundle mới (lỗi thiếu native module), báo cho người dùng.
- **Không xoá app hay erase simulator.**
