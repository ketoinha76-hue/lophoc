import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_FILE = path.join(process.cwd(), "data", "db.json");

import { Database, getDB, writeDB as writeSheetsDB, initSheetsDB } from "./sheets-db";

// Ensure data directory exists for legacy fallback if needed
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

function readDB(): Database {
  return getDB();
}

function writeDB(db: Database) {
  // Sync to sheets
  writeSheetsDB(db).catch(console.error);
  // Optionally backup locally
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to backup to local db", error);
  }
}

async function startServer() {
  require("dotenv").config();
  const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "16YsyE3TB_LURl4pr09qPprzfuCH78lSZ5YmoULkcF-A";
  const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
  
  if (SPREADSHEET_ID && CLIENT_EMAIL && PRIVATE_KEY) {
    initSheetsDB(SPREADSHEET_ID, CLIENT_EMAIL, PRIVATE_KEY);
    console.log("✅ Initialized Google Sheets Live DB");
  } else {
    console.warn("⚠️ Missing Google Sheets credentials. App will crash or return empty data if no local fallback.");
  }

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper log telegram and mock alerts
  function logTelegram(chatId: string, text: string) {
    const db = readDB();
    const timestamp = new Date().toLocaleTimeString("vi-VN") + " - " + new Date().toLocaleDateString("vi-VN");
    db.telegramLogs.unshift({
      id: "TL" + Date.now() + Math.floor(Math.random() * 100),
      chatId,
      text,
      time: timestamp
    });
    // Keep last 50 logs
    if (db.telegramLogs.length > 50) {
      db.telegramLogs = db.telegramLogs.slice(0, 50);
    }
    writeDB(db);
    console.log(`[Telegram Simulation to ${chatId}]: ${text}`);
  }

  function logZalo(phone: string, text: string) {
    const db = readDB();
    const timestamp = new Date().toLocaleTimeString("vi-VN") + " - " + new Date().toLocaleDateString("vi-VN");
    if (!db.zaloLogs) {
      db.zaloLogs = [];
    }
    db.zaloLogs.unshift({
      id: "ZL" + Date.now() + Math.floor(Math.random() * 100),
      phone,
      text,
      time: timestamp
    });
    // Keep last 50 logs
    if (db.zaloLogs.length > 50) {
      db.zaloLogs = db.zaloLogs.slice(0, 50);
    }
    writeDB(db);
    console.log(`[Zalo Simulation to ${phone}]: ${text}`);
  }

  // --- API ROUTES ---

  // Telegram Logs endpoint for polling
  app.get("/api/telegram-logs", (req, res) => {
    const db = readDB();
    res.json(db.telegramLogs || []);
  });

  // Clear Telegram Logs
  app.post("/api/telegram-logs/clear", (req, res) => {
    const db = readDB();
    db.telegramLogs = [];
    writeDB(db);
    res.json({ success: true });
  });

  // Zalo Logs endpoint for polling
  app.get("/api/zalo-logs", (req, res) => {
    const db = readDB();
    res.json(db.zaloLogs || []);
  });

  // Clear Zalo Logs
  app.post("/api/zalo-logs/clear", (req, res) => {
    const db = readDB();
    db.zaloLogs = [];
    writeDB(db);
    res.json({ success: true });
  });

  // Settings Endpoints
  app.get("/api/settings", (req, res) => {
    const db = readDB();
    res.json(db.settings);
  });

  app.post("/api/settings", (req, res) => {
    const { botToken, adminChatId, bankName, bankAcc, bankOwner, zaloOaId, zaloAccessToken, zaloActive } = req.body;
    const db = readDB();
    db.settings = {
      ...db.settings,
      botToken: botToken ? botToken.trim() : "",
      adminChatId: adminChatId ? adminChatId.trim() : "",
      bankName: bankName ? bankName.trim() : "MBBank",
      bankAcc: bankAcc ? bankAcc.trim() : "0071001234567",
      bankOwner: bankOwner ? bankOwner.trim() : "HUYNH BA LONG",
      zaloOaId: zaloOaId ? zaloOaId.trim() : "",
      zaloAccessToken: zaloAccessToken ? zaloAccessToken.trim() : "",
      zaloActive: !!zaloActive
    };
    writeDB(db);
    res.json({ message: "Đã lưu cài đặt hệ thống thành công!" });
  });

  app.post("/api/settings/google-token", (req, res) => {
    const { accessToken } = req.body;
    const db = readDB();
    db.settings = {
      ...db.settings,
      googleAccessToken: accessToken
    };
    writeDB(db);
    res.json({ success: true, message: "Đã lưu token Google thành công!" });
  });

  app.post("/api/upload-drive", async (req, res) => {
    const { fileBase64, fileName, mimeType, maHV, tenHV, tenBH } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ success: false, message: "Lỗi: Không tìm thấy dữ liệu tệp." });
    }

    const db = readDB();
    const token = db.settings?.googleAccessToken;

    // Target folder ID from user request
    const folderId = "1X_NiDYti0pHN0C4jMjIbhvCRvtlXP-62";

    let videoUrl = "";
    let uploadSuccess = false;
    let errorMessage = "";

    if (token) {
      try {
        // Strip out the data url prefix if exists
        let cleanBase64 = fileBase64;
        if (fileBase64.includes(";base64,")) {
          cleanBase64 = fileBase64.split(";base64,")[1];
        }

        // Prepare metadata and body for Google Drive multipart upload
        const metadata = {
          name: fileName,
          parents: [folderId]
        };

        const boundary = "foo_bar_boundary_upload";
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody =
          delimiter +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n` +
          "Content-Transfer-Encoding: base64\r\n\r\n" +
          cleanBase64 +
          closeDelimiter;

        const driveRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        });

        if (driveRes.ok) {
          const driveData = await driveRes.json();
          videoUrl = `https://drive.google.com/file/d/${driveData.id}/view`;
          uploadSuccess = true;
        } else {
          const errData = await driveRes.json().catch(() => ({}));
          console.error("Google Drive API upload failed:", errData);
          errorMessage = errData?.error?.message || `HTTP ${driveRes.status}: ${driveRes.statusText}`;
        }
      } catch (err: any) {
        console.error("Drive upload exception:", err);
        errorMessage = err.message || "Lỗi không xác định";
      }
    } else {
      errorMessage = "Google Drive chưa được liên kết bởi Giáo viên (Thiếu Access Token).";
    }

    // Always create a Practice log record locally so student doesn't lose progress!
    let maxNum = 0;
    db.practices.forEach(item => {
      const num = parseInt(item.maPractice.replace(/\D/g, ''));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const maPractice = "PR" + (maxNum >= 100 ? maxNum + 1 : 100 + db.practices.length + 1);
    
    const today = new Date();
    const formattedDate = ("0" + today.getDate()).slice(-2) + "/" + ("0" + (today.getMonth() + 1)).slice(-2) + "/" + today.getFullYear();

    db.practices.push({
      maPractice,
      maHV,
      tenHV,
      tenBH,
      duration: 1, // default 1 min
      ngay: formattedDate,
      videoUrl: videoUrl || "", // saved google drive URL if successful
      uploadedToDrive: uploadSuccess
    });

    // Update streak for student
    const studentIdx = db.students.findIndex(s => s.maHV === maHV);
    let currentStreak = 0;
    if (studentIdx !== -1) {
      let streak = db.students[studentIdx].streak || 0;
      const lastDateStr = db.students[studentIdx].lastPracticeDate;
      
      if (lastDateStr === formattedDate) {
        // Already practiced today, keep streak
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayFormatted = ("0" + yesterday.getDate()).slice(-2) + "/" + ("0" + (yesterday.getMonth() + 1)).slice(-2) + "/" + yesterday.getFullYear();
        
        if (lastDateStr === yesterdayFormatted || lastDateStr === "") {
          streak++;
        } else {
          streak = 1;
        }
      }
      db.students[studentIdx].streak = streak;
      db.students[studentIdx].lastPracticeDate = formattedDate;
      currentStreak = streak;
    }

    writeDB(db);

    if (uploadSuccess) {
      res.json({
        success: true,
        streak: currentStreak,
        videoUrl,
        message: "Đã tải bài lên thư mục Google Drive thành công!"
      });
    } else {
      res.json({
        success: false,
        streak: currentStreak,
        message: `Đã lưu thông tin trả bài vào danh mục, nhưng KHÔNG tải được lên Google Drive: ${errorMessage}`
      });
    }
  });

  // Songs Endpoints
  app.get("/api/songs", (req, res) => {
    const db = readDB();
    res.json(db.songs);
  });

  app.post("/api/songs", (req, res) => {
    const { tenBH, loiBH, phanLoai } = req.body;
    const db = readDB();
    let maxNum = 0;
    db.songs.forEach(item => {
      const num = parseInt(item.maBH.replace(/\D/g, ''));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const maBH = "BH" + (maxNum >= 100 ? maxNum + 1 : 100 + db.songs.length + 1);
    db.songs.push({
      maBH,
      tenBH: tenBH.trim(),
      loiBH,
      phanLoai: phanLoai || "Hợp Âm"
    });
    writeDB(db);
    res.json({ success: true, message: `Đã thêm thành công bài ${tenBH} vào kho!` });
  });

  app.put("/api/songs/:maBH", (req, res) => {
    const { maBH } = req.params;
    const { tenBH, loiBH, phanLoai } = req.body;
    const db = readDB();
    const songIndex = db.songs.findIndex(s => s.maBH === maBH);
    if (songIndex !== -1) {
      db.songs[songIndex].tenBH = tenBH.trim();
      db.songs[songIndex].loiBH = loiBH;
      db.songs[songIndex].phanLoai = phanLoai || "Hợp Âm";
      writeDB(db);
      res.json({ success: true, message: "Đã cập nhật bài hát thành công!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy bài hát!" });
    }
  });

  app.delete("/api/songs/:maBH", (req, res) => {
    const { maBH } = req.params;
    const db = readDB();
    const lenBefore = db.songs.length;
    db.songs = db.songs.filter(s => s.maBH !== maBH);
    if (db.songs.length < lenBefore) {
      // Clean up linked songs
      db.studentSongs = db.studentSongs.filter(s => s.maBH !== maBH);
      writeDB(db);
      res.json({ success: true, message: "Đã xóa bài hát thành công!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy bài hát!" });
    }
  });

  // Students Login & Management
  app.post("/api/students/login", (req, res) => {
    const { sdt } = req.body;
    const db = readDB();
    const sdtClean = sdt ? sdt.trim() : "";
    const student = db.students.find(s => s.sdt === sdtClean);
    if (student) {
      res.json({
        success: true,
        maHV: student.maHV,
        tenHV: student.tenHV,
        lop: student.lop || "Chưa xếp lớp",
        caHoc: student.caHoc || "Chưa xếp ca",
        streak: student.streak || 0
      });
    } else {
      res.json({ success: false, message: "Không tìm thấy số điện thoại này trên hệ thống!" });
    }
  });

  app.get("/api/students", (req, res) => {
    const db = readDB();
    res.json(db.students);
  });

  app.post("/api/students", (req, res) => {
    const { tenHV, sdt, lop, caHoc, telegramId, hocPhi } = req.body;
    const db = readDB();
    let maxNum = 0;
    db.students.forEach(item => {
      const num = parseInt(item.maHV.replace(/\D/g, ''));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const newIdNum = maxNum >= 100 ? maxNum + 1 : 100 + db.students.length + 1;
    const maHV = "HV" + newIdNum;
    db.students.push({
      maHV,
      tenHV: tenHV.trim(),
      sdt: sdt.trim(),
      lop: lop.trim(),
      caHoc: caHoc.trim(),
      telegramId: telegramId ? telegramId.trim() : "",
      hocPhi: hocPhi ? hocPhi.toString().trim() : "",
      streak: 0,
      lastPracticeDate: ""
    });
    writeDB(db);
    res.json({ success: true, message: `Đã tạo thành công học viên: ${tenHV}` });
  });

  app.put("/api/students/:maHV", (req, res) => {
    const { maHV } = req.params;
    const { tenHV, sdt, lop, caHoc, telegramId, hocPhi } = req.body;
    const db = readDB();
    const stIndex = db.students.findIndex(s => s.maHV.toUpperCase() === maHV.toUpperCase());
    if (stIndex !== -1) {
      db.students[stIndex].tenHV = tenHV.trim();
      db.students[stIndex].sdt = sdt.trim();
      db.students[stIndex].lop = lop.trim();
      db.students[stIndex].caHoc = caHoc.trim();
      db.students[stIndex].telegramId = telegramId ? telegramId.trim() : "";
      db.students[stIndex].hocPhi = hocPhi ? hocPhi.toString().trim() : "";
      writeDB(db);
      res.json({ success: true, message: "Đã cập nhật thông tin học viên thành công!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy học viên!" });
    }
  });

  app.get("/api/students/:maHV/songs", (req, res) => {
    const { maHV } = req.params;
    const db = readDB();
    const targetMaHV = maHV.trim().toUpperCase();
    const matchedSongIds = db.studentSongs
      .filter(ss => ss.maHV.toUpperCase() === targetMaHV)
      .map(ss => ss.maBH.toUpperCase());
    
    const userSongs = db.songs.filter(s => matchedSongIds.includes(s.maBH.toUpperCase()));
    res.json(userSongs);
  });

  app.post("/api/students/:maHV/songs", (req, res) => {
    const { maHV } = req.params;
    const { maBH } = req.body;
    const db = readDB();
    const targetMaHV = maHV.trim().toUpperCase();
    const targetMaBH = maBH.trim().toUpperCase();
    
    const isDuplicate = db.studentSongs.some(
      ss => ss.maHV.toUpperCase() === targetMaHV && ss.maBH.toUpperCase() === targetMaBH
    );
    
    if (isDuplicate) {
      return res.json({ success: false, message: "Bài hát này đã có trong sổ tay rồi!" });
    }
    
    db.studentSongs.push({ maHV: targetMaHV, maBH: targetMaBH });
    writeDB(db);
    res.json({ success: true, message: "Đã gán bài hát vào sổ tay thành công!" });
  });

  app.get("/api/students/:maHV/details", (req, res) => {
    const { maHV } = req.params;
    const db = readDB();
    const targetMaHV = maHV.trim().toUpperCase();
    
    const matchedSongIds = db.studentSongs
      .filter(ss => ss.maHV.toUpperCase() === targetMaHV)
      .map(ss => ss.maBH.toUpperCase());
    const songs = db.songs.filter(s => matchedSongIds.includes(s.maBH.toUpperCase()));
    
    const attendanceRecords = db.attendance.filter(a => a.maHV.toUpperCase() === targetMaHV);
    const attendanceDates = attendanceRecords.map(a => `${a.ngay}${a.ca ? ` (${a.ca})` : ""}`);
    
    const fees = db.fees.filter(f => f.maHV.toUpperCase() === targetMaHV).reverse();
    
    res.json({
      songs,
      attendanceCount: attendanceRecords.length,
      attendanceDates,
      fees
    });
  });

  // Class endpoints
  app.get("/api/classes", (req, res) => {
    const db = readDB();
    res.json(db.classes);
  });

  app.post("/api/classes", (req, res) => {
    const { tenLop, lichHoc, maGV } = req.body;
    const db = readDB();
    let maxNum = 0;
    db.classes.forEach(item => {
      const num = parseInt(item.maLop.replace(/\D/g, ''));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const maLop = "LH" + (maxNum >= 100 ? maxNum + 1 : 100 + db.classes.length + 1);
    db.classes.push({
      maLop,
      tenLop: tenLop.trim(),
      lichHoc: lichHoc.trim(),
      maGV: maGV || "GV100"
    });
    writeDB(db);
    res.json({ success: true, message: `Đã thêm thành công lớp học mới: ${tenLop}` });
  });

  app.put("/api/classes/:maLop", (req, res) => {
    const { maLop } = req.params;
    const { tenLop, lichHoc, maGV } = req.body;
    const db = readDB();
    const classIdx = db.classes.findIndex(c => c.maLop === maLop);
    if (classIdx !== -1) {
      db.classes[classIdx].tenLop = tenLop.trim();
      db.classes[classIdx].lichHoc = lichHoc.trim();
      db.classes[classIdx].maGV = maGV || "GV100";
      writeDB(db);
      res.json({ success: true, message: "Đã cập nhật thông tin lớp học thành công!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy lớp học!" });
    }
  });

  app.delete("/api/classes/:maLop", (req, res) => {
    const { maLop } = req.params;
    const db = readDB();
    const lenBefore = db.classes.length;
    db.classes = db.classes.filter(c => c.maLop !== maLop);
    if (db.classes.length < lenBefore) {
      writeDB(db);
      res.json({ success: true, message: "Đã xóa thành công!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy lớp!" });
    }
  });

  // Bookings endpoints
  app.get("/api/bookings", (req, res) => {
    const db = readDB();
    res.json(db.bookings);
  });

  app.post("/api/bookings", (req, res) => {
    const { maHV, tenHV, maLop, tenLop, caHoc, ngay } = req.body;
    const db = readDB();
    let maxNum = 0;
    db.bookings.forEach(item => {
      const num = parseInt(item.maBooking.replace(/\D/g, ''));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const maBooking = "BK" + (maxNum >= 100 ? maxNum + 1 : 100 + db.bookings.length + 1);
    db.bookings.push({
      maBooking,
      maHV,
      tenHV,
      maLop,
      tenLop,
      caHoc,
      ngay
    });
    writeDB(db);
    res.json({ success: true, message: "Đã đăng ký ca học thành công!" });
  });

  app.delete("/api/bookings/:maBooking", (req, res) => {
    const { maBooking } = req.params;
    const db = readDB();
    const lenBefore = db.bookings.length;
    db.bookings = db.bookings.filter(b => b.maBooking !== maBooking);
    if (db.bookings.length < lenBefore) {
      writeDB(db);
      res.json({ success: true, message: "Đã hủy ca học thành công!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy lịch đặt chỗ!" });
    }
  });

  // Teachers endpoints
  app.get("/api/teachers", (req, res) => {
    const db = readDB();
    res.json(db.teachers);
  });

  app.post("/api/teachers", (req, res) => {
    const { tenGV, email, luongCoBan, sdt } = req.body;
    const db = readDB();
    let maxNum = 0;
    db.teachers.forEach(item => {
      const num = parseInt(item.maGV.replace(/\D/g, ''));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const maGV = "GV" + (maxNum >= 100 ? maxNum + 1 : 100 + db.teachers.length + 1);
    db.teachers.push({
      maGV,
      tenGV: tenGV.trim(),
      email: email.trim(),
      luongCoBan: parseFloat(luongCoBan) || 120000,
      sdt: sdt ? sdt.trim() : ""
    });
    writeDB(db);
    res.json({ success: true, message: "Đã thêm giáo viên thành công!" });
  });

  app.put("/api/teachers/:maGV", (req, res) => {
    const { maGV } = req.params;
    const { tenGV, email, luongCoBan, sdt } = req.body;
    const db = readDB();
    const idx = db.teachers.findIndex(t => t.maGV === maGV);
    if (idx !== -1) {
      db.teachers[idx].tenGV = tenGV.trim();
      db.teachers[idx].email = email.trim();
      db.teachers[idx].luongCoBan = parseFloat(luongCoBan) || 120000;
      db.teachers[idx].sdt = sdt ? sdt.trim() : "";
      writeDB(db);
      res.json({ success: true, message: "Đã cập nhật thông tin giáo viên!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy giáo viên!" });
    }
  });

  app.post("/api/teachers/zalo-salary", (req, res) => {
    const { maGV, message } = req.body;
    const db = readDB();
    const t = db.teachers.find(teacher => teacher.maGV === maGV);
    if (!t) {
      return res.status(404).json({ success: false, message: "Không tìm thấy giảng viên!" });
    }
    const phone = t.sdt || "0912345678";
    logZalo(phone, message);
    res.json({ success: true, message: `Đã gửi bảng lương qua Zalo thành công cho Giảng viên ${t.tenGV} (${phone})!` });
  });

  app.delete("/api/teachers/:maGV", (req, res) => {
    const { maGV } = req.params;
    const db = readDB();
    const lenBefore = db.teachers.length;
    db.teachers = db.teachers.filter(t => t.maGV !== maGV);
    if (db.teachers.length < lenBefore) {
      writeDB(db);
      res.json({ success: true, message: "Đã xóa giáo viên thành công!" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy giáo viên!" });
    }
  });

  // Fees / Invoices endpoints
  app.get("/api/fees", (req, res) => {
    const db = readDB();
    const { maHV } = req.query;
    if (maHV) {
      const filtered = db.fees.filter(f => f.maHV.toUpperCase() === String(maHV).toUpperCase());
      return res.json([...filtered].reverse());
    }
    res.json([...db.fees].reverse());
  });

  app.post("/api/fees", (req, res) => {
    const { maHV, tenHV, soTien, ghiChu } = req.body;
    const db = readDB();
    const today = new Date();
    
    const formattedDate = today.toLocaleDateString("vi-VN") + " " + today.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
    const maHD = "HD" + today.getTime();

    db.fees.push({
      maHD,
      maHV,
      tenHV,
      soTien: parseFloat(soTien) || 0,
      ngayThu: formattedDate,
      nguoiThu: "Huỳnh Bá Long",
      ghiChu
    });

    writeDB(db);

    // Simulated Telegram message to Parent
    const student = db.students.find(s => s.maHV === maHV);
    const telegramId = student ? student.telegramId : "";
    if (telegramId) {
      const msg = `🔔 <b>THÔNG BÁO THU HỌC PHÍ</b>\n\n👤 Học viên: <b>${tenHV}</b>\n💰 Số tiền nộp: <b>${Number(soTien).toLocaleString('vi-VN')} VNĐ</b>\n📝 Nội dung: <i>${ghiChu}</i>\n🕒 Thời gian: ${formattedDate}\n\n<i>Cảm ơn quý phụ huynh đã đồng hành cùng Lớp Nhạc Guitar Huỳnh Long!</i>`;
      logTelegram(telegramId, msg);
    }

    const settings = db.settings;
    const vietqrUrl = `https://vietqr.app/img?bank=${settings.bankName}&acc=${settings.bankAcc}&template=qronly&showinfo=true&holder=${encodeURIComponent(settings.bankOwner)}&amount=${soTien}&addInfo=HOC%20PHI%20${maHV}%20${encodeURIComponent(tenHV)}`;

    const htmlInvoice = `
      <div style="width: 210mm; height: 148mm; padding: 35px; box-sizing: border-box; background: #fff; color: #333; border: 3px double #1a365d; font-family: 'Arial', sans-serif; position: relative;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a365d; padding-bottom: 12px; margin-bottom: 25px;">
          <div>
            <h2 style="margin: 0; color: #1a365d; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">LỚP NHẠC GUITAR HUỲNH LONG</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #4a5568; font-style: italic;">Uy tín - Chất lượng - Đam mê</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; color: #e53e3e; font-size: 16px; font-weight: bold;">MÃ SỐ: ${maHD}</h3>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #4a5568;">Ngày lập: ${formattedDate}</p>
          </div>
        </div>
        
        <div style="text-align: center; font-size: 26px; font-weight: bold; margin: 15px 0 25px 0; color: #1a365d; letter-spacing: 3px; text-transform: uppercase;">BIÊN LAI THU HỌC PHÍ</div>
        
        <div style="display: flex; justify-content: space-between;">
          <table style="width: 65%; font-size: 14px; margin-bottom: 20px;" cellspacing="0" cellpadding="0">
            <tr style="height: 35px;">
              <td style="width: 30%; color: #4a5568; font-weight: bold; border-bottom: 1px dashed #cbd5e0;">Họ tên học viên:</td>
              <td style="font-weight: bold; color: #1a202c; border-bottom: 1px dashed #cbd5e0;">${tenHV} <span style="font-size:11px; font-weight:normal; color:#718096; margin-left: 10px;">(Mã: ${maHV})</span></td>
            </tr>
            <tr style="height: 35px;">
              <td style="color: #4a5568; font-weight: bold; border-bottom: 1px dashed #cbd5e0;">Số tiền nộp:</td>
              <td style="font-weight: bold; color: #e53e3e; font-size: 16px; border-bottom: 1px dashed #cbd5e0;">${Number(soTien).toLocaleString('vi-VN')} VNĐ</td>
            </tr>
            <tr style="height: 35px;">
              <td style="color: #4a5568; font-weight: bold; border-bottom: 1px dashed #cbd5e0;">Nội dung thu:</td>
              <td style="color: #1a202c; border-bottom: 1px dashed #cbd5e0; font-style: italic;">${ghiChu}</td>
            </tr>
          </table>
          <div style="width: 30%; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-sizing: border-box;">
            <img src="${vietqrUrl}" style="max-height: 85px; max-width: 100%;" alt="VietQR Pay"/>
            <div style="font-size: 10px; color: #718096; font-weight: bold; margin-top: 5px;">Quét Mã Để Chuyển Khoản</div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 25px; padding: 0 30px;">
          <div style="width: 40%;">
            <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; color: #2d3748;">Người nộp tiền</h4>
            <p style="margin: 0; font-size: 11px; color: #718096; font-style: italic;">(Ký và ghi rõ họ tên)</p>
          </div>
          <div style="width: 40%;">
            <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; color: #2d3748;">Người thu tiền</h4>
            <p style="margin: 0; font-size: 11px; color: #718096; font-style: italic;">(Ký và ghi rõ họ tên)</p>
            <div style="margin-top: 40px; font-weight: bold; color: #1a365d; font-size: 14px; letter-spacing: 0.5px;">Huỳnh Bá Long</div>
          </div>
        </div>
      </div>
    `;

    res.json({
      success: true,
      message: "Đã thu tiền và xuất biên lai thanh toán thành công!",
      maHD,
      htmlInvoice,
      vietqrUrl
    });
  });

  // Attendance endpoints
  app.get("/api/attendance", (req, res) => {
    const db = readDB();
    res.json([...db.attendance].reverse());
  });

  app.post("/api/attendance", (req, res) => {
    const { maHV, ngayFormatted, caLop } = req.body;
    const db = readDB();
    
    const isDuplicate = db.attendance.some(
      item => item.maHV.toString().trim() === maHV.toString().trim() && item.ngay === ngayFormatted
    );
    
    if (isDuplicate) {
      return res.json({ success: false, message: "Học viên này đã được điểm danh trong ngày hôm nay rồi!" });
    }

    db.attendance.push({ maHV, ngay: ngayFormatted, ca: caLop });
    writeDB(db);

    const student = db.students.find(s => s.maHV === maHV);
    const tenHV = student ? student.tenHV : "";
    const telegramId = student ? student.telegramId : "";

    if (telegramId) {
      const msg = `✅ <b>ĐIỂM DANH THÀNH CÔNG</b>\n\n👤 Học viên <b>${tenHV}</b> đã có mặt tại lớp ngày <b>${ngayFormatted}</b>.\n🎸 Lớp: ${caLop}\n\n<i>Chúc học viên có một buổi học thật hiệu quả!</i>`;
      logTelegram(telegramId, msg);

      // Check-in cycles for fee alerts (cycles of 8)
      const attendanceRecords = db.attendance.filter(a => a.maHV.toUpperCase() === maHV.toUpperCase());
      const totalBuoi = attendanceRecords.length;
      const invoiceRecords = db.fees.filter(f => f.maHV.toUpperCase() === maHV.toUpperCase());
      const soLanDong = invoiceRecords.length;

      let shouldRemind = false;
      let reminderReason = "";
      if (totalBuoi > 0 && totalBuoi % 8 === 0) {
        shouldRemind = true;
        reminderReason = `đã hoàn thành **${totalBuoi} buổi học**`;
      } else if (totalBuoi > 0 && totalBuoi % 8 === 1 && (soLanDong * 8) < totalBuoi) {
        shouldRemind = true;
        reminderReason = `đã bắt đầu chu kỳ mới (buổi ${totalBuoi}) nhưng hệ thống chưa ghi nhận khoản thu học phí`;
      }

      if (shouldRemind) {
        const feeMsg = `🔔 <b>THÔNG BÁO HỌC PHÍ ĐỊNH KỲ</b>\n\n👤 Học viên <b>${tenHV}</b> ${reminderReason}.\n\nXin quý phụ huynh vui lòng hoàn thành đóng học phí cho chu kỳ tiếp theo để đảm bảo tiến độ học tập của các em được thông suốt.\n\n<i>Xin chân thành cảm ơn quý phụ huynh!</i>`;
        logTelegram(telegramId, feeMsg);
        if (db.settings.adminChatId) {
          logTelegram(db.settings.adminChatId, `🔔 [Hệ Thống Auto] Đã gửi nhắc học phí cho học viên: ${tenHV} (${maHV})`);
        }
      }
    }

    res.json({ success: true, message: "Điểm danh thành công!" });
  });

  // Send daily reports and bulk message
  app.post("/api/reports/daily", (req, res) => {
    const { lop, siso, dahoc, chuahoc, ngay, absentNames, absentIds } = req.body;
    const db = readDB();
    const settings = db.settings;

    if (!settings.adminChatId) {
      return res.status(400).json({ success: false, message: "Lỗi: Chưa cài đặt Admin Chat ID trong phần Cài Đặt!" });
    }

    const msg = `📊 <b>BÁO CÁO ĐIỂM DANH TỪNG LỚP</b>\n\n🎸 Lớp học: <b>${lop}</b>\n📅 Ngày: <b>${ngay}</b>\n\n👥 Sĩ số lớp: <b>${siso}</b>\n✅ Có mặt: <b>${dahoc}</b>\n❌ Vắng mặt: <b>${chuahoc}</b>\n\n📝 Danh sách vắng: <i>${absentNames}</i>\n\n<i>(Báo cáo được gửi tự động từ Hệ Thống Quản Lý)</i>`;
    logTelegram(settings.adminChatId, msg);

    if (absentIds && absentIds.length > 0) {
      absentIds.forEach((maAbsent: string) => {
        const student = db.students.find(s => s.maHV === maAbsent);
        const tenHV = student ? student.tenHV : "";
        const telegramId = student ? student.telegramId : "";

        if (telegramId) {
          const absentMsg = `⚠️ <b>THÔNG BÁO VẮNG MẶT</b>\n\n👤 Học viên <b>${tenHV}</b> đã vắng mặt tại buổi học ngày hôm nay (<b>${ngay}</b>) thuộc lớp <b>${lop}</b>.\n\n<i>Hệ thống ghi nhận sự vắng mặt. Xin quý phụ huynh và học viên sắp xếp thời gian để học bù nếu cần thiết!</i>`;
          logTelegram(telegramId, absentMsg);

          const attendanceRecords = db.attendance.filter(a => a.maHV.toUpperCase() === maAbsent.toUpperCase());
          const totalBuoi = attendanceRecords.length;
          const invoiceRecords = db.fees.filter(f => f.maHV.toUpperCase() === maAbsent.toUpperCase());
          const soLanDong = invoiceRecords.length;

          let shouldRemind = false;
          let reminderReason = "";

          if (totalBuoi > 0 && totalBuoi % 8 === 0) {
            shouldRemind = true;
            reminderReason = `đã hoàn thành **${totalBuoi} buổi học**`;
          } else if (totalBuoi > 0 && totalBuoi % 8 === 1 && (soLanDong * 8) < totalBuoi) {
            shouldRemind = true;
            reminderReason = `đã bắt đầu chu kỳ mới (buổi ${totalBuoi}) nhưng hệ thống chưa ghi nhận khoản thu học phí`;
          }

          if (shouldRemind) {
            const feeMsg = `🔔 <b>THÔNG BÁO HỌC PHÍ ĐỊNH KỲ</b>\n\n👤 Học viên <b>${tenHV}</b> hiện tại ${reminderReason} (tính đến thời điểm hiện tại).\n\nXin quý phụ huynh vui lòng hoàn thành đóng học phí cho chu kỳ tiếp theo để đảm bảo tiến độ học tập của các em được thông suốt.\n\n<i>Xin chân thành cảm ơn quý phụ huynh!</i>`;
            logTelegram(telegramId, feeMsg);
          }
        }
      });
    }

    res.json({ success: true, message: "Đã gửi báo cáo điểm danh thành công qua Telegram Admin và gửi nhắc nhở cho học viên vắng mặt!" });
  });

  app.post("/api/reports/bulk-telegram", (req, res) => {
    const { type, target, message } = req.body;
    const db = readDB();
    let count = 0;
    
    db.students.forEach(hv => {
      const tLop = hv.lop ? hv.lop.trim() : "";
      const tId = hv.telegramId ? hv.telegramId.trim() : "";
      if (tId) {
        if (type === 'all' || (type === 'class' && tLop === target) || (type === 'individual' && hv.maHV === target)) {
          // Cá nhân hóa tin nhắn dựa trên từng học viên
          let personalizedMessage = message;
          personalizedMessage = personalizedMessage.replace(/\{TenHV\}/g, hv.tenHV || "");
          personalizedMessage = personalizedMessage.replace(/\{MaHV\}/g, hv.maHV || "");
          personalizedMessage = personalizedMessage.replace(/\{Lop\}/g, hv.lop || "");

          logTelegram(tId, personalizedMessage);
          count++;
        }
      }
    });

    res.json({ success: true, message: `Đã gửi thông báo thành công tới ${count} phụ huynh/học viên qua Telegram!` });
  });

  app.post("/api/reports/admin-report", (req, res) => {
    const { month, year } = req.body;
    const db = readDB();
    const settings = db.settings;

    if (!settings.adminChatId) {
      return res.status(400).json({ success: false, message: "Lỗi: Chưa cài đặt Chat ID Admin trong phần Cài Đặt!" });
    }

    const stats = calculateStats(month, year);
    const title = (month && year) ? `Tháng ${month}/${year}` : "Tổng Quan Toàn Hệ Thống";
    const msg = `📊 <b>BÁO CÁO HỆ THỐNG (${title})</b>\n\n` +
              `👥 Tổng học sinh: <b>${stats.tongHocSinh}</b>\n` +
              `🎸 Số lớp đang mở: <b>${stats.tongLopHoc}</b>\n` +
              `📝 Lượt điểm danh: <b>${stats.tongLuotDiemDanh}</b>\n` +
              `💰 Tạm tính doanh thu: <b>${Number(stats.tongDoanhThu).toLocaleString('vi-VN')}đ</b>\n\n` +
              `<i>(Báo cáo được tạo tự động từ hệ thống Admin)</i>`;
              
    logTelegram(settings.adminChatId, msg);
    res.json({ success: true, message: "Đã gửi báo cáo thành công qua Telegram Admin!" });
  });

  // Calculate Statistics Helper
  function calculateStats(filterMonth?: any, filterYear?: any) {
    const db = readDB();
    const tongHocSinh = db.students.length;
    const tongLopHoc = db.classes.length;
    let tongLuotDiemDanh = 0;
    let tongDoanhThu = 0;

    function isDateMatch(dateStr: string) {
      if (!filterMonth && !filterYear) return true;
      const parts = dateStr.split(" ")[0].split("/");
      if (parts.length !== 3) return false;
      const m = parseInt(parts[1]);
      const y = parseInt(parts[2]);
      if (filterMonth && filterYear) return m == parseInt(filterMonth) && y == parseInt(filterYear);
      if (filterMonth) return m == parseInt(filterMonth);
      if (filterYear) return y == parseInt(filterYear);
      return true;
    }

    const studentClassMap: { [key: string]: string } = {};
    db.students.forEach(st => {
      studentClassMap[st.maHV.toString().trim()] = st.lop || "Chưa xếp lớp";
    });

    const thongKeTheoLop: { [key: string]: { hocVien: number; doanhThu: number } } = {};
    db.students.forEach(st => {
      const tenLop = st.lop || "Chưa xếp lớp";
      if (!thongKeTheoLop[tenLop]) thongKeTheoLop[tenLop] = { hocVien: 0, doanhThu: 0 };
      thongKeTheoLop[tenLop].hocVien += 1;
    });

    db.fees.forEach(inv => {
      if (inv.ngayThu && isDateMatch(inv.ngayThu)) {
        const tien = parseFloat(inv.soTien) || 0;
        tongDoanhThu += tien;
        const maHV = inv.maHV ? inv.maHV.toString().trim() : "";
        const lopCuaHV = studentClassMap[maHV] || "Khác";
        if (!thongKeTheoLop[lopCuaHV]) thongKeTheoLop[lopCuaHV] = { hocVien: 0, doanhThu: 0 };
        thongKeTheoLop[lopCuaHV].doanhThu += tien;
      }
    });

    db.attendance.forEach(att => {
      if (att.ngay && isDateMatch(att.ngay)) {
        tongLuotDiemDanh++;
      }
    });

    const labelsLop: string[] = [];
    const dataHocVien: number[] = [];
    const dataDoanhThu: number[] = [];

    for (const lop in thongKeTheoLop) {
      labelsLop.push(lop);
      dataHocVien.push(thongKeTheoLop[lop].hocVien);
      dataDoanhThu.push(thongKeTheoLop[lop].doanhThu);
    }

    return {
      tongDoanhThu,
      tongHocSinh,
      tongLopHoc,
      tongLuotDiemDanh,
      chartData: { labels: labelsLop, hocVien: dataHocVien, doanhThu: dataDoanhThu }
    };
  }

  app.get("/api/reports/stats", (req, res) => {
    const { month, year } = req.query;
    const stats = calculateStats(month, year);
    res.json(stats);
  });

  // Practices endpoints
  app.get("/api/practices", (req, res) => {
    const { maHV } = req.query;
    const db = readDB();
    if (maHV) {
      const filtered = db.practices.filter(p => p.maHV.toUpperCase() === String(maHV).toUpperCase());
      return res.json([...filtered].reverse());
    }
    res.json([...db.practices].reverse());
  });

  app.post("/api/practices", (req, res) => {
    const { maHV, tenHV, tenBH, duration, videoUrl } = req.body;
    const db = readDB();
    let maxNum = 0;
    db.practices.forEach(item => {
      const num = parseInt(item.maPractice.replace(/\D/g, ''));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const maPractice = "PR" + (maxNum >= 100 ? maxNum + 1 : 100 + db.practices.length + 1);
    
    const today = new Date();
    const formattedDate = ("0" + today.getDate()).slice(-2) + "/" + ("0" + (today.getMonth() + 1)).slice(-2) + "/" + today.getFullYear();
    
    db.practices.push({
      maPractice,
      maHV,
      tenHV,
      tenBH,
      duration: parseInt(duration) || 0,
      ngay: formattedDate,
      videoUrl: videoUrl || ""
    });

    // Update streak for student
    const studentIdx = db.students.findIndex(s => s.maHV === maHV);
    let currentStreak = 0;
    if (studentIdx !== -1) {
      let streak = db.students[studentIdx].streak || 0;
      const lastDateStr = db.students[studentIdx].lastPracticeDate;
      
      if (lastDateStr === formattedDate) {
        // Already practiced today, keep streak
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayFormatted = ("0" + yesterday.getDate()).slice(-2) + "/" + ("0" + (yesterday.getMonth() + 1)).slice(-2) + "/" + yesterday.getFullYear();
        
        if (lastDateStr === yesterdayFormatted || lastDateStr === "") {
          streak++;
        } else {
          streak = 1; // reset streak if gap > 1 day
        }
      }
      db.students[studentIdx].streak = streak;
      db.students[studentIdx].lastPracticeDate = formattedDate;
      currentStreak = streak;
    }

    writeDB(db);
    res.json({ success: true, streak: currentStreak });
  });

  // AI Churn risk advisor calculations
  app.get("/api/reports/churn", (req, res) => {
    const db = readDB();
    const result: any[] = [];
    
    db.students.forEach(st => {
      // Analyze attendance
      const stAtt = db.attendance.filter(a => a.maHV.toUpperCase() === st.maHV.toUpperCase());
      const totalAtt = stAtt.length;
      
      // Analyze payments
      const stInvoices = db.fees.filter(f => f.maHV.toUpperCase() === st.maHV.toUpperCase());
      const totalPaidCycles = stInvoices.length;
      const expectedCycles = Math.ceil(totalAtt / 8);
      const feeOverdue = expectedCycles > totalPaidCycles;
      
      let lastAttDays = 999;
      if (stAtt.length > 0) {
        // Get the latest date
        const sortedAtt = [...stAtt].sort((a, b) => {
          const partsA = a.ngay.split('/');
          const partsB = b.ngay.split('/');
          const dA = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0]));
          const dB = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0]));
          return dB.getTime() - dA.getTime();
        });

        const dateParts = sortedAtt[0].ngay.split('/');
        if (dateParts.length === 3) {
          const d = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - d.getTime());
          lastAttDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      let score = 10; // Base score
      const reasons: string[] = [];

      if (lastAttDays > 21) {
        score += 40;
        reasons.push("Vắng mặt liên tục hơn 3 tuần");
      } else if (lastAttDays > 14) {
        score += 20;
        reasons.push("Không đi học trong 2 tuần gần nhất");
      }

      if (feeOverdue) {
        score += 25;
        reasons.push(`Nợ học phí chu kỳ mới (Đã học: ${totalAtt} buổi, Số lần đóng: ${totalPaidCycles})`);
      }

      if ((st.streak || 0) === 0 && lastAttDays > 10) {
        score += 15;
        reasons.push("Không tự luyện tập tại nhà");
      }

      if (score < 25) {
        reasons.push("Chăm chỉ đi học và tự luyện tập đều đặn");
      }

      let risk = "Thấp";
      if (score >= 60) risk = "Cao";
      else if (score >= 30) risk = "Trung Bình";

      result.push({
        maHV: st.maHV,
        tenHV: st.tenHV,
        lop: st.lop,
        caHoc: st.caHoc,
        risk: risk,
        score,
        reasons: reasons.join(", ")
      });
    });

    res.json(result);
  });

  // Payroll calculation
  app.get("/api/reports/payroll", (req, res) => {
    const db = readDB();
    const classTeacherMap: { [key: string]: string } = {};
    db.classes.forEach(c => {
      if (c.tenLop && c.maGV) {
        classTeacherMap[c.tenLop.trim()] = c.maGV;
      }
    });

    const payroll: any[] = [];
    db.teachers.forEach(t => {
      // Calculate how many check-ins occurred in their classes
      let totalAttHV = 0;
      db.attendance.forEach(att => {
        const tLop = att.ca ? att.ca.trim() : "";
        if (classTeacherMap[tLop] === t.maGV) {
          totalAttHV++;
        }
      });
      // A teacher taught unique class sessions (by date & class name)
      const uniqueSessions = new Set<string>();
      db.attendance.forEach(att => {
        const tLop = att.ca ? att.ca.trim() : "";
        if (classTeacherMap[tLop] === t.maGV && att.ngay) {
          uniqueSessions.add(att.ngay + "_" + tLop);
        }
      });
      const sessionsCount = uniqueSessions.size;
      const salaryEarned = sessionsCount * t.luongCoBan;
      
      payroll.push({
        maGV: t.maGV,
        tenGV: t.tenGV,
        luongCoBan: t.luongCoBan,
        soBuoiDay: sessionsCount,
        soLuotHocVien: totalAttHV,
        tongLuong: salaryEarned
      });
    });

    res.json(payroll);
  });

  // Enable Auto daily summary report schedule (simulation status)
  app.post("/api/reports/scheduler", (req, res) => {
    res.json({ message: "Đã kích hoạt Báo Cáo Điểm Danh Tự Động thành công!" });
  });

  // Bulk import from Google Sheets
  app.post("/api/sync/bulk-import", (req, res) => {
    const { type, records } = req.body;
    if (!type || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    const db = readDB();

    if (type === "students") {
      let maxNum = 0;
      db.students.forEach(item => {
        const num = parseInt(item.maHV.replace(/\D/g, ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });

      let newIdNum = maxNum >= 100 ? maxNum + 1 : 100 + db.students.length + 1;
      let importedCount = 0;
      let updatedCount = 0;

      records.forEach((rec: any) => {
        const sdtClean = rec.sdt ? String(rec.sdt).trim() : "";
        if (!rec.tenHV || !sdtClean) return;

        // Find if student with same phone already exists
        const existingIdx = db.students.findIndex(s => s.sdt === sdtClean);
        if (existingIdx !== -1) {
          // Update details
          db.students[existingIdx].tenHV = rec.tenHV.trim();
          if (rec.lop) db.students[existingIdx].lop = rec.lop.trim();
          if (rec.caHoc) db.students[existingIdx].caHoc = rec.caHoc.trim();
          if (rec.telegramId) db.students[existingIdx].telegramId = String(rec.telegramId).trim();
          if (rec.hocPhi) db.students[existingIdx].hocPhi = String(rec.hocPhi).trim();
          updatedCount++;
        } else {
          // Insert new
          const maHV = "HV" + newIdNum;
          db.students.push({
            maHV,
            tenHV: rec.tenHV.trim(),
            sdt: sdtClean,
            lop: rec.lop ? rec.lop.trim() : "",
            caHoc: rec.caHoc ? rec.caHoc.trim() : "",
            telegramId: rec.telegramId ? String(rec.telegramId).trim() : "",
            hocPhi: rec.hocPhi ? String(rec.hocPhi).trim() : "",
            streak: 0,
            lastPracticeDate: ""
          });
          newIdNum++;
          importedCount++;
        }
      });

      writeDB(db);
      return res.json({ success: true, message: `Thành công! Đã thêm mới ${importedCount} học viên, cập nhật ${updatedCount} học viên.` });
    }

    if (type === "classes") {
      let maxNum = 0;
      db.classes.forEach(item => {
        const num = parseInt(item.maLop.replace(/\D/g, ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });

      let newIdNum = maxNum >= 100 ? maxNum + 1 : 100 + db.classes.length + 1;
      let importedCount = 0;
      let updatedCount = 0;

      records.forEach((rec: any) => {
        if (!rec.tenLop) return;

        // Check if duplicate class name
        const existingIdx = db.classes.findIndex(c => c.tenLop.toLowerCase() === rec.tenLop.trim().toLowerCase());
        if (existingIdx !== -1) {
          if (rec.lichHoc) db.classes[existingIdx].lichHoc = rec.lichHoc.trim();
          if (rec.maGV) db.classes[existingIdx].maGV = rec.maGV.trim();
          updatedCount++;
        } else {
          const maLop = "LH" + newIdNum;
          db.classes.push({
            maLop,
            tenLop: rec.tenLop.trim(),
            lichHoc: rec.lichHoc ? rec.lichHoc.trim() : "Lịch học tự do",
            maGV: rec.maGV ? rec.maGV.trim() : "GV100"
          });
          newIdNum++;
          importedCount++;
        }
      });

      writeDB(db);
      return res.json({ success: true, message: `Thành công! Đã thêm mới ${importedCount} lớp học, cập nhật ${updatedCount} lớp học.` });
    }

    if (type === "songs") {
      let maxNum = 0;
      db.songs.forEach(item => {
        const num = parseInt(item.maBH.replace(/\D/g, ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });

      let newIdNum = maxNum >= 100 ? maxNum + 1 : 100 + db.songs.length + 1;
      let importedCount = 0;
      let updatedCount = 0;

      records.forEach((rec: any) => {
        if (!rec.tenBH || !rec.loiBH) return;

        // Check if song name exists
        const existingIdx = db.songs.findIndex(s => s.tenBH.toLowerCase() === rec.tenBH.trim().toLowerCase());
        if (existingIdx !== -1) {
          db.songs[existingIdx].loiBH = rec.loiBH;
          if (rec.phanLoai) db.songs[existingIdx].phanLoai = rec.phanLoai.trim();
          updatedCount++;
        } else {
          const maBH = "BH" + newIdNum;
          db.songs.push({
            maBH,
            tenBH: rec.tenBH.trim(),
            loiBH: rec.loiBH,
            phanLoai: rec.phanLoai || "Hợp Âm"
          });
          newIdNum++;
          importedCount++;
        }
      });

      writeDB(db);
      return res.json({ success: true, message: `Thành công! Đã thêm mới ${importedCount} bài hát, cập nhật ${updatedCount} bài hát.` });
    }

    return res.status(400).json({ success: false, message: "Loại đối tượng nhập không được hỗ trợ" });
  });


  // --- VITE MIDDLEWARE INTERFACE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
