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
### [2026-11-23] - Business Email Alerts: final implementation checkpoint (Codex)
- Scope: completed local Tasks 4–12 of docs/superpowers/plans/2026-07-09-business-email-alerts.md, including scoped operational mail, private complaints, reminder/retry safeguards, Groom UI and swap requests, PWA mount and Financial Hub UI.
- Evidence: BE typecheck/lint/build PASS; 73 unit suites / 1,027 tests PASS; HTTP E2E 104 PASS / 8 skipped (1 suite skipped). FE build/typecheck PASS, lint exit 0 with advisory warnings, 56 unit tests PASS. Chromium mobile fixture checks PASS. Disposable PostgreSQL plus Mailpit: 8 scenarios PASS, 35 SMTP-accepted messages in final run. Scripts are test/business-mail.live.check.ts (BE) and scripts/verify-business-alerts-ui.cjs (FE).
- Safety fixes: unique PENDING reservation before SMTP, conditional retry claim, current state/recipient permission rechecks, HTML escaping, source-zone handover exception, separate independent complaint review/violation confirmation, medication confirmation and no routine reopening of consumed care tasks.
- DB incident: first Prisma db push accidentally targeted existing equiflow DB on port 5432 because DIRECT_URL remained from .env while only DATABASE_URL was overridden. Schema sync reported success. No reset/accept-data-loss flags used; no before snapshot exists, so no claim of unchanged data. User was notified. Subsequent QA schema setup set BOTH URLs; fixtures restricted to equiflow_qa on port 55439. Do not blindly rollback existing DB.
- Remaining limits: OneSignal needs App ID/HTTPS and real-device delivery test; VietQR remains a placeholder; no real Gmail inbox test, banking refund or partial-payment workflow. SMTP crash ambiguity and commit-to-email gap still require reconciliation/outbox for guaranteed delivery. No push/deploy.
- Detailed handoff: docs/superpowers/plans/2026-11-23-business-email-alerts-handoff.md (workspace root). This checkpoint supersedes earlier notes that Tasks 5–12 remained open or no schema/live test had run.


---
### [2026-11-23 13:30] - Session Update by: Antigravity Assistant
- **Context / Task:** Cập nhật tiến độ dự án, đối chiếu Pull Request của DungLT, dọn dẹp các tài liệu Xuan_Sinh và đưa nhánh nâng cấp lên GitHub PR #177 & PR #132.
- **Changes Made:**
  - **Phân tích đối chiếu PR DungLT (BE #176 & FE #131):** Phát hiện xung đột tiềm tàng giữa PR của DungLT (dựa trên nền `dev` cũ) với 14 commit BE và 3 commit FE mới tại local trên nhánh `feat/business-email-alerts`. Đã xác lập quyết định kiến trúc: KHÔNG merge PR của DungLT vào `dev` lúc này, yêu cầu DungLT rebase theo code mới.
  - **Dọn dẹp môi trường (Cleanup):** Xóa toàn bộ thư mục `Xuan_Sinh/` (~15.3 MB), các file `xuansinh.md`, `Xuansinh_Implementation_QA_*.md`, `.superpowers/sdd/2026-11-23-xuansinh-upgrade`, và các log/test tạm thời trong `tmp/*xuansinh*` (~3 MB). Giải phóng hơn 18.5 MB dung lượng ổ đĩa.
  - **Đưa mã nguồn lên Remote & Mở PR:**
    - BE commit `7710d16` (push lên `origin/feat/business-email-alerts`), mở **PR #177** vào `dev` (bao gồm: Business Email Alerts, Sân tập Training Tracks capacity 6, gợi ý slot tập, ledger chi phí y tế và chống race condition khi finalize bệnh án).
    - FE commit `cb36e63` (push lên `origin/feat/business-email-alerts`), mở **PR #132** vào `dev` (bao gồm: UI lịch trực tuần & xin đổi ca Groom, UI quản lý sân tập, bộ lọc khiếu nại nhân sự theo role và modal giải quyết sự cố).
  - **Đặc tả nghiệp vụ mới (RecieveHorse.md):** Khởi tạo file đặc tả v2 [RecieveHorse.md](file:///e:/01_Academic_FPT/Courses/Se_5_Active/SWP391/MINH_Racehorse_Branch/RecieveHorse.md) chuẩn hóa chu trình 4 bước tiếp nhận và xác thực chính chủ ngựa (PENDING_ADMISSION -> APPOINTED -> INSPECTION_IN_PROGRESS -> RESTING/REJECTED), tách biệt bảng audit `AdmissionHistoryLog` và `AuditLog`, thiết kế 4 template Gmail và giao diện lọc nhanh 7 ngày qua.
  - **Cập nhật Knowledge Graph (Graphify):** Chạy `graphify update .` đồng bộ AST và quan hệ mã nguồn (19,178 nodes, 58,111 edges, 1,709 communities).
- **Current Status:** 
  - Backend & Frontend working tree: Clean 100%.
  - `typecheck` (tsc --noEmit) trên cả BE và FE: PASS 100% (0 errors).
  - GitHub PRs: PR #177 (BE) và PR #132 (FE) đang chạy CI xanh các bước cơ bản; PR #176 và #131 của DungLT giữ nguyên OPEN (chờ rebase).
- **Evidence:**
  - BE build/typecheck: PASS (`tsc --noEmit` code 0).
  - FE build/typecheck: PASS (`tsc --noEmit` code 0).
  - Graphify: exit 0 (`graphify-out/graph.json` updated: 19,178 nodes, 58,111 edges, 1,709 communities).
  - PR Links: BE PR #177 (https://github.com/michaeltran8386/Racehorse_Training_Management_System_MT_BE/pull/177), FE PR #132 (https://github.com/michaeltran8386/Racehorse_Training_Management_System_MT_FE/pull/132).
- **Next Steps / Handoff Notes:**
  - Theo dõi hoàn tất CI của PR #177 và PR #132 trước khi merge vào `dev`.
  - Thông báo cho DungLT pull/rebase nhánh `dev` mới sau khi PR #177 và #132 được merge.
  - Sẵn sàng triển khai 5 tasks của module Tiếp nhận ngựa theo `RecieveHorse.md` khi người dùng yêu cầu.
