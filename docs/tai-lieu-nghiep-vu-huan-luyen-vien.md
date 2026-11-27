# TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ HUẤN LUYỆN VIÊN (HEAD TRAINER)
## DỰ ÁN EQUFLOW - RACEHORSE TRAINING & STABLE MANAGEMENT SYSTEM
> **Phiên bản tài liệu**: v1.0.0 (Official Business Logic Reference - Code-Driven 100%)  
> **Phân hệ**: Huấn luyện & Điều hành Tập luyện Ngựa đua (Training & Workouts)  
> **Đối tượng người dùng**: Huấn luyện viên Trưởng (`Role.HEAD_TRAINER`)  
> **Nguyên tắc biên soạn**: Trích xuất 100% từ mã nguồn thực tế (Backend & Frontend), đúng tên biến, đúng hằng số, đúng logic rẽ nhánh IF/ELSE, có dẫn chứng tệp nguồn cụ thể.

---

## MỤC LỤC
1. [Tổng quan Vai trò & Phân quyền HLV Trưởng](#1-tổng-quan-vai-trò--phân-quyền-hlv-trưởng)
2. [Quy trình 1: Tiếp nhận & Phân công Chiến mã (Handover & Acceptance)](#2-quy-trình-1-tiếp-nhận--phân-công-chiến-mã-handover--acceptance)
3. [Quy trình 2: Lập & Quản lý Vòng đời Giáo án Huấn luyện (Training Plan Lifecycle)](#3-quy-trình-2-lập--quản-lý-vòng-đời-giáo-án-huấn-luyện-training-plan-lifecycle)
4. [Quy trình 3: Lập lịch, Xếp ca & Kiểm soát Xung đột 3 Ngôi (Workout Scheduling & Conflict Checks)](#4-quy-trình-3-lập-lịch-xếp-ca--kiểm-soát-xung-đột-3-ngôi-workout-scheduling--conflict-checks)
5. [Quy trình 4: Thực thi Buổi tập & Ghi nhận Chỉ số Sinh trắc (Session Execution & Telemetry Metrics)](#5-quy-trình-4-thực-thi-buổi-tập--ghi-nhận-chỉ-số-sinh-trắc-session-execution--telemetry-metrics)
6. [Quy trình 5: Cơ chế Liên động Khóa Y tế (Medical Lock Interlock)](#6-quy-trình-5-cơ-chế-liên-động-khóa-y-tế-medical-lock-interlock)
7. [Quy trình 6: Sát hạch Chạy thử & Đăng ký Thi đấu (Trial Runs & Race Entries)](#7-quy-trình-6-sát-hạch-chạy-thử--đăng-ký-thi-đấu-trial-runs--race-entries)
8. [Quy trình 7: Minh bạch Đánh giá từ Chủ ngựa (Trainer Reviews)](#8-quy-trình-7-minh-bạch-đánh-giá-từ-chủ-ngựa-trainer-reviews)
9. [Bảng Tra cứu Tham số & Hằng số Nghiệp vụ Cốt lõi (Business Rule Matrix)](#9-bảng-tra-cứu-tham-số--hằng-số-nghiệp-vụ-cốt-lõi-business-rule-matrix)

---

## 1. TỔNG QUAN VAI TRÒ & PHÂN QUYỀN HLV TRƯỞNG

### 1.1. Định danh & Ràng buộc Tổ chức
- **Mã vai trò**: `HEAD_TRAINER` (thuộc enum `Role` tại `FE/src/shared/types/enums.ts` và Prisma schema).
- **Phạm vi phân bổ khu chuồng (`assignedBarnId`)**:
  - Khi Quản lý CLB tạo tài khoản HLV, bắt buộc phải chọn một Khu chuồng (Barn A, Barn B,...) (`assignedBarnId` không được null).
  - **Ràng buộc định mức khu chuồng**: Mỗi Barn chỉ cho phép tối đa 2 HLV cùng công tác (`MAX_TRAINERS_PER_BARN = 2` tại `BE/src/training/training-rules.ts#L72`).

### 1.2. Ma trận Phân quyền Cố định (Permission Matrix)
Theo định nghĩa tại `FE/src/shared/lib/permissions.ts#L215-L221`, tài khoản HLV Trưởng sở hữu mặc định 5 quyền cốt lõi:
1. `viewHorses`: Xem danh sách và hồ sơ chi tiết các chiến mã trong CLB.
2. `createPlan`: Soạn thảo, chỉnh sửa, kích hoạt, hoàn thành và lưu trữ giáo án huấn luyện.
3. `assignSchedule`: Xếp lịch tập tuần, bố trí bài tập, chỉ định đường chạy và nhân viên chăm sóc (Groom).
4. `recordMetrics`: Ghi nhận dữ liệu sinh trắc học (nhịp tim, tốc độ, cự ly) và đánh giá phong độ sau buổi tập.
5. `viewMedical`: Xem lịch sử bệnh án, tình trạng khóa huấn luyện y tế của ngựa để đảm bảo an toàn tập luyện (không có quyền tự ý đặt/gỡ khóa y tế - quyền này thuộc về Bác sĩ thú y `VETERINARIAN`).

---

## 2. QUY TRÌNH 1: TIẾP NHẬN & PHÂN CÔNG CHIẾN MÃ (HANDOVER & ACCEPTANCE)
*Tệp nguồn: `BE/src/horses/horses.service.ts` (`assignTrainer`, `respondHandover`), `BE/src/horses/horses-handover-qa.spec.ts`*

```
[Quản lý CLB]
     │
     ├── 1. Kiểm tra 4 điều kiện phân công ──► (Thất bại: Ném lỗi Bad Request)
     │
     ├── 2. Sinh Handover Request (SLA 48h) + Token bí mật + Gửi Mail HLV
     │
     ▼
[HLV Trưởng]
     │
     ├────► Từ chối (DECLINE) ──► Nhập lý do ──► Ngựa trở lại trạng thái chưa gán HLV
     │
     └────► Tiếp nhận (ACCEPT)
                 │
                 ├── Gán assignedTrainerId = toTrainerId
                 ├── trainerAssignmentStatus = ASSIGNED
                 └── Cố định SLA 3 ngày lập giáo án (planDeadlineAt = now + 72h)
```

### 2.1. 4 Ràng buộc Điều kiện khi Quản lý phân công ngựa cho HLV (`assignTrainer`):
1. **Ràng buộc ô chuồng**: Chiến mã phải được xếp ô chuồng hoạt động (`stallAllocations.isActive === true`). Nếu chưa có ô chuồng $\rightarrow$ Chặn ném lỗi: *"Chiến mã chưa được xếp ô chuồng đang hoạt động"*.
2. **Ràng buộc cùng Khu chuồng (`BARN_MISMATCH`)**: Khu chuồng của ô chuồng (`stall.zoneId`) phải trùng khớp với Khu chuồng mà HLV đang phụ trách (`trainer.assignedBarnId`). Khác Barn $\rightarrow$ Chặn ném lỗi: *"HLV [Tên] phụ trách [Barn HLV], không thể nhận ngựa ở [Barn Ngựa]"*.
3. **Ràng buộc Định mức trần 8 chiến mã (`TRAINER_CAPACITY_EXCEEDED`)**: Mỗi HLV chỉ được phụ trách tối đa 8 chiến mã đồng thời (`MAX_HORSES_PER_TRAINER = 8`). Nếu số ngựa hiện tại $\ge 8$ $\rightarrow$ Chặn ném lỗi: *"HLV [Tên] đã đạt định mức tối đa 8 chiến mã đồng thời"*.
4. **Ràng buộc Chốt chặn Tồn đọng WIP Limit (`TRAINER_WIP_LIMIT_EXCEEDED`)**: Đếm số ngựa đã tiếp nhận của HLV nhưng chưa có giáo án `ACTIVE`. Nếu `pendingPlanCount >= 2` $\rightarrow$ Chặn ném lỗi: *"Huấn luyện viên [Tên] đang tồn [X] chiến mã chưa kích hoạt giáo án. Vui lòng hoàn tất giáo án hiện có trước khi phân công thêm."*

### 2.2. Cơ chế Hạn phản hồi SLA Bàn giao (48 Giờ):
- Hệ thống sinh một chuỗi ngẫu nhiên 24 bytes Hex (`crypto.randomBytes(24).toString('hex')`) làm `token`.
- Thời hạn hiệu lực: `expiresAt = new Date(Date.now() + 48 * 3600 * 1000)` (đúng 48 giờ).
- Nếu HLV phản hồi sau 48 giờ $\rightarrow$ Ném lỗi `400 BAD_REQUEST`: *"Yêu cầu phân công đã hết hạn phản hồi (48 giờ)."*

### 2.3. Xử lý Tiếp nhận (`ACCEPT`) & Cố định SLA 3 ngày:
- Cập nhật bản ghi `HorseHandoverRequest`: `status = ACCEPTED`, `acceptedAt = new Date()`.
- Cập nhật bản ghi `Horse`: `assignedTrainerId = req.toTrainerId`, `trainerAssignmentStatus = ASSIGNED`, `trainerRespondedAt = new Date()`.
- **Hạn lập giáo án chuẩn**: Cố định đúng 3 ngày (72 giờ) độc lập cho từng chiến mã:
  $$\text{planDeadlineAt} = \text{Date.now()} + 3 \times 24 \times 3600 \times 1000$$
  *(Đã loại bỏ hoàn toàn công thức lũy tiến cũ $3 + 2N$ để chống trôi dạt SLA).*

---

## 3. QUY TRÌNH 2: LẬP & QUẢN LÝ VÒNG ĐỜI GIÁO ÁN HUẤN LUYỆN (TRAINING PLAN LIFECYCLE)
*Tệp nguồn: `BE/src/training/training-plans.service.ts`, `BE/src/training/training-rules.ts`*

### 3.1. Các trạng thái Giáo án (`PlanStatus`):
- `DRAFT`: Bản nháp, HLV đang xây dựng các giai đoạn và bài tập.
- `ACTIVE`: Giáo án đang kích hoạt áp dụng thực tế trên ngựa.
- `COMPLETED`: Giáo án đã hoàn thành chu kỳ huấn luyện.
- `CANCELLED`: Giáo án bị hủy bỏ giữa chừng (bắt buộc nhập lý do hủy $\ge 10$ ký tự).
- `ARCHIVED`: Giáo án được đưa vào kho lưu trữ hồ sơ lịch sử.

### 3.2. Cấu trúc Giai đoạn Huấn luyện (Phases Validation):
Một giáo án bao gồm từ **1 đến 12 giai đoạn** (`MAX_PHASES = 12`), kiểm tra qua hàm `validatePhases`:
- **5 Loại giai đoạn (`PHASE_TYPES`)**:
  1. `BASE`: Xây dựng nền tảng thể lực cơ bản.
  2. `BUILD`: Phát triển cơ bắp và sức bền tim mạch.
  3. `SPEED`: Rèn luyện tốc độ bứt phá.
  4. `PRE_RACE`: Giai đoạn siết cơ, chuẩn bị thi đấu.
  5. `RECOVERY`: Phục hồi thể trạng sau thi đấu/tập nặng.
- **3 Loại mặt sân (`PHASE_SURFACES`)**: `TURF` (Sân cỏ), `DIRT` (Sân cát), `SYNTHETIC` (Mặt sân tổng hợp).
- **Ràng buộc chỉ số mỗi giai đoạn**:
  - Số buổi mỗi tuần: từ 1 đến 14 buổi/tuần (`sessionsPerWeek`).
  - Cự ly tích lũy tuần: từ 500m đến 60.000m/tuần (`maxWeeklyDistance`).
  - Tốc độ mục tiêu: từ 10 đến 70 km/h (`targetSpeedKmh`).
  - Thời lượng tối thiểu: Giáo án ngắn (< 14 ngày) thì mỗi phase tối thiểu 3 ngày; giáo án dài thì phase `PRE_RACE` và `RECOVERY` tối thiểu 3 ngày, các phase còn lại tối thiểu 7 ngày.
  - **Ràng buộc không giao thoa**: `phases[i].startDate > phases[i-1].endDate`. Nếu trùng lặp thời gian $\rightarrow$ Ném lỗi `PHASE_OVERLAP`.

### 3.3. Kích hoạt Giáo án (`ACTIVE`) & Tịnh tiến Lịch tập tự động (`shiftMs`):
- Điều kiện kích hoạt:
  - Chỉ kích hoạt từ trạng thái `DRAFT`.
  - Chiến mã không bị Khóa y tế (`isMedicalLocked === false`).
  - Chiến mã không bị Lưu giữ do nợ tiền chuồng (`isDebtImpounded === false`).
  - Chiến mã chưa có giáo án `ACTIVE` nào khác (Mỗi ngựa chỉ có duy nhất 1 giáo án hiệu lực).
- **Thuật toán Tịnh tiến Lịch tập (`shiftMs`)**:
  - Nếu ngày kích hoạt thực tế trễ hơn so với ngày dự kiến trong nháp:
    $$\text{shiftMs} = \text{targetStartDate} - \text{plan.startDate}$$
  - Backend tự động cộng `shiftMs` vào toàn bộ ngày bắt đầu/kết thúc của các Phase và dời ngày diễn ra của toàn bộ các buổi tập con (`workoutSession.scheduledDate`), bảo đảm không có buổi tập nào bị rơi vào quá khứ.
- **Chuyển đổi trạng thái ngựa**: Khi kích hoạt giáo án, trạng thái chiến mã tự động chuyển từ `RESTING` $\rightarrow$ `IN_TRAINING`.

### 3.4. Hoàn thành Giáo án (`COMPLETED`) & Cơ chế Miễn trừ SLA (`isSlaExempt`):
- **Điều kiện kết thúc**:
  - Bắt buộc nhập báo cáo tổng kết từ 10 đến 2000 ký tự (`dto.summary`).
  - Kiểm tra các buổi tập chưa ghi kết quả (`unfinished`). Nếu còn buổi tập nào chưa hoàn tất $\rightarrow$ Ném lỗi `409 CONFLICT: PLAN_WORKOUT_RESULTS_REQUIRED`: *"Còn [X] buổi tập chưa ghi kết quả"*.
- **Tự động đưa ngựa về Nghỉ ngơi**: Khi giáo án hoàn tất, ngựa tự động chuyển từ `IN_TRAINING` về `RESTING`.
- **Cơ chế Miễn trừ SLA**:
  - Hệ thống tự động gán `isRestingCycle = true` và `planDeadlineAt = null`.
  - Dashboard HLV hiển thị Badge xanh `Nghỉ ngơi hồi phục`, **không tính vào danh sách nợ giáo án 3 ngày**, giải phóng nghĩa vụ SLA của lần bàn giao trước.

---

## 4. QUY TRÌNH 3: LẬP LỊCH, XẾP CA & KIỂM SOÁT XUNG ĐỘT 3 NGÔI (WORKOUT SCHEDULING & CONFLICT CHECKS)
*Tệp nguồn: `BE/src/training/workouts.service.ts`, `workout-availability.service.ts`, `tracks.service.ts`, `training-rules.ts`*

### 4.1. Phân loại 7 Bài tập & Cường độ:
| Mã bài tập | Tên bài tập | Thời lượng tiêu chuẩn | Quy chuẩn Cường độ | Quy chuẩn Mặt sân |
| :--- | :--- | :---: | :---: | :---: |
| `WALK` | Đi bộ | 45 phút | Nhẹ (`LIGHT`) | Cỏ / Cát / Tổng hợp |
| `TROT` | Chạy nước kiệu | 60 phút | Nhẹ / Vừa (`LIGHT`/`MEDIUM`) | Cỏ / Cát / Tổng hợp |
| `CANTER` | Chạy nước đại nhẹ | 60 phút | Vừa (`MEDIUM`) | Cỏ / Cát / Tổng hợp |
| `BREEZE` | Chạy tốc độ | 60 phút | **Luôn ép thành Nặng (`HEAVY`)** | Cỏ / Cát / Tổng hợp |
| `TRIAL` | Chạy thử sát hạch | 90 phút | **Luôn ép thành Nặng (`HEAVY`)** | Cỏ / Cát / Tổng hợp |
| `SWIM` | Bơi phục hồi | 45 phút | Nhẹ / Vừa | **Ép thành `NONE` (Bể bơi)** |
| `TREADMILL` | Máy đi bộ trên cạn | 60 phút | Nhẹ / Vừa | **Ép thành `NONE` (Khu máy)** |

### 4.2. Khung giờ & Quy chuẩn Thời gian (Time Constraints):
- **Giờ tập quy định trong ngày**: Chỉ được phép xếp lịch từ **04:00 đến 20:00** (`withinTrainingHours`).
- **Khung giờ vàng (`Prime Time`: 06:15 - 08:00)**: Thời điểm mát mẻ nhất trong ngày, mỗi HLV bị khống chế **tối đa 2 buổi tập nặng** (`MAX_PRIME_HEAVY_SESSIONS_PER_TRAINER = 2`) để công bằng tài nguyên sân bãi và bảo vệ ngựa.
- **Đệm thời gian của Huấn luyện viên**: Bắt buộc cách nhau tối thiểu **15 phút** (`TRAINER_BUFFER_MINUTES = 15`) giữa 2 buổi tập của cùng 1 HLV.
- **Đệm thời gian của Nhân viên chăm sóc (Groom)**: Bắt buộc đệm **15 phút** (`GROOM_BUFFER_MINUTES = 15`) để làm vệ sinh, tháo yên và tắm cho ngựa.
- **Định mức tải của Groom**: 1 Groom chỉ được phân công tối đa **4 buổi tập/ngày** và **không quá 2 bài tập nặng/ngày** (`MAX_DAILY_WORKOUTS_PER_GROOM = 4`, `MAX_DAILY_HEAVY_WORKOUTS_PER_GROOM = 2`).

### 4.3. Kiểm soát Sức chứa Mặt sân Chạy (Track Capacity):
Hàm kiểm tra `checkTrackAvailability` tại `tracks.service.ts`:
- **Đối với bài tập Nhẹ / Vừa**: Mặt sân cho phép tối đa **3 chiến mã cùng tập** (`TRACK_MAX_LIGHT_HORSES = 3`).
- **Đối với bài tập Nặng (`BREEZE`, `TRIAL`, `HEAVY`)**: Áp dụng cơ chế **Chiếm dụng độc quyền (`HEAVY_OCCUPIED`)**. Khi có 1 chiến mã đang chạy tốc độ, sân bị khóa hoàn toàn, không cho bất kỳ ngựa nào khác vào sân trong khung giờ đó để tránh va chạm ở vận tốc cao.

---

## 5. QUY TRÌNH 4: THỰC THI BUỔI TẬP & GHI NHẬN CHỈ SỐ SINH TRẮC (SESSION EXECUTION & TELEMETRY METRICS)
*Tệp nguồn: `BE/src/training/workouts.service.ts` (`startWorkout`, `recordWorkoutResult`), `training-rules.ts`*

### 5.1. Bắt đầu Buổi tập (`startWorkout`):
- **Chốt chặn y tế**: Kiểm tra `checkMedicalLock(horseId, workoutDate)`. Nếu ngựa đang có Khóa y tế hiệu lực $\rightarrow$ Chặn đứng, ném lỗi `400 BAD_REQUEST: MEDICAL_LOCK_ACTIVE`.
- **Chốt chặn thời gian**: Chỉ được bấm Bắt đầu khi đến giờ tập thực tế (trừ khi bật cờ môi trường test dev `allowEarlyWorkoutStart()`).
- Trạng thái buổi tập chuyển sang `IN_PROGRESS`.

### 5.2. Ghi nhận Chỉ số Sinh trắc học & Thể lực (`recordWorkoutResult`):
- **Thời hạn ghi kết quả**: Tối đa trong vòng **7 ngày** kể từ khi buổi tập diễn ra (`LATE_RESULT_DAYS = 7`). Quá 7 ngày $\rightarrow$ Ném lỗi quá hạn ghi nhận.
- **Giới hạn kiểm tra tính hợp lý sinh học (Sanity Checks)**:
  - Cự ly thực tế: Tối đa **10.000 mét / buổi** (`MAX_SESSION_DISTANCE_METERS = 10000`).
  - Vận tốc trung bình tính toán: Tối đa **75 km/h** (`MAX_AVERAGE_SPEED_KMH = 75` - do kỷ lục thế giới của loài ngựa đua xấp xỉ 70 km/h; vượt quá 75 km/h là dữ liệu nhập sai).
  - Dải nhịp tim:
    - Nhịp tim nghỉ trước tập: 28 – 45 bpm.
    - Nhịp tim đỉnh khi tập nặng: 120 – 240 bpm.
    - Nhịp tim hồi phục sau 15 phút: Đo lường khả năng tản nhiệt và phục hồi tim mạch.
  - Điểm số phong độ (`performanceScore`): Thang điểm chuẩn từ 0 đến 100 điểm.
- **Cảnh báo Bất thường sau Buổi tập (`Post-workout Alerts`)**:
  - Nếu nhịp tim sau 15 phút nghỉ vẫn $> 115$ bpm $\rightarrow$ Hệ thống tự động tạo bản ghi Cảnh báo mệt mỏi quá tải (`Exertion Alert`).
  - Cảnh báo xuất hiện chấm đỏ trên Sidebar của HLV và gửi thông báo tới Bác sĩ thú y để kiểm tra nguy cơ chấn thương cơ/khớp.

---

## 6. QUY TRÌNH 5: CƠ CHẾ LIÊN ĐỘNG KHÓA Y TẾ (MEDICAL LOCK INTERLOCK)
*Tệp nguồn: `BE/src/health/health.service.ts`, `BE/src/training/workouts.service.ts`, `training-common.service.ts`*

Khi Bác sĩ thú y (`VETERINARIAN`) chẩn đoán ngựa có vấn đề sức khỏe và kích hoạt lệnh Khóa y tế (`placeLock`):

```
       [Bác sĩ Thú y đặt Khóa y tế]
                    │
                    ▼
     ┌──────────────────────────────┐
     │  Horse.isMedicalLocked = true│
     └──────────────┬───────────────┘
                    │
       Cơ chế Khóa liên động (Interlock)
                    │
     ┌──────────────┴──────────────┐
     ▼                             ▼
[Tại Module Huấn luyện]     [Tại Dashboard HLV]
- Chặn tạo Plan mới          - Hiển thị Badge đỏ "Khóa y tế"
- Chặn bấm Start Workout     - Khóa nút "Bắt đầu tập"
- Hủy/Hoãn bài tập nặng      - Chuyển thành nút "Xem bệnh án"
```

1. **Khóa quyền Lập giáo án mới**: Tại màn hình Plan Wizard, cờ `canAssign` chuyển thành `false`, hiển thị lý do: *"Ngựa đang bị Khóa huấn luyện y tế bởi Bác sĩ thú y"*.
2. **Khóa quyền Bắt đầu Buổi tập**: Tại API `startWorkout`, Backend kiểm tra hàm `checkMedicalLock`. Nếu phát hiện khóa đang active $\rightarrow$ Ném lỗi `400 BAD_REQUEST`, ngăn chặn 100% việc HLV ép ngựa ốm/chấn thương ra sân.
3. **Tự động Hoãn/Chặn bài tập nặng**: Các buổi tập `HEAVY`, `BREEZE`, `TRIAL` đã lên lịch trong thời gian khóa y tế tự động chuyển sang trạng thái `BLOCKED`.
4. **Giải phóng Khóa y tế**: Chỉ duy nhất Bác sĩ thú y có quyền gỡ khóa (`liftLock`) sau khi khám tái thẩm định. Khi khóa được gỡ, các buổi tập mới được mở khóa trở lại.

---

## 7. QUY TRÌNH 6: SÁT HẠCH CHẠY THỬ & ĐĂNG KÝ THI ĐẤU (TRIAL RUNS & RACE ENTRIES)
*Tệp nguồn: `FE/src/features/training/pages/TrialRunsPage.tsx`, `FE/src/features/racing/pages/RaceEntryPage.tsx`*

1. **Buổi Chạy thử Sát hạch (`Trial Run`)**:
   - Thời lượng: 90 phút (bài tập nặng nhất hệ thống).
   - Đo đạc chính thức 3 cự ly chuẩn thi đấu quốc tế: **1000m, 1200m, 1600m**.
   - Bắt buộc bố trí Nài ngựa chính quy thuộc danh bạ CLB (`CLUB_JOCKEYS`: Trần Văn Kiên, Lê Minh Quân, Nguyễn Tấn Lộc, Phạm Hữu Đạt) với cân nặng chuẩn 50 - 53 kg.
   - Ghi nhận chỉ số Vận tốc bứt phá cực đại (**Top Speed**) và thời gian hoàn thành (giây).
2. **Điều kiện Đăng ký Tham gia Giải đua (`Race Registration`)**:
   - Chiến mã phải đạt trạng thái sẵn sàng (`READY_FOR_RACE`).
   - Tuyệt đối không có Khóa y tế (`isMedicalLocked === false`).
   - Có kết quả Chạy thử sát hạch đạt chuẩn tốc độ (Top Speed $\ge 50$ km/h) làm căn cứ kỹ thuật để HLV Trưởng và Chủ ngựa tự tin gửi danh sách thi đấu.

---

## 8. QUY TRÌNH 7: MINH BẠCH ĐÁNH GIÁ TỪ CHỦ NGỰA (TRAINER REVIEWS)
*Tệp nguồn: `BE/src/training/trainer-reviews.service.ts`, `FE/src/features/training/pages/TrainerReviewsPage.tsx`*

- **Phân quyền Một chiều**:
  - Chủ sở hữu ngựa (`HORSE_OWNER`) có quyền gửi đánh giá từ 1 đến 5 sao kèm nhận xét cho Huấn luyện viên đối với các giáo án đang áp dụng (`ACTIVE`) hoặc đã hoàn thành (`COMPLETED`).
  - HLV Trưởng chỉ có quyền **Xem đánh giá (`My Reviews`)**, hoàn toàn **KHÔNG có quyền can thiệp, chỉnh sửa hay xóa đánh giá**.
- **Chỉ số đánh giá HLV**:
  - Điểm trung bình cộng sao (Average Rating).
  - Tỷ lệ hoàn thành giáo án đúng hạn.
  - Số lượng phản hồi tích cực từ cộng đồng chủ ngựa.

---

## 9. BẢNG TRA CỨU THAM SỐ & HẰNG SỐ NGHIỆP VỤ CỐT LÕI (BUSINESS RULE MATRIX)

| Tên Hằng số / Quy tắc | Giá trị | Tệp nguồn trong Code | Ý nghĩa Nghiệp vụ & Cơ sở Khoa học |
| :--- | :---: | :--- | :--- |
| `MAX_HORSES_PER_TRAINER` | **8** | `BE/src/training/training-rules.ts#L69` | Định mức tối đa 8 ngựa / 1 HLV để đảm bảo chất lượng huấn luyện. |
| `WIP Limit (Pending Plans)` | **2** | `BE/src/horses/horses.service.ts#L2305` | HLV tồn $\ge 2$ ngựa chưa có giáo án thì bị chặn không cho nhận thêm ngựa. |
| `MAX_TRAINERS_PER_BARN` | **2** | `BE/src/training/training-rules.ts#L72` | Mỗi Khu chuồng chỉ bố trí tối đa 2 HLV để tránh xung đột quản lý. |
| `HANDOVER_SLA_HOURS` | **48h** | `BE/src/horses/horses.service.ts#L2316` | Thời hạn tối đa để HLV bấm Tiếp nhận hoặc Từ chối ngựa quản lý giao. |
| `PLAN_CREATION_SLA_DAYS` | **3 ngày** | `BE/src/horses/horses.service.ts#L2467` | Hạn cố định 72 giờ để HLV lập và kích hoạt giáo án sau khi nhận ngựa. |
| `FIRST_HOUR` - `LAST_HOUR` | **04:00 - 20:00** | `BE/src/training/training-rules.ts#L146-L147` | Khung giờ cho phép tổ chức tập luyện trong ngày của CLB. |
| `PRIME_TIME` | **06:15 - 08:00** | `BE/src/training/training-rules.ts#L80-L84` | Khung giờ vàng buổi sáng, khống chế tối đa 2 bài tập nặng / HLV. |
| `TRAINER_BUFFER_MINUTES` | **15 phút** | `BE/src/training/training-rules.ts#L75` | Thời gian đệm nghỉ tối thiểu giữa 2 ca tập của HLV. |
| `GROOM_BUFFER_MINUTES` | **15 phút** | `BE/src/training/training-rules.ts#L138` | Thời gian đệm tối thiểu của Groom để tháo yên, tắm rửa cho ngựa. |
| `MAX_DAILY_WORKOUTS_PER_GROOM`| **4 buổi** | `BE/src/training/training-rules.ts#L65` | Giới hạn an toàn lao động: 1 Groom không phụ trách quá 4 ca/ngày. |
| `TRACK_MAX_LIGHT_HORSES` | **3 ngựa** | `BE/src/training/training-rules.ts#L78` | Sức chứa tối đa của 1 mặt sân cho các bài tập nhẹ/vừa. |
| `HEAVY_OCCUPIED` | **1 ngựa** | `BE/src/training/tracks.service.ts` | Bài tập nặng chiếm dụng độc quyền sân, cấm các ngựa khác vào sân. |
| `MAX_SESSION_DISTANCE_METERS`| **10.000m** | `BE/src/training/training-rules.ts#L141` | Cự ly tối đa cho phép trong 1 buổi tập để chống nhập khống. |
| `MAX_AVERAGE_SPEED_KMH` | **75 km/h** | `BE/src/training/training-rules.ts#L143` | Tốc độ tối đa giới hạn sinh học loài ngựa đua (kỷ lục thế giới $\approx 70$ km/h). |
| `LATE_RESULT_DAYS` | **7 ngày** | `BE/src/training/training-rules.ts#L145` | Hạn chót HLV phải nhập kết quả sau khi buổi tập kết thúc. |
| `MAX_PHASES` | **12** | `BE/src/training/training-rules.ts#L185` | Số giai đoạn tối đa trong 1 giáo án huấn luyện. |
| `MAX_PLAN_WEEKS` | **52 tuần** | `BE/src/training/training-rules.ts#L186` | Thời lượng tối đa của một giáo án (1 năm). |
| `CLUB_UTC_OFFSET_HOURS` | **UTC+7** | `BE/src/training/training-rules.ts#L152` | Quy đổi múi giờ chuẩn Việt Nam, loại bỏ sai lệch ngày giờ hệ thống. |
