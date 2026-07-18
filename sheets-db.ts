import { google } from "googleapis";

export interface Database {
  classes: any[];
  students: any[];
  songs: any[];
  studentSongs: any[];
  attendance: any[];
  fees: any[];
  settings: any;
  bookings: any[];
  teachers: any[];
  practices: any[];
  telegramLogs: any[];
  zaloLogs: any[];
}

const defaultDB: Database = {
  classes: [], students: [], songs: [], studentSongs: [],
  attendance: [], fees: [], settings: {}, bookings: [],
  teachers: [], practices: [], telegramLogs: [], zaloLogs: []
};

let cachedDB: Database = { ...defaultDB };
let lastFetchTime = 0;
let isFetching = false;
let sheetsClient: any = null;
let spreadsheetId = "";

export function initSheetsDB(id: string, clientEmail: string, privateKey: string) {
  if (!id || !clientEmail || !privateKey) return;
  spreadsheetId = id;
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  
  // Start background poll
  setInterval(fetchLatestDB, 30000); // 30s cache
  fetchLatestDB();
}

export function getDB(): Database {
  return cachedDB;
}

// Map the tabs to our collections
const TAB_MAP: Record<keyof Database, string> = {
  classes: "DanhSachLopHoc",
  students: "DanhSachHocVien",
  songs: "KhoBaiHat",
  studentSongs: "HocVien_BaiHat",
  attendance: "DiemDanh",
  fees: "HocPhi",
  settings: "CaiDat",
  bookings: "Bookings",
  teachers: "Teachers",
  practices: "Practices",
  telegramLogs: "TelegramLogs", // Will ignore if not exist
  zaloLogs: "ZaloLogs" // Will ignore if not exist
};

export async function fetchLatestDB() {
  if (!sheetsClient || !spreadsheetId || isFetching) return;
  isFetching = true;
  try {
    const res = await sheetsClient.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });
    const sheetTitles = res.data.sheets?.map((s: any) => s.properties?.title) || [];
    
    // We only fetch ranges that exist in the spreadsheet
    const rangesToFetch = Object.values(TAB_MAP).filter(tab => sheetTitles.includes(tab)).map(tab => `${tab}!A:Z`);
    
    if (rangesToFetch.length === 0) {
      isFetching = false;
      return;
    }

    const dataRes = await sheetsClient.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: rangesToFetch
    });

    const newDB: Database = { ...defaultDB };
    
    const valueRanges = dataRes.data.valueRanges || [];
    for (const vr of valueRanges) {
      const rangeName = vr.range?.split('!')[0].replace(/['"]/g, '') || "";
      const rows = vr.values || [];
      if (rows.length <= 1) continue;
      
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      // Generic mapper
      const mapRows = (data: string[][], keys: string[]) => {
          return data.map(row => {
              const obj: any = {};
              keys.forEach((k, i) => obj[k] = row[i] || "");
              return obj;
          });
      }

      if (rangeName === TAB_MAP.students) newDB.students = mapRows(dataRows, ['maHV', 'tenHV', 'sdt', 'lop', 'caHoc', 'telegramId', 'hocPhi', 'streak', 'lastPracticeDate']);
      else if (rangeName === TAB_MAP.classes) newDB.classes = mapRows(dataRows, ['maLop', 'tenLop', 'lichHoc', 'maGV']);
      else if (rangeName === TAB_MAP.songs) newDB.songs = mapRows(dataRows, ['maBH', 'tenBH', 'loiBH', 'phanLoai']);
      else if (rangeName === TAB_MAP.studentSongs) newDB.studentSongs = mapRows(dataRows, ['maHV', 'maBH']);
      else if (rangeName === TAB_MAP.attendance) newDB.attendance = mapRows(dataRows, ['maHV', 'ngay', 'ca']);
      else if (rangeName === TAB_MAP.fees) newDB.fees = mapRows(dataRows, ['maHV', 'ngayThu', 'soTien', 'ghiChu']);
      else if (rangeName === TAB_MAP.settings) {
          const settingsObj: any = {};
          dataRows.forEach(r => { if(r[0]) settingsObj[r[0]] = r[1] || "" });
          newDB.settings = settingsObj;
      }
      else if (rangeName === TAB_MAP.bookings) newDB.bookings = mapRows(dataRows, ['maBooking', 'maHV', 'tenHV', 'maLop', 'tenLop', 'caHoc', 'ngay']);
      else if (rangeName === TAB_MAP.teachers) newDB.teachers = mapRows(dataRows, ['maGV', 'tenGV', 'email', 'luongCoBan', 'sdt']);
      else if (rangeName === TAB_MAP.practices) newDB.practices = mapRows(dataRows, ['maPractice', 'maHV', 'tenHV', 'tenBH', 'duration', 'ngay', 'videoUrl']);
    }
    
    cachedDB = newDB;
    lastFetchTime = Date.now();
  } catch (error) {
    console.error("Failed to fetch from Google Sheets", error);
  } finally {
    isFetching = false;
  }
}

// We expose writeDB as a fallback for the old logic if needed
// But in a full Google Sheets implementation, writes should be appends/updates.
// For now, we will replace the whole sheet tab when data changes to keep it simple,
// just like the old local JSON logic did, but writing to Sheets instead.
// Warning: This can overwrite concurrent edits on Google Sheets.
export async function writeDB(db: Database) {
  cachedDB = db; // Optimistic local update
  if (!sheetsClient || !spreadsheetId) return; // Silent fallback if not connected
  
  // To avoid hitting rate limits with full sheet rewrites on every minor update,
  // we could debounce this, or rewrite the specific logic. 
  // For safety and speed in this demo, we'll only update memory and let a debounced task sync it.
  debouncedSyncToSheets(db);
}

let syncTimeout: NodeJS.Timeout | null = null;
function debouncedSyncToSheets(db: Database) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncAllToSheets(db).catch(console.error);
  }, 3000); // Wait 3 seconds before writing
}

async function syncAllToSheets(db: Database) {
    if (!sheetsClient || !spreadsheetId) return;
    
    // We update specific tabs that frequently change: students, attendance, etc.
    const updates = [
        { range: `${TAB_MAP.students}!A2:I`, values: db.students.map(s => [s.maHV || "", s.tenHV || "", s.sdt || "", s.lop || "", s.caHoc || "", s.telegramId || "", s.hocPhi || "", s.streak || "", s.lastPracticeDate || ""]) },
        { range: `${TAB_MAP.classes}!A2:D`, values: db.classes.map(c => [c.maLop || "", c.tenLop || "", c.lichHoc || "", c.maGV || ""]) },
        { range: `${TAB_MAP.songs}!A2:D`, values: db.songs.map(s => [s.maBH || "", s.tenBH || "", s.loiBH || "", s.phanLoai || ""]) },
        { range: `${TAB_MAP.attendance}!A2:C`, values: db.attendance.map(a => [a.maHV || "", a.ngay || "", a.ca || ""]) },
        { range: `${TAB_MAP.fees}!A2:D`, values: db.fees.map(f => [f.maHV || "", f.ngayThu || "", f.soTien || "", f.ghiChu || ""]) },
        { range: `${TAB_MAP.studentSongs}!A2:B`, values: db.studentSongs.map(s => [s.maHV || "", s.maBH || ""]) },
        { range: `${TAB_MAP.bookings}!A2:G`, values: db.bookings.map(b => [b.maBooking || "", b.maHV || "", b.tenHV || "", b.maLop || "", b.tenLop || "", b.caHoc || "", b.ngay || ""]) },
        { range: `${TAB_MAP.teachers}!A2:E`, values: db.teachers.map(t => [t.maGV || "", t.tenGV || "", t.email || "", t.luongCoBan || "", t.sdt || ""]) },
        { range: `${TAB_MAP.practices}!A2:G`, values: db.practices.map(p => [p.maPractice || "", p.maHV || "", p.tenHV || "", p.tenBH || "", p.duration || "", p.ngay || "", p.videoUrl || ""]) },
        { range: `${TAB_MAP.settings}!A2:B`, values: Object.entries(db.settings || {}).map(([k, v]) => [k, String(v) || ""]) }
    ];
    
    // Clear and update
    try {
        for (const update of updates) {
            // Very naive full overwrite approach. Real apps should append/update rows using google sheets API properly.
            await sheetsClient.spreadsheets.values.update({
                spreadsheetId,
                range: update.range,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: update.values }
            });
            // Need a sleep to avoid rate limits 60/min
            await new Promise(r => setTimeout(r, 500));
        }
    } catch (e) {
        console.error("Error writing to sheets:", e);
    }
}
