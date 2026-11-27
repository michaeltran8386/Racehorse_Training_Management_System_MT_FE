# 📖 KỊCH BẢN SỬ DỤNG CHI TIẾT CÁC TÍNH NĂNG CHUỒNG TRẠI & GROOM
*Phiên bản: v7.3.0 | EquiFlow System*

---

## 🔑 1. THÔNG TIN ĐĂNG NHẬP & TÌNH TRẠNG TẢI THỰC TẾ

Dữ liệu demo đã được cơ cấu lại đa dạng các mức tải để bạn kiểm chứng trọn vẹn mọi tình huống:

| Vai trò | Email đăng nhập | Mật khẩu | Họ tên | Tình trạng tải ô chuồng | Mục đích demo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Quản lý CLB** | `manager@gmail.com` | `EquiFlow@2026` | Nguyễn Hoàng Long | Toàn quyền điều hành | Điều phối chuồng trại, phân công nhanh, giao việc phát sinh |
| **Groom 1** | `groom@gmail.com` | `EquiFlow@2026` | **Trần Thị Mai** | **4 / 6 ô** tại Barn A *(còn 2 slot)* | **Demo tính năng Smart Lock (tích đủ 2 ô là khóa mờ)** |
| **Groom 2** | `groom2@gmail.com` | `EquiFlow@2026` | **Hoàng Văn Phúc** | **6 / 6 ô** tại Barn A *(đầy tải)* | **Demo kiểm chứng chặn vượt trần 6 ô chuồng** |
| **Groom 3** | `groom3@gmail.com` | `EquiFlow@2026` | **Đỗ Thị Mai** | **4 / 6 ô** tại Barn B *(còn 2 slot)* | Demo phân công tại Barn B |
| **Groom 4** | `groom4@gmail.com` | `EquiFlow@2026` | **Lê Quốc Tuấn** | **0 / 6 ô** tại Barn A & B *(trống)* | **Demo Xếp ngựa mới & gán Groom từ đầu** |

---

## 🧭 KỊCH BẢN 1: QUAN SÁT SƠ ĐỒ LƯỚI 4x3 & NHẬN DIỆN CẢNH BÁO

### Mục tiêu:
Xác nhận sơ đồ chuồng trại hiển thị đúng ma trận $4 \times 3$ (12 ô/Barn) từ trái sang phải, không còn mã ngựa rườm rà, và nhận diện rõ 2 ô đang thiếu người chăm sóc.

### Các bước thực hiện:
1. Đăng nhập tài khoản **Quản lý CLB** (`manager@gmail.com` / `EquiFlow@2026`).
2. Vào menu: **Quản lý chuồng trại** $\rightarrow$ **Sơ đồ chuồng trại** (`/stalls/map`).
3. Tại dropdown chọn phân khu, chọn **Barn A**:
   - **Quan sát ma trận 4x3**: Giao diện hiển thị đúng 4 hàng $\times$ 3 cột từ `A-01` đến `A-12` (từ trái qua phải, trên xuống dưới).
   - **Giao diện thoáng sạch**: Mỗi ô chỉ gồm:
     - Dòng 1: Mã ô (VD: `A-01`).
     - Dòng 2: **Tên ngựa** (VD: `Phong Lôi`) font chữ đậm to rõ (đã bỏ mã `HR-DEMO-A01`).
     - Dòng 3: Tên nhân viên phụ trách.
4. **Nhận diện trạng thái thực tế tại Barn A**:
   - `A-01`, `A-02`, `A-03`, `A-04`: Hiển thị `👨‍🌾 Trần Thị Mai` (4 ô).
   - `A-05`, `A-06`, `A-07`, `A-08`, `A-09`, `A-10`: Hiển thị `👨‍🌾 Hoàng Văn Phúc` (6 ô).
   - **`A-11` và `A-12`**: Hiển thị viền cam nổi bật cùng nhãn cảnh báo **`⚠️ Chưa gán Groom`** (đây là 2 ô cần xử lý!).

---

## ⚡ KỊCH BẢN 2: PHÂN CÔNG NHANH GROOM (TRẢI NGHIỆM SMART LOCK LỰA CHỌN A)

### Mục tiêu:
Gán 2 ô thiếu người (`A-11`, `A-12`) cho Groom **Trần Thị Mai** (đang có 4/6 ô) và trải nghiệm cơ chế Smart Lock tự động khóa mờ khi tích đủ định mức.

### Các bước thực hiện:
1. Tại phân khu **Barn A**, bấm nút:
   👉 **`⚡ Phân công nhanh Groom`**
2. Hộp thoại modal mở ra:
   - **Chọn Groom phụ trách**: Chọn `Trần Thị Mai`.
   - **Quan sát thanh tải**: Hệ thống hiển thị:
     `Tải hiện tại: 4/6 ô chuồng` | `✅ Còn nhận được tối đa: 2 ô chuồng`.
     Thanh tiến trình màu cam ở mức 66%.
3. **Thử nghiệm cơ chế Smart Lock (Lựa chọn A)**:
   - Danh sách ô chuồng có ngựa hiển thị 12 ô của Barn A.
   - Bạn tích chọn ô **`A-11`** $\rightarrow$ Số lượng đã chọn: `1 / 2`.
   - Bạn tích tiếp ô **`A-12`** $\rightarrow$ Số lượng đã chọn đạt trần: `2 / 2`.
   - **Hiệu ứng Smart Lock kích hoạt tức thì**: Tất cả các ô còn lại (`A-01` đến `A-10`) **ngay lập tức bị khóa mờ (`disabled`, opacity 0.45)**. Khi rê chuột vào hiện biểu tượng cấm 🚫 kèm tooltip: *"Đã chọn đủ 2 ô cho phép của Groom này"*.
   - **Bỏ chọn thử**: Bỏ tick ô `A-12` $\rightarrow$ Các ô khác lập tức sáng lại bình thường!
4. **Bấm nút "Chọn nhanh tối đa (2)"**: Hệ thống tự động chọn đúng 2 ô `A-11` và `A-12`.
5. Bấm nút: **`Phân công (2 ô)`**:
   - Thông báo màu xanh: *"Đã phân công thành công 2 ô chuồng cho Groom Trần Thị Mai!"*.
   - Sơ đồ Barn A tự động làm mới: `A-11` và `A-12` biến mất nhãn cam cảnh báo và chuyển thành `👨‍🌾 Trần Thị Mai`.
   - Lúc này Trần Thị Mai đạt chuẩn đủ tải $6/6$ ô chuồng!

---

## 🚫 KỊCH BẢN 3: KIỂM CHỨNG CHẶN GROOM ĐÃ ĐẦY TẢI (6/6 Ô)

### Mục tiêu:
Xác nhận hệ thống bảo vệ triệt để trần tải 6 ô chuồng, không cho phép gán thêm việc cho Groom đã đầy tải.

### Các bước thực hiện:
1. Tại phân khu **Barn A**, bấm nút **`⚡ Phân công nhanh Groom`**.
2. Tại dropdown chọn Groom, chọn **`Hoàng Văn Phúc`**:
   - Hệ thống hiển thị ngay thanh tải màu đỏ:
     `Tải hiện tại: 6/6 ô chuồng` | `⛔ Đã đạt tải tối đa 6 ô chuồng (Không thể gán thêm)`.
   - Toàn bộ danh sách checkbox bên dưới bị khóa mờ hoàn toàn.
   - Nút `Phân công` bị vô hiệu hóa (`disabled`).

---

## 🔄 KỊCH BẢN 4: ĐỔI GROOM HOẶC CHỈ ĐỊNH ĐƠN LẺ TỪNG Ô

### Mục tiêu:
Đổi nhân viên phụ trách cho một ô chuồng cụ thể và trải nghiệm giao diện tiếng Việt ngữ cảnh 100%.

### Các bước thực hiện:
1. Tại **Barn A**, click chuột vào ô **`A-01`** (Chiến mã *Phong Lôi*).
2. Panel thông tin mở ra:
   - Dòng nhân viên: `Nhân viên chăm sóc: Trần Thị Mai`.
   - Nút hành động hiển thị chuẩn tiếng Việt: **`Đổi Groom chăm sóc`** *(thay vì tiếng Anh Assign care Groom trước đây)*.
3. Bấm nút **`Đổi Groom chăm sóc`**:
   - Hộp thoại hiển thị: *"Phân công Groom chăm sóc — Phong Lôi"*.
   - Dropdown chọn Groom chỉ hiển thị những Groom còn slot trống ($< 6$) đang trực tại Barn A (ví dụ: `Lê Quốc Tuấn (0/6 ô chuồng)`).
   - Chọn `Lê Quốc Tuấn` $\rightarrow$ Bấm **`Lưu phân công`**.
4. Ô `A-01` lập tức đổi thành `👨‍🌾 Lê Quốc Tuấn`. Tải của Trần Thị Mai giảm về $5/6$, tải của Lê Quốc Tuấn tăng lên $1/6$.

---

## 🐴 KỊCH BẢN 5: XẾP NGỰA VÀO Ô CHUỒNG TRỐNG & CHỌN GROOM TRỰC TIẾP

### Mục tiêu:
Xếp chiến mã mới vào chuồng trống và chọn Groom phụ trách ngay trong form (chỉ hiện Groom còn $< 6$ ô).

### Các bước thực hiện:
1. Chuyển sang phân khu **Barn B** $\rightarrow$ Click vào ô trống `B-07` (nhãn `Chờ xếp ngựa`).
2. Bấm nút **`Xếp ngựa vào ô chuồng`**.
3. Form xếp ô chuồng mở ra:
   - Chọn chiến mã (VD: *Bạch Mã Hoàng Tử*).
   - Tại trường **"Groom phụ trách (Tùy chọn)"**: Hệ thống hiển thị:
     - `Đỗ Thị Mai (4/6 ô chuồng)`
     - `Lê Quốc Tuấn (1/6 ô chuồng)`
     *(Groom Hoàng Văn Phúc 6/6 đầy tải tự động bị ẩn)*.
   - Chọn `Đỗ Thị Mai` $\rightarrow$ Bấm **`Xếp vào ô chuồng`**.
4. Ô `B-07` chuyển thành ô có ngựa, mang màu trạng thái sức khỏe và hiển thị ngay `👨‍🌾 Đỗ Thị Mai`.

---

## ➕ KỊCH BẢN 6: GIAO VIỆC PHÁT SINH ĐỘT XUẤT (AD-HOC TASKS)

### Mục tiêu:
Quản lý giao việc chăm sóc phát sinh và kiểm chứng hệ thống tự động điền Groom phụ trách chuồng.

### Các bước thực hiện:
1. Bấm nút **`➕ Thêm việc phát sinh`** trên thanh công cụ.
2. Chọn chiến mã: Chọn *Phong Lôi (Ô A-01)*.
   - **Tự động điền Groom**: Hệ thống tự động chọn ngay `Lê Quốc Tuấn` (Groom đang quản lý ô `A-01`).
3. Phân loại: Chọn *Vệ sinh ô chuồng / Thay rơm*.
4. Giờ dự kiến: Nhập `14:30`.
5. Tiêu đề: Nhập *"Thay rơm khẩn cấp sau buổi tập cát"*.
6. Bấm **`Lưu công việc`** $\rightarrow$ Hệ thống sinh mã `ADHOC-20261124-XXXXXX` và đẩy thẳng vào ca trực của Lê Quốc Tuấn.
7. Đăng nhập tài khoản Groom `groom4@gmail.com` / `EquiFlow@2026` $\rightarrow$ Vào **Checklist hàng ngày** (`/daily-tasks`) sẽ thấy ngay nhiệm vụ phát sinh này để tick hoàn thành!

---
*Tất cả dữ liệu và kịch bản đã sẵn sàng 100% để bạn kiểm nghiệm thực tế!*
