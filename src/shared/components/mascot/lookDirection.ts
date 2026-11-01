// Chọn ảnh linh vật theo vị trí con trỏ so với tâm linh vật (8 ảnh trong public/assets/mascot).
export type MascotLook = "front" | "up" | "upLeft" | "left" | "upRight" | "right" | "down" | "downLeft";

export const MASCOT_IMAGES: Record<MascotLook, string> = {
  front: "/assets/mascot/horse_1_chinh_dien.png",
  up: "/assets/mascot/horse_2_nhin_len.png",
  upLeft: "/assets/mascot/horse_3_cheo_trai.png",
  left: "/assets/mascot/horse_4_ngang_trai.png",
  upRight: "/assets/mascot/horse_5_cheo_phai.png",
  right: "/assets/mascot/horse_6_ngang_phai.png",
  down: "/assets/mascot/horse_7_nhin_xuong.png",
  downLeft: "/assets/mascot/horse_8_dinh_dau.png",
};

/** dx, dy: con trỏ trừ tâm linh vật (px, trục y hướng xuống). Gần dưới 100px thì nhìn thẳng. */
export function lookDirection(dx: number, dy: number): MascotLook {
  if (Math.hypot(dx, dy) < 100) return "front";
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180, âm là phía trên
  if (deg >= -115 && deg < -65) return "up";
  if (deg >= -160 && deg < -115) return "upLeft";
  if (deg >= -65 && deg < -20) return "upRight";
  if (deg >= -20 && deg < 35) return "right";
  if (deg >= 35 && deg < 115) return "down";
  if (deg >= 115 && deg < 150) return "downLeft";
  return "left";
}
