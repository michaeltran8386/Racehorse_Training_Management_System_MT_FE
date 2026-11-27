# DANH SÁCH LỖI VÀ TỒN ĐỌNG HỆ THỐNG (DEFECT & IMPROVEMENT LOG)

## 1. Lỗi phân hệ Xác thực & Lời mời (Authentication & Invitations)

### Mã lỗi: DEFECT-AUTH-01
- **Tiêu đề:** Thiếu nút và luồng "Từ chối lời mời" (Decline Invitation) trong Email mẫu Mailpit và Màn hình Chấp nhận lời mời.
- **Mức độ nghiêm trọng:** Medium (Gây sai lệch kịch bản demo nếu người dùng muốn từ chối trực tiếp từ email).
- **Thực trạng phát hiện (Current Behavior):**
  - Khi Quản lý CLB tạo tài khoản mới ở trạng thái `INVITED` (tại `BE/src/accounts/accounts.service.ts`), hệ thống sinh mã OTP 6 chữ số và gửi email qua `BE/src/auth/otp.service.ts`.
  - Template email gửi đi (xem trên Mailpit `http://localhost:8025`) chỉ có duy nhất:
    - Mã OTP xác thực 6 số.
    - Một nút bấm duy nhất: **"KÍCH HOẠT TÀI KHOẢN & ĐẶT MẬT KHẨU"** trỏ tới `/accept-invite?email=...&code=...`.
    - **Hoàn toàn KHÔNG có nút "Từ chối lời mời" (Decline Invitation)**.
  - Trên giao diện Frontend (`FE/src/features/auth/pages/AcceptInvitePage.tsx`):
    - Chỉ có form nhập mã OTP và nút "Verify invitation" để chuyển sang đặt mật khẩu `/reset-password`.
    - Không có bất kỳ nút hay tùy chọn nào cho phép người được mời bấm "Tôi từ chối lời mời này".
- **Hệ quả thực tế trên hệ thống hiện tại:**
  - Người được mời nếu không muốn tham gia thì KHÔNG THỂ chủ động bấm từ chối từ email.
  - Lời mời chỉ có thể kết thúc bằng 2 cách:
    1. Chờ hết thời hạn hiệu lực 48 giờ (OTP tự hết hạn).
    2. Quản lý CLB chủ động vào danh sách tài khoản (tab Đang mời) và nhấn nút **"Xóa / Thu hồi lời mời"**.
- **Giải pháp kỹ thuật khi nâng cấp (Proposed Fix):**
  1. Backend: Bổ sung endpoint `POST /auth/decline-invite` tiếp nhận email và OTP code, cập nhật trạng thái User thành `REJECTED`, giải phóng Barn được gán và ghi nhận audit log.
  2. Template Mail: Bổ sung liên kết phụ / nút phụ thứ hai trong template HTML: `<a href="${appUrl}/decline-invite?...">Từ chối lời mời tham gia</a>`.
  3. Frontend: Tạo trang `/decline-invite` hoặc thêm nút "Từ chối lời mời" ngay trên `AcceptInvitePage.tsx`.


---

## 2. Lỗi phân hệ Huấn luyện viên (Training & Trainer Handover)

### Mã lỗi: DEFECT-TRN-01 [ĐÃ XỬ LÝ - RESOLVED]
- **Tiêu đề:** Lỗi Widget Dashboard hardcode chuỗi tĩnh "Hạn lập giáo án: còn 3 ngày".
- **Vị trí:** `FE/src/features/dashboard/components/RoleDashboards.tsx` (Dòng 1170-1194).
- **Trạng thái:** ĐÃ SỬA VÀ NGHIỆM THU (100% Build Pass).
- **Giải pháp đã thực hiện:** Thay chuỗi tĩnh bằng logic tính động số ngày từ `r.horse.planDeadlineAt`. Nếu quá hạn hiển thị text đỏ `Quá hạn lập giáo án: X ngày`, nếu còn hạn hiển thị text vàng `Hạn lập giáo án: còn X ngày`.

---

### Mã lỗi: DEFECT-TRN-02 [ĐÃ XỬ LÝ - RESOLVED]
- **Tiêu đề:** Lỗ hổng trôi dạt thời hạn SLA (SLA Slippage) do công thức lũy tiến cộng dồn ngày khi gán nhiều ngựa.
- **Vị trí:** `BE/src/horses/horses.service.ts` (Dòng 2307 & 2467).
- **Trạng thái:** ĐÃ SỬA VÀ NGHIỆM THU (10/10 Jest Tests Pass).
- **Giải pháp đã thực hiện:**
  1. Cố định SLA: `const days = 3;` (72 giờ độc lập) tại `respondHandover`.
  2. Bổ sung chốt chặn WIP Limit tại `assignTrainer`: nếu HLV đang tồn $\ge 2$ chiến mã chưa có giáo án `ACTIVE` thì chặn phân công và ném lỗi `TRAINER_WIP_LIMIT_EXCEEDED`.
  3. Cập nhật `horses-handover-qa.spec.ts` tương ứng.

---

### Mã lỗi: DEFECT-TRN-03 [ĐÃ XỬ LÝ - RESOLVED]
- **Tiêu đề:** Lỗi thẻ KPI Dashboard "Đang phụ trách (Trần 8)" hiển thị sai số lượng (lấy nhầm `inTraining` thay vì `totalHorses`) và thiếu gán `assignedTrainerId` khi tiếp nhận.
- **Vị trí:** `FE/src/features/dashboard/components/RoleDashboards.tsx` (Dòng 923) & `BE/src/horses/horses.service.ts` (Dòng 2482).
- **Trạng thái:** ĐÃ SỬA VÀ NGHIỆM THU (100% Build Pass, Jest Tests Pass).
- **Giải pháp đã thực hiện:**
  1. Frontend: Đổi giá trị hiển thị thành `value={overview.loading ? "—" : `${totalHorses} / 8`}`, khớp hoàn toàn với Banner tổng và danh sách 8 chiến mã.
  2. Backend: Bổ sung `assignedTrainerId: req.toTrainerId` vào giao dịch cập nhật chiến mã khi HLV chấp nhận bàn giao (`respondHandover`).
- **Phân định nguyên nhân:** 100% là lỗi code gán nhầm biến hiển thị ở Frontend, dữ liệu seed trong Database hoàn toàn chính xác.
- **Hướng giải quyết ngắn gọn:**
  - Sửa dòng 923 thành: `value={overview.loading ? "—" : `${totalHorses} / 8`}`.
  - Dòng trend hiển thị bên dưới: `{inTraining} có giáo án · {withoutPlan} chờ lập giáo án`.
