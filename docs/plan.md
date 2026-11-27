# KẾ HOẠCH TRIỂN KHAI (PLAN)
## KẾ HOẠCH XỬ LÝ TRIỆT ĐỂ KẼ HỞ SLA & DỌN DẸP MÃ NGUỒN RÁC
**Dự án**: EquiFlow - Hệ thống Quản lý Huấn luyện & Chuồng trại Ngựa đua  
**Phiên bản**: v47.0.0  
**Tác giả**: Ban BA / PM & Kỹ thuật  
**Trạng thái**: Hoàn tất Ca 1 & Ca 2 — Chờ chữ "DUYỆT" từ User để chuyển sang Ca 3 (Dev)

---

### I. CÁC CA LÀM VIỆC THEO QUY TRÌNH PHÒNG BAN

#### Ca 1 (BA / PM) - Hoàn thành & Chờ duyệt Chốt 1
- [x] Rà soát toàn bộ source code phân hệ Huấn luyện viên và phát hiện kẽ hở SLA ngựa hoàn thành giáo án.
- [x] Lập đặc tả nghiệp vụ chi tiết và tiêu chuẩn nghiệm thu trong [docs/brief.md](file:///d:/02_Code/My_Project/docs/brief.md) v47.0.0.
- [x] Lập kế hoạch triển khai [docs/plan.md](file:///d:/02_Code/My_Project/docs/plan.md) v47.0.0.

#### Ca 2 (UI / UX) - Hoàn thành & Chờ duyệt Chốt 2
- [x] Cập nhật quy chuẩn giao diện trong [docs/design-system.md](file:///d:/02_Code/My_Project/docs/design-system.md) v47.0.0:
  - Trạng thái dòng Dashboard khi ngựa hoàn thành giáo án: Hiển thị badge tone info `Nghỉ ngơi hồi phục`, ẩn dòng cảnh báo hạn deadline.

#### Ca 3 (Dev) - Chờ chữ "DUYỆT" từ User để sửa mã nguồn
- [ ] **Task 3.1**: Sửa [BE/src/training/training-insights.service.ts](file:///d:/02_Code/My_Project/BE/src/training/training-insights.service.ts):
  - Bổ sung kiểm tra giáo án `COMPLETED` để gán `planDeadlineAt: null` và `isRestingCycle: true` cho ngựa đang nghỉ ngơi sau giáo án.
- [ ] **Task 3.2**: Sửa [FE/src/features/dashboard/components/RoleDashboards.tsx](file:///d:/02_Code/My_Project/FE/src/features/dashboard/components/RoleDashboards.tsx):
  - Render Badge `Nghỉ ngơi hồi phục` cho ngựa đã xong giáo án, không tính vào nhóm nợ hạn deadline.
- [ ] **Task 3.3**: Dọn dẹp mã nguồn rác (Dead code):
  - Xóa [FE/src/features/training/pages/PlanHistoryPage.tsx](file:///d:/02_Code/My_Project/FE/src/features/training/pages/PlanHistoryPage.tsx).
  - Xóa [FE/src/features/training/components/.gitkeep](file:///d:/02_Code/My_Project/FE/src/features/training/components/.gitkeep).
  - Xóa import `PlanHistoryPage` trong `router.tsx` và `lazyPages.ts`.

#### Ca 4 (QA / QC) - Kiểm thử và nghiệm thu
- [ ] **Task 4.1**: Chạy kiểm thử Unit test Backend: `npm test` trong `BE`.
- [ ] **Task 4.2**: Chạy kiểm thử Build Frontend: `npm run build` trong `FE`.
- [ ] **Task 4.3**: Chạy biên dịch Backend: `npm run build` trong `BE`.
- [ ] **Task 4.4**: Cập nhật đồng bộ [docs/status.json](file:///d:/02_Code/My_Project/docs/status.json).

---

### I. CÁC CA LÀM VIỆC THEO QUY TRÌNH PHÒNG BAN

#### Ca 1 (BA / PM) - Hoàn thành & Chờ duyệt Chốt 1
- [x] Rà soát và xác định nguyên nhân gốc rễ 3 lỗi: KPI Dashboard hiển thị nhầm biến `inTraining`, Dashboard hardcode tĩnh hạn 3 ngày, và công thức SLA lũy tiến nới ngày.
- [x] Lập đặc tả nghiệp vụ chi tiết và tiêu chuẩn nghiệm thu trong [docs/brief.md](file:///d:/02_Code/My_Project/docs/brief.md) v46.0.0.
- [x] Cập nhật kế hoạch triển khai [docs/plan.md](file:///d:/02_Code/My_Project/docs/plan.md) v46.0.0.

#### Ca 2 (UI / UX) - Hoàn thành & Chờ duyệt Chốt 2
- [x] Cập nhật quy chuẩn giao diện trong [docs/design-system.md](file:///d:/02_Code/My_Project/docs/design-system.md) v46.0.0:
  - Thẻ KPI 1: Hiển thị giá trị chuẩn `${totalHorses} / 8`.
  - Bảng "Chiến mã chưa có giáo án": Hiển thị đếm lùi động `Còn X ngày` (vàng) hoặc `Quá hạn X ngày` (đỏ).
  - Thông báo lỗi chặn khi Quản lý cố gán vượt WIP Limit.

#### Ca 3 (Dev) - Chờ chữ "DUYỆT" từ User để sửa mã nguồn
- [ ] **Task 3.1**: Sửa [RoleDashboards.tsx](file:///d:/02_Code/My_Project/FE/src/features/dashboard/components/RoleDashboards.tsx):
  - Dòng 923: Đổi `value` sang `${totalHorses} / 8`.
  - Dòng 1176: Thay thế chuỗi tĩnh bằng logic tính `diffDays` từ `r.horse.planDeadlineAt`.
- [ ] **Task 3.2**: Sửa [horses.service.ts](file:///d:/02_Code/My_Project/BE/src/horses/horses.service.ts):
  - Hàm `respondHandover`: Bổ sung `assignedTrainerId: req.toTrainerId` khi `ACCEPT`.
  - Hàm `respondHandover`: Đổi công thức tính hạn thành cố định `const days = 3;`.
  - Hàm `assignTrainer`: Bổ sung chốt chặn WIP Limit (`pendingPlanCount >= 2` $\rightarrow$ ném lỗi).
- [ ] **Task 3.3**: Cập nhật file seed [seed-master.ts](file:///d:/02_Code/My_Project/BE/prisma/seed-master.ts): Chuẩn hóa dữ liệu đàn ngựa ban đầu của HLV Tuấn là 7 con để khi tiếp nhận Hắc Long Mã nhảy lên 8/8 chuẩn bài.

#### Ca 4 (QA / QC) - Kiểm thử và nghiệm thu
- [ ] **Task 4.1**: Build kiểm tra Frontend: `npm run build` trong `FE`.
- [ ] **Task 4.2**: Chạy kiểm thử Backend: `npm test` trong `BE`.
- [ ] **Task 4.3**: Chạy seed và đối soát toàn vẹn DB: `npm run db:seed:master && npm run db:verify`.
- [ ] **Task 4.4**: Cập nhật đồng bộ [docs/status.json](file:///d:/02_Code/My_Project/docs/status.json) sang `qa` $\rightarrow$ `waiting_approval`.
