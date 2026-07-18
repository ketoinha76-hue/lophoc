export interface Song {
  maBH: string;
  tenBH: string;
  loiBH: string;
  phanLoai: "Hợp Âm" | "Cảm Âm" | "Bài Học";
}

export interface Student {
  maHV: string;
  tenHV: string;
  sdt: string;
  lop: string;
  caHoc: string;
  telegramId?: string;
  hocPhi?: string;
  streak?: number;
  lastPracticeDate?: string;
}

export interface ClassRoom {
  maLop: string;
  tenLop: string;
  lichHoc: string;
  maGV: string;
}

export interface Booking {
  maBooking: string;
  maHV: string;
  tenHV: string;
  maLop: string;
  tenLop: string;
  caHoc: string;
  ngay: string;
}

export interface Teacher {
  maGV: string;
  tenGV: string;
  email: string;
  luongCoBan: number;
  sdt?: string;
}

export interface PracticeLog {
  maPractice: string;
  maHV: string;
  tenHV: string;
  tenBH: string;
  duration: number;
  ngay: string;
  videoUrl?: string;
}

export interface Attendance {
  maHV: string;
  ngay: string;
  ca?: string;
}

export interface FeeReceipt {
  maHD: string;
  maHV: string;
  tenHV: string;
  soTien: number;
  ngayThu: string;
  nguoiThu: string;
  ghiChu: string;
}

export interface SystemSettings {
  botToken: string;
  adminChatId: string;
  bankName: string;
  bankAcc: string;
  bankOwner: string;
  zaloOaId?: string;
  zaloAccessToken?: string;
  zaloActive?: boolean;
}

export interface TelegramLog {
  id: string;
  chatId: string;
  text: string;
  time: string;
}

export interface ZaloLog {
  id: string;
  phone: string;
  text: string;
  time: string;
}

export interface ChurnRisk {
  maHV: string;
  tenHV: string;
  lop: string;
  caHoc: string;
  risk: "Thấp" | "Trung Bình" | "Cao";
  score: number;
  reasons: string;
}

export interface Payroll {
  maGV: string;
  tenGV: string;
  luongCoBan: number;
  soBuoiDay: number;
  soLuotHocVien: number;
  tongLuong: number;
}
