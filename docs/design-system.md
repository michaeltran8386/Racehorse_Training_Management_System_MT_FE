# TÀI LIỆU HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM)
## QUY CHUẨN GIAO DIỆN DASHBOARD HLV & ĐẾM LÙI THỜI HẠN LẬP GIÁO ÁN
**Dự án**: EquiFlow - Racehorse Training & Stable Management System  
**Phiên bản**: v46.0.0  
**Tác giả**: Ban UI / UX & Kỹ thuật Giao diện  
**Trạng thái**: Hoàn tất Ca 2 — Chờ duyệt (Chốt 2)

---

### I. QUY CHUẨN HIỂN THỊ THẺ KPI DASHBOARD HLV

1. **Thẻ KPI 1 - Đang phụ trách**:
   - **Label**: `Đang phụ trách` / `Managing` (Loại bỏ hoàn toàn hậu tố `(Trần 8)` theo yêu cầu chuẩn hóa giao diện tối giản).
   - **Icon**: `activity`, nền xanh lục nhạt `var(--ok-bg)`, màu icon `var(--ok)`.
   - **Value**: `${totalHorses} / 8` (Phản ánh chuẩn xác tổng số chiến mã HLV đang phụ trách trong đàn, định mức trần 8 con thể hiện qua mẫu số).
   - **Trend line**: `${inTraining} có giáo án · ${withoutPlan} chờ lập giáo án`.
   - **Link điều hướng**: `/training/plans`.

2. **Thẻ KPI 2 - Chờ lập giáo án**:
   - **Label**: `Chờ lập giáo án`.
   - **Value**: `${withoutPlan}`.
   - **Trend line**: Nếu > 0 hiển thị `Cần lập kế hoạch` (màu hổ phách), nếu = 0 hiển thị `✓ Đã phân bổ 100%` (màu xanh lục).
   - **Link điều hướng**: `/training/plans?tab=UNPLANNED`.

---

### II. QUY CHUẨN ĐẾM LÙI HẠN LẬP GIÁO ÁN TRÊN BẢNG DASHBOARD

Tại bảng "Chiến mã chưa có giáo án huấn luyện" (`RoleDashboards.tsx`):
- **Trường hợp Ngựa đã hoàn thành giáo án & Nghỉ ngơi (`r.horse.isRestingCycle || r.horse.status === 'RESTING'`)**:
  - Hiển thị Badge tone `info` (màu xanh dương nhạt): `Nghỉ ngơi hồi phục`.
  - Dòng phụ: `Đã hoàn thành giáo án` (màu `var(--text-muted)`).
  - Tuyệt đối KHÔNG hiển thị nhãn đếm lùi hạn 3 ngày hoặc cảnh báo quá hạn đỏ.
- **Trạng thái Còn hạn (`diffDays >= 0`)**:
  - Dòng trạng thái hiển thị: `Hạn lập giáo án: còn ${diffDays} ngày`.
  - Màu chữ: `var(--warn)` (Màu vàng hổ phách cảnh báo nhẹ), font-weight: 500, font-size: 11px.
- **Trạng thái Quá hạn (`diffDays < 0`)**:
  - Dòng trạng thái hiển thị: `Quá hạn lập giáo án: ${Math.abs(diffDays)} ngày`.
  - Màu chữ: `var(--danger)` (Màu đỏ cảnh báo khẩn cấp), font-weight: 600, font-size: 11px.
- **Trường hợp đã có Bản nháp (`r.plan.status === 'DRAFT'`)**:
  - Hiển thị Badge tone `info` (màu xanh dương): `Bản nháp: ${r.plan.name}`.
  - Ẩn dòng đếm ngược ngày trên dòng đó, nút hành động chuyển thành `Xem & Kích hoạt`.

---

### III. THÔNG BÁO CHỐT CHẶN WIP LIMIT (QUẢN LÝ GÁN NGỰA)
- Khi Quản lý cố gắng gán thêm ngựa cho HLV đang có $\ge 2$ ngựa chưa kích hoạt giáo án:
  - Hiển thị Alert / Toast tone `danger`: *"Huấn luyện viên [Tên HLV] đang tồn 2 chiến mã chưa kích hoạt giáo án. Vui lòng hoàn tất trước khi nhận thêm."*
