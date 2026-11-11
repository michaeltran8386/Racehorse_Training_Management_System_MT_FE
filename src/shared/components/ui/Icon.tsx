import type { SVGProps } from "react";
import {
  Activity, Archive, ArrowLeft, ArrowRight, Ban, Bath, Bell, Bone, Box, Brush, Calendar, Camera, ChartColumn, ChartLine, Check,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleCheck, CircleX, ClipboardList, Clock, CloudSun, Columns2, DollarSign,
  Download, Droplet, Ellipsis, Eye, EyeOff, FileText, Filter, Flag, Flame, GitBranch, Globe, Heart, HeartPulse, History,
  House, Image, Inbox, Info, Key, Layers, LayoutGrid, Lightbulb, List, Lock, LockOpen, LogOut, Mail, Map, MapPin, Monitor, Moon,
  Package, Pencil, Phone, Pill, Play, Plus, Printer, RefreshCw, Scale, Search, Send, Settings, Shield, SlidersHorizontal,
  Sparkles, Star, Stethoscope, Sun, Syringe, Trash2, TrendingDown, TrendingUp, TriangleAlert, Trophy, Upload, User, Users, Video,
  Wheat, X, Zap, type LucideIcon,
} from "lucide-react";
import { iconPaths } from "./icons";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name" | "children" | "ref"> {
  name: string;
  size?: number;
  strokeWidth?: number;
  /** Đặt trong dòng chữ (căn theo chân chữ) thay vì khối. */
  inline?: boolean;
}

// Giữ API <Icon name> cũ: tên cũ ánh xạ sang Lucide (tham khảo tên ở thư mục "lucide-icon font/").
const LUCIDE: Record<string, LucideIcon> = {
  home: House, activity: Activity, heart: Heart, pulse: HeartPulse, calendar: Calendar, clipboard: ClipboardList,
  stethoscope: Stethoscope, pill: Pill, syringe: Syringe, bone: Bone, trophy: Trophy, users: Users, user: User,
  shield: Shield, lock: Lock, unlock: LockOpen, key: Key, phone: Phone, mail: Mail, bell: Bell, search: Search,
  filter: Filter, plus: Plus, check: Check, checkCircle: CircleCheck, x: X, xCircle: CircleX, alert: TriangleAlert,
  info: Info, ban: Ban, clock: Clock, history: History, refresh: RefreshCw, download: Download, upload: Upload,
  file: FileText, edit: Pencil, trash: Trash2, eye: Eye, eyeOff: EyeOff, chart: ChartLine, trend: TrendingUp,
  trendDown: TrendingDown, layers: Layers, package: Package, wheat: Wheat, droplet: Droplet, camera: Camera,
  video: Video, play: Play, pin: MapPin, grid: LayoutGrid, list: List, settings: Settings, logout: LogOut, sun: Sun,
  cloudSun: CloudSun, moon: Moon, globe: Globe, lightbulb: Lightbulb,
  arrowRight: ArrowRight, arrowLeft: ArrowLeft, chevronDown: ChevronDown, chevronRight: ChevronRight,
  chevronLeft: ChevronLeft, chevronUp: ChevronUp, more: Ellipsis, dollar: DollarSign, flag: Flag, zap: Zap, star: Star,
  branch: GitBranch, monitor: Monitor, printer: Printer, image: Image, sparkles: Sparkles, scale: Scale, map: Map,
  bath: Bath, broom: Brush, fire: Flame, barChart: ChartColumn, inbox: Inbox, columns: Columns2, cube: Box,
  sliders: SlidersHorizontal, archive: Archive, send: Send,
};

// Icon luôn ẩn với trình đọc màn hình (aria-hidden): nghĩa nằm ở nhãn chữ đi kèm.
// Chỉ dùng bộ Lucide; ngoại lệ duy nhất là "horse" trong icons.ts (Lucide không có glyph ngựa, người dùng duyệt 03/11/2026).
export function Icon({ name, size = 16, strokeWidth = 1.8, inline, style, ...rest }: IconProps) {
  const layout = inline ? { display: "inline-block", verticalAlign: "-0.125em" } : { display: "block" };
  const common = { width: size, height: size, "aria-hidden": true, focusable: "false", style: { flexShrink: 0, ...layout, ...style } } as const;
  const Lucide = LUCIDE[name];
  if (Lucide) return <Lucide {...rest} {...common} strokeWidth={strokeWidth} />;
  const paths = iconPaths[name];
  if (!paths) return <Info {...rest} {...common} strokeWidth={strokeWidth} />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }}
      {...rest}
      {...common}
    />
  );
}
