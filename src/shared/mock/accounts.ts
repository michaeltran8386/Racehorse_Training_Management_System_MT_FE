// Dữ liệu mẫu: 7 tài khoản của design (LO_TRINH.md) + 5 tài khoản bổ sung để mock có đủ
// mọi vai trò VÀ mọi trạng thái. Mật khẩu demo: equiflow123.

import { defaultNotify, defaultPermissions } from "@/shared/lib/permissions";
import type { Account } from "@/shared/types/auth";

// Tăng số này mỗi khi sửa danh sách bên dưới (thêm/xóa/đổi tài khoản).
// db.ts so số này với bản lưu trong localStorage của trình duyệt: khác nhau
// là coi như hỏng, xóa hết và gieo lại — người test không cần tự tay xóa localStorage.
export const SEED_VERSION = 9;

type Seed = Pick<Account, "id" | "fullName" | "email" | "role" | "status"> & Partial<Account>;

function make(seed: Seed): Account {
  return {
    phone: "0900 000 000",
    password: "equiflow123",
    createdAt: "2025-06-01T09:00:00",
    lastActive: null,
    requestedAt: null,
    requestCode: null,
    lockedAt: null,
    invitedBy: null,
    statusReason: null,
    statusChangedAt: null,
    statusChangedBy: null,
    permissions: defaultPermissions(seed.role),
    permissionsChangedAt: null,
    permissionsChangedBy: null,
    notify: defaultNotify(seed.role),
    ...seed,
  };
}

export function seedAccounts(): Account[] {
  return [
    make({
      id: "nam", fullName: "Trần Văn Nam", email: "nam.tran@gmail.com", role: "HEAD_TRAINER", status: "ACTIVE",
      phone: "0912 445 118", createdAt: "2025-02-04T09:00:00", lastActive: "2026-09-19T07:12:00",
      permissionsChangedAt: "2026-09-12T10:00:00", permissionsChangedBy: "Michael Tran",
    }),
    make({
      id: "chau", fullName: "Dr. Lê Minh Châu", email: "chau.le@gmail.com", role: "VETERINARIAN", status: "ACTIVE",
      phone: "0903 221 764", createdAt: "2025-03-10T09:00:00", lastActive: "2026-09-19T06:48:00",
    }),
    make({
      id: "binh", fullName: "Phạm Thị Bình", email: "binh.pham@gmail.com", role: "GROOM", status: "LOCKED",
      phone: "0977 310 552", lastActive: "2026-09-12T14:02:00", lockedAt: "2026-09-12T14:12:00",
      invitedBy: "Michael Tran", statusReason: "Shared the account password with a visitor at Barn B.",
      statusChangedAt: "2026-09-12T14:12:00", statusChangedBy: "Michael Tran",
    }),
    make({
      id: "anh", fullName: "Nguyễn Hoàng Anh", email: "anh.nguyen@gmail.com", role: "HORSE_OWNER", status: "PENDING_APPROVAL",
      phone: "0938 640 019", requestedAt: "2026-09-18T09:40:00", requestCode: "REQ-2609-012",
    }),
    make({
      id: "viet", fullName: "Michael Tran", email: "viet.do@gmail.com", role: "CLUB_MANAGER", status: "ACTIVE",
      phone: "0989 100 200", createdAt: "2024-11-15T09:00:00", lastActive: "2026-09-19T08:30:00",
    }),
    make({
      id: "ha", fullName: "Lý Thu Hà", email: "ha.ly@gmail.com", role: "HORSE_OWNER", status: "ACTIVE",
      phone: "0945 882 306", lastActive: "2026-09-17T21:15:00",
    }),
    make({
      id: "khoi", fullName: "Vũ Minh Khôi", email: "khoi.vu@gmail.com", role: "HORSE_OWNER", status: "ACTIVE",
      phone: "0918 777 043", lastActive: "2026-09-15T09:51:00",
    }),
    // ---- bổ sung để phủ đủ 8 trạng thái ----
    make({
      id: "ngoc", fullName: "Trịnh Bảo Ngọc", email: "ngoc.trinh@gmail.com", role: "HORSE_OWNER", status: "PENDING_EMAIL",
      requestedAt: "2026-09-19T08:05:00", requestCode: "REQ-2609-013",
    }),
    make({
      id: "huy", fullName: "Hoàng Gia Huy", email: "huy.hoang@gmail.com", role: "HORSE_OWNER", status: "PENDING_APPROVAL",
      requestedAt: "2026-09-16T10:20:00", requestCode: "REQ-2609-011",
    }),
    make({
      id: "tung", fullName: "Ngô Thanh Tùng", email: "tung.ngo@gmail.com", role: "GROOM", status: "INVITED",
      password: "", createdAt: "2026-09-20T08:15:00", invitedBy: "Michael Tran",
    }),
    make({
      id: "khang", fullName: "Dr. Đặng Minh Khang", email: "khang.dang@gmail.com", role: "VETERINARIAN", status: "INACTIVE",
      lastActive: "2026-06-30T17:00:00", invitedBy: "Michael Tran",
      statusReason: "Contract ended on 30 June 2026.", statusChangedAt: "2026-07-01T09:00:00", statusChangedBy: "Michael Tran",
    }),
    make({
      id: "trang", fullName: "Bùi Thu Trang", email: "trang.bui@gmail.com", role: "HORSE_OWNER", status: "REJECTED",
      requestedAt: "2026-09-10T14:30:00", requestCode: "REQ-2609-009",
      statusReason: "No horse registered under this name at the club.",
      statusChangedAt: "2026-09-11T10:05:00", statusChangedBy: "Michael Tran",
    }),
    make({
      id: "minh", fullName: "Minh Michael", email: "Minhmaiki@gmail.com", role: "CLUB_MANAGER", status: "ACTIVE",
      password: "123456",
    }),
    make({
      id: "seed-manager", fullName: "Hoàng Văn Sơn", email: "manager@gmail.com", role: "CLUB_MANAGER", status: "ACTIVE",
      password: "EquiFlow@2026",
    }),
    make({
      id: "seed-trainer", fullName: "Đinh Quang Trung", email: "trainer@gmail.com", role: "HEAD_TRAINER", status: "ACTIVE",
      password: "EquiFlow@2026",
    }),
    make({
      id: "seed-vet", fullName: "Dr. Võ Thanh Hải", email: "vet@gmail.com", role: "VETERINARIAN", status: "ACTIVE",
      password: "EquiFlow@2026",
    }),
    make({
      id: "seed-groom", fullName: "Lê Văn Phúc", email: "groom@gmail.com", role: "GROOM", status: "ACTIVE",
      password: "EquiFlow@2026",
    }),
    make({
      id: "seed-owner", fullName: "Phan Đức Long", email: "owner@gmail.com", role: "HORSE_OWNER", status: "ACTIVE",
      password: "EquiFlow@2026",
    }),
  ];
}
