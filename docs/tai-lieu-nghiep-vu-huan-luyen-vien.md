# TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ HUẤN LUYỆN VIÊN TRƯỞNG
**Hệ thống:** EquiFlow – Nền tảng Quản lý Chuồng trại & Huấn luyện Ngựa đua  
**Chuyên đề phân hệ:** Bàn làm việc Huấn luyện viên Trưởng (Head Trainer Workspace)  
**Phiên bản:** v2.1.0 – Chuẩn hóa Nghiệp vụ Quản trị 100% (Phân định Rõ ràng Luồng Hợp lệ & Luồng Vi phạm)  
**Ngày cập nhật:** 27/11/2026  

---

## LỜI NÓI ĐẦU & NGUYÊN TẮC TIẾP CẬN NGHIỆP VỤ

Tài liệu này được biên soạn độc quyền cho đội ngũ Chuyên viên Nghiệp vụ (BA), Quản lý Câu lạc bộ (Club Manager) và các Huấn luyện viên Trưởng (Head Trainer). Toàn bộ nội dung tập trung mô tả bản chất quy trình vận hành, thẩm quyền các vai trò và hành vi ứng xử của hệ thống phần mềm.

Mọi quy tắc nghiệp vụ trong tài liệu đều được phân định minh bạch thành hai nhánh vận hành thực tế:
1. **Trường hợp Hợp lệ (Đúng quy chuẩn)**: Hệ thống ghi nhận kết quả gì, chuyển dịch trạng thái nghiệp vụ ra sao, hiển thị huy hiệu hoặc thông báo chúc mừng/xác nhận thành công như thế nào.
2. **Trường hợp Vi phạm (Sai quy chuẩn)**: Hệ thống dựng rào cản kỹ thuật ở đâu, chế tài quản lý áp dụng là gì (khóa nút chức năng, tạm hoãn ca tập, kích hoạt cảnh báo chỉ số hiệu suất KPI qua thư điện tử) và câu thông báo lỗi cụ thể hiển thị trực tiếp trên màn hình người dùng là gì.

---

## 1. TỔNG QUAN PHÂN HỆ & MA TRẬN PHÂN QUYỀN

### 1.1. Phạm vi Quản lý & Trách nhiệm Chuyên môn
Huấn luyện viên Trưởng là nhân sự chuyên môn cấp cao, chịu trách nhiệm toàn diện về công tác huấn luyện thể lực, nâng cao phong độ, kiểm soát an toàn vận động và sát hạch thi đấu cho các chiến mã thuộc Khu chuồng mình phụ trách.

- **Nhiệm vụ chính**:
  - Tiếp nhận chiến mã do Quản lý CLB bàn giao theo đúng Khu chuồng được phân công.
  - Thiết lập và điều hành vòng đời giáo án huấn luyện (từ 1 đến 12 giai đoạn sinh lý phát triển).
  - Lập lịch tập luyện theo tuần, điều phối khung giờ tập, chọn mặt sân và đường chạy, phòng ngừa xung đột thể lực và va chạm tốc độ cao.
  - **Tự điều hành buổi tập & Kiêm nài ngựa**: Huấn luyện viên Trưởng trực tiếp dẫn dắt ca tập và trực tiếp cưỡi ngựa trên đường chạy trong các bài tập tốc độ/sát hạch. Nhân viên chăm sóc chuồng trại (Groom) chỉ phụ trách các công việc tĩnh trong khu chuồng (cho ăn, dọn phân, tắm rửa vệ sinh định kỳ) và tuyệt đối không tham gia dẫn tập hay nài ngựa trên đường chạy.
  - Ghi nhận chỉ số sinh trắc học viễn trắc (cự ly, thời gian, vận tốc trung bình, nhịp tim nghỉ / đỉnh / hồi phục) và giám sát nguy cơ chấn thương sau buổi tập.
  - Thẩm định 4 tiêu chí sẵn sàng thi đấu trước khi gửi danh sách đăng ký giải đua.

### 1.2. Ma trận Phân quyền Cố định của Huấn luyện viên Trưởng

| STT | Tên Quyền Nghiệp vụ | Mô tả Thẩm quyền | Hành vi Hệ thống Hỗ trợ |
| :---: | :--- | :--- | :--- |
| **1** | **Xem danh bạ chiến mã** | Tra cứu danh sách và xem hồ sơ lý lịch toàn diện của các chiến mã trong CLB. | Xem thông tin nguồn gốc, giống ngựa, số hiệu ô chuồng, khu chuồng và trạng thái huấn luyện hiện tại. |
| **2** | **Quản lý giáo án huấn luyện** | Khởi tạo, chỉnh sửa giai đoạn, kích hoạt áp dụng, hoàn tất chu kỳ và lưu trữ giáo án. | Cho phép soạn thảo bản nháp giáo án, lên danh sách các buổi tập con và nghiệm thu tổng kết chu kỳ. |
| **3** | **Xếp lịch & Điều phối ca tập** | Lập lịch tập tuần, bố trí bài tập, chọn mặt sân tập và chỉ định đường chạy cụ thể. | Kiểm tra tự động sức chứa đường chạy, giãn cách an toàn giữa các ca tập và khóa đường chạy khi chạy tốc độ cao. |
| **4** | **Ghi nhận sinh trắc & Phong độ** | Cập nhật số liệu vận động thực tế, thông số nhịp tim và đánh giá điểm số phong độ. | Tự động tính toán tốc độ trung bình, cảnh báo vượt ngưỡng sinh học và gắn cờ cảnh báo mệt mỏi quá tải. |
| **5** | **Xem bệnh án & Khóa y tế** | Tra cứu lịch sử chẩn đoán y khoa và theo dõi tình trạng phong tỏa huấn luyện vì lý do sức khỏe. | Xem chi tiết nguyên nhân chấn thương do Bác sĩ thú y ghi nhận. **HLV tuyệt đối không có quyền tự ý đặt hoặc gỡ khóa y tế** (quyền này thuộc độc quyền của Bác sĩ thú y). |

### 1.3. Ma trận Phân quyền Truy cập Sơ đồ Chuồng trại (Stall Map RBAC)

Sơ đồ chuồng trại là khu vực vận hành nhạy cảm liên quan đến an ninh tài sản và an toàn sinh học. Hệ thống áp dụng quy tắc phân quyền chặt chẽ theo nguyên tắc tối thiểu thông tin:

| Vai trò Người dùng | Thẩm quyền Xem Sơ đồ Chuồng | Phạm vi & Chức năng Cho phép |
| :--- | :---: | :--- |
| **Quản lý CLB** *(Club Manager)* | **ĐƯỢC XEM (Toàn quyền)** | - Xem toàn bộ các Khu chuồng và ô chuồng trong khuôn viên.<br>- Xem khối **Ban điều hành & Định mức nhân sự** (định mức HLV, Groom, tình trạng đủ/thiếu người).<br>- Thực hiện các thao tác: Xếp ô chuồng, chuyển ô, trả ô, phân công HLV, gán Groom và bật/tắt bảo trì ô. |
| **Huấn luyện viên Trưởng** *(Head Trainer)* | **ĐƯỢC XEM (Chuyên môn)** | - Xem sơ đồ các khu chuồng để nắm vị trí ô chuồng của đàn ngựa mình và đồng nghiệp phụ trách.<br>- Theo dõi trạng thái thể lực của ngựa tại ô (sẵn sàng, đang tập, cách ly, khóa y tế). |
| **Bác sĩ Thú y** *(Veterinarian)* | **ĐƯỢC XEM (Y tế)** | - Định vị nhanh ô chuồng của ngựa bệnh để tiếp cận khám chữa bệnh tại chỗ.<br>- Giám sát các ô chuồng thuộc diện cách ly, kiểm dịch hoặc đang bị khóa y tế. |
| **Nhân viên Chăm sóc** *(Groom)* | **ĐƯỢC XEM (Chăm sóc)** | - Xem vị trí ô chuồng, có bộ lọc riêng **"Chỉ ô chuồng của tôi"** để tập trung chăm sóc các ô trong ca trực.<br>- Không xem được hồ sơ chủ sở hữu của các chiến mã không thuộc phạm vi ca trực của mình. |
| **Chủ sở hữu Chiến mã** *(Horse Owner)* | **TUYỆT ĐỐI KHÔNG** | - **Chặn 100% quyền truy cập**. Giao diện hoàn toàn không có mục Sơ đồ chuồng.<br>- **Lý do nghiệp vụ:** Bảo đảm an toàn sinh học nội bộ và bảo mật thông tin các chiến mã của chủ ngựa khác. Chủ ngựa chỉ theo dõi ngựa của mình tại mục *"Chiến mã của tôi"*. |

---

## 2. QUY TRÌNH 1: TIẾP NHẬN & PHÂN CÔNG CHIẾN MÃ

### 2.1. Phân công Chiến mã từ Quản lý CLB cho Huấn luyện viên
Khi Quản lý CLB thực hiện thao tác chỉ định một Huấn luyện viên Trưởng phụ trách chiến mã, hệ thống tự động kiểm tra nghiêm ngặt 5 điều kiện nghiệp vụ đồng thời:

| Quy tắc Nghiệp vụ | Nội dung Ràng buộc | Xử lý & Thông báo khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Ràng buộc Ô chuồng** | Chiến mã phải đang được xếp vào một ô chuồng thực tế có hiệu lực hoạt động. | Hệ thống hợp lệ, chuyển sang kiểm tra Khu chuồng phụ trách. | **Hành vi:** Chặn lưu phân công.<br>**Thông báo lỗi:** *"Chiến mã chưa được xếp ô chuồng đang hoạt động."* |
| **Ràng buộc Khu chuồng (Barn)** | Khu chuồng của ô chuồng nuôi dưỡng ngựa phải trùng khớp hoàn toàn với Khu chuồng mà HLV đang quản lý. | Hệ thống xác nhận cùng khu chuồng, cho phép tiếp tục quy trình. | **Hành vi:** Chặn lưu phân công.<br>**Thông báo lỗi:** *"HLV [Họ và tên HLV] phụ trách [Tên Khu chuồng HLV], không thể nhận ngựa ở [Tên Khu chuồng Ngựa]."* |
| **Ràng buộc Trạng thái Tài khoản HLV** | HLV được phân công bắt buộc phải đang ở trạng thái **Đang hoạt động chính thức (ACTIVE)**. Các tài khoản mới được gửi thư mời (chưa kích hoạt mật khẩu) hoặc bị khóa đều không được phép tiếp nhận ngựa. | Tài khoản HLV đang hoạt động, hệ thống hiển thị trong danh sách chọn. | **Hành vi:** Lọc bỏ 100% tài khoản chưa kích hoạt khỏi ô chọn. Nếu cố tình gửi yêu cầu, hệ thống chặn đứng.<br>**Thông báo lỗi:** *"Huấn luyện viên không hợp lệ hoặc đang không hoạt động."* |
| **Định mức trần Quản lý** | Mỗi Huấn luyện viên chỉ được phụ trách tối đa **8 chiến mã đồng thời**. | Tổng số ngựa hiện tại của HLV < 8, hệ thống cho phép giao thêm ngựa. | **Hành vi:** Chặn lưu phân công.<br>**Thông báo lỗi:** *"HLV [Họ và tên HLV] đã đạt định mức tối đa 8 chiến mã đồng thời."* |
| **Hạn mức Tồn đọng (WIP Limit)** | HLV chỉ được phép tồn tối đa **1 chiến mã** đã tiếp nhận nhưng chưa kích hoạt giáo án (nếu tồn từ 2 con trở lên sẽ bị nghẽn việc). | Số ngựa chưa có giáo án chính thức < 2, hệ thống xác nhận HLV đủ năng lực tiếp nhận việc mới. | **Hành vi:** Chặn lưu phân công.<br>**Thông báo lỗi:** *"Huấn luyện viên [Họ và tên HLV] đang tồn [Số lượng] chiến mã chưa kích hoạt giáo án. Vui lòng hoàn tất giáo án hiện có trước khi phân công thêm."* |

- **Kết quả khi Phân công Thành công**:
  - Hệ thống tự động khởi tạo bản ghi yêu cầu bàn giao kèm theo một liên kết xác thực có thời hạn hiệu lực đúng **48 giờ**.
  - Trạng thái bàn giao của chiến mã chuyển sang **Đang chờ Huấn luyện viên phản hồi**.
  - Hệ thống tự động gửi thư điện tử thông báo đến Huấn luyện viên kèm nút bấm dẫn thẳng tới trang tiếp nhận.
  - Quản lý CLB nhận thông báo xác nhận: *"Đã gửi yêu cầu phân công chiến mã [Tên ngựa] đến HLV [Tên HLV]. Thời hạn phản hồi là 48 giờ."*

---

### 2.2. Phản hồi Yêu cầu Bàn giao từ Huấn luyện viên (Thời hạn 48 Giờ)
Huấn luyện viên nhận được thông báo sẽ truy cập giao diện phản hồi để xem hồ sơ chiến mã và đưa ra quyết định:

| Quyết định của HLV | Điều kiện Nghiệp vụ | Xử lý & Thông báo khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Từ chối Tiếp nhận** | HLV cung cấp lý do từ chối (tối thiểu 10 ký tự). | **Xử lý:** Hủy yêu cầu phân công, đưa chiến mã về trạng thái Chưa phân công, đưa vào danh sách Tồn đọng chờ bổ nhiệm HLV mới trên Dashboard, gửi thông báo kèm lý do cho Quản lý CLB.<br>**Thông báo hiển thị:** *"Đã từ chối tiếp nhận chiến mã [Tên ngựa]."* | **Vi phạm:** HLV gửi phản hồi khi yêu cầu đã quá hạn 48 giờ.<br>**Thông báo lỗi:** *"Yêu cầu phân công đã hết hạn phản hồi (48 giờ)."* |
| **Đồng ý Tiếp nhận** | HLV bấm nút xác nhận trong vòng 48 giờ kể từ lúc Quản lý tạo yêu cầu. | **Xử lý:** Ghi nhận HLV chính thức phụ trách ngựa; trạng thái chuyển sang Đã phân công; **tự động chuyển quyền sở hữu giáo án hiện có và các buổi tập từ ngày mai trở đi cho HLV mới**; **kích hoạt đồng hồ đếm ngược thời hạn lập giáo án cố định đúng 3 ngày (72 giờ)**.<br>**Thông báo hiển thị:** *"Đã tiếp nhận chiến mã [Tên ngựa]. Hạn lập giáo án hoàn thành: 3 ngày."* | **Vi phạm:** Bấm tiếp nhận khi yêu cầu đã quá hạn 48 giờ.<br>**Thông báo lỗi:** *"Yêu cầu phân công đã hết hạn phản hồi (48 giờ)."* |

- **Cơ chế Kế thừa Giáo án & Buổi tập Tự động khi Tiếp nhận**:
  - Khi HLV bấm Đồng ý Tiếp nhận, nếu chiến mã đã có giáo án từ trước (trạng thái Bản nháp hoặc Đang áp dụng), hệ thống tự động gán HLV mới làm người chủ quản giáo án.
  - Đối với các buổi tập đã lên lịch: Các buổi tập từ **ngày mai trở đi** (`00:00 ngày mai`) được tự động đổi sang HLV mới điều hành. Buổi tập của ngày hôm nay do HLV cũ hoàn thành nốt ca trực để tránh gián đoạn ngày tập.

---

### 2.3. Quy định Hạn chót Lập Giáo án (SLA 3 Ngày) & Chế tài Xử lý Vi phạm

Sau khi bấm tiếp nhận chiến mã thành công, Huấn luyện viên có nghĩa vụ lập và kích hoạt giáo án huấn luyện chính thức trong vòng **3 ngày (đúng 72 giờ độc lập cho từng con)**.

```
[HLV bấm Tiếp nhận] ───> Bắt đầu đếm ngược 72 giờ
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
[Hoàn thành trong 72 giờ]                       [Vượt quá 72 giờ]
- Kích hoạt giáo án thành công                  - Giao diện: Hiện Huy hiệu Đỏ cảnh báo
- Huy hiệu Vàng: "Còn X ngày"                   - Dashboard: Dòng chữ đỏ "Quá hạn X ngày"
- Giải phóng hạn mức tồn đọng (WIP)             - Kích hoạt Chốt chặn tồn đọng (WIP Limit)
- Ngựa chuyển sang: "Đang huấn luyện"           - Tự động gửi Email cảnh báo KPI Quá hạn
```

#### Chi tiết Xử lý Hai nhánh SLA:

1. **Trường hợp Thực hiện Đúng hạn (Trong vòng 72 giờ)**:
   - **Giao diện Danh sách giáo án**: Hiển thị Huy hiệu màu Vàng cam: `Mới tiếp nhận · Còn 3 ngày` (hoặc `Còn 2 ngày`, `Còn 1 ngày`). Nút thao tác hiển thị màu xanh nổi bật: `Lập giáo án ngay`.
   - **Giao diện Bàn làm việc HLV (Dashboard)**: Hiển thị dòng trạng thái: `Hạn lập giáo án: còn [X] ngày`.
   - **Khi kích hoạt giáo án thành công**: Nghĩa vụ hoàn tất, huy hiệu đếm ngược biến mất, trạng thái chiến mã chuyển sang `Đang huấn luyện`, giải phóng 1 suất tồn đọng trong Hạn mức tồn đọng (WIP Limit).

2. **Trường hợp Vi phạm Quá hạn (Sau 72 giờ chưa kích hoạt giáo án chính thức)**:
   - **Cảnh báo trên Giao diện Danh sách giáo án**: Chuyển ngay lập tức sang Huy hiệu màu Đỏ cảnh báo nguy cấp: `Mới tiếp nhận · Quá hạn [X] ngày`.
   - **Cảnh báo trên Bàn làm việc HLV (Dashboard)**: Xuất hiện dòng cảnh báo màu đỏ đậm: `Quá hạn lập giáo án: [X] ngày`.
   - **Chế tài Giới hạn nhận việc mới (Kích hoạt WIP Limit)**: Con ngựa quá hạn này vẫn bị tính là ngựa tồn đọng. Nếu HLV có từ 2 ngựa tồn đọng trở lên, Quản lý CLB sẽ bị hệ thống chặn đứng hoàn toàn, không thể giao thêm bất kỳ chiến mã nào mới cho HLV này cho đến khi giáo án được kích hoạt.
   - **Chế tài Thư điện tử Cảnh báo KPI Tự động**: Bộ quét ngầm định kỳ của hệ thống tự động kích hoạt thông báo cảnh báo hiệu suất đến hộp thư của cả Huấn luyện viên phụ trách và Quản lý CLB:
     - **Tiêu đề thư**: `[TMEC Cảnh báo KPI] Quá hạn lập giáo án cho chiến mã [Tên chiến mã]`
     - **Nội dung thư**: *"Chiến mã [Tên chiến mã] ([Mã số định danh]) đã được tiếp nhận ngày [Ngày tiếp nhận] nhưng quá hạn hoàn thành giáo án ([Hạn chót ngày/tháng/năm]) mà chưa kích hoạt giáo án. Vui lòng hoàn tất và kích hoạt giáo án ngay."*

---

### 2.4. Thời gian chờ 48 Giờ của HLV sau khi Hủy Nháp (Cooldown)
Để bảo đảm tính nghiêm túc trong công tác chuyên môn và tránh việc HLV liên tục tạo rồi hủy nháp gây sai lệch dữ liệu:
- **Quy tắc**: Nếu HLV chủ động hủy một bản nháp giáo án hoặc để bản nháp hết hạn đối với một chiến mã, hệ thống lập tức đưa HLV vào danh sách thời gian chờ **48 giờ** đối với riêng chiến mã đó.
- **Trường hợp Hợp lệ**: HLV chờ hết 48 giờ hoặc tạo giáo án cho các chiến mã hợp lệ khác.
- **Trường hợp Vi phạm**: HLV cố tình bấm tạo giáo án mới cho con ngựa vừa hủy nháp trong vòng 48 giờ:
  - **Hành vi:** Chặn mở màn hình tạo giáo án.
  - **Thông báo lỗi hiển thị:** *"Bạn đang trong thời gian chờ ([Số giờ] giờ còn lại) đối với chiến mã [Tên chiến mã] do vừa hủy hoặc để hết hạn bản nháp. Vui lòng liên hệ Quản lý CLB nếu cần mở khóa sớm."*

---

### 2.5. Cơ chế Xử lý Chiến mã Tồn đọng & Giao diện Thu gọn Thông minh (Preview Mode)

Khi Huấn luyện viên chuyển Khu chuồng, hoặc HLV cũ từ chối tiếp nhận / để hết hạn 48 giờ, chiến mã sẽ rơi vào trạng thái **Tồn đọng Chờ Bổ nhiệm HLV** (`UNASSIGNED`).

- **Cơ chế Cảnh báo trên Bàn làm việc Quản lý (Dashboard)**:
  - Khối cảnh báo *"Chiến mã Tồn đọng Chờ Bổ nhiệm HLV (Do Điều chuyển Nhân sự)"* xuất hiện nổi bật với viền cảnh báo màu cam.
  - **Chế độ xem trước thông minh (Preview Mode)**: Để tránh làm tràn màn hình khi có nhiều ngựa tồn đọng, hệ thống mặc định chỉ hiển thị **1 đến 2 chiến mã tượng trưng**.
  - **Nút điều khiển Sổ ra / Thu gọn**:
    - Nút **`Xem tất cả (N)`** (ở thanh tiêu đề và dưới chân khối): Cho phép Quản lý bấm để sổ ra toàn bộ danh sách khi cần rà soát và xử lý hàng loạt.
    - Nút **`Thu gọn`**: Cho phép đóng gọn danh sách lại như ban đầu sau khi kiểm tra xong.
- **3 Hành động Khắc phục Nhanh cho từng Chiến mã Tồn đọng**:
  1. **Phân công HLV mới**: Mở modal chọn HLV trưởng cùng Khu chuồng đang hoạt động (`ACTIVE`) để tiếp nhận ngựa.
  2. **Chuyển sang Barn khác**: Dẫn sang Sơ đồ chuồng để chuyển ngựa sang khu chuồng có HLV còn dư định mức tiếp nhận.
  3. **Dời lịch tập +1 ngày**: Tạm hoãn buổi tập của ngày hôm nay/ngày mai sang ngày kế tiếp để bảo vệ an toàn cho chiến mã khi chưa có người hướng dẫn.

---

### 2.6. Quy tắc Điều chuyển Khu chuồng của HLV & Bàn giao Chia tách Thông minh

Khi Quản lý CLB thực hiện điều chuyển một Huấn luyện viên Trưởng sang phụ trách Khu chuồng (Barn) khác, hệ thống áp dụng cơ chế bàn giao an toàn:

| Trường hợp Điều chuyển | Ràng buộc Nghiệp vụ | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **HLV đang có 0 chiến mã** | HLV không quản lý bất kỳ chiến mã nào. | Hệ thống chuyển Khu chuồng ngay lập tức. | Không áp dụng ràng buộc bàn giao. |
| **HLV đang có chiến mã** | Bắt buộc phải chọn một HLV đồng nghiệp **cùng Khu chuồng hiện tại** và **đang hoạt động chính thức (`ACTIVE`)** để nhận bàn giao. | HLV đồng nghiệp hợp lệ, cùng khu và đang hoạt động. | - Chưa chọn HLV nhận: *"Huấn luyện viên đang phụ trách [X] chiến mã. Vui lòng chọn Huấn luyện viên đồng nghiệp trong cùng khu chuồng để bàn giao trước khi chuyển khu."*<br>- Chọn chính mình: *"Không thể tự bàn giao cho chính mình."*<br>- Chọn HLV khác khu: *"Huấn luyện viên nhận bàn giao phải cùng phụ trách trong khu chuồng hiện tại."*<br>- Chọn HLV chưa kích hoạt: *"Người nhận bàn giao phải là Huấn luyện viên trưởng đang hoạt động."* |
| **Chia tách Đàn ngựa Thông minh** | HLV nhận bàn giao chỉ được nhận tối đa đến **định mức 8 chiến mã**. | - Số ngựa trong định mức: Bàn giao trực tiếp sang HLV đồng nghiệp.<br>- Số ngựa vượt định mức (dôi dư): Tự động chuyển về diện **Tồn đọng Chờ Bổ nhiệm HLV** để Quản lý điều phối sau. | Không để xảy ra tình trạng dồn ép quá tải (> 8 ngựa) cho bất kỳ HLV nào. |

---

## 3. QUY TRÌNH 2: LẬP & ĐIỀU HÀNH VÒNG ĐỜI GIÁO ÁN HUẤN LUYỆN

### 3.1. Các Trạng thái của Giáo án Huấn luyện
1. **Bản nháp (`DRAFT`)**: HLV đang biên soạn mục tiêu, cơ cấu các giai đoạn sinh lý và lên danh sách các bài tập dự kiến.
2. **Đang áp dụng (`ACTIVE`)**: Giáo án đã được kích hoạt áp dụng thực tế trên chiến mã (mỗi chiến mã chỉ có DUY NHẤT một giáo án ở trạng thái này).
3. **Đã hoàn thành (`COMPLETED`)**: Chu kỳ huấn luyện đã kết thúc trọn vẹn và đã có báo cáo nghiệm thu tổng kết.
4. **Đã hủy (`CANCELLED`)**: Giáo án bị chấm dứt giữa chừng do điều kiện khách quan (chấn thương dài hạn, yêu cầu đột xuất từ chủ ngựa).
5. **Đã lưu trữ (`ARCHIVED`)**: Đưa vào kho hồ sơ lịch sử để phục vụ thống kê chuyên môn.

---

### 3.2. Điều kiện Khởi tạo Giáo án Mới

| Quy tắc Nghiệp vụ | Tiêu chuẩn Thẩm định | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Thể trạng Chiến mã** | Ngựa phải đang hoạt động, không bị giải nghệ, không bị khóa y tế và không bị tạm giữ. | Cho phép chọn ngựa để soạn giáo án. | - Ngựa đã ngừng quản lý: *"Ngựa đã ngừng quản lý."*<br>- Đang bị khóa y tế: *"Ngựa đang bị Khóa huấn luyện y tế. Không thể tạo giáo án mới cho đến khi Bác sĩ thú y gỡ khóa."*<br>- Nợ tiền chuồng bị tạm giữ: *"Ngựa đang bị tạm giữ do nợ tiền chuồng. Không thể lập giáo án."* |
| **Chủ quyền Giáo án** | Chiến mã chưa có giáo án Bản nháp hoặc Đang áp dụng của HLV khác. | Hợp lệ, tiến hành phân bổ bản ghi mới. | **Hành vi:** Chặn tạo mới.<br>**Thông báo lỗi:** *"Chiến mã đã có giáo án của huấn luyện viên khác."* |
| **Định mức Giáo án HLV** | Tổng số giáo án Bản nháp + Đang áp dụng của HLV không vượt quá 8. | Hợp lệ, cấp quyền mở form soạn thảo. | **Hành vi:** Chặn tạo mới.<br>**Thông báo lỗi:** *"HLV đã đạt định mức tối đa 8 giáo án đang quản lý."* |
| **Đặt tên Giáo án** | Tên giáo án phải có chữ cái, không được đặt hoàn toàn bằng chữ số. | Tên hợp lệ, hiển thị tiêu đề giáo án. | **Hành vi:** Chặn lưu giáo án.<br>**Thông báo lỗi:** *"Tên giáo án không hợp lệ. Phải chứa ít nhất một chữ cái và không được chỉ bao gồm chữ số."* |
| **Mục tiêu Giáo án** | Mục tiêu phải bắt đầu bằng chữ cái, không bắt đầu bằng số/ký tự đặc biệt. | Mục tiêu hợp lệ. | **Hành vi:** Chặn lưu giáo án.<br>**Thông báo lỗi:** *"Mục tiêu giáo án phải bắt đầu bằng chữ cái, không được bắt đầu bằng số hoặc ký tự đặc biệt."* |
| **Thời lượng & Ngày bắt đầu** | - Tổng thời gian tối đa **52 tuần** (1 năm).<br>- Ngày bắt đầu phải từ ngày mai trở đi. | Thời gian giáo án hợp lệ. | - Quá 52 tuần: *"Giáo án tối đa 52 tuần."*<br>- Bắt đầu hôm nay hoặc quá khứ: *"Ngày bắt đầu giáo án phải từ ngày mai trở đi."* |

---

### 3.3. Cấu trúc Giai đoạn Sinh lý (Kiểm tra từ 1 đến 12 Giai đoạn)
Mỗi giáo án được chia thành từ 1 đến 12 giai đoạn kế tiếp nhau với 5 loại hình sinh lý:
1. **Xây dựng nền tảng**: Rèn luyện thể lực cơ bản, tăng dung tích phổi.
2. **Phát triển thể lực**: Phát triển hệ cơ bắp và sức bền tim mạch.
3. **Rèn luyện tốc độ**: Tối ưu guồng chân và rèn luyện tốc độ bứt phá.
4. **Chuẩn bị thi đấu**: Siết cân, làm quen nhịp độ đường đua trước giải đấu.
5. **Phục hồi thể trạng**: Thả lỏng tích cực, tái tạo cơ bắp sau thi đấu hoặc tập nặng.

#### Ràng buộc Định lượng từng Giai đoạn:
- **Mặt sân áp dụng**: Sân cỏ, Sân cát hoặc Sân tổng hợp.
- **Tần suất buổi tập tuần**: Từ 1 đến 14 buổi/tuần. Nếu nhập sai: Báo lỗi *"Số buổi mỗi tuần phải từ 1 đến 14 buổi."*
- **Cự ly tích lũy tuần**: Từ 500m đến 60.000m/tuần. Nếu nhập sai: Báo lỗi *"Cự ly tối đa mỗi tuần phải từ 500m đến 60.000m."*
- **Tốc độ mục tiêu**: Từ 10 đến 70 km/h. Nếu nhập sai: Báo lỗi *"Tốc độ mục tiêu phải từ 10 đến 70 km/h."*
- **Thời lượng tối thiểu từng giai đoạn**:
  - Đối với giáo án ngắn (< 14 ngày): Mỗi giai đoạn tối thiểu 3 ngày.
  - Đối với giáo án thông thường (≥ 14 ngày): Giai đoạn Chuẩn bị thi đấu và Phục hồi tối thiểu 3 ngày; các giai đoạn rèn luyện nền tảng/thể lực/tốc độ tối thiểu **7 ngày (1 tuần)**.
- **Khung trần sinh lý an toàn tối đa từng giai đoạn (`Physiological Ceiling`)**:
  - Nhằm bảo vệ hệ gân cơ và chống chai lì phong độ, mỗi loại giai đoạn bị khống chế trần tối đa theo khoa học huấn luyện ngựa đua quốc tế (*Equine Exercise Physiology*):
    + **Nền tảng thể lực (`BASE`)**: Tối đa **56 ngày (8 tuần)** (tránh chai lì hiếu khí và ì phản xạ).
    + **Phát triển thể lực (`BUILD`)**: Tối đa **42 ngày (6 tuần)** (tránh viêm bao hoạt dịch khớp).
    + **Rèn luyện tốc độ (`SPEED`)**: Tối đa **28 ngày (4 tuần)** (bảo vệ gân gót gập SDFT và xương mè trước áp lực nước rút).
    + **Chuẩn bị thi đấu (`PRE_RACE`)**: Tối đa **14 ngày (2 tuần)** (điểm rơi phong độ tối ưu, xả cơ tích lũy glycogen).
    + **Phục hồi thể trạng (`RECOVERY`)**: Tối đa **21 ngày (3 tuần)** (tránh teo cơ do thả lỏng quá lâu).
  - Khi người dùng điều chỉnh ngày, giao diện tự động khóa cứng (*clamping*) không cho chọn vượt trần sinh lý. Nếu gửi payload vi phạm, Backend chặn với mã lỗi `INVALID_PHASE`.
  - Đối với giáo án siêu dài (> 140 ngày), hệ thống yêu cầu cấu hình tối thiểu nhiều giai đoạn để đảm bảo tổng thời lượng không vượt quá tổng trần sinh lý của các giai đoạn cộng lại.
- **Ràng buộc Chống đè lấn Thời gian**: Ngày bắt đầu của giai đoạn kế tiếp phải lớn hơn ngày kết thúc của giai đoạn liền trước.
  - **Trường hợp Hợp lệ**: Các giai đoạn nối tiếp liên tục, hệ thống chuyển sang bước lên lịch tập con.
  - **Trường hợp Vi phạm (Thời gian bị trùng)**: Hệ thống chặn lưu cấu trúc, báo lỗi trực tiếp trên giao diện: *"Giai đoạn bị trùng thời gian với giai đoạn [Tên giai đoạn liền trước]."*

---

### 3.4. Kích hoạt Giáo án Chính thức & Cơ chế Tịnh tiến Lịch tập Tự động

```
[Bản nháp DRAFT] ───> Bấm "Kích hoạt giáo án"
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼
[Đủ điều kiện kích hoạt]                     [Thiếu điều kiện kích hoạt]
- Trạng thái ngựa: RESTING -> IN_TRAINING     - Chưa có buổi tập nào: Báo lỗi
- Giáo án: DRAFT -> ACTIVE                   - Không có bài tập tương lai: Báo lỗi
- Tự động tịnh tiến lịch nếu kích hoạt trễ  - Ngựa có Khóa y tế: Báo lỗi
- Xóa bỏ cảnh báo quá hạn SLA 3 ngày         - Đang theo dõi thú y mà chưa tích xác nhận: Báo lỗi
```

#### Ma trận Thẩm định Kích hoạt Giáo án:

| Tiêu chuẩn Kiểm tra | Điều kiện Nghiệp vụ | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Sự tồn tại của Buổi tập** | Giáo án phải chứa ít nhất 1 buổi tập con. | Chấp nhận kiểm tra tiếp tính khả thi. | **Hành vi:** Chặn kích hoạt.<br>**Thông báo lỗi:** *"Giáo án phải có ít nhất một buổi tập."* |
| **Tính khả thi Thời gian** | Phải có ít nhất 1 buổi tập diễn ra từ ngày hôm nay trở đi. | Chấp nhận giáo án có tính khả thi. | **Hành vi:** Chặn kích hoạt.<br>**Thông báo lỗi:** *"Giáo án không có buổi tập nào trong tương lai. Vui lòng bổ sung hoặc điều chỉnh lịch tập trước khi kích hoạt."* |
| **Tình trạng Y tế Ngựa** | Ngựa không bị Bác sĩ thú y khóa y tế. | Cho phép kích hoạt giáo án. | **Hành vi:** Nút Kích hoạt bị vô hiệu hóa.<br>**Thông báo lỗi:** *"Chiến mã đang bị Khóa huấn luyện y tế. Không thể kích hoạt giáo án."* |
| **Xác nhận Tham vấn Thú y** | Nếu ngựa đang thuộc diện theo dõi đặc biệt (chấn thương nhẹ, cách ly, nghi vấn), HLV bắt buộc phải tích chọn ô *"Đã tham vấn Bác sĩ thú y"*. | Hệ thống ghi nhận biên bản tham vấn và cho phép kích hoạt. | **Hành vi:** Chặn kích hoạt.<br>**Thông báo lỗi:** *"Chiến mã đang trong diện theo dõi y tế đặc biệt. Bắt buộc phải tham vấn ý kiến Bác sĩ thú y trước khi kích hoạt giáo án."* |
| **Cơ chế Tịnh tiến Tự động** | HLV kích hoạt giáo án trễ hơn so với ngày bắt đầu dự kiến ban đầu trong bản nháp. | **Hệ thống tự động tính độ lệch thời gian và dời toàn bộ ngày của các giai đoạn cũng như dời ngày của toàn bộ các buổi tập con về phía trước một khoảng tương ứng**, bảo đảm không có bài tập nào bị rơi vào quá khứ. | Không phát sinh lỗi; hệ thống tự động bảo toàn lịch trình. |

- **Kết quả khi Kích hoạt Thành công**:
  - Giáo án chuyển sang trạng thái **Đang áp dụng**.
  - Chiến mã tự động chuyển trạng thái từ **Nghỉ ngơi** sang **Đang huấn luyện**.
  - Toàn bộ nghĩa vụ SLA lập giáo án 3 ngày được thanh toán hoàn tất; xóa vĩnh viễn các badge/cảnh báo quá hạn.

---

### 3.5. Chỉnh sửa Giáo án Đang Hoạt động
- **Ràng buộc Bảo vệ Dữ liệu Quá khứ**: HLV không được phép thay đổi khoảng ngày của giáo án nếu sự thay đổi đó làm các buổi tập **ĐÃ HOÀN THÀNH** bị văng ra ngoài khung ngày mới.
  - **Khi Hợp lệ**: Khung ngày mới bao trọn toàn bộ các buổi tập đã hoàn thành, hệ thống cập nhật lịch trình thành công.
  - **Khi Vi phạm**: Hệ thống chặn lưu, báo lỗi: *"Không thể thay đổi khoảng ngày vì có buổi tập đã hoàn thành nằm ngoài khoảng ngày mới."*
- **Ràng buộc Giai đoạn đã diễn ra**: Giai đoạn đã có buổi tập hoàn thành thì không được phép xóa và không được sửa đổi ngày bắt đầu.
  - **Khi Vi phạm**: Hệ thống báo lỗi: *"Giai đoạn đã có buổi tập hoàn thành, không thể xóa hoặc sửa ngày bắt đầu."*

---

### 3.6. Hoàn thành Giáo án & Cơ chế Miễn trừ SLA Nghỉ ngơi

| Tiêu chuẩn Nghiệm thu | Nội dung Yêu cầu Nghiệp vụ | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Báo cáo Tổng kết Chu kỳ** | HLV bắt buộc phải nhập nhận xét, đánh giá kết quả huấn luyện (từ 10 đến 2.000 ký tự). | Báo cáo hợp lệ, đủ điều kiện đóng giáo án. | **Hành vi:** Chặn hoàn thành giáo án.<br>**Thông báo lỗi:** *"Báo cáo nhận xét tổng kết chu kỳ huấn luyện phải từ 10 đến 2000 ký tự."* |
| **Nghiệm thu Buổi tập Tồn đọng** | Toàn bộ các buổi tập con trong giáo án phải được cập nhật kết quả đầy đủ (đã ghi nhận hoàn thành hoặc đã bấm hủy ca tập). | Toàn bộ bài tập đã tất toán, hệ thống cho phép hoàn tất giáo án. | **Hành vi:** Chặn hoàn tất.<br>**Thông báo lỗi:** *"Còn [Số lượng] buổi tập chưa ghi kết quả: [Danh sách ngày]. Vui lòng cập nhật kết quả hoặc hủy buổi tập trước khi hoàn thành giáo án."* |

- **Đặc quyền Miễn trừ SLA Chu kỳ Nghỉ ngơi (`isRestingCycle`)**:
  - Khi một giáo án được chuyển sang trạng thái Đã hoàn thành, chiến mã tự động chuyển từ trạng thái `Đang huấn luyện` về trạng thái `Nghỉ ngơi`.
  - Hệ thống **tự động xóa bỏ hạn chót SLA 3 ngày**, gán nhãn Chu kỳ Nghỉ ngơi hồi phục.
  - Trên Bàn làm việc HLV và Danh sách giáo án: Hiển thị Huy hiệu màu Xanh lá cây tươi sáng: **`Nghỉ ngơi hồi phục`**.
  - Ý nghĩa nghiệp vụ: Chiến mã được quyền nghỉ ngơi thư giãn sau đợt thi đấu căng thẳng, **HLV không bị ép buộc lập giáo án mới và hoàn toàn không bị phạt KPI quá hạn**.

---

## 4. QUY TRÌNH 3: LẬP LỊCH, XẾP CA & KIỂM SOÁT XUNG ĐỘT BUỔI TẬP

### 4.1. Bảng Quy chuẩn 7 Loại Bài tập Chuyên sâu

| Tên Bài tập | Mục tiêu Thể lực | Thời lượng Tiêu chuẩn | Quy chuẩn Cường độ | Quy chuẩn Mặt sân |
| :--- | :--- | :---: | :---: | :---: |
| **Đi bộ thư giãn** | Thả lỏng khớp, lưu thông khí huyết | **45 phút** | Nhẹ | Sân cỏ / Sân cát / Sân tổng hợp |
| **Chạy nước kiệu** | Khởi động, kích thích cơ bắp | **60 phút** | Nhẹ hoặc Vừa | Sân cỏ / Sân cát / Sân tổng hợp |
| **Chạy nước đại nhẹ** | Rèn luyện dung tích phổi và nhịp thở | **60 phút** | Vừa | Sân cỏ / Sân cát / Sân tổng hợp |
| **Chạy tốc độ cao** | Bứt phá tốc độ tối đa | **60 phút** | **Hệ thống luôn tự động ép thành NẶNG** | Sân cỏ / Sân cát / Sân tổng hợp |
| **Chạy thử sát hạch** | Sát hạch thi đấu đo cự ly và tốc độ | **90 phút** | **Hệ thống luôn tự động ép thành NẶNG** | Sân cỏ / Sân cát / Sân tổng hợp |
| **Bơi phục hồi** | Xả cơ bắp không chịu tải trọng khớp | **45 phút** | Nhẹ hoặc Vừa | **Tự động ép thành: Khu Bể bơi** *(Không dùng đường chạy)* |
| **Máy đi bộ trên cạn** | Rèn bước chân trong không gian tĩnh | **60 phút** | Nhẹ hoặc Vừa | **Tự động ép thành: Khu Máy tập** *(Không dùng đường chạy)* |

---

### 4.2. Nguyên tắc HLV Tự Dẫn dắt Buổi tập & Kiêm Nài ngựa
- Trong toàn bộ phân hệ Huấn luyện EquiFlow: **Huấn luyện viên Trưởng của giáo án trực tiếp đứng lớp hướng dẫn và trực tiếp cưỡi ngựa (kiêm Nài ngựa) trên đường chạy**.
- Trên Giao diện Xếp lịch buổi tập: **Hoàn toàn không có trường lựa chọn Nhân viên chăm sóc chuồng trại (Groom)**. Hệ thống tự động gán thông tin của chính Huấn luyện viên vào vị trí người phụ trách buổi tập và nài ngựa điều khiển.
- Phân định ranh giới: Nhân viên chăm sóc chuồng trại tuyệt đối không dẫn ngựa ra đường chạy và không cưỡi ngựa. Groom chỉ chăm sóc tĩnh tại khu chuồng trại (cho ăn, quét dọn phân, tắm rửa vệ sinh).

---

### 4.3. Khung giờ Hoạt động & Dòng thời gian Khả dụng Thông minh (Timeline Interval Slicing)

```
05:30   06:15                   11:30   13:30   14:15                   17:00   18:00   19:00
  │───────│───────────────────────│───────│───────│───────────────────────│───────│───────│
  ▼       ▼                       ▼       ▼       ▼                       ▼       ▼       ▼
Ăn sáng  [Khung rảnh sáng 🟢]   Ăn trưa Tắm xả   [Khung rảnh chiều 🟢]  Ăn tối & Nghỉ đêm
(Groom)  (Tự động trừ ca bận)   & nghỉ  cơ móng  (Tự động trừ ca bận)   (Groom sinh hoạt)
```

- **Thuật toán Tự động Cắt tỉa Khung giờ Khả dụng (Dynamic Interval Slicing)**:
  - Khi HLV mở màn hình xếp lịch tập hoặc tạo lịch tự động, hệ thống không hiển thị dải giờ chung chung mà **tự động đối chiếu lịch bận thực tế của HLV** trong ngày đó để chia nhỏ các khoảng thời gian rảnh.
  - **Khung sáng (06:15 – 11:30)**: Tự động trừ đi các ca HLV bận tập ngựa khác (ví dụ: bận 08:00 – 09:00) $\rightarrow$ Tự động tách thành:
    - `06:15 – 08:00: Khung rảnh sáng` 👉 Huy hiệu màu xanh: **`Khả dụng`**
    - `08:00 – 09:00: HLV bận: [Tên ngựa]` 👉 Huy hiệu màu cam: **`Đang bận`**
    - `09:00 – 11:30: Khung rảnh sáng` 👉 Huy hiệu màu xanh: **`Khả dụng`**
  - **Khung chiều (14:15 – 17:00)**: Tương tự, tự động bắt đầu sau khi Groom hoàn tất ca tắm xả cơ móng (14:15) và trừ đi các ca tập chiều $\rightarrow$ Hiển thị chính xác các khoảng thời gian rảnh thực tế kèm huy hiệu **`Khả dụng`**.
  - **Đồng nhất thuật ngữ**: Loại bỏ hoàn toàn sự mâu thuẫn giữa nhãn "Khuyên dùng" và "Khả dụng"; toàn bộ các khoảng thời gian trống đủ điều kiện xếp lịch đều được định danh thống nhất là **`Khả dụng`**.

| Quy chuẩn Khung giờ | Tiêu chuẩn Nghiệp vụ | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Giờ Mở cửa Khuôn viên** | Từ **04:00 sáng đến 20:00 tối**. | Giờ tập nằm trong khung mở cửa hạ tầng. | **Hành vi:** Chặn lưu buổi tập.<br>**Thông báo lỗi:** *"Giờ bắt đầu phải từ 04:00 đến 20:00."* |
| **Chốt chặn Sinh học Chiều** | Buổi tập bắt buộc phải **kết thúc trước hoặc đúng 17:00 chiều** để ngựa tắm hạ nhiệt và ăn tối (17:00 - 18:00). Do bài tập kéo dài 45 - 60 phút, **giờ bắt đầu muộn nhất được phép xếp là 16:00 chiều**. | Buổi tập kết thúc ≤ 17:00 chiều, đảm bảo thời gian ăn tối nghỉ đêm của ngựa. | **Hành vi:** Chặn lưu lịch tập.<br>**Thông báo lỗi:** *"Buổi tập phải kết thúc trước hoặc đúng 17:00 chiều để đảm bảo giờ nghỉ ngơi và ăn tối của ngựa. Giờ bắt đầu muộn nhất là 16:00."*<br>*(Giao diện khống chế cứng ô chọn giờ từ 04:00 đến 16:00).* |
| **Hạn ngạch Khung giờ Vàng** | **06:15 đến 08:00 sáng**: Khung giờ thời tiết mát mẻ nhất. Mỗi HLV bị khống chế tối đa **2 buổi tập nặng** để bảo đảm công bằng tài nguyên đường chạy. | HLV xếp ≤ 2 bài tập nặng trong khung 06:15 - 08:00. | **Hành vi:** Chặn lưu buổi tập.<br>**Thông báo lỗi:** *"HLV đã đạt hạn ngạch tối đa 2 bài tập nặng trong khung giờ vàng buổi sáng (06:15 - 08:00). Vui lòng chọn khung giờ khác."* |
| **Các khung giờ khác trong ngày** | Từ 08:15 đến 16:00 chiều: HLV được xếp thêm các bài tập nặng khác bình thường nếu đường chạy còn trống. | Cho phép lưu lịch tập nếu đường chạy trống và cách ca trước ≥ 15 phút. | Không bị giới hạn bởi hạn ngạch 2 bài của giờ vàng. |

---

### 4.4. Kiểm soát Xung đột Thời gian (Conflict Checks)

| Loại Xung đột | Ràng buộc Nghiệp vụ | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Thời gian Đệm nghỉ của HLV** | Giữa 2 buổi tập liên tiếp của cùng 1 Huấn luyện viên bắt buộc phải có thời gian nghỉ tối thiểu **15 phút**. | Ca tập mới cách ca trước/sau ≥ 15 phút. | **Hành vi:** Chặn lưu ca tập trùng.<br>**Thông báo lỗi:** *"Huấn luyện viên [Họ và tên HLV] đã có buổi tập của ngựa [Tên ngựa] lúc [Khung giờ]. HLV chỉ có thể điều hành 1 buổi tập tại một thời điểm. Chọn giờ bắt đầu từ [Giờ trước] trở về trước hoặc từ [Giờ sau] trở đi."* |
| **Xung đột Thể lực của Ngựa** | Một chiến mã không thể tham gia 2 buổi tập cách nhau dưới **30 phút**. | Hai buổi tập của ngựa cách nhau ≥ 30 phút. | **Hành vi:** Chặn lưu ca tập.<br>**Thông báo lỗi:** *"Chiến mã đã có lịch tập khác quá gần khung giờ này (cần cách tối thiểu 30 phút)."* |
| **Thời điểm Tạo lịch Hôm nay** | Nếu lên lịch cho buổi tập diễn ra ngay trong ngày hôm nay, giờ bắt đầu phải sau giờ hiện tại tối thiểu **30 phút**. | Đặt lịch trước ít nhất 30 phút so với giờ chạy thực tế. | **Hành vi:** Chặn lưu lịch gấp.<br>**Thông báo lỗi:** *"Giờ bắt đầu buổi tập phải cách thời điểm hiện tại ít nhất 30 phút."* |

---

### 4.5. Chọn Mặt sân & Kiểm soát Sức chứa Đường chạy (Track Capacity)
- **Luồng thao tác trên Giao diện**:
  1. HLV chọn **Loại Mặt sân** (Sân cỏ, Sân cát, Sân tổng hợp, hoặc Bể bơi/Máy tập).
  2. Dựa vào mặt sân đã chọn, hệ thống tự động lọc danh sách các **Đường chạy thực tế** trong khuôn viên CLB để HLV chọn đường chạy cụ thể.

- **Cơ chế Kiểm soát Hai Nhánh Sức chứa**:
  1. **Đối với Bài tập Nhẹ / Vừa (Đi bộ, Nước kiệu, Nước đại)**:
     - Áp dụng cơ chế chia sẻ đường chạy theo sức chứa thiết kế (từ **4 đến 6 chiến mã cùng lúc** tùy theo từng đường chạy).
     - **Trường hợp Hợp lệ**: Số lượng ngựa đang tập trên đường chạy < Sức chứa tối đa $\rightarrow$ Hệ thống cho phép xếp thêm ngựa vào tập luyện bình thường.
     - **Trường hợp Vi phạm (Đường chạy đã đầy)**: Hệ thống hiển thị nhãn Đầy sân, chặn không cho đặt lịch, yêu cầu HLV đổi đường chạy khác hoặc chuyển khung giờ.
  2. **Đối với Bài tập Nặng (Chạy tốc độ cao, Chạy thử sát hạch)**:
     - Áp dụng nguyên tắc **Chiếm dụng Độc quyền 100%**.
     - **Trường hợp Hợp lệ**: Khi đường chạy hoàn toàn trống trong khung giờ đó $\rightarrow$ Cho phép HLV xếp ca chạy tốc độ cao. Ngay khi được xếp lịch, đường chạy đó lập tức bị khóa kín trong suốt khung giờ diễn ra.
     - **Trường hợp Vi phạm**: Nếu có một HLV khác cố tình xếp bất kỳ bài tập nào (dù nhẹ hay nặng) vào cùng đường chạy đó trong khung giờ trên:
       - **Hành vi:** Hệ thống chặn đứng hoàn toàn để loại trừ triệt để nguy cơ tai nạn va chạm ở tốc độ cao (trên 60 km/h).
       - **Thông báo lỗi hiển thị:** *"Đường chạy [Tên đường chạy] đang có buổi tập tốc độ cao của chiến mã khác trong khung giờ này. Vui lòng chọn đường chạy hoặc khung giờ khác."*

---

## 5. QUY TRÌNH 4: THỰC THI BUỔI TẬP & GHI NHẬN CHỈ SỐ SINH TRẮC HỌC

### 5.1. Bắt đầu Buổi tập

| Tiêu chuẩn Kiểm tra | Điều kiện Nghiệp vụ | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Kiểm tra Khóa Y tế** | Chiến mã không có Khóa y tế đang hiệu lực vào ngày diễn ra buổi tập. | Nút `Bắt đầu buổi tập` khả dụng, cho phép bấm. | **Hành vi:** Nút Bắt đầu bị khóa, chuyển thành nút đỏ `Xem bệnh án`.<br>**Thông báo lỗi:** *"Chiến mã đang bị Khóa huấn luyện y tế. Không thể bắt đầu buổi tập."* |
| **Thời điểm Bắt đầu** | Phải đến đúng hoặc sau giờ tập thực tế mới được phép bấm Bắt đầu. | Trạng thái buổi tập chuyển sang `Đang diễn ra`. Bắt đầu tính giờ thực tế. | Bấm trước giờ tập bị chặn (trừ chế độ mô phỏng kiểm thử nội bộ). |

---

### 5.2. Ghi nhận Chỉ số Sinh trắc & Đánh giá Phong độ

Sau khi ca tập hoàn thành, Huấn luyện viên Trưởng trực tiếp nhập các chỉ số viễn trắc sinh học thu thập được:

| Chỉ số / Tiêu chuẩn | Giới hạn Nghiệp vụ & Khoa học | Xử lý khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :--- | :--- | :--- |
| **Thời hạn Ghi kết quả** | Tối đa trong vòng **7 ngày** kể từ khi buổi tập kết thúc. | Kết quả được ghi nhận vào hồ sơ thể lực của ngựa. | **Hành vi:** Khóa form nhập kết quả.<br>**Thông báo lỗi:** *"Đã quá 7 ngày, không thể ghi kết quả cho buổi tập đã bỏ lỡ."* |
| **Thời hạn Chỉnh sửa** | Chỉ được sửa kết quả trong vòng **48 giờ** kể từ lần lưu đầu tiên. | Cho phép lưu các điều chỉnh số liệu chính xác. | **Hành vi:** Khóa quyền chỉnh sửa.<br>**Thông báo lỗi:** *"Đã hết hạn chỉnh sửa kết quả buổi tập (48 giờ kể từ lần ghi đầu tiên)."* |
| **Giới hạn Cự ly Buổi tập** | Tối đa **10.000 mét (10 km) / buổi tập**. | Cự ly hợp lệ, tiến hành tính toán tốc độ. | **Hành vi:** Chặn lưu dữ liệu.<br>**Thông báo lỗi:** *"Cự ly tập luyện thực tế tối đa là 10.000 mét."* |
| **Ngưỡng Vận tốc Sinh học** | Tốc độ trung bình tính toán tối đa là **75 km/h** (kỷ lục thế giới loài ngựa đua xấp xỉ 70 km/h). | Vận tốc hợp lệ, lưu vào biểu đồ phong độ. | **Hành vi:** Chặn lưu (chống nhập khống sai lệch).<br>**Thông báo lỗi:** *"Vận tốc trung bình tính toán ([Tốc độ] km/h) vượt quá ngưỡng sinh học tối đa của loài ngựa (75 km/h). Vui lòng kiểm tra lại cự ly và thời gian."* |
| **Tốc độ Bứt phá Cực đại** | Tốc độ cao nhất (Top Speed) không được nhỏ hơn Tốc độ trung bình. | Ghi nhận chỉ số bứt phá thành công. | **Hành vi:** Chặn lưu số liệu vô lý.<br>**Thông báo lỗi:** *"Tốc độ bứt phá cực đại không thể nhỏ hơn tốc độ trung bình."* |
| **Chỉ số Nhịp tim Chuẩn** | - Nhịp tim nghỉ: 28 – 45 nhịp/phút.<br>- Nhịp tim đỉnh: 120 – 240 nhịp/phút.<br>- Nhịp tim hồi phục: **Không được lớn hơn nhịp tim đỉnh**. | Dải nhịp tim an toàn, cập nhật hồ sơ tim mạch. | **Vi phạm:** Nhập nhịp hồi phục > nhịp đỉnh.<br>**Thông báo lỗi:** *"Nhịp tim hồi phục không thể cao hơn nhịp tim đỉnh trong buổi tập."* |
| **Điểm số Phong độ** | Chấm điểm cảm quan chuyên môn theo thang điểm từ **0 đến 100 điểm**. | Điểm số được tích lũy vào hồ sơ xét duyệt thi đấu. | Nhập ngoài dải 0 - 100 bị chặn báo lỗi. |

---

### 5.3. Xử lý Dấu hiệu Bất thường & Cảnh báo Y tế Khẩn cấp

```
[HLV tích chọn Dấu hiệu Bất thường]
                │
                ▼ (Bắt buộc nhập mô tả ≥ 10 ký tự)
   ┌────────────────────────────────────────┐
   │ Hệ thống ghi nhận kết quả buổi tập     │
   └────────────────────┬───────────────────┘
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
[Hệ thống Báo động Thú y]         [Cảnh báo Bàn làm việc HLV]
- Bắn thông báo khẩn cấp tức thì  - Nếu nhịp tim sau 15p > 115 bpm:
  đến Bác sĩ thú y                - Gắn cờ Cảnh báo Mệt mỏi quá tải
- Tự động tạo hồ sơ khám sơ bộ     trên Sidebar và Hồ sơ chiến mã
```

1. **Ràng buộc Mô tả Dấu hiệu Bất thường**:
   - Khi HLV phát hiện ngựa có dấu hiệu: Què chân / khập khiễng, Thở dốc kéo dài, Chảy máu mũi, Sưng khớp / sưng gân, hoặc Bỏ ăn / ủ rũ:
   - **Trường hợp Hợp lệ**: HLV nhập mô tả chi tiết từ 10 đến 500 ký tự $\rightarrow$ Hệ thống ghi nhận kết quả và **ngay lập tức gửi thông báo khẩn cấp thời gian thực đến Bác sĩ thú y** với tiêu đề: *"Phát hiện dấu hiệu bất thường sau buổi tập của chiến mã [Tên chiến mã]"*.
   - **Trường hợp Vi phạm**: HLV tích chọn dấu hiệu nhưng để trống phần mô tả:
     - **Hành vi:** Chặn lưu kết quả buổi tập.
     - **Thông báo lỗi:** *"Vui lòng nhập mô tả chi tiết dấu hiệu bất thường để Bác sĩ thú y nắm thông tin."*

2. **Cảnh báo Mệt mỏi Quá tải (Exertion Alert)**:
   - Nếu nhịp tim hồi phục sau 15 phút nghỉ ngơi vẫn **vượt trên 115 nhịp/phút**:
   - Hệ thống tự động kích hoạt Cờ cảnh báo mệt mỏi quá tải màu Cam trên Bàn làm việc của Huấn luyện viên để HLV chủ động giảm tải trọng trong các ca tập kế tiếp.

---

### 5.4. Hủy Buổi tập Chưa Diễn ra
- **Điều kiện**: HLV chỉ được phép hủy các buổi tập chưa hoàn thành (Đã lên lịch, Bị chặn, hoặc Đã bỏ lỡ).
- **Ràng buộc Lý do Hủy**: Nếu HLV chọn lý do hủy là `Khác`:
  - **Trường hợp Hợp lệ**: HLV nhập giải trình từ 10 đến 500 ký tự $\rightarrow$ Buổi tập chuyển sang trạng thái Đã hủy, giải phóng khung giờ trên đường chạy.
  - **Trường hợp Vi phạm (Để trống giải trình)**: Hệ thống chặn hủy, báo lỗi: *"Vui lòng nhập giải trình lý do hủy buổi tập (tối thiểu 10 ký tự)."*

---

## 6. QUY TRÌNH 5: CƠ CHẾ LIÊN ĐỘNG KHÓA Y TẾ (MEDICAL LOCK INTERLOCK)

Cơ chế Khóa liên động là rào chắn an toàn tối thượng của hệ thống EquiFlow, được thiết kế để triệt tiêu hoàn toàn khả năng chiến mã đang có vấn đề sức khỏe bị ép ra sân tập.

```
       [Bác sĩ Thú y kích hoạt Khóa Y tế]
                       │
                       ▼
         Chiến mã bị KHÓA Y TẾ TOÀN DIỆN
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[Tại Phân hệ Huấn luyện]     [Tại Giao diện HLV]
- Chặn tạo giáo án mới       - Hiển thị Huy hiệu đỏ "Khóa y tế"
- Chặn kích hoạt giáo án     - Nút "Bắt đầu tập" bị khóa cứng
- Chặn bấm bắt đầu ca tập    - Chuyển thành nút đỏ "Xem bệnh án"
- Tự động hoãn bài tập nặng
```

### Chi tiết Tác động Hai Nhánh của Khóa Y tế:

| Điểm Chặn Chức năng | Hành vi của Hệ thống khi CÓ KHÓA Y TẾ | Hành vi khi BÁC SĨ THÚ Y GỠ KHÓA |
| :--- | :--- | :--- |
| **Tạo Giáo án Mới** | **Hành vi:** Chặn đứng tại bước chọn ngựa.<br>**Thông báo lỗi:** *"Ngựa đang bị Khóa huấn luyện y tế. Không thể tạo giáo án mới cho đến khi Bác sĩ thú y gỡ khóa."* | Trạng thái bình thường, cho phép khởi tạo giáo án mới. |
| **Kích hoạt Giáo án** | **Hành vi:** Vô hiệu hóa nút Kích hoạt.<br>**Thông báo lỗi:** *"Chiến mã đang bị Khóa huấn luyện y tế. Không thể kích hoạt giáo án."* | Cho phép kích hoạt giáo án nếu đủ điều kiện buổi tập. |
| **Bắt đầu Buổi tập** | **Hành vi:** Nút `Bắt đầu buổi tập` bị khóa cứng, chuyển thành nút đỏ `Xem bệnh án`. Nếu cố tình gọi thao tác:<br>**Thông báo lỗi:** *"Chiến mã đang bị Khóa huấn luyện y tế. Không thể bắt đầu buổi tập."* | Nút `Bắt đầu buổi tập` sáng trở lại, cho phép bấm khi đến giờ. |
| **Lịch tập Nặng Đã lên lịch** | Toàn bộ các buổi tập Chạy tốc độ cao, Chạy thử sát hạch trong khoảng thời gian khóa y tế **tự động chuyển sang trạng thái BỊ CHẶN (Hoãn tập)**. | HLV được phép điều chỉnh lại lịch tập sau khi có chẩn đoán hồi phục. |

> **Thẩm quyền Duy nhất**: Chỉ duy nhất Bác sĩ thú y (`Role.VETERINARIAN`) có thẩm quyền Đặt khóa hoặc Gỡ khóa y tế sau khi tái khám chuyên môn. Huấn luyện viên Trưởng tuyệt đối không thể can thiệp bằng bất kỳ hình thức nào.

---

## 7. QUY TRÌNH 6: SÁT HẠCH CHẠY THỬ & ĐĂNG KÝ THI ĐẤU

### 7.1. Buổi Chạy thử Sát hạch Chuẩn Quốc tế
- **Thời lượng**: 90 phút (bài tập cường độ cao nhất hệ thống).
- **Cự ly đo đạc chính thức**: Đo đạc thời gian cán đích ở 3 cự ly thi đấu quốc tế: **1.000m, 1.200m, 1.600m**.
- **Chỉ số bắt buộc thu thập**: Tốc độ bứt phá cực đại (Top Speed) và điểm số phong độ.

---

### 7.2. Bảng Thẩm định 4 Trụ cột Sẵn sàng Thi đấu

Chiến mã chỉ được hệ thống công nhận **Đủ điều kiện đăng ký thi đấu** khi thỏa mãn đồng thời **toàn bộ 4/4 tiêu chí khắt khe**:

| Trụ cột Thẩm định | Tiêu chuẩn Nghiệp vụ | Xử lý khi ĐẠT TIÊU CHÍ (ĐÚNG) | Chế tài khi KHÔNG ĐẠT (SAI) |
| :--- | :--- | :--- | :--- |
| **Trụ cột 1: Thể trạng Y tế** | - Không bị Khóa y tế.<br>- Không ở diện chấn thương, cách ly.<br>- Không bị tạm giữ do nợ tiền chuồng.<br>- Không bị ngừng quản lý. | Tiêu chí y tế đạt tích xanh. | **Hành vi:** Đánh dấu X đỏ tiêu chí y tế; khóa hoàn toàn nút nộp danh sách thi đấu. |
| **Trụ cột 2: Tiến độ Giáo án** | Có giáo án Đang áp dụng và tiến độ hoàn thành đạt **từ 80% trở lên** (hoặc đã tích lũy tối thiểu 8 buổi tập hoàn tất). | Tiêu chí giáo án đạt tích xanh. | **Hành vi:** Đánh dấu X đỏ, cảnh báo: *"Chưa hoàn thành đủ 80% giáo án."* |
| **Trụ cột 3: Phong độ Chạy thử** | Có ít nhất 1 bài Chạy thử sát hạch đạt **Điểm phong độ ≥ 70 / 100 điểm** và **Vận tốc bứt phá cực đại ≥ 50 km/h**. | Tiêu chí sát hạch đạt tích xanh. | **Hành vi:** Đánh dấu X đỏ, cảnh báo: *"Chưa có bài chạy thử đạt chuẩn (Điểm ≥ 70 và Tốc độ ≥ 50 km/h)."* |
| **Trụ cột 4: An toàn Tải trọng** | Tổng tải trọng vận động 7 ngày gần nhất không vượt quá **130%** mức tải trung bình tuần của 4 tuần trước đó (không có cảnh báo sốc tải trọng). | Tiêu chí an toàn cơ bắp đạt tích xanh. | **Hành vi:** Đánh dấu X đỏ, cảnh báo: *"Cảnh báo gai tải trọng vượt ngưỡng 130%. Nguy cơ chấn thương cao."* |

- **Kết quả Thẩm định**:
  - **Khi ĐẠT 4/4 TIÊU CHÍ**: Giao diện hiển thị Huy hiệu Xanh lá cây tươi sáng: **`Đủ điều kiện thi đấu`**. Mở khóa chức năng nộp danh sách đăng ký giải đua gửi Quản lý CLB.
  - **Khi VI PHẠM (Dù chỉ 1 tiêu chí)**: Giao diện hiển thị Huy hiệu Màu Xám: **`Chưa đủ điều kiện`**. Nút nộp danh sách bị khóa mờ; hệ thống liệt kê rõ ràng các tiêu chí chưa đạt để HLV tiếp tục bồi dưỡng.

---

## 8. QUY TRÌNH 7: MINH BẠCH ĐÁNH GIÁ TỪ CHỦ SỞ HỮU NGỰA

Nhằm bảo đảm tính khách quan và nâng cao chất lượng dịch vụ huấn luyện:
- **Thẩm quyền Đánh giá**: Chủ sở hữu chiến mã có quyền gửi đánh giá từ 1 đến 5 sao kèm nhận xét cho Huấn luyện viên đối với các giáo án đang áp dụng hoặc đã hoàn thành.
- **Ranh giới Quyền hạn của HLV**:
  - Huấn luyện viên Trưởng **chỉ có quyền Xem danh sách đánh giá của tôi (`My Reviews`)**.
  - **HLV hoàn toàn KHÔNG có quyền chỉnh sửa, ẩn hoặc xóa bất kỳ đánh giá nào của Chủ ngựa**.
- **Bộ Chỉ số Uy tín Chuyên môn của HLV**:
  - **Điểm số hài lòng trung bình** (tính theo số sao từ Chủ ngựa).
  - **Tỷ lệ hoàn thành giáo án đúng hạn SLA 3 ngày** (không bị cảnh báo quá hạn).
  - **Tỷ lệ chiến mã sát hạch đạt chuẩn thi đấu thành công**.

---

## 9. BẢNG TỔNG HỢP MA TRẬN QUY TẮC NGHIỆP VỤ ĐA NHÁNH (HỢP LỆ & VI PHẠM)

Bảng ma trận dưới đây là tài liệu căn cứ cốt lõi dành cho BA nghiệm thu và Quản lý đối soát toàn bộ phân hệ:

| Tên Quy tắc Nghiệp vụ | Giá trị Chuẩn mực | Xử lý & Thông báo khi HỢP LỆ (ĐÚNG) | Hành vi Chặn & Thông báo khi VI PHẠM (SAI) |
| :--- | :---: | :--- | :--- |
| **Định mức ngựa / HLV** | **Tối đa 8 ngựa** | Cho phép Quản lý giao thêm ngựa cho HLV. | **Chặn phân công**.<br>Thông báo: *"HLV [Họ và tên] đã đạt định mức tối đa 8 chiến mã đồng thời."* |
| **Hạn mức tồn đọng (WIP Limit)** | **Tồn < 2 ngựa** chưa có giáo án | HLV được phép nhận thêm ngựa mới. | **Chặn phân công**.<br>Thông báo: *"Huấn luyện viên [Họ và tên] đang tồn [X] chiến mã chưa kích hoạt giáo án. Vui lòng hoàn tất giáo án hiện có trước khi phân công thêm."* |
| **Ràng buộc Khu chuồng** | Cùng Khu chuồng | Cho phép giao ngựa và lên lịch tập. | **Chặn phân công**.<br>Thông báo: *"HLV [Họ tên HLV] phụ trách [Barn HLV], không thể nhận ngựa ở [Barn Ngựa]."* |
| **Thời hạn phản hồi bàn giao** | **48 giờ** | Cho phép HLV bấm Đồng ý hoặc Từ chối nhận ngựa. | **Chặn thao tác**.<br>Thông báo: *"Yêu cầu phân công đã hết hạn phản hồi (48 giờ)."* |
| **SLA Lập giáo án** | **Cố định 3 ngày (72 giờ)** | - Giao diện: Badge vàng *"Còn X ngày"*. Nút *"Lập giáo án ngay"*. Khi kích hoạt giáo án: Giải phóng nghĩa vụ. | - Giao diện: Badge đỏ *"Quá hạn X ngày"*. Dashboard báo đỏ.<br>- Tự động kích hoạt WIP Limit chặn nhận ngựa mới.<br>- Tự động gửi Email cảnh báo KPI: `[TMEC Cảnh báo KPI] Quá hạn lập giáo án cho chiến mã [Tên ngựa]`. |
| **Thời gian chờ hủy nháp (Cooldown)**| **48 giờ** | Tạo giáo án cho các ngựa hợp lệ khác. | **Chặn tạo giáo án cho ngựa đó**.<br>Thông báo: *"Bạn đang trong thời gian chờ ([X] giờ còn lại) đối với chiến mã [Tên] do vừa hủy hoặc để hết hạn bản nháp..."* |
| **Thời lượng giáo án tối đa** | **52 tuần** | Giáo án hợp lệ, cho phép lưu nháp. | **Chặn lưu**.<br>Thông báo: *"Giáo án tối đa 52 tuần."* |
| **Tên & Mục tiêu giáo án** | Phải có chữ cái, bắt đầu bằng chữ cái | Chấp nhận lưu thông tin giáo án. | - Tên toàn số: *"Tên giáo án không hợp lệ..."*<br>- Mục tiêu bắt đầu bằng số: *"Mục tiêu giáo án phải bắt đầu bằng chữ cái..."* |
| **Thời lượng tối thiểu giai đoạn** | 3 ngày hoặc 7 ngày | Cho phép lưu cấu trúc giai đoạn. | Báo lỗi thời lượng giai đoạn không đạt ngưỡng tối thiểu. |
| **Trùng lặp giai đoạn** | Không chồng chéo ngày | Các giai đoạn nối tiếp liên tục. | **Chặn lưu**.<br>Thông báo: *"Giai đoạn bị trùng thời gian với giai đoạn [Tên phase trước]."* |
| **Kích hoạt thiếu buổi tập** | Phải có $\ge$ 1 buổi tập khả thi | Giáo án kích hoạt thành công, ngựa chuyển sang `Đang huấn luyện`. | - Không có buổi tập: *"Giáo án phải có ít nhất một buổi tập."*<br>- Không có bài tương lai: *"Giáo án không có buổi tập nào trong tương lai..."* |
| **Tham vấn thú y khi kích hoạt** | Bắt buộc tích xác nhận | Ghi nhận tham vấn, kích hoạt bình thường. | **Chặn kích hoạt**.<br>Thông báo: *"Chiến mã đang trong diện theo dõi y tế đặc biệt. Bắt buộc phải tham vấn ý kiến Bác sĩ thú y..."* |
| **Nghiệm thu đóng giáo án** | Không còn bài tập dở dang | Đóng giáo án thành công, ngựa chuyển sang `Nghỉ ngơi hồi phục`, miễn trừ SLA 3 ngày. | **Chặn kết thúc giáo án**.<br>Thông báo: *"Còn [X] buổi tập chưa ghi kết quả: [Danh sách ngày]..."* |
| **Khung giờ mở cửa khuôn viên** | **04:00 - 20:00** | Lịch tập nằm trong giờ mở cửa. | **Chặn lưu**.<br>Thông báo: *"Giờ bắt đầu phải từ 04:00 đến 20:00."* |
| **Chốt chặn sinh học buổi chiều** | **Kết thúc $\le$ 17:00** (bắt đầu muộn nhất 16:00) | Đảm bảo giờ ngựa tắm hạ nhiệt và ăn tối (17:00 - 18:00). | **Chặn lưu**.<br>Thông báo: *"Buổi tập phải kết thúc trước hoặc đúng 17:00 chiều để đảm bảo giờ nghỉ ngơi và ăn tối của ngựa. Giờ bắt đầu muộn nhất là 16:00."* |
| **Hạn ngạch giờ vàng (06:15-08:00)** | **Tối đa 2 bài tập nặng** | Chia sẻ công bằng đường chạy buổi sáng. | **Chặn lưu bài thứ 3**.<br>Thông báo: *"HLV đã đạt hạn ngạch tối đa 2 bài tập nặng trong khung giờ vàng buổi sáng (06:15 - 08:00)..."* |
| **Đệm nghỉ của HLV** | **Tối thiểu 15 phút** | HLV được nghỉ ngơi giữa 2 ca tập. | **Chặn lưu**.<br>Thông báo: *"Huấn luyện viên [Tên] đã có buổi tập của ngựa [Tên ngựa] lúc [Giờ]..."* |
| **Khoảng cách 2 ca tập của ngựa** | **Tối thiểu 30 phút** | Ngựa được hồi phục giữa 2 ca vận động. | **Chặn lưu**.<br>Thông báo: *"Chiến mã đã có lịch tập khác quá gần khung giờ này..."* |
| **Sức chứa đường chạy bài nhẹ/vừa** | **4 - 6 ngựa / đường** | Cho phép nhiều ngựa cùng tập nhẹ. | Hiển thị trạng thái Đầy sân, chặn không cho đặt thêm. |
| **Độc quyền đường chạy bài nặng** | **1 ngựa độc quyền** | Khóa kín đường chạy, an toàn tốc độ cao. | **Chặn xếp trùng ca**.<br>Thông báo: *"Đường chạy [Tên] đang có buổi tập tốc độ cao của chiến mã khác trong khung giờ này..."* |
| **Hạn nộp kết quả ca tập** | **Trong vòng 7 ngày** | Kết quả được ghi nhận vào hồ sơ. | **Khóa form nhập**.<br>Thông báo: *"Đã quá 7 ngày, không thể ghi kết quả cho buổi tập đã bỏ lỡ."* |
| **Hạn sửa kết quả ca tập** | **Trong vòng 48 giờ** | Cho phép điều chỉnh sai lệch số liệu. | **Khóa quyền sửa**.<br>Thông báo: *"Đã hết hạn chỉnh sửa kết quả buổi tập (48 giờ kể từ lần ghi đầu tiên)."* |
| **Trần cự ly buổi tập** | **Tối đa 10.000m** | Cự ly hợp lệ. | **Chặn lưu**.<br>Thông báo: *"Cự ly tập luyện thực tế tối đa là 10.000 mét."* |
| **Trần tốc độ sinh học** | **Tối đa 75 km/h** | Tốc độ nằm trong giới hạn loài ngựa. | **Chặn lưu**.<br>Thông báo: *"Vận tốc trung bình tính toán ([X] km/h) vượt quá ngưỡng sinh học tối đa của loài ngựa (75 km/h)..."* |
| **Dấu hiệu bất thường & Mô tả** | Bắt buộc mô tả $\ge$ 10 ký tự | Ghi nhận kết quả, tự động bắn thông báo khẩn cấp tức thời cho Bác sĩ thú y. | **Chặn lưu**.<br>Thông báo: *"Vui lòng nhập mô tả chi tiết dấu hiệu bất thường để Bác sĩ thú y nắm thông tin."* |
| **Cảnh báo mệt mỏi quá tải** | Nhịp hồi phục sau 15p $\le$ 115 bpm | Thể lực hồi phục tốt. | Tự động gắn cờ Cảnh báo Mệt mỏi Quá tải (màu cam) trên Bàn làm việc HLV nếu nhịp tim sau 15p > 115 bpm. |
| **Tác động Khóa Y tế** | Đặt / Gỡ độc quyền bởi Thú y | Tự động mở khóa các tính năng khi thú y gỡ khóa. | - Chặn tạo giáo án mới: *"Ngựa đang bị Khóa huấn luyện y tế..."*<br>- Chặn kích hoạt giáo án: *"Chiến mã đang bị Khóa huấn luyện y tế..."*<br>- Nút Bắt đầu ca tập bị khóa cứng, chuyển thành nút đỏ *"Xem bệnh án"*, ném lỗi: *"Chiến mã đang bị Khóa huấn luyện y tế..."*<br>- Tự động chuyển toàn bộ bài tập nặng sang trạng thái BỊ CHẶN (Hoãn tập). |
| **Thẩm định Đủ chuẩn Thi đấu** | Đạt đồng thời **4/4 tiêu chí** | Cấp nhãn Xanh lá: **`Đủ điều kiện thi đấu`**, mở khóa gửi đăng ký thi đấu cho Quản lý. | Cấp nhãn Xám: **`Chưa đủ điều kiện`**, liệt kê cụ thể các tiêu chí vi phạm, khóa nút gửi đăng ký. |
| **Minh bạch Đánh giá Chủ ngựa** | HLV chỉ có quyền Xem | Đánh giá được bảo vệ toàn vẹn, tính vào bộ chỉ số uy tín và xếp hạng HLV. | HLV hoàn toàn không có nút Sửa hoặc Xóa đánh giá của Chủ ngựa. |
