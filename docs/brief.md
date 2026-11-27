# TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ (BRIEF)
## NGHIỆM THU CUỐI CÙNG: XỬ LÝ TRIỆT ĐỂ SLA NGỰA HOÀN THÀNH GIÁO ÁN & DỌN DẸP MÃ NGUỒN RÁC
**Dự án**: EquiFlow - Hệ thống Quản lý Huấn luyện & Chuồng trại Ngựa đua  
**Phiên bản tài liệu**: v47.0.0 (Final Acceptance: SLA Exemption & Dead Code Elimination)  
**Tác giả**: Ban BA / PM & Kiến trúc Hệ thống  
**Trạng thái**: Hoàn tất Ca 1 & Ca 2 — Chờ chữ "DUYỆT" từ User để triển khai Ca 3 (Dev)

---

### I. MỤC TIÊU NGHIỆM THU CUỐI CÙNG CHO SINH VIÊN BẢO VỆ HỘI ĐỒNG
1. **Bịt kín kẽ hở SLA 3 ngày sau khi hoàn thành giáo án**:
   - Khi chiến mã đã hoàn thành chu kỳ giáo án (`PlanStatus.COMPLETED`), ngựa được tự động chuyển về trạng thái `RESTING` (Nghỉ ngơi hồi phục) hoặc `READY_FOR_RACE` (Sẵn sàng thi đấu).
   - Nghĩa vụ SLA 3 ngày của lần bàn giao trước đã **HOÀN TẤT (SLA FULFILLED)**.
   - Hệ thống phải **miễn trừ SLA (`isSlaExempt = true`, `planDeadlineAt = null`)**, tuyệt đối không để Dashboard báo "Quá hạn lập giáo án: 90 ngày" gây bất hợp lý nghiệp vụ trước Hội đồng.
2. **Dọn dẹp triệt để mã nguồn rác (Dead Code Elimination)**:
   - Xóa bỏ trang mồ côi `PlanHistoryPage.tsx` (đã được thay thế bằng URL filter `/training/plans?status=COMPLETED`).
   - Xóa bỏ import không sử dụng trong `router.tsx` và `lazyPages.ts`.
   - Xóa bỏ tệp rỗng `.gitkeep` (0 bytes) trong thư mục components.

---

### II. ĐẶC TẢ CHI TIẾT NGHIỆP VỤ

#### 1. Xử lý triệt để SLA Miễn trừ tại Backend & Frontend
- **Backend (`BE/src/training/training-insights.service.ts`)**:
  - Khi tính toán dữ liệu tổng quan cho Dashboard (`getOverview`):
  - Truy vấn thêm các giáo án đã hoàn thành `PlanStatus.COMPLETED` của các chiến mã.
  - Nếu ngựa đã có giáo án `COMPLETED` và hiện không có giáo án `ACTIVE`/`DRAFT`, đồng thời ngựa đang ở trạng thái `RESTING` hoặc `READY_FOR_RACE`:
    - Gán `planDeadlineAt = null` (Xóa bỏ hạn SLA của lần bàn giao cũ).
    - Thêm trường `isRestingCycle: true` và `lastCompletedPlanName`.
- **Frontend (`FE/src/features/dashboard/components/RoleDashboards.tsx`)**:
  - Tại bảng "Chiến mã chưa có giáo án":
  - Nếu ngựa có `isRestingCycle` hoặc không có `planDeadlineAt`:
    - Hiển thị Badge `tone="info"`: `Nghỉ ngơi hồi phục` (không báo hạn hoặc quá hạn màu đỏ).
    - Dòng mô tả: `Đã hoàn thành giáo án · Chờ chu kỳ mới`.

#### 2. Danh mục Mã nguồn Rác cần Xóa bỏ (Dead Code)
- Xóa tệp: `FE/src/features/training/pages/PlanHistoryPage.tsx`.
- Xóa tệp: `FE/src/features/training/components/.gitkeep`.
- Xóa dòng import và export `PlanHistoryPage` trong:
  - `FE/src/app/lazyPages.ts` (dòng 16).
  - `FE/src/app/router.tsx` (dòng 63).

---

### I. DANH SÁCH 3 LỖI VÀ NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

#### 1. Lỗi 1 (DEFECT-TRN-03): Thẻ Dashboard "Đang phụ trách (Trần 8)" hiển thị sai số lượng và luồng tiếp nhận
- **Thực trạng**:
  - Tiêu đề thẻ ghi `Đang phụ trách (Trần 8)`, nhưng con số to hiển thị lại là `5 / 8`. Trong khi đó, hồ sơ danh sách ngựa của HLV có đủ 8 con và Banner trên đỉnh ghi đúng `8/8 chiến mã`.
  - Trước khi tiếp nhận ngựa hiển thị 5 con, sau khi tiếp nhận vẫn trơ ra 5 con.
- **Nguyên nhân gốc rễ**:
  - **Frontend (`RoleDashboards.tsx` dòng 923)**: Thẻ KPI gán nhầm giá trị hiển thị là `${inTraining} / 8`. Biến `inTraining` chỉ đếm số ngựa có giáo án `ACTIVE` (5 con), trong khi biến đúng của tổng số ngựa đang phụ trách là `totalHorses` (8 con). Khi tiếp nhận ngựa mới chưa có giáo án `ACTIVE`, `inTraining` không đổi nên thẻ bị "đứng hình" ở số 5.
  - **Backend (`horses.service.ts` dòng 2480-2487)**: Trong hàm `respondHandover` khi HLV bấm `ACCEPT`, code cập nhật `trainerAssignmentStatus = ASSIGNED` nhưng **bỏ quên cập nhật `assignedTrainerId: req.toTrainerId`** vào bảng Horse.

#### 2. Lỗi 2 (DEFECT-TRN-01): Bảng Dashboard hardcode chuỗi tĩnh "Hạn lập giáo án: còn 3 ngày"
- **Thực trạng**:
  - Tại bảng "Chiến mã chưa có giáo án huấn luyện" trên Dashboard, dòng trạng thái bị gắn cứng chữ `"Hạn lập giáo án: còn 3 ngày"`.
- **Nguyên nhân gốc rễ**:
  - Tại `RoleDashboards.tsx` (dòng 1176), code gán cứng chuỗi text tĩnh `{isVi ? "Hạn lập giáo án: còn 3 ngày" : "Deadline: 3 days"}`.
  - Trong khi Backend API `getOverview` đã gửi trường `r.horse.planDeadlineAt`, và trang `PlanListPage.tsx` đã có logic tính `diffDays = Math.ceil((deadline - now) / 86400000)` để đổi màu đỏ khi quá hạn.

#### 3. Lỗi 3 (DEFECT-TRN-02): Lỗ hổng trôi dạt SLA (SLA Slippage) do công thức lũy tiến cộng dồn ngày
- **Thực trạng**:
  - Khi HLV nhận nhiều ngựa, công thức `days = 3 + waitingCount * 2` nới ngày cho các con phía sau: con thứ 4 được 9 ngày, con thứ 8 được 17 ngày.
- **Nguyên nhân & Rủi ro**:
  - HLV chây ì dồn toa, ngựa bị bỏ rơi nửa tháng trong chuồng không vận động gây teo cơ, chủ ngựa chịu thiệt hại chi phí, dễ bị Hội đồng bảo vệ đồ án bắt bẻ lỗ hổng quy trình.

---

### II. GIẢI PHÁP TRIỂN KHAI CHI TIẾT (PROPOSED FIXES)

#### 1. Sửa Lỗi 1 (Dashboard KPI 1 & Backend Tiếp nhận):
- **Frontend (`RoleDashboards.tsx`)**:
  - Sửa dòng 923: `value={overview.loading ? "—" : `${totalHorses} / 8`}`.
  - Dòng trend: `${inTraining} có giáo án · ${withoutPlan} chờ lập giáo án`.
- **Backend (`horses.service.ts`)**:
  - Bổ sung `assignedTrainerId: req.toTrainerId` vào transaction cập nhật Horse khi `ACCEPT`.

#### 2. Sửa Lỗi 2 (Dashboard Deadline Countdown):
- **Frontend (`RoleDashboards.tsx`)**:
  - Đọc trường `r.horse.planDeadlineAt`.
  - Tính `diffDays = Math.ceil((new Date(r.horse.planDeadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24))`.
  - Nếu `diffDays >= 0`: Hiển thị `Hạn lập giáo án: còn ${Math.max(1, diffDays)} ngày` (màu vàng warn).
  - Nếu `diffDays < 0`: Đổi màu sang đỏ danger: `Quá hạn lập giáo án: ${Math.abs(diffDays)} ngày`.

#### 3. Sửa Lỗi 3 (Chuẩn hóa SLA Cố định 3 ngày & Chốt chặn WIP Limit = 2):
- **Backend (`horses.service.ts` dòng 2467)**:
  - Cố định hạn lập giáo án: `const days = 3;` (72 giờ độc lập cho mọi chiến mã).
- **Backend (`horses.service.ts` hàm `assignTrainer`)**:
  - Bổ sung chốt chặn: Kiểm tra số ngựa đang nợ giáo án của HLV (`trainingPlans: { none: { status: PlanStatus.ACTIVE } }`).
  - Nếu HLV đang tồn $\ge 2$ chiến mã chưa kích hoạt giáo án $\rightarrow$ Ném lỗi `400 Bad Request` với mã `TRAINER_WIP_LIMIT_EXCEEDED` ("HLV đang tồn 2 chiến mã chưa kích hoạt giáo án. Vui lòng hoàn tất trước khi nhận thêm").

---

### III. TIÊU CHUẨN NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] **AC-1**: Thẻ KPI 1 trên Dashboard hiển thị đúng tổng số ngựa phụ trách: `${totalHorses} / 8` (hiển thị 8/8 thay vì 5/8).
- [ ] **AC-2**: Sau khi bấm tiếp nhận, `assignedTrainerId` được lưu vào DB và số lượng ngựa trên thẻ KPI tăng lên chính xác.
- [ ] **AC-3**: Bảng Dashboard hiển thị đếm ngược ngày thực tế từ `planDeadlineAt`, chuyển màu đỏ khi quá hạn.
- [ ] **AC-4**: Mọi chiến mã tiếp nhận đều có hạn cố định 3 ngày; Quản lý không thể gán con thứ 3 nếu HLV đang nợ 2 con chưa có giáo án `ACTIVE`.
- [ ] **AC-5**: Toàn bộ dự án biên dịch sạch sẽ (`FE build` và `BE test`), không có lỗi cú pháp.
