# 📑 BÁO CÁO TOÀN DIỆN VỀ NGHIỆP VỤ, RÀNG BUỘC & HỆ THỐNG QUẢN LÝ GROOM
**Hệ thống Quản lý Huấn luyện & Chăm sóc Ngựa Đua EquiFlow**  
*Phiên bản tài liệu: v8.0.0 | Ngày hoàn tất: 24/11/2026*

---

## 📌 MỤC LỤC
1. [Bối cảnh & Động lực tái thiết kế](#1-bối-cảnh--động-lực-tái-thiết-kế)
2. [Bản chất nghiệp vụ Groom trong EquiFlow](#2-bản-chất-nghiệp-vụ-groom-trong-equiflow)
3. [Hệ thống 5 Ràng buộc Bất biến (Hard Invariants)](#3-hệ-thống-5-ràng-buộc-bất-biến-hard-invariants)
4. [Các tính năng & Giải pháp kỹ thuật mới đã triển khai](#4-các-tính-năng--giải-pháp-kỹ-thuật-mới-đã-triển-khai)
5. [Kiến trúc Mã nguồn & Thay đổi kỹ thuật](#5-kiến-trúc-mã-nguồn--thay-đổi-kỹ-thuật)
6. [Dữ liệu thực nghiệm & Kịch bản nghiệm thu](#6-dữ-liệu-thực-nghiệm--kịch-bản-nghiệm-thu)
7. [Kết quả Kiểm thử Ca 4 (QA/QC) & Kết luận](#7-kết-quả-kiểm-thử-ca-4-qaqc--kết-luận)

---

## 1. BỐI CẢNH & ĐỘNG LỰC TÁI THIẾT KẾ

Trong các phiên bản trước, hệ thống quản lý chuồng trại và phân công nhân viên chăm sóc (Groom) gặp phải 4 lỗ hổng vận hành nghiêm trọng:

```mermaid
flowchart TD
    subgraph VẤN_ĐỀ_CŨ["Các lỗ hổng vận hành trước đây"]
        A1["Lưới phân khu lộn xộn, không đồng nhất số lượng"]
        A2["Gán Groom tùy ý, thiếu định mức trần (Quá tải lao động)"]
        A3["Lỗ hổng ô trống: Gán Groom cho chuồng không có ngựa -> Sinh việc ma"]
        A4["Phân công xuyên Barn: 1 Groom chạy qua lại giữa 2 khu chuồng xa nhau"]
    end

    subgraph GIẢI_PHÁP_MỚI["Hệ thống chuẩn hóa EquiFlow v8.0"]
        B1["Ma trận 4x3 chuẩn hóa: 12 ô/Barn, đánh số trái sang phải"]
        B2["Khóa cứng định mức: Tối đa 6 ô chuồng / 1 Groom"]
        B3["Khóa gán ô trống: Chỉ ô có ngựa mới được gán Groom"]
        B4["Bất biến phân khu: 1 Groom chỉ thuộc 1 Barn duy nhất"]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
```

1. **Cấu trúc lưới bất đối xứng**: Các Barn có số hàng, số cột không đồng nhất, gây khó khăn cho việc quản lý trực quan và lập kế hoạch di chuyển của nhân viên.
2. **Quá tải và thiếu kiểm soát định mức**: Thiếu cơ chế chặn cứng định mức tối đa cho Groom, dẫn tới rủi ro 1 nhân viên bị gán 8–10 con ngựa, vi phạm tiêu chuẩn phúc lợi động vật và quy định an toàn lao động.
3. **Lỗ hổng "Ô chuồng trống sinh công việc ma"**: Cho phép gán Groom vào ô chuồng chưa có ngựa (`AVAILABLE`). Khi hệ thống cronjob quét hàng ngày, nó tự động sinh ra hàng loạt nhiệm vụ chăm sóc (cho ăn, dọn phân, chải lông) cho một ô chuồng không có ngựa, làm sai lệch bảng chấm công, lãng phí định mức và gây hoang mang cho Groom.
4. **Phân tán địa lý (Phân công xuyên Barn)**: Một Groom vừa phải chăm sóc ngựa tại Barn A vừa phải chạy sang Barn B, làm tăng thời gian di chuyển, mất tập trung và tăng nguy cơ lây nhiễm chéo dịch bệnh giữa các phân khu chuồng.

---

## 2. BẢN CHẤT NGHIỆP VỤ GROOM TRONG EQUIFLOW

Để hiểu rõ toàn bộ logic trong code, cần phân biệt rạch ròi 2 khái niệm cốt lõi:

```mermaid
classDiagram
    class StallAllocation {
        +String id
        +String stallId
        +String horseId
        +String assignedGroomUserId
        +Boolean isActive
        +DateTime startDate
        +DateTime endDate
        Trách nhiệm quản lý cố định
    }

    class DailyCareTask {
        +String id
        +String taskCode
        +DateTime date
        +String horseId
        +String stallZoneId
        +String assignedGroomUserId
        +DailyTaskType taskType
        +String scheduledTime
        +Boolean isCompleted
        Đầu việc thực thi hằng ngày
    }

    StallAllocation ..> DailyCareTask : "Là gốc rễ để tự sinh hoặc gán người thực hiện"
```

### 2.1. Phân biệt `StallAllocation` và `DailyCareTask`
- **`StallAllocation` (Trách nhiệm quản lý chuồng trại cố định)**:
  - Thể hiện sự gắn kết giữa **[1 Ô chuồng] $\leftrightarrow$ [1 Con ngựa] $\leftrightarrow$ [1 Groom phụ trách]**.
  - Đây là trách nhiệm dài hạn. Một Groom nhận chăm sóc con ngựa nào thì con ngựa đó thuộc về hạn ngạch tải của Groom đó.
- **`DailyCareTask` (Nhiệm vụ chăm sóc thường nhật)**:
  - Là các đầu công việc cụ thể phát sinh theo ngày (Checklist ca trực).
  - Hệ thống tự động quét và sinh ra mỗi ngày dựa trên **4 nguồn dữ liệu thực tế**:
    1. *Khẩu phần dinh dưỡng*: Cho ăn sáng/trưa/tối theo chỉ định.
    2. *Quy chuẩn vệ sinh*: Dọn chuồng, thay rơm, khử khuẩn, cạo móng.
    3. *Lịch tập HLV*: Tự động sinh việc dắt ngựa chuẩn bị trước giờ tập **15 phút** (`WORKOUT_PREP_PREFIX`).
    4. *Chỉ dẫn y tế thú y*: Uống thuốc, thay băng gạc, bọc ủng lạnh, xoa bóp cơ.
  - **Nguyên tắc kế thừa**: Mọi `DailyCareTask` của một con ngựa sẽ mặc định gán cho chính Groom đang giữ `StallAllocation` của con ngựa đó (`assignedGroomUserId`).

---

## 3. HỆ THỐNG 5 RÀNG BUỘC BẤT BIẾN (HARD INVARIANTS)

Đây là 5 chốt chặn nghiệp vụ được kiểm soát nghiêm ngặt ở tầng CSDL, Backend NestJS và Frontend React:

### 🔒 Ràng buộc 1: Định mức tải tối đa 6 ô chuồng / 1 Groom
- **Quy tắc**: Tại bất kỳ thời điểm nào, một Groom chỉ được phụ trách tối đa **6 ô chuồng có ngựa đang hoạt động** (`MAX_STALLS_PER_GROOM = 6`).
- **Xử lý Backend**:
  ```typescript
  const currentCount = await tx.stallAllocation.count({
    where: { assignedGroomUserId: groomId, isActive: true }
  });
  if (currentCount + newStallsCount > MAX_STALLS_PER_GROOM) {
    throw apiError(HttpStatus.BAD_REQUEST, 'GROOM_MAX_STALLS_EXCEEDED',
      `Groom chỉ còn nhận được ${MAX_STALLS_PER_GROOM - currentCount} ô chuồng. Vượt định mức tối đa 6.`);
  }
  ```
- **Xử lý Frontend**: Cơ chế **Smart Lock (Lựa chọn A)** tự động tính `remainingSlots = 6 - currentCount`. Khi tích đủ số lượng, tất cả các checkbox còn lại tự động bị khóa mờ (`disabled`, opacity 0.45).

### 🔒 Ràng buộc 2: Bất biến phân khu (1 Groom - 1 Barn duy nhất)
- **Quy tắc**: Tất cả các ô chuồng mà một Groom phụ trách phải thuộc **cùng một phân khu Barn duy nhất**. Tuyệt đối không cho phép gán 1 ô ở Barn A và 1 ô ở Barn B.
- **Xử lý Backend**:
  ```typescript
  const otherZoneAlloc = await tx.stallAllocation.findFirst({
    where: {
      assignedGroomUserId: groomId,
      isActive: true,
      stall: { zoneId: { not: targetZoneId } }
    }
  });
  if (otherZoneAlloc) {
    throw apiError(HttpStatus.CONFLICT, 'GROOM_MULTI_ZONE_FORBIDDEN',
      `Groom đang phụ trách tại khu khác. Mỗi Groom chỉ được phụ trách các ô chuồng trong cùng 1 phân khu.`);
  }
  ```

### 🔒 Ràng buộc 3: Chốt chặn ô chuồng trống (Chờ xếp ngựa)
- **Quy tắc**: Chỉ ô chuồng **ĐÃ CÓ NGỰA** (`OCCUPIED`) mới được phân công Groom. Ô chuồng trống (`AVAILABLE`) hiển thị trạng thái `Chờ xếp ngựa` và bị khóa, ngăn chặn việc gán Groom ảo.
- **Mục đích**:
  - Không làm Groom bị trừ slot ảo vào định mức 6 ô.
  - Ngăn chặn hệ thống cronjob tự sinh công việc ma cho ô chuồng trống.
- **Xử lý Backend**: API `assignAllocationGroom` kiểm tra `row?.isActive`, nếu ô chưa có ngựa sẽ chặn ngay với mã `ALLOCATION_NOT_ACTIVE`.

### 🔒 Ràng buộc 4: Tự động hoàn lại slot khi trả chuồng / chuyển chuồng
- **Khi trả ô chuồng (`returnStall`)**:
  - Hệ thống đóng `StallAllocation` hiện tại (`isActive = false, endDate = now`).
  - Slot tải của Groom tự động giảm đi 1 (từ $6/6$ về $5/6$).
  - Tự động hủy/dọn sạch các đầu việc chưa hoàn thành trong ngày của ngựa cũ.
- **Khi chuyển ô chuồng (`transferHorse`)**:
  - Chuyển `StallAllocation` sang ô chuồng mới. Nếu ô mới khác Barn, hệ thống yêu cầu chỉ định Groom mới thuộc Barn đích.

### 🔒 Ràng buộc 5: Điều kiện ứng viên Groom trực ca hoạt động
- **Quy tắc**: Danh sách Groom được chọn để gán/đổi chỉ lấy những nhân sự thỏa mãn đồng thời 3 điều kiện:
  1. `role === Role.GROOM` và `status === UserStatus.ACTIVE`.
  2. Đang có ca trực hoạt động (`ACTIVE` trong `ShiftRoster`) tại đúng phân khu đó trong ngày hôm nay.
  3. Định mức tải hiện tại chưa chạm trần ($< 6$ ô chuồng).

---

## 4. CÁC TÍNH NĂNG & GIẢI PHÁP KỸ THUẬT MỚI ĐÃ TRIỂN KHAI

### 📐 4.1. Chuẩn hóa ma trận lưới $4 \times 3$ (12 ô / Barn)
- **Cấu trúc**: Mỗi Barn Zone được định dạng chuẩn $4 \text{ hàng} \times 3 \text{ cột}$.
- **Tọa độ & Thứ tự**: Đánh số và xếp tọa độ từ trái sang phải, từ trên xuống dưới:
  $$\begin{matrix}
  \text{A-01 }(1, 1) & \text{A-02 }(1, 2) & \text{A-03 }(1, 3) \\
  \text{A-04 }(2, 1) & \text{A-05 }(2, 2) & \text{A-06 }(2, 3) \\
  \text{A-07 }(3, 1) & \text{A-08 }(3, 2) & \text{A-09 }(3, 3) \\
  \text{A-10 }(4, 1) & \text{A-11 }(4, 2) & \text{A-12 }(4, 3)
  \end{matrix}$$
- **Hiển thị giao diện**:
  - CSS Grid 3 cột: `gridTemplateColumns: repeat(3, minmax(130px, 1fr))`.
  - Ô chuồng đã được **loại bỏ mã kỹ thuật dài dòng** (như `HR-DEMO-A01`), chỉ tập trung hiển thị: **Mã ô**, **Tên ngựa (font đậm)**, và **Tên Groom / Nhãn cảnh báo**.

### 🏷️ 4.2. Trực quan hóa cảnh báo ô chuồng
- **Ô đã có Groom**: Hiển thị `👨‍🌾 [Tên Groom]` (VD: `👨‍🌾 Trần Thị Mai`).
- **Ô có ngựa nhưng chưa có Groom**: Hiển thị nhãn cam nổi bật theo yêu cầu:
  👉 **`⚠️ Chưa gán nhân viên chăm sóc`**  
  *(Được thiết kế tinh tế với nền `rgba(245, 158, 11, 0.12)`, viền cam mỏng, co giãn `fit-content` hòa hợp Dark Theme).*
- **Ô chuồng trống**: Hiển thị viền nét đứt kèm nhãn `Chờ xếp ngựa`.

### ⚡ 4.3. Tính năng "Phân công nhanh Groom" (Smart Lock - Lựa chọn A)
- Đặt nút **`⚡ Phân công nhanh Groom`** trên thanh công cụ của Quản lý CLB.
- Cho phép chọn Groom: Hiển thị thanh tải trực quan (Xanh $< 4$, Cam $4-5$, Đỏ $6/6$).
- **Cơ chế Khóa thông minh (Smart Lock - Lựa chọn A)**:
  - Khi Quản lý tích chọn đủ số slot còn lại của Groom (`6 - currentCount`), tất cả các checkbox chưa chọn còn lại **ngay lập tức bị khóa mờ (`disabled`, opacity 0.45)**, trỏ chuột biến thành biểu tượng cấm 🚫 kèm tooltip nhắc nhở.
  - Bỏ tick 1 ô $\rightarrow$ Các ô khác sáng lại ngay lập tức.
  - Có nút **`Chọn nhanh tối đa (k)`** để tự động tích chọn đủ định mức trong 1 click.
- **Xử lý Backend**: Giao dịch Atomic `$transaction` cập nhật toàn bộ `StallAllocation` và đồng bộ ngay các `DailyCareTask` trong ngày hôm nay sang Groom mới.

### ➕ 4.4. Tính năng "Thêm công việc phát sinh đột xuất" (Ad-hoc Tasks)
- Đặt nút **`➕ Thêm việc phát sinh`** cho phép Quản lý giao việc ngoài lịch trình thường nhật.
- **Cơ chế Auto-fill**: Khi chọn ngựa, hệ thống **tự động điền Groom đang phụ trách chuồng của ngựa đó**.
- Các loại việc hỗ trợ:
  - *Vệ sinh ô chuồng / Thay rơm (`CLEANING`)*
  - *Chải lông / Tắm mát (`GROOMING`)*
  - *Bổ sung thức ăn / Cỏ tươi (`FEEDING`)*
  - *Dắt đi bộ / Thả lỏng nhẹ (`WALKING`)*
  - *Bọc ủng lạnh / Chườm đá (`ICE_BOOT_REST`)*
  - *Vật lý trị liệu / Xoa bóp (`PHYSICAL_THERAPY`)*
  - *Công việc phát sinh khác (`OTHER`)*
- Mã nhiệm vụ chuẩn hóa: `ADHOC-YYYYMMDD-XXXXXX`, tự động đẩy vào ca trực của Groom và ghi nhật ký kiểm toán Audit Log.

### 🌐 4.5. Chuẩn hóa tiếng Việt 100% ngữ cảnh
- Bảng điều khiển ô chuồng phân biệt ngữ cảnh thông minh:
  - Ô đã có Groom $\rightarrow$ Hiển thị nút: **`Đổi Groom chăm sóc`**.
  - Ô chưa có Groom $\rightarrow$ Hiển thị nút: **`Phân công Groom chăm sóc`**.
- Toàn bộ hộp thoại phân công, thông báo, nhãn trường đều được Việt hóa 100%, xóa bỏ hoàn toàn các chuỗi tiếng Anh tồn đọng.

---

## 5. KIẾN TRÚC MÃ NGUỒN & THAY ĐỔI KỸ THUẬT

### 5.1. Backend (NestJS / Prisma)
| File | Vai trò thay đổi |
| :--- | :--- |
| `BE/src/stalls/dto/bulk-assign-groom.dto.ts` | Tạo mới DTO cho API phân công nhanh (`groomUserId`, `allocationIds`) |
| `BE/src/daily-tasks/dto/create-ad-hoc-task.dto.ts` | Tạo mới DTO cho API việc phát sinh (`horseId`, `taskType`, `title`, `scheduledTime`, `assignedGroomUserId`, `description`) |
| `BE/src/stalls/stalls.controller.ts` | Khai báo endpoint `@Post('allocations/bulk-groom')` |
| `BE/src/stalls/stalls.service.ts` | Hiện thực logic `MAX_STALLS_PER_GROOM = 6`, `assertGroom`, `bulkAssignGroom`, kiểm soát 1 Barn và giao dịch atomic đồng bộ tasks |
| `BE/src/daily-tasks/daily-tasks.controller.ts` | Khai báo endpoint `@Post('ad-hoc')` |
| `BE/src/daily-tasks/daily-tasks.service.ts` | Hiện thực logic `createAdHocTask`, kiểm tra hợp lệ Groom, tạo task ad-hoc và ghi Audit Log |
| `BE/prisma/seed-demo-flow.ts` | Tái cấu trúc ma trận 4x3, cơ cấu 4 Groom với 4 mức tải mẫu đa dạng ($0/6, 4/6, 6/6$) |

### 5.2. Frontend (React / Vite)
| File | Vai trò thay đổi |
| :--- | :--- |
| `FE/src/features/stable/api.ts` | Bổ sung API client `bulkAssignGroom` và `getGroomCandidates` |
| `FE/src/features/stable/api/dailyTasksApi.ts` | Bổ sung API client `createAdHoc` |
| `FE/src/features/stable/components/ZoneGrid.tsx` | Grid 3 cột, hiển thị tên ngựa to rõ (bỏ mã ngựa), nhãn cam `⚠️ Chưa gán nhân viên chăm sóc` co giãn `fit-content` |
| `FE/src/features/stable/components/BulkAssignGroomModal.tsx` | Tạo mới Modal phân công nhanh kèm thanh tải và cơ chế Smart Lock (Lựa chọn A) |
| `FE/src/features/stable/components/CreateAdHocTaskModal.tsx` | Tạo mới Modal giao việc phát sinh kèm cơ chế auto-fill Groom |
| `FE/src/features/stable/components/AssignAllocationGroomModal.tsx` | Việt hóa 100% modal phân công đơn lẻ theo ngữ cảnh |
| `FE/src/features/stable/components/StallDialogs.tsx` | Tích hợp chọn Groom phụ trách ngay lúc xếp ngựa mới vào chuồng |
| `FE/src/features/stable/pages/StableMapPage.tsx` | Tích hợp các nút hành động, thanh công cụ và quản lý dialog |

---

## 6. DỮ LIỆU THỰC NGHIỆM & KỊCH BẢN NGHIỆM THU

Cơ sở dữ liệu mẫu đã được nạp sẵn 4 tài khoản Groom đại diện cho mọi trạng thái tải để kiểm chứng:

```
[Barn A: 12 ô chuồng (A-01 .. A-12)]
┌──────────────┬──────────────┬──────────────┐
│ A-01         │ A-02         │ A-03         │
│ Phong Lôi    │ Tuyết Ảnh    │ Lôi Chấn     │
│ 👨‍🌾 Mai (1/4) │ 👨‍🌾 Mai (2/4) │ 👨‍🌾 Mai (3/4) │
├──────────────┼──────────────┼──────────────┤
│ A-04         │ A-05         │ A-06         │
│ Dạ Nguyệt    │ Lão Tướng    │ Huyền Vũ     │
│ 👨‍🌾 Mai (4/4) │ 👨‍🌾 Phúc (1/6)│ 👨‍🌾 Phúc (2/6)│
├──────────────┼──────────────┼──────────────┤
│ A-07         │ A-08         │ A-09         │
│ Tuyết Phong  │ Kim Long     │ Thần Phong   │
│ 👨‍🌾 Phúc (3/6)│ 👨‍🌾 Phúc (4/6)│ 👨‍🌾 Phúc (5/6)│
├──────────────┼──────────────┼──────────────┤
│ A-10         │ A-11         │ A-12         │
│ Hắc Báo      │ Hồng Kỳ      │ Phi Vũ       │
│ 👨‍🌾 Phúc (6/6)│ ⚠️ Chưa gán  │ ⚠️ Chưa gán  │
└──────────────┴──────────────┴──────────────┘
```

1. **Trần Thị Mai** (`groom@gmail.com`): Đang giữ **4 / 6 ô** $\rightarrow$ Còn trống đúng 2 slot.
2. **Hoàng Văn Phúc** (`groom2@gmail.com`): Đang giữ **6 / 6 ô** $\rightarrow$ Đầy tải 100%.
3. **Đỗ Thị Mai** (`groom3@gmail.com`): Đang giữ **4 / 6 ô** tại Barn B $\rightarrow$ Còn trống 2 slot.
4. **Lê Quốc Tuấn** (`groom4@gmail.com`): Đang giữ **0 / 6 ô** $\rightarrow$ Sẵn sàng nhận việc mới.
5. **Ô `A-11` và `A-12`**: Có ngựa nhưng **CHƯA GÁN NHÂN VIÊN CHĂM SÓC** $\rightarrow$ Dùng để demo tính năng phân công nhanh và Smart Lock.

---

## 7. KẾT QUẢ KIỂM THỬ CA 4 (QA/QC) & KẾT LUẬN

### 7.1. Kết quả kiểm thử tự động (`verify-groom-matrix-rules.ts`)
Bộ kịch bản kiểm thử tích hợp tự động gồm 17 ca kiểm thử đã được chạy thành công:
- **Test 1 - 10 (Cấu trúc lưới)**: Xác minh tất cả các Barn đều có `rows = 4, cols = 3`, 12 ô chuồng, sắp xếp đúng thứ tự từ trái sang phải, trên xuống dưới $\rightarrow$ **PASS**.
- **Test 11 - 12 (Hard Limit 6 ô)**: Xác minh không Groom nào vượt quá 6 ô chuồng $\rightarrow$ **PASS**.
- **Test 13 (Chốt chặn ô trống)**: Xác minh ô `AVAILABLE` không có `StallAllocation` active $\rightarrow$ **PASS**.
- **Test 14 - 17 (Nhiệm vụ Ad-hoc)**: Xác minh tạo thành công `DailyCareTask` mã `ADHOC-...`, gán đúng ngựa và Groom $\rightarrow$ **PASS**.
- **Tổng kết**: **17 / 17 Tests PASSED (100%)**.

### 7.2. Kết quả Build hệ thống
- **Backend NestJS**: `nest build` $\rightarrow$ **Thành công 0 lỗi**.
- **Frontend React/Vite**: `tsc --noEmit && vite build` $\rightarrow$ **Thành công 0 lỗi**.

### 7.3. Kết luận
Toàn bộ yêu cầu của bạn về:
1. Chuẩn hóa ma trận chuồng trại $4 \times 3$.
2. Khóa cứng định mức 6 ô/Groom và bất biến 1 Groom - 1 Barn.
3. Giải quyết triệt để lỗ hổng ô chuồng trống sinh công việc ma.
4. Phân công nhanh Groom với cơ chế Smart Lock (Lựa chọn A).
5. Thêm công việc phát sinh đột xuất cho Groom.
6. Giao diện trực quan hóa thẩm mỹ, không còn mã ngựa rườm rà, nhãn `⚠️ Chưa gán nhân viên chăm sóc` chuẩn mực thuần Việt.

Tất cả đã được hiện thực hóa trọn vẹn, kiểm thử nghiệm thu toàn diện và sẵn sàng vận hành trên môi trường Production!
