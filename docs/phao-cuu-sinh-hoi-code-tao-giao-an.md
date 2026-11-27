# CẨM NANG THỰC CHIẾN BẢO VỆ ĐỒ ÁN: LUỒNG CODE TẠO GIÁO ÁN HUẤN LUYỆN
## DÀNH RIÊNG CHO NGƯỜI KHÔNG CHUYÊN CODE — KỊCH BẢN CHỈ ĐIỂM CODE & THAO TÁC TAY
> **Mục tiêu**: Vượt qua phần vấn đáp code của Hội đồng lúc 9h sáng mai mà không cần học lập trình phức tạp.  
> **Nguyên tắc**: Thuộc lòng tọa độ 4 tệp tin cốt lõi, phím tắt tìm kiếm `Ctrl + P`, `Ctrl + F`, và quy trình trả lời chuẩn xác.

---

## I. BẢN ĐỒ TỌA ĐỘ 4 TỆP TIN CỐT LÕI (IN RA GIẤY CẦM TAY)

Khi Thầy Cô yêu cầu: *"Chỉ cho thầy luồng tạo giáo án chạy từ đâu tới đâu?"*, bạn nhớ đúng 4 trạm dừng sau:

| Trạm | Vai trò | Đường dẫn tệp tin (File Path) | Dòng code chính | Từ khóa bấm `Ctrl + F` tìm nhanh |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Giao diện Web** | `FE/src/features/training/pages/PlanWizardPage.tsx` | **2139 – 2152** | `Lưu giáo án & Tiếp theo: Xếp lịch tập` |
| **2** | **Cầu nối API** | `FE/src/features/training/api.ts` | **368 – 372** | `async createPlan(` |
| **3** | **Đón nhận Backend**| `BE/src/training/training.controller.ts` | **201 – 208** | `@Post('plans')` |
| **4** | **Lưu Database** | `BE/src/training/training-plans.service.ts` | **280 – 295** | `tx.trainingPlan.create` |

---

## II. KỊCH BẢN 4 TÌNH HUỐNG THẦY CÔ BẮT BẺ CODE & HÀNH ĐỘNG TAY

### Tình huống 1: "Cái nút 'Lưu giáo án' ở file nào, sửa thử chữ trên nút cho thầy xem?"
- **Ý đồ Thầy Cô**: Kiểm tra bạn có thực sự biết giao diện đang chạy từ code nào hay không.
- **Thao tác tay của bạn (Làm theo đúng 4 bước)**:
  1. Trong VS Code, bấm phím tắt: **`Ctrl + P`** $\rightarrow$ Gõ: `PlanWizardPage.tsx` $\rightarrow$ Nhấn **Enter**.
  2. Bấm phím tắt: **`Ctrl + F`** $\rightarrow$ Gõ: `Lưu giáo án & Tiếp theo` $\rightarrow$ Con trỏ nhảy ngay đến **dòng 2150**.
  3. Chỉ tay vào màn hình: *"Dạ thưa Thầy, nút bấm nằm ở dòng 2150 của file PlanWizardPage.tsx ạ!"*.
  4. Nếu Thầy bảo sửa chữ: Bạn đổi chữ `Lưu giáo án & Tiếp theo: Xếp lịch tập` thành `Xác nhận tạo giáo án mới`, rồi bấm **`Ctrl + S`** (Lưu file).
  5. Quay lại trình duyệt Web: Do hệ thống có cơ chế Hot-reload tự động, chữ trên màn hình đổi ngay lập tức mà không cần F5. Thầy Cô sẽ thấy bạn thao tác rất tự tin!

---

### Tình huống 2: "Cái icon mũi tên ở nút này ở đâu, xóa nó đi xem nào?"
- **Ý đồ Thầy Cô**: Xem bạn có phân biệt được thẻ JSX icon và text hay không.
- **Thao tác tay của bạn**:
  1. Ngay tại **dòng 2150** của file `PlanWizardPage.tsx`, nhìn ngay phía sau chữ có đoạn mã:
     ```tsx
     <Icon name="arrowRight" inline size={14} />
     ```
  2. Dùng chuột bôi đen đoạn `<Icon name="arrowRight" inline size={14} />` rồi bấm phím **Delete**.
  3. Bấm **`Ctrl + S`** để lưu lại.
  4. Quay lại trình duyệt Web: Mũi tên biến mất ngay lập tức. Bạn trả lời: *"Dạ em đã xóa icon mũi tên rồi ạ!"*.

---

### Tình huống 3: "Bấm nút này thì gọi API nào? Luồng đi từ Frontend sang Backend như thế nào?"
- **Ý đồ Thầy Cô**: Kiểm tra kiến trúc Client - Server.
- **Thao tác tay & Lời thoại của bạn**:
  1. Mở file `PlanWizardPage.tsx`, kéo lên dòng **1156**, chỉ tay:
     - *"Dạ thưa Thầy, khi bấm nút, hàm `save()` sẽ lấy toàn bộ dữ liệu form (Tên giáo án, ngày bắt đầu, ngày kết thúc, các giai đoạn) và gọi hàm `trainingApi.createPlan(payload)` ở dòng 1156 ạ."*
  2. Bấm `Ctrl + P`, gõ mở file `FE/src/features/training/api.ts`, chỉ vào dòng **370**:
     - *"Hàm này dùng phương thức HTTP `POST` để đẩy dữ liệu lên đường dẫn `/training/plans` trên máy chủ Backend."*
  3. Bấm `Ctrl + P`, gõ mở file `BE/src/training/training.controller.ts`, chỉ vào dòng **201**:
     - *"Tại Backend, Controller tiếp nhận endpoint `@Post('plans')` ở dòng 201, kiểm tra đúng quyền HLV Trưởng (`HEAD_TRAINER`) rồi chuyển qua Service để xử lý tiếp."*

---

### Tình huống 4: "Dữ liệu giáo án được lưu vào bảng nào trong Cơ sở dữ liệu?"
- **Ý đồ Thầy Cô**: Kiểm tra cơ sở dữ liệu và ORM.
- **Lời thoại trả lời ngay không cần ngập ngừng**:
  - *"Dạ thưa Thầy, dữ liệu được xử lý trong file `training-plans.service.ts` tại dòng 280, sử dụng Prisma ORM ghi trực tiếp vào bảng **`TrainingPlan`** trong cơ sở dữ liệu PostgreSQL ạ."*
  - *"Khi mới tạo xong, trạng thái của giáo án luôn được gán mặc định là **`DRAFT`** (Bản nháp). Sau khi HLV xếp xong các buổi tập chi tiết và bấm Kích hoạt thì trạng thái mới chuyển sang **`ACTIVE`** ạ!"*

---

## III. 3 PHÍM TẮT SINH TỬ TRONG VS CODE CẦN NHỚ
1. **`Ctrl + P`**: Mở nhanh bất kỳ file nào bằng cách gõ tên file.
2. **`Ctrl + F`**: Tìm kiếm từ khóa hoặc đoạn text trong file đang mở.
3. **`Ctrl + S`**: Lưu file ngay sau khi chỉnh sửa để web tự động cập nhật.

---

> [!IMPORTANT]
> **BÍ QUYẾT GIỮ VỮNG TÂM LÝ**:  
> Thầy Cô chỉ muốn xem bạn có thực sự làm việc trên project này hay không. Khi Thầy Cô hỏi code, bạn cứ bình tĩnh bấm `Ctrl + P` mở đúng file, bấm `Ctrl + F` tìm đúng dòng chữ theo cẩm nang này. Chỉ cần mở đúng file trong vòng 5 giây là bạn đã ghi trọn điểm phong thái và năng lực!
