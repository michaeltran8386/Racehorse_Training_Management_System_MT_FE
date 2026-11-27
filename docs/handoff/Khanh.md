# Báo cáo trạng thái & Handoff — Lê Minh Khánh

- **Cập nhật lúc:** 27/11/2026 23:03 (UTC+7)

## 1. Trạng thái Git (BE & FE)
- **BE (`MT_BE`):** Nhánh hiện tại (`feat/f1-admission-owner-dossier`) | Đã tách trực tiếp từ `origin/dev` mới nhất `1f29903` (`Chậm 0 / Vượt 3 commits`) | Working tree (`Sạch`) | Đã push lên nhánh phụ `origin/feat/f1-admission-owner-dossier` (không chạm `dev`/`main`).
- **FE (`MT_FE`):** Nhánh hiện tại (`feat/f1-admission-owner-dossier`) | Đã tách trực tiếp từ `origin/dev` mới nhất `73138f1` (`Chậm 0 / Vượt 2 commits`) | Working tree (`Sạch`) | Đã push lên nhánh phụ `origin/feat/f1-admission-owner-dossier` (không chạm `dev`/`main`).

## 2. Mục đích & Tính năng đang làm
- **Luồng 1 — Nộp & theo dõi hồ sơ tiếp nhận chiến mã kiểu Cổng Dịch vụ công (Horse Registration & Admission Dossier):**
  - Nâng cấp form đăng ký chiến mã của Chủ ngựa thành tờ khai 3 phần: (1) Thông tin chiến mã, (2) Đính kèm tối đa 3 ảnh giấy tờ pháp lý rõ chữ (hỗ trợ tải ảnh từ máy + 2 mẫu ảnh demo 1-click + xem phóng to lightbox), (3) Khung ghi chú mong muốn gửi CLB (`ownerNotes`) kèm cam kết thông tin.
  - Xây dựng **Phiếu theo dõi hồ sơ 4 bước** cho Chủ ngựa (nhúng ở đầu trang chi tiết ngựa và trang riêng **`Hồ sơ đã nộp`** tại `/horses/my-admissions`): hiển thị mã `ADM`, lịch hẹn, Quản lý & Bác sĩ phụ trách, lời nhắn hướng dẫn từ CLB, nhật ký xử lý; cho phép **Bổ sung giấy tờ / Sửa ghi chú** khi `PENDING_VERIFICATION`, **Rút hồ sơ** trước thẩm định, và **Nộp lại hồ sơ** khi bị từ chối/hủy.
  - Phía Quản lý CLB: hiển thị trực tiếp **Ghi chú mong muốn & Bộ ảnh giấy tờ pháp lý** của Chủ ngựa ngay trong modal **Xếp lịch hẹn** và modal **Thẩm định** để đọc yêu cầu trước khi xếp giờ và đối chiếu bản gốc; đồng bộ cảnh báo & nút hủy **quá hạn ≥ 3 ngày** với `effectiveNow()` / `getDemoDate()`.
  - Bảo mật vai trò: mở `GET /horses/admissions` và `GET /horses/admissions/:id/history` cho `HORSE_OWNER` với bộ lọc bắt buộc `ownerId = user.userId` và tự động ẩn toàn bộ ghi chú thẩm định nội bộ của Staff (`legalDocumentsNote`, `healthCheckNotes`, `healthReviews`, `isHealthEligible`).
- **Liên kết PR:** Nhánh phụ `feat/f1-admission-owner-dossier` đã push sẵn lên `origin` ở cả 2 repo để Lead review và mở PR vào `dev`.

## 3. Danh sách file đã tạo / chỉnh sửa & Mục đích

### Backend (`MT_BE` — `git diff --name-status origin/dev..HEAD`)
| File | Loại | Mục đích |
|---|---|---|
| `prisma/schema.prisma` | Sửa | Thêm 2 cột nullable `documentPhotos Json?` và `ownerNotes String?` vào model `HorseAdmissionRecord`. |
| `src/common/constants/http.ts` | Sửa | Nâng `JSON_BODY_LIMIT` từ `256KB` lên `2MB` để hỗ trợ tải tối đa 3 ảnh giấy tờ pháp lý rõ nét. |
| `src/horses/dto/create-horse.dto.ts` | Sửa | Thêm `AdmissionDocumentPhotoDto`, `documentPhotos` (tối đa 3 ảnh) và `ownerNotes` (tối đa 1000 ký tự). |
| `src/horses/dto/admission.dto.ts` | Sửa | Thêm `UpdateOwnerAdmissionSubmissionDto` cho API chủ ngựa bổ sung giấy tờ / sửa ghi chú khi chưa xếp lịch. |
| `src/horses/horses.controller.ts` | Sửa | Mở `GET /horses/admissions` & `GET /horses/admissions/:id/history` cho `HORSE_OWNER`; thêm `PATCH /horses/admissions/:id/submission`. |
| `src/horses/horses.service.ts` | Sửa | Lưu `ownerNotes`/`documentPhotos`, trả `latestAdmission` đã che trường nội bộ cho Chủ ngựa, ép lọc `ownerId`, thêm `updateOwnerSubmission`, thông báo chuông cho Chủ ngựa khi xếp lịch, dùng `effectiveNow()` cho kiểm tra quá hạn 3 ngày. |
| `docs/handoff/Khanh.md` | Thêm | Báo cáo trạng thái & bàn giao tiến độ theo mẫu của nhóm trưởng. |

### Frontend (`MT_FE` — `git diff --name-status origin/dev..HEAD`)
| File | Loại | Mục đích |
|---|---|---|
| `src/features/horses/components/LegalDocumentsUploader.tsx` | Thêm | Component tải tối đa 3 ảnh giấy tờ pháp lý (kèm 2 ảnh mẫu demo 1-click) và `LegalDocumentsGallery` phóng to lightbox. |
| `src/features/horses/components/LegalDocumentsUploader.module.css` | Thêm | Styling cho khung tải giấy tờ pháp lý, lưới ảnh và lightbox. |
| `src/features/horses/components/OwnerAdmissionDossierCard.tsx` | Thêm | Phiếu theo dõi hồ sơ kiểu Dịch vụ công (stepper 4 bước, lịch hẹn, lời nhắn CLB, bổ sung giấy tờ/ghi chú, rút hồ sơ, nộp lại, nhật ký xử lý). |
| `src/features/horses/components/OwnerAdmissionDossierCard.module.css` | Thêm | Styling cho phiếu theo dõi hồ sơ Dịch vụ công và thanh tiến độ 4 bước. |
| `src/features/horses/pages/OwnerAdmissionsPage.tsx` | Thêm | Trang **`Hồ sơ đã nộp`** (`/horses/my-admissions`) cho `HORSE_OWNER` kèm lọc trạng thái và tìm kiếm. |
| `src/features/horses/pages/HorseFormPage.tsx` | Sửa | Nâng cấp thành tờ khai 3 phần (upload ảnh giấy tờ pháp lý, ghi chú mong muốn + chip gợi ý, tick cam kết, hỗ trợ `?reapply=<horseId>`). |
| `src/features/horses/pages/HorseDetailPage.tsx` | Sửa | Nhúng `OwnerAdmissionDossierCard` ở đầu trang chi tiết ngựa cho Chủ ngựa. |
| `src/features/horses/pages/HorseListPage.tsx` | Sửa | Thêm nút nhanh **`Hồ sơ đã nộp`** cho Chủ ngựa. |
| `src/features/horses/pages/HorseAdmissionListPage.tsx` | Sửa | Hiện badge số ảnh pháp lý & ghi chú chủ ngựa; tính quá hạn ≥ 3 ngày theo `getDemoDate()` kèm badge đỏ `Quá hạn X ngày`. |
| `src/features/horses/components/AdmissionScheduleModal.tsx` | Sửa | Hiện khung **Tờ khai của Chủ ngựa** (ghi chú mong muốn + ảnh giấy tờ phóng to) ngay đầu modal xếp lịch. |
| `src/features/horses/components/AdmissionInspectionModal.tsx` | Sửa | Hiện ghi chú mong muốn & thư viện ảnh giấy tờ chủ nộp trong modal thẩm định để đối chiếu bản gốc; không ghi đè `documentsUrl` khi lưu thẩm định. |
| `src/features/horses/services/admissionService.ts` | Sửa | Thêm `extractAdmissionDocumentPhotos` và `updateOwnerAdmissionSubmission` (`PATCH /horses/admissions/:id/submission`). |
| `src/features/horses/types.ts` | Sửa | Bổ sung `latestAdmission`, `admissionRecords` trên `Horse` và `ownerNotes`, `documentPhotos`, `documentsUrl` trên `CreateHorsePayload`. |
| `src/features/horses/types/admission.types.ts` | Sửa | Thêm `AdmissionDocumentPhoto`, `UpdateOwnerAdmissionSubmissionDto` và mở rộng `HorseAdmissionRecord` (`ownerNotes`, `documentPhotos`, `manager`, `horse.weightKg`). |
| `src/shared/utils/imageCompressor.ts` | Sửa | Thêm tùy chọn `maxBytes` (mặc định giữ nguyên `50KB` cho avatar; giấy tờ pháp lý nén `1280×1600`, `220KB` để rõ chữ). |
| `src/app/lazyPages.ts` | Sửa | Đăng ký lazy-load cho `OwnerAdmissionsPage`. |
| `src/app/router.tsx` | Sửa | Thêm route `/horses/my-admissions`. |
| `src/shared/lib/permissions.ts` | Sửa | Thêm mục menu **`Hồ sơ đã nộp`** cho `HORSE_OWNER`, cấu hình `isNavItemActive` và `screenAccess`. |
| `src/shared/lib/navigation.ts` | Sửa | Thêm breadcrumb cho `/horses/my-admissions` và tránh khớp nhầm `/horses/:id`. |
| `docs/handoff/Khanh.md` | Thêm | Báo cáo trạng thái & bàn giao tiến độ theo mẫu của nhóm trưởng. |

## 4. Thay đổi Database / Env (nếu có)
- **Database (`MT_BE/prisma/schema.prisma`):** Thêm 2 cột nullable trên bảng `HorseAdmissionRecord`:
  - `documentPhotos Json?`
  - `ownerNotes String?`
  - Tương thích 100% với dữ liệu cũ; chỉ cần chạy `npx prisma db push` (đúng quy trình CI `database-schema-check` của nhóm trong `.github/workflows/ci.yml`).
- **Biến `.env`:** Không thêm hay sửa biến `.env` bắt buộc nào.
- **Script seed:** Không sửa `prisma/seed-demo-flow.ts` (giữ nguyên từ `origin/dev`).

## 5. Trạng thái kiểm tra & Việc còn tồn đọng
- **Kết quả kiểm tra mới nhất trên chính nhánh `feat/f1-admission-owner-dossier`:**
  - **BE (`MT_BE`):**
    - `npm run lint` (`eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0`): **PASS** (0 errors, 0 warnings toàn repo).
    - `npm run typecheck` (`tsc --noEmit`): **PASS** (exit 0).
    - `npm run build` (`nest build`): **PASS** (exit 0).
    - Unit tests (`npx jest src/horses/ --runInBand`): **PASS** (**8/8 suites, 168/168 tests passed**).
    - E2E tests (`test/rbac-matrix.e2e-spec.ts` + `test/horses.e2e-spec.ts`): **PASS** (**2/2 suites, 32/32 tests passed**).
  - **FE (`MT_FE`):**
    - `npm run lint` (`oxlint`): **PASS** (0 errors; 217 warnings toàn repo).
    - `npm run typecheck` (`tsc --noEmit`): **PASS** (exit 0).
    - `npm run build` (`tsc --noEmit && vite build`): **PASS** (0 errors, built in 996ms).
    - Unit tests (`node --experimental-strip-types --test tests/unit/*.test.ts`): **PASS** (**70/70 tests passed**, 0 fail).
- **Việc còn tồn đọng / lưu ý khi Lead review & demo:**
  1. **Lưu ý dữ liệu seed Luồng 1:** Trong `prisma/seed-demo-flow.ts` trên `origin/dev`, tài khoản `owner@gmail.com` (`Robert Sterling`) đang gắn cờ nợ xấu (`isBadDebtFlagged = true`) nên BE sẽ chặn đăng ký ngựa mới (`OWNER_BAD_DEBT`) — khi demo nộp hồ sơ ngựa mới cần dùng thêm 1 tài khoản Chủ ngựa không nợ xấu hoặc đăng ký tài khoản mới.
  2. **Lưu ý Resend free quota:** Key Resend dùng chung của nhóm có giới hạn 100 email/ngày (tối 27/11 đã chạm `HTTP 429` khi cả nhóm test đồng thời).
  3. Chờ Lead review nhánh `feat/f1-admission-owner-dossier` và quyết định merge vào `dev` (chạy `npx prisma db push` sau khi merge BE).
