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

| Vai Trò | Email Đăng Nhập | Mật Khẩu | Khu Vực Làm Việc |
| :--- | :--- | :---: | :--- |
| **Quản Lý (Club Manager)** | `manager@gmail.com` | `EquiFlow@2026` | Phê duyệt thành viên, cấu hình chuồng trại, phân quyền, xem Audit Log |
| **HLV Trưởng (Head Trainer)** | `trainer@gmail.com` | `EquiFlow@2026` | Lập giáo án thông minh, theo dõi bài tập, giám sát nhịp tim và thể lực |
| **Bác Sĩ Thú Y (Veterinarian)**| `vet@gmail.com` | `EquiFlow@2026` | Khám chữa bệnh, cấp Khóa Y Tế, sơ đồ chấn thương 2D, lịch tiêm phòng |
| **Nhân Viên Chuồng (Groom)** | `groom@gmail.com` | `EquiFlow@2026` | Danh sách công việc hàng ngày, tiếp tế kho vật tư, phân bổ ca trực |
| **Chủ Ngựa (Horse Owner)** | `owner@gmail.com` | `EquiFlow@2026` | Theo dõi sức khỏe ngựa sở hữu, xem hóa đơn & xuất báo cáo tài chính PDF |

---

## 🌟 3. Các Phân Hệ & Luồng Nghiệp Vụ Hoàn Chỉnh (Flow 1 — Flow 6)

### 📋 Flow 1: Hồ Sơ Chiến Mã & Sơ Đồ Chuồng Trại 2D (`/horses`, `/stalls`, `/stable-map`)
- **Hồ sơ ngựa 6 tab chuyên sâu:** Thông tin chung, gia phả 3 đời, theo dõi cân nặng (`weightKg`), lịch sử trạng thái, chỉ số thể lực và phân quyền chủ sở hữu.
- **Sơ đồ chuồng trại 2D tương tác:** Bản đồ ô chuồng dạng lưới trực quan cho Barn 1, Barn 2 và Khu cách ly y tế. Hỗ trợ điều chuyển, bảo trì chuồng và hiển thị bong bóng ngựa nghỉ ngơi.

### ⏱️ Flow 2: Lập Giáo Án & Giám Sát Huấn Luyện (`/training/*`)
- **Thuật toán Plan Wizard:** Phân chia chu kỳ huấn luyện (Base, Speed, Tapering, Recovery), tự động gán bài tập theo từng cự ly và mặt đường đua (Cỏ Turf / Cát Dirt).
- **Lịch tập tuần kéo thả (Weekly Calendar):** Quản lý bài tập theo ngày, gán nài ngựa và Groom hỗ trợ.
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
- **Đăng ký giải đấu & Phân làn thi đấu:** Kiểm tra điều kiện y tế trước khi cho phép ghi danh thi đấu.
- **Kế toán & Báo cáo tài chính chủ ngựa:** Lập hóa đơn chi phí lưu chuồng, ăn uống, dịch vụ thú y; hỗ trợ **In / Xuất hóa đơn PDF & CSV**.

### 🤖 Flow 6: Trợ Lý AI & Hệ Thống Đa Ngôn Ngữ
- **Trợ lý AI Thông Minh:** Chatbot hỏi đáp kỹ thuật cưỡi ngựa và tra cứu thông tin theo tài liệu câu lạc bộ.
- **Song ngữ Anh - Việt 100%:** Chuyển đổi ngôn ngữ linh hoạt với bộ từ điển chuẩn hóa toàn diện.

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
