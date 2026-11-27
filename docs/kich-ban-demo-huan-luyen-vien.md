# KỊCH BẢN DEMO THỰC CHIẾN 100% PHÂN HỆ HUẤN LUYỆN VIÊN (TRAINER)
### Hệ thống Quản lý và Huấn luyện Ngựa đua EquiFlow

---

## PHẦN 1: TỔNG QUAN VÀ THÔNG SỐ HỆ THỐNG DEMO

### 1.1. Mục tiêu tài liệu
Tài liệu này cung cấp toàn bộ quy trình demo thực tế, bao phủ 100% các nhánh nghiệp vụ (branches & coverage) của vai trò **Huấn luyện viên (Head Trainer / Trainer)** trong hệ thống EquiFlow. Mọi dữ liệu sử dụng trong kịch bản là dữ liệu thật 100% trong cơ sở dữ liệu PostgreSQL, sẵn sàng thao tác trên giao diện trực quan và đối chiếu qua hòm thư Mailpit.

### 1.2. Môi trường và Địa chỉ truy cập
- **Cổng giao diện Frontend:** `http://localhost:5173`
- **Cổng giao diện Backend API:** `http://localhost:3000/api`
- **Hòm thư điện tử Mailpit:** `http://localhost:8025`
- **Lệnh làm mới và chuẩn hóa dữ liệu demo 100%:**
  ```bash
  cd BE
  npm run db:seed:trainer-demo
  ```

### 1.3. Bảng tài khoản tham gia kịch bản
| Vai trò | Email đăng nhập | Mật khẩu | Phân công khu chuồng | Nhiệm vụ chính trong demo |
| :--- | :--- | :--- | :--- | :--- |
| **Quản lý CLB** | `manager@gmail.com` | `EquiFlow@2026` | Quản trị toàn CLB | Tạo tài khoản HLV mới, gán Barn, giao chiến mã cho HLV |
| **HLV chính hiện tại** | `trainer.quan@gmail.com` | `EquiFlow@2026` | Phụ trách `Barn A` | Nhận ngựa `Hắc Long Mã`, demo nháp rồi xóa, lên giáo án chuẩn, thực hiện bài tập, báo sự cố |
| **HLV mới 1 (Đồng ý)** | `trainer.nam@gmail.com` | `EquiFlow@2026` (sau khi kích hoạt) | Gán `Barn C` (Trống) | Quản lý gửi lời mời -> Mở Mailpit nhấn **Chấp nhận lời mời** -> Đặt mật khẩu |
| **HLV mới 2 (Từ chối)** | `trainer.trong@gmail.com` | Không có | Gán `Barn A` (Đã có người) | Quản lý gửi lời mời -> Thấy cảnh báo Barn -> Mở Mailpit nhấn **Từ chối lời mời** -> Tài khoản bị hủy |
| **Bác sĩ thú y** | `vet.ha@gmail.com` | `EquiFlow@2026` | Phòng y tế & Thẩm định | Khám chấn thương, mở Khóa y tế (`LIFT_LOCK`) sau khi có sự cố |
| **Groom chăm sóc** | `groom.phuc@gmail.com` | `EquiFlow@2026` | Chăm sóc `Hắc Long Mã` | Tiếp nhận nhiệm vụ dắt ngựa tập thể lực (`DailyTask`) |

---

## PHẦN 2: MA TRẬN 100% QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

| Mã quy tắc | Tên quy tắc nghiệp vụ | Định nghĩa & Ràng buộc kỹ thuật |
| :--- | :--- | :--- |
| **BR-ACC-01** | Tạo tài khoản HLV | Quản lý CLB tạo tài khoản HLV với vai trò `HEAD_TRAINER` hoặc `TRAINER`. Trạng thái ban đầu: `INVITED`. |
| **BR-BARN-01** | Trạng thái Barn đầy / Barn trống | Khi chọn Barn quản lý: Barn trống được gán bình thường. Barn đã có HLV khác phụ trách sẽ hiển thị cảnh báo màu vàng đã có người quản lý. |
| **BR-MAIL-01** | Thư mời kích hoạt bảo mật | Hệ thống tự động sinh Token OTP mục đích `INVITE`, gửi qua hòm thư điện tử Mailpit với thời hạn hiệu lực 7 ngày. |
| **BR-MAIL-02** | Xử lý Thu hồi / Hủy lời mời | Thực tế email hiện tại chưa có nút từ chối trực tiếp (xem lỗi DEFECT-AUTH-01). Lời mời được kết thúc bằng cách Quản lý CLB bấm "Xóa / Thu hồi lời mời" trên danh sách tài khoản hoặc để mã OTP tự hết hạn sau 48 giờ. |
| **BR-MAIL-03** | Xử lý Kích hoạt lời mời | HLV mở email trong Mailpit, bấm nút "KÍCH HOẠT TÀI KHOẢN & ĐẶT MẬT KHẨU", nhập mã OTP 6 số và thiết lập mật khẩu đạt chuẩn. Tài khoản chuyển sang `ACTIVE` và đăng nhập vào hệ thống. |
| **BR-TRN-CAP** | Hạn mức quản lý chiến mã | Mỗi HLV chỉ được quản lý tối đa **8 chiến mã đồng thời** (`MAX_HORSES_PER_TRAINER = 8`). Khi đạt 8/8, hệ thống khóa không cho gán thêm ngựa mới. |
| **BR-TRN-DASH** | Dashboard HLV & Hạn lập giáo án | Khi nhận ngựa mới, chiến mã lập tức xuất hiện tại widget "Chiến mã chưa có giáo án huấn luyện" với huy hiệu "Chưa có giáo án" và thời hạn khuyến nghị 3 ngày. |
| **BR-PLN-DUR** | Thời lượng giáo án tối thiểu | Giáo án phải có độ dài tối thiểu **1 tuần (7 ngày)**. Hệ thống chặn lưu giáo án dưới 7 ngày. |
| **BR-PLN-DFT** | Vòng đời bản nháp (Draft Plan) | HLV có thể lưu bản nháp (`DRAFT`). Khi xóa hoặc hủy bản nháp, chiến mã vẫn giữ nguyên trạng thái "Chưa có giáo án", không bị mất dấu hay chuyển nhầm trạng thái. |
| **BR-TRK-CAP** | Sức chứa đường chạy thời gian thực | Mỗi đường chạy có sức chứa cố định theo khung giờ: Đường chạy cỏ A = 6 ngựa; Đường chạy cỏ B = 4 ngựa. Khi line đã đủ ngựa tại khung giờ chọn, option bị vô hiệu hóa `[Đã đầy X/X]` và chặn lưu bài tập. |
| **BR-TRN-NO-OVL**| Chống trùng giờ HLV | Một HLV không thể huấn luyện 2 chiến mã tại cùng một thời điểm. Giao diện cung cấp thanh thước đo trực quan trong ngày và các Smart Chip giờ trống. Nếu chọn giờ trùng bài tập của ngựa khác, hệ thống cảnh báo xung đột và ngăn chặn lưu. |
| **BR-GRM-CAP** | Định mức công việc của Groom | 1 Groom phụ trách tối đa **4 bài tập/ngày** (`MAX_DAILY_WORKOUTS_PER_GROOM = 4`) và tối đa **2 bài tập nặng/ngày** (`MAX_DAILY_HEAVY_WORKOUTS_PER_GROOM = 2`). |
| **BR-HRS-REST** | Hồi phục thể lực chiến mã | Một chiến mã tối đa 3 bài tập/ngày (`MAX_WORKOUTS_PER_DAY = 3`). Nếu ngày hôm trước chiến mã tập bài nặng (`HEAVY`, `BREEZE`, `TRIAL`), ngày hôm sau bắt buộc phải là ngày nghỉ ngơi hoặc chỉ được tập bài nhẹ (`LIGHT`). |
| **BR-PLN-ACT** | Kích hoạt giáo án | Sau khi giáo án được duyệt kích hoạt (`ACTIVE`), hệ thống tự động sinh công việc hàng ngày (`DailyTask`) phân công Groom chuẩn bị ngựa (`WORKOUT_PREP`) và đưa ngựa về chuồng an toàn. |
| **BR-WRK-EXEC** | Ghi nhận kết quả bài tập | HLV ghi nhận kết quả thực tế gồm: Quãng đường (m), vận tốc (km/h), nhịp tim sau tập (bpm), nhịp thở (lần/phút), ghi chú thể lực. Bài tập chuyển sang trạng thái `COMPLETED`. |
| **BR-INC-RPT** | Báo cáo sự cố khi tập | Nếu chiến mã gặp chấn thương trong buổi tập, HLV tạo Báo cáo sự cố (`Incident Report`). Buổi tập chuyển trạng thái `CANCELLED` hoặc `MISSED`. |
| **BR-MED-LCK** | Khóa y tế tự động (Medical Lock) | Khi có sự cố chấn thương, hệ thống tự động kích hoạt Khóa y tế. Toàn bộ các bài tập nặng (`HEAVY`) trong tương lai của chiến mã bị chuyển thành `BLOCKED`. HLV không thể lên lịch bài nặng mới cho đến khi Bác sĩ thú y nghiệm thu và gỡ Khóa y tế (`LIFT_LOCK`). |

---

## PHẦN 3: KỊCH BẢN DEMO CHI TIẾT 5 GIAI ĐOẠN (RUNBOOK THỰC CHIẾN)

### GIAI ĐOẠN 1: QUẢN LÝ TÀI KHOẢN HLV MỚI, CHỌN BARN & PHẢN HỒI EMAIL

#### 1. Thao tác trên giao diện:
- **Bước 1.1:** Mở trình duyệt tại `http://localhost:5173`, đăng nhập tài khoản Quản lý: `manager@gmail.com` / `EquiFlow@2026`.
- **Bước 1.2:** Vào menu **Quản lý tài khoản** -> Nhấn nút **"Tạo tài khoản mới"**.
- **Bước 1.3 (Thử nghiệm Barn đã có người & Nhánh Từ chối):**
  - Họ và tên: `Vũ Đình Trọng`
  - Email: `trainer.trong@gmail.com`
  - Vai trò: `Huấn luyện viên trưởng (HEAD_TRAINER)`
  - Khu chuồng phụ trách: Chọn `Barn A · Khu Huấn Luyện Chính`.
  - *Quan sát:* Màn hình xuất hiện cảnh báo màu vàng: *"Barn này hiện đã có Huấn luyện viên Trần Minh Quân phụ trách"*.
  - Nhấn nút **"Gửi lời mời"**.
- **Bước 1.4 (Thử nghiệm Barn trống & Nhánh Chấp nhận):**
  - Tiếp tục nhấn **"Tạo tài khoản mới"**.
  - Họ và tên: `Lê Hoàng Nam`
  - Email: `trainer.nam@gmail.com`
  - Vai trò: `Huấn luyện viên (TRAINER)`
  - Khu chuồng phụ trách: Chọn `Barn C · Phân Khu Mới (Trống)`.
  - *Quan sát:* Không có cảnh báo vì Barn C đang trống.
  - Nhấn nút **"Gửi lời mời"**.
- **Bước 1.5 (Tương tác với Mailpit & Điểm lưu ý thực tế):**
  - Mở tab trình duyệt mới vào Mailpit: `http://localhost:8025`.
  - Mở thư của `trainer.nam@gmail.com`:
    - Thư chứa mã OTP 6 số và một nút bấm duy nhất: **"KÍCH HOẠT TÀI KHOẢN & ĐẶT MẬT KHẨU"** (Hiệu lực 48 giờ).
    - Nhấn vào nút này -> Trình duyệt dẫn đến trang `/accept-invite` -> Nhập OTP, đặt mật khẩu mới `EquiFlow@2026` -> Kích hoạt tài khoản `ACTIVE` thành công.
  - **Điểm lưu ý nghiệp vụ & Tồn đọng (DEFECT-AUTH-01):**
    - Mở thư của `trainer.trong@gmail.com`: Trong mẫu email hiện tại hoàn toàn **không có nút Từ chối lời mời**. Người nhận nếu không muốn tham gia thì không thể bấm từ chối trực tiếp từ email.
    - Để hủy lời mời này trên hệ thống: Quản lý quay lại danh sách tài khoản, chọn tab "Đang mời (Invited)" và nhấn **"Xóa / Thu hồi lời mời"**, hoặc để mã OTP tự hết hạn sau 48 giờ.

#### 2. Lời thuyết minh nghiệp vụ:
> *"Trong hệ thống EquiFlow, mỗi khu chuồng (Barn) có chỉ tiêu quản lý chuyên trách. Khi Quản lý phân công HLV phụ trách một Barn, hệ thống sẽ đối soát thời gian thực xem Barn đó đã có HLV khác đảm nhiệm hay chưa. Khi tạo tài khoản mới, hệ thống gửi email kèm mã OTP 48 giờ có nút kích hoạt để HLV thiết lập mật khẩu chuyển sang ACTIVE. Hiện tại hệ thống chưa tích hợp nút từ chối trực tiếp trong email (mã lỗi ghi nhận DEFECT-AUTH-01), lời mời chưa được chấp nhận sẽ được Quản lý thu hồi từ danh sách tài khoản hoặc tự động hết hạn sau 48 giờ."*

---

### GIAI ĐOẠN 2: PHÂN CÔNG CHIẾN MÃ VÀ KIỂM TRA HẠN MỨC 8 NGỰA

#### 1. Thao tác trên giao diện:
- **Bước 2.1:** Tại tài khoản Quản lý, truy cập menu **Danh sách ngựa**.
- **Bước 2.2:** Tìm chiến mã **`Hắc Long Mã`** (Mã: `HRS-HLM-99`, Chuồng C-01). Cột HLV hiện đang ghi *"Chưa phân công"*.
- **Bước 2.3:** Nhấn vào nút **"Giao cho Huấn luyện viên"**.
- **Bước 2.4:** Chọn Huấn luyện viên: `Trần Minh Quân` (hoặc `Lê Hoàng Nam`).
- **Bước 2.5:** Nhập ghi chú: *"Giao phụ trách huấn luyện thể lực chuẩn bị mùa giải mới"*. Nhấn **"Xác nhận bàn giao"**.
- **Bước 2.6 (Kiểm thử biên):** Nếu thử giao thêm ngựa cho một HLV đã có đủ 8 ngựa, hệ thống sẽ chặn và báo lỗi vượt quá hạn mức tối đa 8 chiến mã (`BR-TRN-CAP`).

#### 2. Lời thuyết minh nghiệp vụ:
> *"Quy tắc nghiệp vụ BR-TRN-CAP quy định rõ: Mỗi Huấn luyện viên chỉ được quản lý tối đa 8 chiến mã đồng thời nhằm đảm bảo chất lượng theo dõi sức khỏe và giáo án tập luyện sát sao nhất. Quản lý không thể giao quá 8 ngựa cho một HLV."*

---

### GIAI ĐOẠN 3: HLV TIẾP NHẬN NGỰA, DASHBOARD & DEMO "NHÁP RỒI XÓA"

#### 1. Thao tác trên giao diện:
- **Bước 3.1:** Đăng xuất tài khoản Quản lý. Đăng nhập tài khoản HLV: `trainer.quan@gmail.com` / `EquiFlow@2026`.
- **Bước 3.2:** Quan sát màn hình **Tổng quan (Dashboard)**:
  - Widget trung tâm **"Chiến mã chưa có giáo án huấn luyện"** lập tức hiển thị chiến mã **`Hắc Long Mã`**.
  - Huy hiệu hiển thị là **`Chưa có giáo án`** kèm dòng nhắc nhở *"Hạn lập giáo án: còn 3 ngày"*.
- **Bước 3.3 (Thử nghiệm lưu nháp rồi xóa nháp):**
  - Nhấn nút **"+ Lập giáo án ngay"** tại dòng của `Hắc Long Mã`.
  - Nhập tên giai đoạn: *"Giáo án khảo sát"*, chọn ngày bắt đầu và kết thúc (7 ngày).
  - Nhấn nút **"Lưu bản nháp"** -> Hệ thống lưu bản nháp `DRAFT`.
  - Vào menu **Danh sách giáo án** -> Chọn tab **Bản nháp** -> Nhấn nút **"Xóa giáo án nháp"**.
  - Quay lại trang **Tổng quan (Dashboard)**:
  - *Quan sát:* Chiến mã `Hắc Long Mã` vẫn hiển thị nguyên vẹn ở widget "Chiến mã chưa có giáo án huấn luyện" với huy hiệu "Chưa có giáo án", hoàn toàn không bị biến mất hay mất dấu.

#### 2. Lời thuyết minh nghiệp vụ:
> *"Trước đây hệ thống có thể gặp lỗi khi HLV tạo nháp rồi hủy thì con ngựa bị mất dấu. Với thiết kế mới theo chuẩn BR-PLN-DFT, bản nháp (DRAFT) là trạng thái tạm thời. Khi HLV xóa bản nháp, hệ thống tự động hoàn nguyên ngựa về danh mục 'Chưa có giáo án' để đảm bảo không một chiến mã nào bị bỏ sót giáo án tập luyện."*

---

### GIAI ĐOẠN 4: LẬP GIÁO ÁN CHUẨN 7 NGÀY & KIỂM THỬ 100% RÀNG BUỘC (PLAN WIZARD)

#### 1. Thao tác trên giao diện:
- **Bước 4.1:** Tại dòng `Hắc Long Mã`, nhấn **"+ Lập giáo án ngay"** để mở Wizard.
- **Bước 4.2 (Ràng buộc thời lượng tối thiểu 7 ngày - BR-PLN-DUR):**
  - Thử chọn ngày kết thúc cách ngày bắt đầu 4 ngày -> Hệ thống báo lỗi: *"Thời lượng giáo án huấn luyện tối thiểu phải là 1 tuần (7 ngày)"*.
  - Chọn khoảng thời gian chuẩn: 7 ngày (ví dụ từ `2026-11-27` đến `2026-12-04`).
- **Bước 4.3 (Kiểm thử Sức chứa đường chạy thời gian thực - BR-TRK-CAP):**
  - Thêm bài tập vào ngày `2026-11-27`, chọn khung giờ: `07:00 - 08:00`.
  - Chọn Mặt sân: `Mặt sân cỏ (TURF)`.
  - Mở dropdown **"Chọn sân tập thể lực"**:
  - *Quan sát:*
    - Dòng 1: `Đường chạy cỏ A (Chính) · [Đã đầy 6/6]` -> **Bị làm mờ (disabled), không cho click chọn** do đã có 6 chiến mã khác đăng ký tập khung giờ này.
    - Dòng 2: `Đường chạy cỏ B (Phụ) · 0/4 ngựa` -> Khả dụng, click chọn bình thường.
- **Bước 4.4 (Kiểm thử Chống trùng giờ Huấn luyện viên - BR-TRN-NO-OVL):**
  - Đổi giờ tập sang khung giờ: `08:00 - 09:00`.
  - *Quan sát:*
    - Thanh thước đo lịch HLV (`TrainerDailyScheduleBar`) chuyển sang khối đỏ tại khung giờ `08:00 - 09:00`, ghi rõ: *"Trùng lịch huấn luyện với Bạch Long Mã"*.
    - Nút Lưu bị vô hiệu hóa kèm cảnh báo đỏ.
    - Bên dưới hiển thị các **Smart Slot Chips** gợi ý giờ trống (ví dụ: `09:30 - 10:30`, `14:00 - 15:00`).
    - HLV nhấn 1-click vào chip `09:30 - 10:30`, giờ tập tự động điền và cảnh báo đỏ lập tức biến mất.
- **Bước 4.5 (Kiểm thử Bài tập nặng & Ngày nghỉ phục hồi - BR-HRS-REST):**
  - Tại ngày thứ 2, chọn bài tập `BREEZE` (Chạy tốc độ) -> Cường độ tự động khóa cố định là `HEAVY`.
  - Tại ngày thứ 3, nếu cố tình đặt tiếp bài tập `TRIAL` hoặc `HEAVY`, hệ thống sẽ cảnh báo vi phạm quy tắc nghỉ ngơi thể lực (sau bài tập nặng phải có ít nhất 24h nghỉ ngơi hoặc chỉ được đi bộ `WALK` nhẹ).
- **Bước 4.6:** Nhấn **"Lưu & Kích hoạt giáo án"**. Giáo án chuyển trạng thái `ACTIVE`.
- Hệ thống tự động sinh nhiệm vụ chuẩn bị ngựa (`WORKOUT_PREP`) trong danh sách công việc hàng ngày cho Groom Hoàng Văn Phúc.

#### 2. Lời thuyết minh nghiệp vụ:
> *"Khâu lập giáo án là trái tim của phân hệ Huấn luyện viên, nơi hội tụ 4 lớp rào chắn an toàn:
> Thứ nhất: Sức chứa đường chạy được kiểm tra động theo từng line và từng khung giờ cụ thể (line 6 ngựa, line 4 ngựa). Khi đủ tải, hệ thống tự động khóa không cho chọn thêm.
> Thứ hai: Ràng buộc chống phân thân HLV - một HLV không thể cùng lúc có mặt tại 2 buổi tập. Hệ thống dùng thanh thước đo trực quan và Smart Chips 1-Click để gợi ý giờ trống tối ưu.
> Thứ ba: Định mức Groom tối đa 4 bài/ngày và 2 bài nặng/ngày để đảm bảo an toàn lao động.
> Thứ tư: Quy tắc thể lực bắt buộc ngựa phải có chu kỳ phục hồi sau các bài tập nặng BREEZE hoặc TRIAL."*

---

### GIAI ĐOẠN 5: THỰC HIỆN BUỔI TẬP, GHI CHỈ SỐ & KÍCH HOẠT KHÓA Y TẾ (INCIDENT & MEDICAL LOCK)

#### 1. Thao tác trên giao diện:
- **Bước 5.1:** Vào menu **Lịch tập luyện (Weekly Calendar)**, chọn buổi tập của `Hắc Long Mã`.
- **Bước 5.2 (Thực hiện bài tập bình thường):**
  - Nhấn **"Bắt đầu bài tập"**.
  - Nhập thông số thực tế: Cự ly `1200 m`, Tốc độ đạt được `42 km/h`, Nhịp tim sau tập `108 bpm`, Nhịp thở `32 lần/phút`.
  - Nhấn **"Lưu kết quả bài tập"** -> Buổi tập chuyển trạng thái `COMPLETED`.
- **Bước 5.3 (Phát sinh sự cố chấn thương):**
  - Tại buổi tập tiếp theo, giả định ngựa có dấu hiệu đi khập khiễng chân trước.
  - HLV nhấn nút **"Báo cáo sự cố (Report Incident)"**.
  - Chọn loại sự cố: `Chấn thương cơ gân chân trước (Limb/Tendon Strain)`.
  - Mô tả: *"Ngựa bước đi tập tễnh sau đoạn tăng tốc, cần bác sĩ thú y can thiệp gấp"*.
  - Nhấn **"Gửi báo cáo sự cố"**.
- **Bước 5.4 (Hiện tượng tự động Khóa y tế - BR-MED-LCK):**
  - Hệ thống tự động kích hoạt **Khóa y tế (`Medical Lock`)** trên chiến mã `Hắc Long Mã`.
  - Mở lại giáo án của ngựa: Toàn bộ các buổi tập nặng (`HEAVY`, `BREEZE`, `TRIAL`) trong những ngày tiếp theo bị hệ thống tự động chuyển sang màu đỏ và gắn cờ `BLOCKED` (Bị chặn). HLV không thể kích hoạt hay cho ngựa tập bài nặng.
- **Bước 5.5 (Bác sĩ thú y nghiệm thu mở khóa):**
  - Đăng xuất, đăng nhập tài khoản Bác sĩ: `vet.ha@gmail.com` / `EquiFlow@2026`.
  - Vào menu **Bệnh án & Kiểm định y tế** -> Mở hồ sơ sự cố của `Hắc Long Mã`.
  - Bác sĩ nhập biên bản khám, xác nhận ngựa đã hồi phục hoàn toàn sau điều trị và nhấn **"Mở khóa huấn luyện (Lift Medical Lock)"**.
  - Đăng nhập lại tài khoản HLV: Các bài tập trong giáo án tự động chuyển từ `BLOCKED` trở lại khả dụng bình thường.

#### 2. Lời thuyết minh nghiệp vụ:
> *"Quy tắc Khóa y tế tự động (BR-MED-LCK) là cơ chế bảo vệ tính mạng và sức khỏe cao nhất cho chiến mã. Bất cứ khi nào HLV hoặc Groom báo cáo sự cố chấn thương, hệ thống sẽ lập tức khóa mọi bài tập nặng để tránh nguy cơ tổn thương vĩnh viễn. Quyền mở khóa chỉ thuộc về Bác sĩ thú y có chứng chỉ sau khi đã thăm khám và ký xác nhận lâm sàng trên hệ thống."*
