export interface HorseAvatarPreset {
  id: string;
  horseCode: string;
  name: string;
  breed: string;
  color: string;
  url: string;
}

export const DEFAULT_HORSE_AVATAR = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#e9eee8"/><path d="M22 82c0-20 8-30 22-39L38 20l13 10 14-9-1 18 17 17-8 13-18-8-3 21z" fill="#45604b"/><circle cx="64" cy="44" r="2" fill="#fff"/></svg>')}`;

export const HORSE_AVATAR_PRESETS: HorseAvatarPreset[] = [
  {
    "id": "horse-01",
    "horseCode": "HR-000001",
    "name": "Bạch Long Mã",
    "breed": "Thoroughbred",
    "color": "Bay",
    "url": "/images/horses/horse-01.jpg"
  },
  {
    "id": "horse-02",
    "horseCode": "HR-000002",
    "name": "Xích Thố",
    "breed": "Thoroughbred",
    "color": "Chestnut",
    "url": "/images/horses/horse-02.jpg"
  },
  {
    "id": "horse-03",
    "horseCode": "HR-000003",
    "name": "Kim Long",
    "breed": "Warmblood",
    "color": "Palomino",
    "url": "/images/horses/horse-03.jpg"
  },
  {
    "id": "horse-04",
    "horseCode": "HR-000004",
    "name": "Vân Tiêu",
    "breed": "Arabian Cross",
    "color": "Grey",
    "url": "/images/horses/horse-04.jpg"
  },
  {
    "id": "horse-05",
    "horseCode": "HR-000005",
    "name": "Thần Phong",
    "breed": "Arabian",
    "color": "Bay Dark",
    "url": "/images/horses/horse-05.jpg"
  },
  {
    "id": "horse-06",
    "horseCode": "HR-000006",
    "name": "Hắc Báo",
    "breed": "Standardbred",
    "color": "Black",
    "url": "/images/horses/horse-06.jpg"
  },
  {
    "id": "horse-07",
    "horseCode": "HR-000007",
    "name": "Hồng Kỳ",
    "breed": "Quarter Horse",
    "color": "Chestnut",
    "url": "/images/horses/horse-07.jpg"
  },
  {
    "id": "horse-08",
    "horseCode": "HR-000008",
    "name": "Phi Vũ",
    "breed": "Appaloosa",
    "color": "Roan",
    "url": "/images/horses/horse-08.jpg"
  },
  {
    "id": "horse-09",
    "horseCode": "HR-000009",
    "name": "Tử Điện",
    "breed": "Paint",
    "color": "Bay",
    "url": "/images/horses/horse-09.jpg"
  },
  {
    "id": "horse-10",
    "horseCode": "HR-000010",
    "name": "Thanh Loan",
    "breed": "Arabian Cross",
    "color": "Gray Roaming",
    "url": "/images/horses/horse-10.jpg"
  },
  {
    "id": "horse-11",
    "horseCode": "HR-000011",
    "name": "Ngàn Hoa",
    "breed": "Paint",
    "color": "Palomino",
    "url": "/images/horses/horse-11.jpg"
  },
  {
    "id": "horse-12",
    "horseCode": "HR-000012",
    "name": "Thiên Mã",
    "breed": "Warmblood",
    "color": "Bay Dark",
    "url": "/images/horses/horse-12.jpg"
  },
  {
    "id": "horse-13",
    "horseCode": "HR-000013",
    "name": "Hỏa Phụng",
    "breed": "Thoroughbred",
    "color": "Chestnut",
    "url": "/images/horses/horse-13.jpg"
  },
  {
    "id": "horse-14",
    "horseCode": "HR-000014",
    "name": "Phong Lôi",
    "breed": "Quarter Horse",
    "color": "Black",
    "url": "/images/horses/horse-14.jpg"
  },
  {
    "id": "horse-15",
    "horseCode": "HR-000015",
    "name": "Tuyết Ảnh",
    "breed": "Arabian",
    "color": "Grey",
    "url": "/images/horses/horse-15.jpg"
  },
  {
    "id": "horse-16",
    "horseCode": "HR-000016",
    "name": "Lôi Chấn",
    "breed": "Standardbred",
    "color": "Roan",
    "url": "/images/horses/horse-16.jpg"
  },
  {
    "id": "horse-17",
    "horseCode": "HR-000017",
    "name": "Dạ Nguyệt",
    "breed": "Appaloosa",
    "color": "Black",
    "url": "/images/horses/horse-17.jpg"
  },
  {
    "id": "horse-18",
    "horseCode": "HR-000018",
    "name": "Lão Tướng",
    "breed": "Thoroughbred",
    "color": "Bay Dark",
    "url": "/images/horses/horse-18.jpg"
  },
  {
    "id": "horse-19",
    "horseCode": "HR-000019",
    "name": "Huyền Vũ",
    "breed": "Warmblood",
    "color": "Black",
    "url": "/images/horses/horse-19.jpg"
  }
];

export function resolveHorseAvatar(avatarUrl?: string | null, horseCode?: string | null, horseName?: string | null): string {
  if (avatarUrl) return avatarUrl;
  if (horseCode === "HRS-DEMO-01" || horseName === "Bạch Long Mã") return "/images/horses/horse-01.jpg";
  if (horseCode === "HRS-DEMO-02" || horseName === "Xích Thố") return "/images/horses/horse-02.jpg";
  const found = HORSE_AVATAR_PRESETS.find(p => p.horseCode === horseCode || (horseName && p.name.toLowerCase() === horseName.toLowerCase()));
  return found?.url || DEFAULT_HORSE_AVATAR;
}
