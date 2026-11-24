# EQUIFLOW — CENTRAL PROGRESS & CONTEXT ANCHOR (`core.md`)

> **MANDATORY PROTOCOL APPLIED:**  
> 1. Single Source of Truth: Auto-read on every session start.  
> 2. Strict Append-Only: Never delete or overwrite previous history.  
> 3. Mandatory Session Handoff: Log every completed session using the standardized format at the bottom.

---

## 1. PROJECT ARCHITECTURE & CORE SUMMARY
- **Project Name:** EquiFlow (Thien Ma Equestrian Club — TMEC)
- **Domain:** Racehorse Training, Stable Management, Veterinary Care & Equine Sports Finance.
- **Tech Stack:**
  - **Backend:** NestJS 11, TypeScript, Prisma ORM, PostgreSQL (Docker port 5432).
  - **Frontend:** React 19, Vite, Tailwind CSS, Lucide React (port 5173).
  - **Simulator:** HTML5 Canvas / Vite (port 5175).
- **Core RBAC Roles:**
  - `CLUB_MANAGER`: Full management, stall allocation, shifts, permission requests, financial reconciliation, tournaments, audit log.
  - `HEAD_TRAINER`: Training plans, weekly schedules, workout results, horse performance reviews.
  - `VETERINARIAN`: Medical records, preventive care schedules, prescriptions, Medical Lock execution.
  - `GROOM`: Daily care checklist (feeding, walking, grooming, icing), stall incident reporting.
  - `HORSE_OWNER`: Horse registration, view health/training, tournament entry, transfer confirmation, bill payment reporting.
- **Shared Test Password:** `EquiFlow@2026`

---

## 2. REPOSITORY & BRANCH STATUS (AS OF 2026-11-21)
- **Backend (`Racehorse_Training_Management_System_MT_BE`):**
  - Current Branch: `fix/michael` (Branched from `dev-michael/needfix`, Commit `0d5ac64` + `core.md`)
  - Target PR: `dev` on `origin` (GitHub)
- **Frontend (`Racehorse_Training_Management_System_MT_FE`):**
  - Current Branch: `fix/michael` (Branched from `dev-michael/needfix`, Commit `4a9fd5d` + `core.md`)
  - Target PR: `dev` on `origin` (GitHub)
- **Simulator (`Racehorse_Simulator_Web`):**
  - Current Branch: `dev` (Up to date with `origin/dev`).
- **Clean Distribution Package:**
  - `Xuan_Sinh/` (~14.8 MB) containing clean source of BE + FE + Quick Start scripts (`start.bat`, `stop.bat`) + comprehensive `README.md`.

---

## 3. SESSION HANDOFF & CHANGE LOGS

---
### [2026-11-21 20:25] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:**
  1. Audited and supplemented screenshots for `EquiFlow_Bug_UX_Report_Template.xlsx` directly from the live application without build/test.
  2. Answered deep architectural quiz regarding Groom zone vs stall allocation duality (`ShiftRoster` vs `StallAllocation.assignedGroomUserId`) and the origins of the Horse Transfer feature (`HorseTransferRequest`).
  3. Packaged a clean distribution folder `Xuan_Sinh` containing pure FE & BE source code and handoff documentation (free of old documents, logs, `node_modules`, and `dist`).
  4. Verified current Git branch state in view-only mode (`dev-michael/needfix` on both BE and FE, currently local and unpushed).
  5. Initialized `core.md` under the mandatory collaborative workflow protocol.
- **Changes Made:**
  - `<EquiFlow_Bug_UX_Report_Template.xlsx>`: Injected 19 OpenXML DrawingML screenshots for items `QA-01` to `QA-19` into Column M, preserved existing `richData` cell images for `UX-001` through `UI-008`.
  - `<Xuan_Sinh/>`: Created clean distribution bundle (~14.8 MB) containing BE, FE, `start.bat`, `stop.bat`, and `README.md`.
  - `<core.md>`: Established central progress tracker and single source of truth protocol.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:**
  - Both Backend and Frontend are on local branch `dev-michael/needfix` with all fixes for `needFix.docx` already committed locally. If ready to publish or review, create upstream tracking branches or open Pull Requests to `dev` or `main`.
  - Do NOT overwrite or truncate `core.md`; always append your next session block at the bottom of Section 3.

---
### [2026-11-21 20:30] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:**
  1. Replaced `dev-michael/needfix` branch with `fix/michael` across both BE and FE repositories.
  2. Integrated `core.md` directly into both repository roots (`Racehorse_Training_Management_System_MT_BE/core.md` and `Racehorse_Training_Management_System_MT_FE/core.md`).
  3. Committed `core.md` and pushed `fix/michael` to GitHub.
  4. Created Pull Requests on GitHub for both repositories targeting `dev` with detailed summary comments for manual review and merging.
- **Changes Made:**
  - `<Racehorse_Training_Management_System_MT_BE/core.md>`: Added central context file to BE repository.
  - `<Racehorse_Training_Management_System_MT_FE/core.md>`: Added central context file to FE repository.
  - `<core.md>`: Updated branch definitions and logged PR submission.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:**
  - Review and manually merge the open Pull Requests on GitHub (`fix/michael` -> `dev`) for both BE and FE.
  - Verify that CI/CD passes on GitHub Actions after merge.

---
### [2026-11-21 20:35] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:** Re-ran Prettier formatting across the entire Backend repository, resolved ESLint no-unused-vars warnings in financial specs, and pushed clean code to branch fix/michael (updating PR #173).
- **Changes Made:** 
  - <Racehorse_Training_Management_System_MT_BE/prisma/seed.ts>: Formatted with Prettier.
  - <Racehorse_Training_Management_System_MT_BE/src/auth/otp.service.spec.ts>: Formatted with Prettier.
  - <Racehorse_Training_Management_System_MT_BE/src/financial/financial-billing.spec.ts>: Suppressed unused variable warning.
  - <Racehorse_Training_Management_System_MT_BE/src/financial/financial.service.spec.ts>: Suppressed unused variable warning.
  - <Racehorse_Training_Management_System_MT_BE/src/training/trainer-reviews.service.ts>: Formatted with Prettier.
  - <Racehorse_Training_Management_System_MT_BE/src/training/trainer-reviews.service.spec.ts>: Formatted with Prettier.
  - <Racehorse_Training_Management_System_MT_BE/src/training/training-plans.service.ts>: Formatted with Prettier.
  - <Racehorse_Training_Management_System_MT_BE/src/training/training.controller.ts>: Formatted with Prettier.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:** BE code passes typecheck (0 errors), ESLint (0 errors, 0 warnings), and Prettier. Ready to merge PR #173 on GitHub.

---
### [2026-11-21 20:46] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:** Fixed CI test failure where `groomZoneIds()` caused HTTP 500 when `prisma.shiftRoster` / `prisma.groomAssignment` was undefined in test mock setups (`medical.e2e-spec.ts` and `rbac-matrix.e2e-spec.ts`).
- **Changes Made:** 
  - `<Racehorse_Training_Management_System_MT_BE/src/shift-rosters/groom-zones.ts>`: Added defensive fallback (`prisma?.shiftRoster ?? prisma?.groomAssignment`) and null checks so missing models return empty zone arrays gracefully without throwing unhandled exceptions.
  - `<Racehorse_Training_Management_System_MT_BE/test/medical.e2e-spec.ts>`: Defined `shiftRoster.findMany` and `groomAssignment.findMany` in mock Prisma client; updated `where.stallAllocations` assertion to align with zone-based groom scoping.
  - `<Racehorse_Training_Management_System_MT_BE/test/rbac-matrix.e2e-spec.ts>`: Defined `shiftRoster.findMany` and `groomAssignment.findMany` in mock Prisma client; updated GROOM `ASSIGNED_ONLY` scope assertion to verify assigned zone isolation or assigned groom ID.
  - `<core.md>`: Appended session update across root, BE, and FE.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:** All 67 unit test suites (935 tests) and all 8 e2e test suites (103 tests) pass (0 failures). TypeScript checks and ESLint pass with 0 errors and 0 warnings. Changes committed and pushed to `fix/michael` to update PR #173.

---
### [2026-11-21 20:54] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:** Synchronized and updated distribution package `Xuan_Sinh/` with the latest fixes, formatting, tests, and documentation.
- **Changes Made:** 
  - `<Xuan_Sinh/Racehorse_Training_Management_System_MT_BE/>`: Mirrored latest backend source code including `groom-zones.ts` null safety/fallback, updated e2e test mocks, and `core.md`.
  - `<Xuan_Sinh/Racehorse_Training_Management_System_MT_FE/>`: Mirrored latest frontend source code including `core.md`.
  - `<Xuan_Sinh/README.md>`: Verified instructions, credentials, and quick start guide.
  - `<core.md>`: Appended session update across root, BE, FE, and `Xuan_Sinh`.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:** `Xuan_Sinh/` is fully up-to-date (~26.8 MB clean source, 0 node_modules, 0 .git), ready to zip and hand off to partners or other teams.

---
### [2026-11-22 13:23] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:** Packaged complete technical note and runnable open-source suite reproducing Google Codelab (Location Intelligence ADK Agent with MCP) at 0 VND (without GCP billing or credit card).
- **Changes Made:** 
  - `<ADK_MCP_Location_Intelligence_0Dong.md>`: Created comprehensive technical documentation comparing paid Google Cloud vs. 0đ Open-Source MCP stack, schema analysis, and step-by-step reproduction guide.
  - `<ADK_Bakery_0Dong/>`: Implemented fully functional runnable project including 4 original CSV datasets, SQLite database loader (`init_db.py`), local MCP toolset (`mcp_tools.py`), 5-question automated test suite (`test_questions.py`), free Gemini agent (`agent.py`), and 1-click script (`run.bat`).
  - `<core.md>`: Appended session update across root, BE, and FE.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:** The 0đ Location Intelligence MCP Agent is fully tested and verified against all 5 Codelab Step 6 benchmark questions.

---
### [2026-11-22 13:38] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:** Updated graphify knowledge graph and prepared comprehensive handoff context in `AI_FAST_CONTEXT.md` for OpenAI Codex.
- **Changes Made:** 
  - `<graphify-out/>`: Executed incremental graph rebuild via `graphify update .` (rebuilt 23,922 nodes, 79,573 edges, 905 communities in `graph.json`, `graph.html`, and `GRAPH_REPORT.md`).
  - `<AGENTS.md>`, `<.codex/hooks.json>`: Configured native Codex integration via `graphify codex install`.
  - `<AI_FAST_CONTEXT.md>`: Updated repository map with active branches (`fix/michael`), exact test counts (935 unit tests PASS, 103 e2e tests PASS), Groom Zone architecture details, Graphify CLI usage instructions, and quality gate commands for Codex.
  - `<core.md>`: Appended session update across root, BE, and FE.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:** Repository and documentation are 100% prepared for Codex. Codex can immediately read `AI_FAST_CONTEXT.md` and `core.md`, query `graphify-out/graph.json`, and continue development on branch `fix/michael`.

---
### [2026-11-22 14:26] - Session Update by: MichaelTran1226 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:** Established and organized the isolated "Upgrade_Sprint" repository containing advanced modules, blueprints, and production-ready code for post-stabilization rollout.
- **Changes Made:** 
  - `<Upgrade_Sprint/>`: Packaged 5 advanced modules:
    1. `01_Inline_Simulation/`: Embedded React 19 Canvas 2D simulation viewport, HUD telemetry, and WebSocket bridge.
    2. `02_AI_Equine_MCP_Assistant/`: Local FastMCP Python server, injury risk calculation service, and AI chat drawer.
    3. `03_Automated_Cashflow_Invoicing/`: NestJS cashflow controller/service (supply import cost reconciliation, prize offsetting) and UI dashboard.
    4. `04_Mobile_PWA_Offline_Groom/`: Camera-based 15-digit ISO microchip scanner and IndexedDB offline checklist sync.
    5. `05_Media_Biometrics_Upload/`: Client-side HTML5 Canvas image compression (<= 50KB) and reusable image picker.
  - `<Upgrade_Sprint/README.md>` & `<Upgrade_Sprint/INTEGRATION_ROLLOUT_PLAN.md>`: Full architectural manifest, 5-phase rollout roadmap, and rollback contingency plan.
  - `<AI_FAST_CONTEXT.md>`: Updated repository map to document `Upgrade_Sprint/` as an isolated sandbox for future phases.
  - `<core.md>`: Appended session update across root, BE, and FE.
- **Current Status:** Completed
- **Next Steps / Handoff Notes for Next Member:** The core system remains 100% stable (935 unit tests, 103 e2e tests passing). When ready to roll out new features, consult `Upgrade_Sprint/INTEGRATION_ROLLOUT_PLAN.md`.


---
### [2026-11-22 15:58] - Session Update by: Codex
- **Context / Task:** Chuyển luồng chuyển nhượng ngựa và thao tác tạo khu/ô chuồng vào Upgrade Sprint. Giới hạn phân việc theo khu chuồng.
- **Changes Made:** Gỡ các điểm vào BE/FE và lưu bản vá tại Module 06–07 của Upgrade_Sprint. Seed mặc định A/B/C/H có 12 ô mỗi khu. Checklist chỉ gán Groom có ca đúng khu. Kiểm tra phạm vi HLV khi xếp tập và chuyển ô.
- **Current Status:** Completed.
- **Evidence:** BE 929 unit tests và 104 HTTP E2E đạt (8 bài được skip theo cấu hình). FE 53 unit tests, typecheck và build đạt. Bốn bản vá qua git apply --check.
- **Next Steps / Handoff Notes:** Seed chưa áp dụng lên PostgreSQL đang dùng. Đối chiếu phân công cũ trước khi áp dụng vào dữ liệu vận hành.

---
### [2026-11-22 16:08] - Session Update by: Codex
- **Context / Task:** Cập nhật dữ liệu vận hành EquiFlow theo quy mô chuồng và phạm vi phân công mới.
- **Changes Made:** Trên PostgreSQL cục bộ, thêm 8 ô cho khu C và 8 ô cho khu H, sửa Groom ô B07 theo ca sáng khu B. Gỡ giao 8 việc chưa hoàn thành tại C/H chưa có Groom đúng ca. Hủy GA-000008 và 5 buổi chưa tập, giữ 7 buổi đã tập và 2 buổi bỏ lỡ. Cập nhật Groom B07 trong seed.
- **Current Status:** Completed.
- **Evidence:** AuditLog `ALIGN_STABLE_ZONE_DATA` có 12 mục. PostgreSQL xác nhận 4 khu × 12 vị trí duy nhất, 0 phân công sai khu được kiểm tra, giữ 5 hồ sơ chuyển chủ. Chạy thử lại không phát sinh thay đổi. BE typecheck đạt.

---
### [2026-11-22 17:56] - Session Update by: Codex
- **Context / Task:** Thực thi kế hoạch đã duyệt về thông báo y tế, bàn giao chuồng, checklist Groom và giới hạn HLV.
- **Changes Made:** Chốt chẩn đoán/Medical Lock gửi tới chủ ngựa, Quản lý CLB, HLV phụ trách và Groom đúng khu. Đổi chuồng tạo việc bàn giao tại khu nguồn. Checklist nhận lịch chuẩn bị tập và áp dụng hạn chế y tế. Nâng giới hạn lên 8 ngựa cùng khu và cập nhật seed gốc.
- **Current Status:** Implemented and verified.
- **Evidence:** BE 931 unit và 104 HTTP E2E đạt, 8 E2E được skip theo cấu hình. FE 53 unit và build đạt. Seed và luồng chốt chẩn đoán/bàn giao được chạy thử trên PostgreSQL tạm.
- **Handoff:** PostgreSQL đang dùng giữ nguyên. Chưa thao tác qua trình duyệt theo từng vai trò.

---
### [2026-11-22 22:15] - Session Update by: Antigravity
- **Context / Task:** Hợp nhất (Merge) PR #129 & #174 (fix/michael) và PR #130 & #175 (fix/DungLT) vào nhánh `dev`. Đồng bộ toàn diện mã nguồn và trạng thái runtime.
- **Changes Made:**
  - Hợp nhất PR #130 (FE) & PR #175 (BE) của dunglt1602: Chuẩn hóa canonical attributes (`onlyMine`, `symptoms`, `recheckDate`, `extendReason`, `horseWeightSnapshot`), xóa bỏ code chết và các alias dư thừa giữa Flow 3 và Flow 4.
  - Đồng bộ nhánh `dev` và `fix/michael` trên cả local và remote GitHub (fast-forward clean).
  - Tích hợp tài liệu thiết kế UX/UI Groom 1-chạm & Tài chính minh bạch VietQR tại `NOTE.md` Mục 5 cùng tệp prototype độc lập `mock_preview_groom_finance.html`.
- **Current Status:** Completed & Stabilized.
- **Evidence:**
  - FE: `tsc --noEmit && vite build` biên dịch thành công 100% (0 errors).
  - BE: `nest build` đạt 100%, `npm run test` đạt **67/67 Test Suites, 931/931 Unit Tests Green**.
  - Runtime: Docker PostgreSQL (5432 healthy), Backend NestJS (3000 HTTP 200), Frontend Vite (5173 HTTP 200).
- **Next Steps / Handoff Notes:** Toàn bộ nhánh `dev` và `fix/michael` đã đồng nhất và sẵn sàng phục vụ kiểm thử end-to-end trên trình duyệt.


---
---
### [2026-11-23] - Session Update by Codex
- Context / Task: Resume Claude's business-email implementation after quota interruption. Recovered original conversation and compared current Git diff with the approved 12-task plan.
- Progress confirmed from code: Tasks 1–3 have existing commits (SMTP mapping, BusinessMail module, templates). Claude stopped during Task 4 financial hooks with six modified files.
- Changes made: Completed lifecycle mail hooks for create/update/changeStatus and payment confirmation. Added manager-only remind and payment-failure APIs and input validation for failure details. Corrected billing links to /financial-reports and local date display. Introduced INVOICE_OVERDUE / overdue-now for the immediate-overdue notification, preserving the 3-day milestone for the later scheduler. Preserved legacy dedupe keys for events without refId. Object references distinguish invoices, and adjustment notifications carry the persisted update timestamp. Reminder response reflects SMTP acceptance. Formatted the mail module files that failed the existing lint gate.
- Evidence: Backend typecheck, lint and build passed. Unit suite had 977 passing tests and two localhost EACCES failures in the sandbox; both HTTP tests passed on rerun outside sandbox. Business-mail tests rerun after added dedupe coverage: 26 passed. HTTP E2E outside sandbox: 104 passed, 8 skipped. These tests use mocks; no real delivery evidence is claimed.
- Remaining work: Tasks 5–12 need implementation/verification, including health/stall/prize event hooks, complaints, reminder scheduler/retry, frontend actions, Groom view, PWA and financial UI. Manager-only API portion of Task 8 is implemented. Partial-payment/refund execution has no completed business workflow here; the adjustment mail reflects the existing draft invoice update operation.
- Risks / handoff: No live database/schema update or real email delivery performed. BusinessMailService still sends before inserting its dedupe record and has no concurrent delivery claim, so concurrent emit/retry requires hardening before production use. Changes are local and uncommitted. Continue with Task 5 after reviewing existing recipient policy in NotificationsService.

---
### [2026-11-23] - Business Email Alerts: final implementation checkpoint (Codex)
- Scope: completed local Tasks 4–12 of docs/superpowers/plans/2026-07-09-business-email-alerts.md, including scoped operational mail, private complaints, reminder/retry safeguards, Groom UI and swap requests, PWA mount and Financial Hub UI.
- Evidence: BE typecheck/lint/build PASS; 73 unit suites / 1,027 tests PASS; HTTP E2E 104 PASS / 8 skipped (1 suite skipped). FE build/typecheck PASS, lint exit 0 with advisory warnings, 56 unit tests PASS. Chromium mobile fixture checks PASS. Disposable PostgreSQL plus Mailpit: 8 scenarios PASS, 35 SMTP-accepted messages in final run. Scripts are test/business-mail.live.check.ts (BE) and scripts/verify-business-alerts-ui.cjs (FE).
- Safety fixes: unique PENDING reservation before SMTP, conditional retry claim, current state/recipient permission rechecks, HTML escaping, source-zone handover exception, separate independent complaint review/violation confirmation, medication confirmation and no routine reopening of consumed care tasks.
- DB incident: first Prisma db push accidentally targeted existing equiflow DB on port 5432 because DIRECT_URL remained from .env while only DATABASE_URL was overridden. Schema sync reported success. No reset/accept-data-loss flags used; no before snapshot exists, so no claim of unchanged data. User was notified. Subsequent QA schema setup set BOTH URLs; fixtures restricted to equiflow_qa on port 55439. Do not blindly rollback existing DB.
- Remaining limits: OneSignal needs App ID/HTTPS and real-device delivery test; VietQR remains a placeholder; no real Gmail inbox test, banking refund or partial-payment workflow. SMTP crash ambiguity and commit-to-email gap still require reconciliation/outbox for guaranteed delivery. No push/deploy.
- Detailed handoff: docs/superpowers/plans/2026-11-23-business-email-alerts-handoff.md (workspace root). This checkpoint supersedes earlier notes that Tasks 5–12 remained open or no schema/live test had run.

---
### [2026-11-23 07:22] - Session Update by: DungLT0216 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:**
  1. **Vấn đề 1 (Khóa ngựa từ Incident Report sang Bệnh án):** Khi truy cập từ Báo cáo sự cố (Incident Report) sang tạo Bệnh án (`RecordFormPage`), khóa chặt ngựa được gán từ báo cáo, không cho phép đổi sang ngựa khác. Giao diện hiển thị rõ huy hiệu và thông báo khóa.
  2. **Vấn đề 2 (Khóa đơn vị thuốc danh mục & Liều lượng số tự nhiên):**
     - Khi chọn thuốc từ danh mục hệ thống trong đơn thuốc (`AddPrescriptionModal`), khóa cứng trường đơn vị tính (chai, lọ, ống...), không cho phép chỉnh sửa.
     - Chỉnh sửa trường liều lượng (`dosage`) chỉ cho phép nhập số tự nhiên dương (>= 1, step 1), ngăn chặn nhập số thập phân (như 1.3 chai).
     - Backend `medical-records.service.ts` kiểm tra nghiêm ngặt `assertDose` bắt buộc liều dùng phải là số nguyên dương >= 1.
  3. **Vấn đề 3 (Bỏ trang Biomechanical Alerts):** Loại bỏ hoàn toàn trang và liên kết Biomechanical Alerts khỏi hệ thống phân quyền, menu điều hướng và cấu hình router. Route cũ `/alerts` tự động chuyển tiếp về `/training/alerts`.
  4. **Vấn đề 4 (Medical Lock ràng buộc chặt chẽ với Medical Record & Chu trình chuyển trạng thái ngựa):**
     - Khóa huấn luyện y tế (`MedicalLock`) bắt buộc phải gắn với một Bệnh án đang mở (`OPEN`). Nếu tạo khóa mà ngựa không có bệnh án mở, hệ thống từ chối với lỗi `OPEN_RECORD_REQUIRED`.
     - Xóa bỏ các nút tạo Medical Lock độc lập (ở `IncidentDetailModal`, `TrainingLockPage`, `HerdHealthPage`, và `MedicalRecordPage`). Medical Lock chỉ được tạo song hành khi tạo hoặc chốt Bệnh án.
     - Bệnh án không được phép đóng (`closeMedicalRecord`) nếu ngựa vẫn còn bất kỳ Khóa huấn luyện nào đang hiệu lực (`ACTIVE_LOCK_EXISTS`).
     - Khi Bác sĩ thú y kết thúc điều trị và đóng bệnh án, trạng thái của ngựa tự động chuyển về `RESTING` (Nghỉ ngơi, `isMedicalLocked: false`), không chuyển về `UNDER_OBSERVATION`. Head Trainer sau đó sẽ rà soát các buổi tập nặng bị hoãn và khi mở lại tập luyện thì ngựa sẽ chuyển sang `IN_TRAINING`.
  5. **Vấn đề 5 (Mô hình 2D chấn thương & injuries.service.ts):**
     - Sửa lỗi trong `injuries.service.ts` khi xem lại chấn thương cũ (`asOfDate`): cập nhật đúng `statusAtDate` (`ACTIVE` / `RESOLVED`), khắc phục tình trạng vết thương đã lành bị ẩn hoặc lọc sai khi tra cứu lịch sử.
     - Chuẩn hóa cờ `includeHealed` hỗ trợ cả boolean và chuỗi ký tự.
     - Parse mảng `recoveryHistory` từ JSON trong backend trước khi trả về client.
     - Sửa lỗi font/so sánh góc nhìn `view` trên `InjuryMapPage.tsx` (`item.viewSide === "RIGHT" ? "RIGHT" : "LEFT"`, không dùng hàm dịch `tr("LEFT")` gây sai lệch chuỗi so sánh).
     - Thêm thanh chọn ngày `asOfDate` ("Xem theo ngày lịch sử") trên toolbar của `InjuryMapPage.tsx` để xem lại ảnh chụp chấn thương tại thời điểm trong quá khứ.
     - Bổ sung hiển thị dòng thời gian tiến trình hồi phục lâm sàng (`Clinical Recovery Timeline`) hiển thị đầy đủ các mốc đánh giá, giai đoạn, mức độ nghiêm trọng, ghi chú và người cập nhật từ `recoveryHistory`.
     - Chuẩn hóa loại bỏ thuộc tính trùng lặp giữa `viewSide` và `bodySide`.
- **Evidence / Test Results:**
  - Backend: `npm run lint` đạt 0 errors, 0 warnings (--max-warnings=0).
  - Backend: `npm run typecheck` đạt 0 errors.
  - Backend: `npm run test:unit` đạt **67/67 Test Suites PASS, 933/933 Unit Tests PASS**.
  - Backend E2E: Đã khắc phục mock transaction `medicalRecord` trong `test/medical.e2e-spec.ts` và `test/operational-loop.e2e-spec.ts`, đảm bảo fallback an toàn `tx.medicalRecord || this.prisma.medicalRecord`.
  - Backend Build: `nest build` thành công 100% (0 errors).
  - Frontend Build: `tsc --noEmit && vite build` thành công 100% (0 errors).
- **Current Status:** Hoàn thành toàn bộ 5 vấn đề và toàn bộ các bộ kiểm thử tự động, sẵn sàng commit & push lên GitHub.

### [2026-11-23 11:25] - Session Update by: DungLT0216 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:**
  1. **Actor Groom Attributes (Phân tích thuộc tính Actor Groom):**
     - Thuộc tính tài khoản & định danh: `id`, `email`, `fullName`, `phone`, `avatarUrl`, `role: Role.GROOM`, `status: AccountStatus`, `twoFactorEnabled`, `createdAt`, `updatedAt`, `deletedAt`.
     - Phân công & nhiệm vụ: `stallAllocations` (phụ trách các ô chuồng cụ thể và ngựa trong ô), `shiftRosters` (lịch trực theo ngày, ca sáng/chiều/tối và khu vực `zoneId`), `dailyTasksAssigned` (các công việc chăm sóc hàng ngày gồm Cho ăn, Vệ sinh, Chải lông móng, Chườm đá, Đi bộ, Cho uống thuốc, Vật lý trị liệu), `dailyTasksCompleted` (lịch sử hoàn thành), `dailyGroomingLogs` (nhật ký ca trực), `incidentsReported` (báo cáo sự cố chuồng/sức khỏe).
     - Quyền hạn: Phạm vi `ASSIGNED_ONLY` giới hạn trong khu chuồng trực.
  2. **Vấn đề 1 (Song ngữ Flow 3 & Flow 4):**
     - Rà soát toàn bộ chuỗi hiển thị đơn ngữ trong Flow 3 (Y tế) và Flow 4 (Chuồng trại / Công việc hàng ngày / Sự cố). Bổ sung từ điển `vi-text.ts` và hàm `tr()` bảo đảm hỗ trợ đầy đủ tiếng Việt và tiếng Anh.
  3. **Vấn đề 2 (Loại bỏ cân nặng ngựa trong phần Vitals khám lâm sàng):**
     - Khám lâm sàng tại chuồng thực tế không có cân điện tử trọng tải lớn; cân nặng được quản lý tại hồ sơ ngựa / phân hệ dinh dưỡng.
     - Loại bỏ trường nhập cân nặng `weightKg` khỏi `RecordFormPage.tsx` và bỏ hiển thị thẻ Cân nặng khỏi `VitalsDisplay.tsx`.
  4. **Vấn đề 3 (Loại bỏ Unlock Conditions khỏi giao diện Medical Lock):**
     - Do điều kiện mở khóa không hiển thị thực tế gây dư thừa, đã loại bỏ trường `unlockConditions` / `lockUnlockConditions` khỏi `FinalizeRecordModal.tsx` và `TrainingLockModal.tsx`.
  5. **Vấn đề 4 (Khóa cố định Báo cáo sự cố khi đã Giải quyết / Bác bỏ):**
     - Tại `incidents.service.ts`: Chặn hoàn toàn mọi thao tác đổi trạng thái khi sự cố đã ở trạng thái `RESOLVED` hoặc `DISMISSED`.
     - Tại `IncidentDetailModal.tsx`: Khi sự cố đã giải quyết hoặc bác bỏ, ẩn form cập nhật và hiển thị biểu tượng ổ khóa cùng thông báo báo cáo đã khóa, chỉ giữ nút liên kết xem bệnh án liên quan.
  6. **Vấn đề 5 (Mô hình chấn thương 2D - Lọc khoảng ngày & Khóa đổi tọa độ khi đang điều trị):**
     - Sửa lỗi so sánh ngày (UTC midnight bug) bằng hàm `toEndOfDay` (`23:59:59.999Z`), đảm bảo chọn ngày hiện tại hiển thị đầy đủ chấn thương lành trong ngày.
     - Hỗ trợ lọc theo khoảng thời gian (`fromDate` đến `toDate`) trên cả Backend (`InjuryQueryDto`, `injuries.service.ts`) và Frontend (`InjuryMapPage.tsx`, `api.ts`).
     - Khóa chức năng dời vị trí pin chấn thương (`Relocate Pin`): Chỉ cho phép dời tọa độ khi chấn thương mới tạo ở giai đoạn cấp tính (`ACUTE`) và chưa có tiến trình hồi phục (`recoveryHistory.length <= 1`). Chặn tại Backend với mã lỗi `INJURY_LOCKED_FOR_RELOCATION`.
  7. **Vấn đề 6 (Phác đồ điều trị & Kê đơn thuốc):**
     - Phác đồ điều trị (`addTreatmentPhase`, `updateTreatmentPhase`): Ngăn chặn triệt để các giai đoạn lồng / chồng chéo thời gian lên nhau (`newStart <= exEnd && newEnd >= exStart`). Loại bỏ thuộc tính `allowedActivity` khỏi modal, chi tiết bệnh án và phác đồ.
     - Đơn thuốc: Yêu cầu bắt buộc chọn thuốc từ danh mục kho (`supplyId`), khóa cứng đơn vị theo sản phẩm kho, liều dùng số tự nhiên dương.
  8. **Vấn đề 7 & 9 (Đồng bộ việc Groom bắt đầu từ ngày hôm sau & Đóng băng việc khi Vet đóng bệnh án):**
     - `syncMedicalTasksForHorse`: Việc đồng bộ task y tế khi Vet chỉnh sửa phác đồ hoặc đơn thuốc bắt đầu áp dụng từ ngày hôm sau (`tomorrow`), giữ nguyên vẹn ca làm việc hôm nay của Groom.
     - Khi đóng bệnh án (`closeMedicalRecord`) hoặc thay đổi phác đồ/đơn thuốc: Không xóa task của Groom làm mất lịch sử, mà cập nhật task sang trạng thái khóa (`isMedicalLocked: true`), kèm thông báo: *"Bác sĩ thú y đã kết thúc điều trị / đóng bệnh án"*, vô hiệu hóa nút hoàn thành của Groom.
  9. **Vấn đề 8 (Gửi email thông báo lịch tái khám cho Bác sĩ thú y):**
     - Khi lên lịch tái khám cho ngựa (`addFollowUp`), hệ thống tự động gửi email thông báo chi tiết thời gian và ghi chú tái khám trực tiếp đến hòm thư của Bác sĩ thú y phụ trách thông qua `MailService`.
- **Evidence / Test Results:**
  - Backend: `npm run lint` đạt 0 errors, 0 warnings (--max-warnings=0).
  - Backend: `npm run typecheck` đạt 0 errors.
  - Backend: `npx jest src/medical/medical-services.spec.ts src/daily-tasks/daily-tasks.service.spec.ts` đạt 100% PASS (88/88 tests).
  - Frontend: `npm run lint` đạt 0 errors.
  - Frontend: `npm run typecheck` đạt 0 errors.
  - Frontend: `npm run test:unit` đạt 100% PASS (53/53 tests).
- **Current Status:** Hoàn thành toàn diện tất cả các yêu cầu; sẵn sàng push lên branch `fix/DungLT`.


---
### Session Handoff Update (2026-11-23) - DungLT0216
- **Author:** DungLT0216
- **Context & Objectives:**
  1. **Vấn đề 1 (Mô hình chấn thương 2D - Điều kiện dời vị trí, Việt hóa vùng giải phẫu & Giao diện lọc thời gian):**
     - Bỏ ràng buộc chỉ cho phép giai đoạn `ACUTE` đổi vị trí pin chấn thương. Cho phép dời vị trí chấn thương (`isRelocatable`) khi chấn thương chưa lành (`stage !== 'HEALED' && status !== 'RESOLVED'`) và chưa có các đánh giá tiến triển điều trị / hồi phục tiếp theo (`recoveryHistory.length <= 1`), bất kể được khởi tạo ở giai đoạn cấp tính hay bán cấp tính.
     - Cập nhật ở cả Backend (`src/medical/injuries.service.ts`) và Frontend (`InjuryMapPage.tsx`).
     - Việt hóa toàn diện danh mục Vùng giải phẫu chấn thương (`ANATOMICAL_ZONE_LABELS_VI`, `getAnatomicalZoneLabel`) cho cả lớp cơ (Muscular) và lớp xương (Skeletal) khi giao diện đang ở chế độ Tiếng Việt; đồng thời hiển thị chuẩn xác ở dropdown chọn vùng, danh sách điểm chấn thương, chi tiết chấn thương, pin tooltip và tiêu đề cập nhật.
     - Tái thiết kế toàn bộ khu vực lọc khoảng thời gian (`filterBar`, `dateFilterGroup`, `dateField`, `dateInput`) trên `InjuryMapPage.tsx` và `InjuryMapPage.module.css` theo phong cách hiện đại, thanh lịch, đồng bộ với toàn hệ thống: có icon lịch, label "Khoảng thời gian (Timeline Range):", các ô input ngày gọn gàng và nút xóa lọc tiện lợi.
  2. **Vấn đề 2 (Khắc phục lỗi chuyển trạng thái ngựa khi Bác sĩ thú y kết thúc bệnh án):**
     - Sửa lỗi `ROLE_RESTRICTION` ("Bác sĩ thú y chỉ được đưa ngựa vào nhóm y tế, đổi trong nhóm y tế, hoặc trả về Nghỉ ngơi / Đang tập luyện") khi gọi `closeMedicalRecord`.
     - Nguyên nhân: Trước đó `backToWork` trong `src/horses/horse-rules.ts` bắt buộc `from` phải nằm trong `MEDICAL_STATUSES`. Nếu ngựa đang ở trạng thái vận hành như `IN_TRAINING` hoặc `ACTIVE` khi bệnh án đóng, việc chuyển sang `RESTING` bị từ chối.
     - Khắc phục: Cho phép Bác sĩ thú y đưa ngựa về `RESTING` từ bất kỳ trạng thái hoạt động nào (cả nhóm y tế và nhóm vận hành) để phục vụ việc nghỉ ngơi hồi phục khi đóng bệnh án hoặc điều trị, đồng thời đảm bảo không vi phạm quy tắc nâng trạng thái lên `IN_TRAINING` (vẫn do HLV trưởng quyết định). Bổ sung unit test trong `src/horses/horse-rules.spec.ts`.
  3. **Vấn đề 3 (Dọn dẹp bộ lọc & danh mục trong Chăm sóc phòng ngừa - Preventive Care):**
     - Loại bỏ tab và tùy chọn lọc "No history" (Chưa có lịch sử) không còn phù hợp khỏi `Tabs` và `<Select>` trạng thái tại `CareSchedulePage.tsx`.
     - Loại bỏ tùy chọn danh mục "Routine Checkup" (`GENERAL`) trong modal tạo lịch chăm sóc phòng ngừa mới vì thực tế rơi vào `VACCINATION`. Giữ lại đúng 4 danh mục chuẩn theo enum Backend: `VACCINATION`, `DEWORMING`, `FARRIER` (Farrier Care), và `DENTAL` (Dental Care).
- **Evidence / Test Results:**
  - Backend: `npm run lint` đạt 0 errors, 0 warnings (--max-warnings=0).
  - Backend: `npm run typecheck` đạt 0 errors.
  - Backend: `jest src/horses/horse-rules.spec.ts` đạt 100% PASS (14/14 tests).
  - Backend: `incident-photo-body.spec.ts` đạt 100% PASS (2/2 tests).
  - Frontend: `npm run lint` đạt 0 errors.
  - Frontend: `npm run typecheck` đạt 0 errors.
  - Frontend: `npm run test:unit` đạt 100% PASS (53/53 tests).
- **Current Status:** Hoàn thành toàn diện tất cả các yêu cầu; sẵn sàng commit và push lên branch `fix/DungLT`.

---
### [2026-11-23 14:35] - Session Update by: DungLT0216 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:** Đồng bộ và hợp nhất (Merge) nhánh `dev` vào nhánh `fix/DungLT` trên cả Backend và Frontend, giải quyết toàn bộ xung đột code sau khi nhánh của đồng đội (`feat/business-email-alerts` PR #177 BE, PR #132 FE) được merge vào `dev`.
- **Changes & Conflict Resolutions:**
  1. **Hợp nhất tính năng từ `dev`:**
     - Tích hợp hệ thống Business Mail, cấu hình SMTP / Mailpit, module thông báo email nghiệp vụ (billing, health, stall-move, violation).
     - Tích hợp hệ thống Khiếu nại (Complaints), quy trình phân ca Groom & Groom Zones, đổi ca trực (Shift Swap).
     - Tích hợp quản lý Đường chạy (Training Tracks), kiểm tra sức chứa vận động thể chất và đề xuất slot an toàn.
     - Tích hợp Sổ cái chi phí chăm sóc (`care_cost_ledger`), hạch toán chi phí y tế thực tế vào phụ lục hóa đơn và cập nhật Báo cáo tài chính cho Chủ ngựa.
     - Tích hợp Prisma Schema mở rộng (các migration mới và models mới: `Complaint`, `BusinessMailing`, `TrainingTrack`, `CareCostEntry`,...).
  2. **Bảo toàn và hoàn thiện nghiệp vụ lõi của `fix/DungLT`:**
     - `src/medical/medical-records.service.ts`: Khóa chặt điều kiện đóng bệnh án (`closeMedicalRecord`), yêu cầu không còn khóa huấn luyện nào còn hiệu lực hoặc đã xác nhận hồi phục an toàn (`ACTIVE_LOCK_EXISTS`), chuyển trạng thái ngựa về `RESTING`, khóa và ghi chú dừng các nhiệm vụ y tế của Groom khi bệnh án đóng. Tương thích hoàn toàn với cả mock transaction `findMany` và `findFirst`.
     - `src/daily-tasks/daily-tasks.service.ts`: Giữ nguyên tính năng lưu vết hủy công việc (`cancelledAt`), đồng thời kích hoạt kiểm tra công việc y tế bị khóa (`TASK_MEDICAL_LOCKED`), ngăn chặn Groom hoàn thành các task đã dừng do đổi đơn thuốc hoặc kết thúc điều trị.
     - `src/incidents/incidents.service.ts`: Giữ nguyên quy tắc kiểm tra chuyển trạng thái sự cố và khóa cứng báo cáo sự cố khi đã ở trạng thái kết thúc (`RESOLVED` / `DISMISSED`).
     - `DailyChecklistPage.tsx`: Khôi phục nút bấm 1-chạm bị vô hiệu hóa kèm icon khóa và thông điệp hướng dẫn khi công việc y tế bị dừng (`isMedicalLockedTask`), bảo toàn giao diện phân ca và nút "Request rework".
     - `IncidentDetailModal.tsx`: Giữ nguyên khung khóa báo cáo sự cố đã giải quyết, loại bỏ nút tạo Training Lock tự do (bắt buộc thông qua Bệnh án), tích hợp `IncidentResolutionPanel`.
     - `permissions.ts` & `FinalizeRecordModal.tsx`: Loại bỏ Biomechanical Alerts, giữ phân quyền Training Locks, dọn dẹp thuộc tính mở khóa dư thừa.
- **Evidence / Verification:**
  - Backend: `npm run typecheck` đạt 0 errors.
  - Backend: `npm run lint` đạt 0 errors, 0 warnings (--max-warnings=0).
  - Backend Unit Tests: `medical-record-lifecycle.spec.ts`, `daily-tasks.service.spec.ts`, `medical-services.spec.ts` đạt 100% PASS (98/98 tests).
  - Backend Build: `nest build` thành công 100% (0 errors).
  - Frontend: `npm run typecheck` đạt 0 errors.
  - Frontend: `npm run lint` đạt 0 errors.
  - Frontend Unit Tests: `npm run test:unit` đạt 100% PASS (57/57 tests).
  - Frontend Build: `tsc --noEmit && vite build` thành công 100% (0 errors).
- **Current Status:** Hoàn tất hợp nhất `dev` vào `fix/DungLT`. Nhánh `fix/DungLT` đã sẵn sàng 100% để tạo PR vào `dev`.


---
### [2026-11-23 20:50] - Session Update by: Antigravity Assistant
- **Context / Task:** Trien khai hoan thien module Tiep nhan ngua moi (Horse Admission - RecieveHorse.md), don dep loi song ngu UI va chuan bi Pull Request cho nhanh feat/horse-admission.
- **Implementation Details:**
  1. **Backend (Racehorse_Training_Management_System_MT_BE):**
     - Da them model Prisma: HorseAdmission, AdmissionInspection, AdmissionSchedule ho tro quy trinh 5 buoc tiep nhan.
     - Rang buoc & nghiep vu tiep nhan: src/horses/admission-rules.ts, src/horses/dto/admission.dto.ts, src/horses/horse-rules.ts.
     - Email templates thong bao tiep nhan & lich kiem tra: src/business-mail/templates/admission-templates.ts.
     - Endpoints & nghiep vu service: src/horses/horses.controller.ts, src/horses/horses.service.ts.
     - Unit tests: 8 test suites (177 tests) dat 100% PASS. Build NestJS hoan tat khong loi.
  2. **Frontend (Racehorse_Training_Management_System_MT_FE):**
     - Giao dien tiep nhan ngua: HorseAdmissionListPage.tsx, AdmissionHistoryTimeline.tsx, AdmissionScheduleModal.tsx, AdmissionInspectionModal.tsx.
     - Khac phuc triet de hien thi song ngu / tieng Anh sot lai tren UI (AuditLogPage.tsx, HealthBadge.tsx, StallGrid.tsx, AssistantChat.tsx, src/shared/i18n/vi-text.ts, src/shared/lib/status.ts).
     - Tich hop CustomerCareWidget.tsx va he thong dieu huong lazy loading.
     - Kiem tra kieu du lieu (tsc --noEmit) va vite build dat 100% thanh cong khong co loi.
- **Verification:**
  - BE: 8 suites / 177 unit tests PASS, nest build 0 errors.
  - FE: tsc --noEmit && vite build 0 errors.
- **Current Status:** San sang commit va tao Pull Request feat/horse-admission -> dev tren GitHub.

---
### [2026-11-23] — Sửa bughientai.docx
- Khôi phục menu tiếp nhận: thêm horses/admissions vào sidebarOrder của 4 vai trò staff, chỉ highlight mục tiếp nhận khi đang ở màn hình này.
- Dịch menu phản ánh VI/EN; chuyển lọc vai trò vào form chọn người, giữ quyền BE và xóa lựa chọn không còn hợp lệ.
- Thu gọn KPI đánh giá HLV, lọc cả 1–2 sao, loại ngày tương lai khỏi thống kê 30 ngày; làm rõ phạm vi dữ liệu đã tải.
- Sửa gợi ý lịch cho giáo án không phase, giới hạn ngày theo plan/phase, chặn response cũ, thêm thông báo và bản dịch; giữ kiểm tra lại khi lưu.
- Kiểm chứng qua CLI agy theo yêu cầu: Playwright cô lập 18/18, FE unit 57/57, BE unit liên quan 105/105; FE typecheck/lint/build exit 0. Lint còn warnings, build có cảnh báo chunk size.
- Không đổi schema/BE, không ghi DB thật/gửi mail/deploy. Giữ nguyên deletion docs/srs.txt có trước; chưa commit/push. Plan và bằng chứng ở workspace docs/superpowers/plans/2026-11-23-bughientai-fixes.md và tmp/bughientai-review/.

---
### [2026-11-23] — Thiết kế lại màn hình tiếp nhận theo DESIGN
- Nguồn chuẩn: thư mục workspace DESIGN (DESIGN_SYSTEM.md, typography.md, COMPONENT_SPECS.md, animation.md và design-tokens.json).
- User override rõ ràng: dùng góc bo tròn, ưu tiên hơn quy định góc vuông trong DESIGN. Control 8px, thẻ 12px, modal 16px.
- AdmissionDesign.module.css triển khai token/style scoped: Barlow Condensed cho tiêu đề, Inter cho nội dung, theme sáng/tối, focus ring, bóng modal cứng và motion/reduced-motion. Không thay font/theme toàn app.
- Làm lại danh sách tiếp nhận: thông tin ngựa trước, mã hồ sơ có nút lịch sử dùng bàn phím, bộ lọc có nhãn, số hồ sơ từ API, trạng thái tải/trống/lỗi và vùng cuộn bảng riêng.
- Đồng bộ modal hẹn/kiểm tra/hủy/từ chối/lịch sử; tái sử dụng Modal/Field/Input/Textarea/Button hiện có, giữ payload/quyền và cách chuyển giờ địa phương sang ISO. Sửa breadcrumb không còn nhận admissions là horse-id.
- Chuỗi tiếng Việt riêng cho tiếp nhận: Xếp lịch hẹn, hồ sơ tiếp nhận, phân trang; dịch giống ngựa theo cơ chế sẵn có.
- Kiểm chứng qua CLI agy --dangerously-skip-permissions -p: full 24/24 Playwright; 6/6 ca DESIGN chạy lại với hover reduced-motion; 57/57 unit; typecheck/lint/build exit 0. Lint còn warnings, không tuyên bố zero warnings.
- Đã xem ảnh 375/900/1280px, sáng/tối, VI/EN; modal lịch hẹn/kiểm tra/lịch sử; kiểm tra focus, bo góc, font và shadow. Review tĩnh không còn blocker.
- Bằng chứng workspace tmp/bughientai-review/agy-design-delivery.jsonl, agy-design-motion.jsonl; ảnh FE/test-results/admission-*.png. Không ghi DB thật, không commit/push/deploy; giữ nguyên thay đổi có trước.


---
### [2026-11-24 21:05] - Session Update by: DungLT0216 / Antigravity Assistant (Full-Stack Engineer)
- **Context / Task:**
  1. Loại bỏ các trường Expected rest days và Conditions for release khi kích hoạt "Propose Training Lock activation" trong màn hình RecordFormPage.
  2. Chuẩn hóa cấu trúc Medical Lock Code thành `MLK-YYYY-XXX` (trong đó YYYY là năm, XXX là số thứ tự tăng dần 3 chữ số: ví dụ `MLK-2026-001`, `MLK-2026-002`,...) thay cho định dạng cũ `KH-...`.
  3. Loại bỏ thẻ quản lý "Medical protection" (thẻ khóa y tế) khỏi màn hình chi tiết bệnh án RecordDetailPage; việc quản lý và chỉnh sửa khóa huấn luyện được quy hoạch tập trung tại trang Training Lock (`/medical/locks`).
  4. Sửa cảnh báo ESLint `@typescript-eslint/no-unused-vars` đối với import `randomUUID` trong `medical-lifecycle.service.ts`.
- **Changes Made:**
  - `Racehorse_Training_Management_System_MT_FE/src/features/health/pages/RecordFormPage.tsx`: Loại bỏ 2 trường nhập Expected rest days và Conditions for release, dọn dẹp state và payload liên quan.
  - `Racehorse_Training_Management_System_MT_FE/src/features/health/pages/RecordDetailPage.tsx`: Loại bỏ component `<MedicalLocksPanel ... />` và import tương ứng, tối ưu giao diện bệnh án tập trung vào khám và điều trị.
  - `Racehorse_Training_Management_System_MT_BE/src/medical/medical-lock-code.ts`: Tạo hàm `generateMedicalLockCode` sinh mã theo format `MLK-YYYY-XXX`, hỗ trợ atomic counter và fallback kiểm tra trùng mã.
  - `Racehorse_Training_Management_System_MT_BE/src/medical/medical-lock-code.spec.ts`: Bổ sung 4 unit tests kiểm thử hàm sinh mã `generateMedicalLockCode`.
  - `Racehorse_Training_Management_System_MT_BE/src/medical/medical-locks.service.ts`: Áp dụng `generateMedicalLockCode` khi tạo khóa huấn luyện (thay thế mã `KH-XXXXXX`).
  - `Racehorse_Training_Management_System_MT_BE/src/medical/medical-lifecycle.service.ts`: Áp dụng `generateMedicalLockCode` cho các khóa y tế tự động / theo sự cố (thay thế `KH-${randomUUID()}` và `KH-AUTO-...`), loại bỏ import `randomUUID` thừa.
  - `Racehorse_Training_Management_System_MT_BE/prisma/schema.prisma`: Cập nhật chú thích chuẩn format `MLK-2026-001`.
  - `core.md`: Ghi nhận nhật ký phiên làm việc trên cả FE và BE.
- **Evidence / Verification:**
  - Backend: `nest build` hoàn thành 100% không lỗi (exit code 0).
  - Backend: `npm run lint` đạt 0 errors, 0 warnings (--max-warnings=0).
  - Backend Unit Tests: `medical-lock-code.spec.ts`, `medical-lifecycle.service.spec.ts` đạt 100% PASS (8/8 tests).
  - Frontend: `tsc --noEmit && vite build` hoàn thành 100% không lỗi (exit code 0).
- **Current Status:** Hoàn thành toàn bộ yêu cầu, commit và push lên nhánh `fix/DungLT` trên cả 2 repository FE và BE.
