# 🐎 EquiFlow — Racehorse Training & Stable Management System (Frontend Web)

[![Frontend CI / CD Pipeline](https://github.com/MichaelTran1226/Racehorse_Training_Management_System_MT_FE/actions/workflows/ci.yml/badge.svg)](https://github.com/MichaelTran1226/Racehorse_Training_Management_System_MT_FE/actions)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Port](https://img.shields.io/badge/Port-5173-blue.svg)](http://localhost:5173)

Giao diện ứng dụng web Single Page Application (SPA) hiện đại dành cho Câu lạc bộ đua ngựa chuyên nghiệp **EquiFlow (Thien Ma Equestrian Club - TMEC)** thuộc Đồ án SWP391 — Đại học FPT.

---

## 🚀 1. Khởi Động Nhanh (Quick Start)

### Yêu cầu tiên quyết:
- **Node.js**: Phiên bản 22.x hoặc 24.x LTS (`node -v`)
- **Backend API Server**: Đã chạy tại `http://localhost:3000` (xem [Backend README](../Racehorse_Training_Management_System_MT_BE/README.md))

### Các bước cài đặt:

```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Cấu hình biến môi trường
# Trên Windows PowerShell:
Copy-Item .env.example .env.local
# Trên Linux / macOS:
cp .env.example .env.local

# 3. Khởi chạy máy chủ phát triển Vite
npm run dev
```

Ứng dụng web sẽ hoạt động tại: **`http://localhost:5173`**

---

## 🔑 2. Tài Khoản Đăng Nhập Dùng Thử

Toàn bộ tài khoản có mật khẩu chung: **`EquiFlow@2026`**

| Vai Trò | Email Đăng Nhập | Mật Khẩu | Khu Vực Làm Việc & Chiến Mã |
| :--- | :--- | :---: | :--- |
| **Quản Lý (Club Manager)** | `manager@gmail.com` | `EquiFlow@2026` | Quản trị tài khoản, phân quyền, cấu hình chuồng trại, Audit Log, sao kê tài chính |
| **HLV Trưởng 1 (Head Trainer)**| `trainer@gmail.com` | `EquiFlow@2026` | Lập giáo án thông minh, xếp lịch buổi tập, giám sát thể lực & nhịp tim |
| **HLV Trưởng 2 (Head Trainer)**| `trainer2@gmail.com`| `EquiFlow@2026` | Phụ trách nhóm ngựa đua Barn 2 & Cúp cự ly kinh điển |
| **Bác Sĩ Thú Y (Veterinarian)**| `vet@gmail.com` | `EquiFlow@2026` | Khám lâm sàng, cấp/mở Khóa Y Tế, sơ đồ chấn thương 2D, lịch tiêm phòng |
| **Nhân Viên Chuồng (Groom 1)** | `groom@gmail.com` | `EquiFlow@2026` | Chăm sóc Barn 1 (A01-A08), tiếp tế kho vật tư, danh sách công việc ca trực |
| **Nhân Viên Chuồng (Groom 2)** | `groom2@gmail.com` | `EquiFlow@2026` | Chăm sóc Barn 2 (B01-B08), xử lý sự cố chuồng trại |
| **Nhân Viên Chuồng (Groom 3)** | `groom3@gmail.com` | `EquiFlow@2026` | Phụ trách Khu Cách Ly (C01) và Khu Lưu Giữ nợ phí (Zone H) |
| **Chủ Ngựa 1 (Horse Owner)** | `owner@gmail.com` | `EquiFlow@2026` | Sở hữu: Bạch Long Mã, Xích Thố, Kim Long, Vân Tiêu |
| **Chủ Ngựa 2 (Horse Owner)** | `owner2@gmail.com` | `EquiFlow@2026` | Sở hữu: Thần Phong, Lão Tướng, Tuyết Ảnh, Lôi Chấn |
| **Chủ Ngựa 3 (VIP Owner)** | `owner3@gmail.com` | `EquiFlow@2026` | Chủ ngựa VIP — Sở hữu: Hắc Báo, Hồng Kỳ |
| **Chủ Ngựa 4 (Debt-risk Owner)**| `owner4@gmail.com` | `EquiFlow@2026` | Có ngựa nợ phí lưu giữ tại Zone H: Dạ Nguyệt, Thanh Loan |

---

## 🌟 3. Các Phân Hệ & Luồng Nghiệp Vụ Hoàn Chỉnh (Flow 1 — Flow 6)

### 📋 Flow 1: Hồ Sơ Chiến Mã & Sơ Đồ Chuồng Trại 2D (`/horses`, `/stalls`, `/stable-map`)
- **Hồ sơ ngựa 6 tab chuyên sâu:** Thông tin chung, gia phả 3 đời, theo dõi cân nặng (`weightKg`), lịch sử trạng thái, chỉ số thể lực và phân quyền chủ sở hữu.
- **Sơ đồ chuồng trại 2D tương tác:** Bản đồ ô chuồng dạng lưới trực quan cho Barn 1, Barn 2, Khu cách ly y tế và **Khu Lưu giữ nợ phí (Zone H)**. Hỗ trợ điều chuyển, bảo trì chuồng và hiển thị bong bóng ngựa nghỉ ngơi.

### ⏱️ Flow 2: Lập Giáo Án & Giám Sát Huấn Luyện (`/training/*`)
- **Thuật toán Plan Wizard:** Phân chia chu kỳ huấn luyện (Base, Speed, Tapering, Recovery), tự động gán bài tập theo từng cự ly và mặt đường đua (Cỏ Turf / Cát Dirt).
- **Lịch tập tuần kéo thả (Weekly Calendar):** Quản lý bài tập theo ngày, gán nài ngựa và Groom hỗ trợ.
- **Công cụ tìm kiếm thông minh `SearchSelect`:** Tìm kiếm ngựa nhanh chóng kết hợp dropdown và gõ tiếng Việt không dấu.
- **Cơ chế Khóa Huấn Luyện An Toàn (`RULE-MED-01`):** Ngựa đang có Khóa Y Tế sẽ tự động bị chặn các bài tập nặng (`BREEZE`, `TRIAL_RUN`), chỉ cho phép phục hồi nhẹ.
- **Biểu đồ thể lực (Fitness Chart):** Giám sát nhịp tim phục hồi, tốc độ tối đa và cảnh báo quá tải cơ bắp.

### 🩺 Flow 3: Y Tế, Bệnh Án & Sơ Đồ Chấn Thương 2D (`/health/*`)
- **Hồ sơ bệnh án điện tử:** Chẩn đoán lâm sàng, phác đồ điều trị, kê đơn thuốc và lịch hẹn tái khám rút gọn.
- **Sơ đồ giải phẫu chấn thương 2D:** Đánh dấu chính xác vị trí tổn thương trên mô hình cơ/xương ngựa, theo dõi giai đoạn hồi phục (`ACUTE` $\to$ `RECOVERING` $\to$ `HEALED`).
- **Lệnh Khóa Y Tế (Medical Lock Modal):** Ban hành lệnh cấm tập luyện/thi đấu đối với ngựa chấn thương, kèm đánh giá tác động và điều kiện gỡ khóa.
- **Lịch tiêm phòng & chăm sóc định kỳ:** Quản lý tiêm vắc-xin, tẩy giun, mài răng, đóng móng định kỳ.

### 📦 Flow 4: Vận Hành Chuồng Trại, Kho Vật Tư & Phân Ca (`/stable/*`)
- **Danh sách công việc hàng ngày (Daily Checklist):** Danh mục nhiệm vụ theo ca trực với vùng bấm đạt chuẩn WCAG $\ge 44\text{ px}$.
- **Kho vật tư & Yêu cầu tiếp tế:** Đặt mua cỏ khô, yến mạch, thuốc men với xe giao hàng thời gian thực từ Simulator.
- **Lịch làm việc ca trực (Shift Roster):** Phân bổ ca sáng/chiều/tối cho nhân viên chăm sóc.

### 🏆 Flow 5: Trường Đua, Giải Đấu & Báo Cáo Tài Chính (`/racing/*`, `/financial/*`)
- **Đăng ký giải đấu & Phân trang số chuẩn (`RaceEntryPage`):** Phân trang 10 giải/trang loại bỏ scroll vô tận; tích hợp `SearchSelect` lọc nhanh ngựa đủ điều kiện thi đấu.
- **Kế toán & Báo cáo tài chính chủ ngựa (`CostReportPage`, `OwnerFinancialReportsPage`):**
  - Chuỗi dữ liệu sao kê **6 tháng liên tục (07/2026 – 12/2026)** gồm 31 hóa đơn với 4 trạng thái: Đã thanh toán (`PAID`), Đã gửi (`SENT`), Chưa gửi (`DRAFT`), và Quá hạn (`OVERDUE`).
  - Lập hóa đơn chi phí lưu chuồng tính tự động theo ngày thực tế (`prorated by days`), ăn uống, dịch vụ thú y và bù trừ tiền thưởng giải đua.
  - Hỗ trợ **In / Xuất hóa đơn PDF & Excel (.xlsx)**.

### 🤖 Flow 6: Trợ Lý AI Chuyên Biệt & Hệ Thống Đa Ngôn Ngữ
- **Trợ lý AI TMEC Assistant:** Định hướng phục vụ chuyên sâu cho **Chủ Ngựa (`HORSE_OWNER`)** để tra cứu tình trạng chiến mã, lịch tập và sao kê cá nhân hóa; giao diện nhân viên nội bộ tinh giản để tối ưu thao tác chuyên môn.
- **Song ngữ Anh - Việt 100%:** Chuyển đổi ngôn ngữ tức thời, đồng nhất nhãn trạng thái ("Đã gửi" / "Chưa gửi") và định dạng tiền tệ dấu chấm phân cách hàng nghìn (`6.000.000 đ`).

---

## 🧪 4. Kiểm Thử & Kiểm Soát Chất Lượng

```bash
# Kiểm tra TypeScript typecheck (0 lỗi)
npm run typecheck

# Kiểm tra ESLint
npm run lint

# Đóng gói bản phát hành sản phẩm (Production Build)
npm run build

# Chạy kiểm thử tự động Playwright E2E
npx playwright test
```

---

## 🏛️ 5. Cấu Trúc Thư Mục

```
src/
├── features/
│   ├── accounts/     # Quản lý người dùng, chỉnh sửa hồ sơ
│   ├── auth/         # Màn hình đăng nhập, xác thực OTP, Google Sign-in
│   ├── dashboard/    # Bảng điều khiển phân quyền theo 5 vai trò
│   ├── financial/    # Quản lý hóa đơn, báo cáo tài chính chủ ngựa
│   ├── health/       # Bệnh án y tế, khóa huấn luyện, sơ đồ chấn thương 2D
│   ├── horses/       # Danh sách, chi tiết và danh mục ngựa đua
│   ├── master-data/  # Danh mục giống, vật tư, ô chuồng
│   ├── racing/       # Giải đấu, trường đua, kết quả thi đấu
│   ├── stable/       # Vận hành chuồng trại, kho vật tư, phân ca trực
│   └── training/     # Giáo án, lịch tập tuần, biểu đồ thể lực
├── shared/
│   ├── components/   # UI Kit dùng chung (Button, Card, DataTable, Combobox, Modal...)
│   ├── i18n/         # Bộ từ điển song ngữ Anh - Việt
│   ├── lib/          # API Client (Axios), phân quyền, helper định dạng (+84 phone...)
│   └── styles/       # Design Tokens và Global CSS
└── App.tsx           # Bộ định tuyến ứng dụng (React Router v7)
```
