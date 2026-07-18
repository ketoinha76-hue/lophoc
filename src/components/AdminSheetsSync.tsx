import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import { fetch, stripHtmlFromLyrics } from "../lib/api";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Columns, 
  Database, 
  LogIn, 
  LogOut, 
  ArrowRight, 
  HelpCircle,
  TrendingUp,
  Flame,
  Search,
  Lock
} from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive");

interface SheetProperties {
  sheetId: number;
  title: string;
}

interface SheetMetadata {
  properties: SheetProperties;
}

const findBestHeaderIndex = (headers: string[], keywords: string[], excludeKeywords: string[] = ["mã", "id", "code"]) => {
  let found = headers.findIndex(h => {
    const hl = h.toLowerCase();
    const hasExclude = excludeKeywords.some(ex => hl.includes(ex));
    if (hasExclude) return false;
    return keywords.some(k => hl.includes(k.toLowerCase()));
  });

  if (found === -1) {
    found = headers.findIndex(h => {
      const hl = h.toLowerCase();
      return keywords.some(k => hl.includes(k.toLowerCase()));
    });
  }

  return found;
};

export default function AdminSheetsSync({ onRefresh }: { onRefresh: () => void }) {
  // Spreadsheet States
  const [spreadsheetId, setSpreadsheetId] = useState<string>("16YsyE3TB_LURl4pr09qPprzfuCH78lSZ5YmoULkcF-A");
  const [selectedSheetGid, setSelectedSheetGid] = useState<string>("615025549");
  
  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Sheets & Data States
  const [sheetList, setSheetList] = useState<SheetProperties[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState<boolean>(false);
  const [activeSheetTitle, setActiveSheetTitle] = useState<string>("");
  const [rawData, setRawData] = useState<string[][]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [syncTarget, setSyncTarget] = useState<"students" | "classes" | "songs">("students");

  // Mapping state
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: number }>({});
  
  // Progress state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Sync All States
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncAllStatus, setSyncAllStatus] = useState<{
    students?: { success: boolean; count: number; message?: string; error?: string };
    classes?: { success: boolean; count: number; message?: string; error?: string };
    songs?: { success: boolean; count: number; message?: string; error?: string };
  } | null>(null);

  // Initialize Auth Observer
  useEffect(() => {
    const savedToken = localStorage.getItem("google_access_token");
    if (savedToken) {
      setAccessToken(savedToken);
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Google Sign-In
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setSyncResult(null);
    setErrorLog(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        localStorage.setItem("google_access_token", credential.accessToken);
        setUser(result.user);

        // Save token to backend settings so it's accessible server-side
        await fetch("/api/settings/google-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: credential.accessToken })
        }).catch(err => console.error("Failed to save google token:", err));
        
        // Fetch sheets automatically
        await fetchSpreadsheetMetadata(credential.accessToken, spreadsheetId);
      } else {
        throw new Error("Không lấy được mã truy cập (Access Token) từ Google.");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorLog(err.message || "Đăng nhập Google thất bại. Hãy chắc chắn bạn cấp đủ quyền.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Log Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("google_access_token");
      setSheetList([]);
      setRawData([]);
      setHeaders([]);
      setSyncResult(null);
      setSyncAllStatus(null);
    } catch (err: any) {
      console.error("Logout error", err);
    }
  };

  // Direct fetch sheet values for background sync all
  const fetchSheetValuesForSync = async (token: string, spreadId: string, title: string) => {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadId.trim()}/values/${encodeURIComponent(title)}!A1:Z1000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("google_access_token");
        setAccessToken(null);
        throw new Error("Mã xác thực Google đã hết hạn. Vui lòng kết nối lại tài khoản.");
      }
      throw new Error(`Không thể lấy dữ liệu bảng "${title}": ${res.statusText}`);
    }
    const data = await res.json();
    return data.values || [];
  };

  // Auto-detect mappings and construct records on the fly
  const detectAndMapRows = (rows: string[][], target: "students" | "classes" | "songs") => {
    if (rows.length <= 1) return [];
    const firstRow = rows[0];
    const mappings: { [key: string]: number } = {};
    
    if (target === "students") {
      const nameKeywords = ["họ tên", "tên học viên", "học viên", "tên", "ho ten", "name", "student name", "student"];
      mappings.tenHV = findBestHeaderIndex(firstRow, nameKeywords);

      const phoneKeywords = ["số điện thoại", "sđt", "sdt", "điện thoại", "phone", "telephone", "mobile"];
      mappings.sdt = findBestHeaderIndex(firstRow, phoneKeywords);

      const classKeywords = ["lớp", "lop", "lớp học", "class"];
      mappings.lop = findBestHeaderIndex(firstRow, classKeywords);

      const schedKeywords = ["ca học", "lịch học", "ca hoc", "lich hoc", "schedule", "time", "ca"];
      mappings.caHoc = findBestHeaderIndex(firstRow, schedKeywords);

      const teleKeywords = ["telegram", "tele", "telegram id", "chat id"];
      mappings.telegramId = findBestHeaderIndex(firstRow, teleKeywords);

      const feeKeywords = ["học phí", "hocphi", "hoc phi", "tiền", "tiền học", "fee", "amount", "price"];
      mappings.hocPhi = findBestHeaderIndex(firstRow, feeKeywords);
    } else if (target === "classes") {
      const nameKeywords = ["tên lớp", "lớp", "ten lop", "class name", "class"];
      mappings.tenLop = findBestHeaderIndex(firstRow, nameKeywords);

      const schedKeywords = ["lịch học", "lich hoc", "schedule", "thời gian", "lich"];
      mappings.lichHoc = findBestHeaderIndex(firstRow, schedKeywords);

      const teacherKeywords = ["giáo viên", "giảng viên", "gv", "giao vien", "teacher", "instructor"];
      mappings.maGV = findBestHeaderIndex(firstRow, teacherKeywords);
    } else if (target === "songs") {
      const nameKeywords = ["tên bài hát", "bài hát", "tên bài", "ten bai hat", "song title", "song", "title"];
      mappings.tenBH = findBestHeaderIndex(firstRow, nameKeywords);

      const lyricsKeywords = ["lời", "lời bài hát", "loi bai hat", "lyrics", "nội dung", "mã cảm âm", "hợp âm"];
      mappings.loiBH = findBestHeaderIndex(firstRow, lyricsKeywords);

      const catKeywords = ["phân loại", "thể loại", "loại", "category", "type"];
      mappings.phanLoai = findBestHeaderIndex(firstRow, catKeywords);
    }

    return rows.slice(1).map(row => {
      const record: any = {};
      if (target === "students") {
        const tenIdx = mappings.tenHV;
        const sdtIdx = mappings.sdt;
        const lopIdx = mappings.lop;
        const caIdx = mappings.caHoc;
        const teleIdx = mappings.telegramId;
        const feeIdx = mappings.hocPhi;

        record.tenHV = tenIdx !== undefined && tenIdx >= 0 ? row[tenIdx] : "";
        record.sdt = sdtIdx !== undefined && sdtIdx >= 0 ? row[sdtIdx] : "";
        record.lop = lopIdx !== undefined && lopIdx >= 0 ? row[lopIdx] : "";
        record.caHoc = caIdx !== undefined && caIdx >= 0 ? row[caIdx] : "";
        record.telegramId = teleIdx !== undefined && teleIdx >= 0 ? row[teleIdx] : "";
        record.hocPhi = feeIdx !== undefined && feeIdx >= 0 ? row[feeIdx] : "";
      } else if (target === "classes") {
        const tenIdx = mappings.tenLop;
        const schedIdx = mappings.lichHoc;
        const gvIdx = mappings.maGV;

        record.tenLop = tenIdx !== undefined && tenIdx >= 0 ? row[tenIdx] : "";
        record.lichHoc = schedIdx !== undefined && schedIdx >= 0 ? row[schedIdx] : "";
        record.maGV = gvIdx !== undefined && gvIdx >= 0 ? row[gvIdx] : "";
      } else if (target === "songs") {
        const tenIdx = mappings.tenBH;
        const lyricsIdx = mappings.loiBH;
        const catIdx = mappings.phanLoai;

        record.tenBH = tenIdx !== undefined && tenIdx >= 0 ? row[tenIdx] : "";
        const rawLyrics = lyricsIdx !== undefined && lyricsIdx >= 0 ? row[lyricsIdx] : "";
        const phanLoaiVal = catIdx !== undefined && catIdx >= 0 ? row[catIdx] : "Hợp Âm";
        record.phanLoai = phanLoaiVal;
        record.loiBH = phanLoaiVal === "Bài Học" ? rawLyrics : stripHtmlFromLyrics(rawLyrics);
      }
      return record;
    }).filter(rec => {
      if (target === "students") return rec.tenHV && rec.sdt;
      if (target === "classes") return rec.tenLop;
      if (target === "songs") return rec.tenBH && rec.loiBH;
      return false;
    });
  };

  // Perform bulk synchronization for ALL datasets with 1 click
  const handleSyncAll = async () => {
    if (!spreadsheetId) {
      setErrorLog("Vui lòng nhập ID Spreadsheet.");
      return;
    }
    if (!accessToken) {
      setErrorLog("Vui lòng kết nối Google Account trước.");
      return;
    }

    setIsSyncingAll(true);
    setSyncAllStatus(null);
    setErrorLog(null);

    const statusResult: typeof syncAllStatus = {};

    try {
      const cleanId = spreadsheetId.trim();
      
      // Fetch fresh sheet tabs metadata
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets(properties(title,sheetId))`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!metaRes.ok) {
        if (metaRes.status === 401) {
          localStorage.removeItem("google_access_token");
          setAccessToken(null);
          throw new Error("Mã xác thực Google đã hết hạn. Vui lòng nhấn 'Kết Nối Google Account' để đăng nhập lại.");
        }
        throw new Error(`Lỗi lấy danh sách trang tính: ${metaRes.statusText}`);
      }
      const metaData = await metaRes.json();
      const currentSheets = (metaData.sheets || []).map((s: any) => s.properties);
      setSheetList(currentSheets);

      const normalizeString = (str: string) => {
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/\s+/g, "");
      };

      const findSheetTitleByKeywordLocal = (keywords: string[], fallback: string, list: any[]) => {
        const match = list.find(sheet => {
          const sheetTitleNorm = normalizeString(sheet.title);
          return keywords.some(keyword => {
            const keywordNorm = normalizeString(keyword);
            return sheetTitleNorm.includes(keywordNorm);
          });
        });
        return match ? match.title : fallback;
      };

      // 1. Sync Students
      const studentTabName = findSheetTitleByKeywordLocal(["học viên", "hoc vien", "student"], "students", currentSheets);
      try {
        const rows = await fetchSheetValuesForSync(accessToken, cleanId, studentTabName);
        const records = detectAndMapRows(rows, "students");
        if (records.length > 0) {
          const res = await fetch("/api/sync/bulk-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "students", records })
          });
          if (res.ok) {
            const data = await res.json();
            statusResult.students = { success: data.success, count: records.length, message: data.message };
          } else {
            statusResult.students = { success: false, count: 0, error: `Máy chủ trả về lỗi: ${res.statusText}` };
          }
        } else {
          statusResult.students = { success: false, count: 0, error: `Không tìm thấy dòng học viên hợp lệ nào trong tab "${studentTabName}"` };
        }
      } catch (err: any) {
        statusResult.students = { success: false, count: 0, error: err.message };
      }

      // 2. Sync Classes
      const classTabName = findSheetTitleByKeywordLocal(["lớp", "lop", "class"], "classes", currentSheets);
      try {
        const rows = await fetchSheetValuesForSync(accessToken, cleanId, classTabName);
        const records = detectAndMapRows(rows, "classes");
        if (records.length > 0) {
          const res = await fetch("/api/sync/bulk-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "classes", records })
          });
          if (res.ok) {
            const data = await res.json();
            statusResult.classes = { success: data.success, count: records.length, message: data.message };
          } else {
            statusResult.classes = { success: false, count: 0, error: `Máy chủ trả về lỗi: ${res.statusText}` };
          }
        } else {
          statusResult.classes = { success: false, count: 0, error: `Không tìm thấy dòng lớp học hợp lệ nào trong tab "${classTabName}"` };
        }
      } catch (err: any) {
        statusResult.classes = { success: false, count: 0, error: err.message };
      }

      // 3. Sync Songs
      const songTabName = findSheetTitleByKeywordLocal(["bài hát", "bai hat", "song"], "songs", currentSheets);
      try {
        const rows = await fetchSheetValuesForSync(accessToken, cleanId, songTabName);
        const records = detectAndMapRows(rows, "songs");
        if (records.length > 0) {
          const res = await fetch("/api/sync/bulk-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "songs", records })
          });
          if (res.ok) {
            const data = await res.json();
            statusResult.songs = { success: data.success, count: records.length, message: data.message };
          } else {
            statusResult.songs = { success: false, count: 0, error: `Máy chủ trả về lỗi: ${res.statusText}` };
          }
        } else {
          statusResult.songs = { success: false, count: 0, error: `Không tìm thấy dòng bài hát hợp lệ nào trong tab "${songTabName}"` };
        }
      } catch (err: any) {
        statusResult.songs = { success: false, count: 0, error: err.message };
      }

      setSyncAllStatus(statusResult);
      onRefresh();
    } catch (err: any) {
      console.error("Sync all sheets error:", err);
      setErrorLog(err.message || "Gặp lỗi hệ thống khi đồng bộ hàng loạt.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Fetch Spreadsheet Sheets (Metadata)
  const fetchSpreadsheetMetadata = async (token: string, sheetIdStr: string) => {
    if (!sheetIdStr) return;
    setIsLoadingSheets(true);
    setErrorLog(null);
    try {
      const cleanId = sheetIdStr.trim();
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets(properties(title,sheetId))`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Lỗi tải thông tin bảng tính: ${res.statusText}`);
      }

      const data = await res.json();
      const sheets = (data.sheets || []).map((s: SheetMetadata) => s.properties);
      setSheetList(sheets);

      // Try to find the matching sheet for gid selected or fallback
      let foundSheet = sheets.find((s: SheetProperties) => String(s.sheetId) === String(selectedSheetGid));
      if (!foundSheet && sheets.length > 0) {
        foundSheet = sheets[0];
        setSelectedSheetGid(String(sheets[0].sheetId));
      }

      if (foundSheet) {
        setActiveSheetTitle(foundSheet.title);
        await fetchSheetValues(token, cleanId, foundSheet.title);
      }
    } catch (err: any) {
      console.error("Fetch metadata error", err);
      setErrorLog(err.message || "Không thể truy cập Google Sheets. Vui lòng cấp quyền hoặc kiểm tra tính công khai/chia sẻ của tài liệu.");
    } finally {
      setIsLoadingSheets(false);
    }
  };

  // Fetch Specific Sheet Cell Values
  const fetchSheetValues = async (token: string, spreadId: string, title: string) => {
    if (!spreadId || !title) return;
    setIsLoadingData(true);
    setRawData([]);
    setHeaders([]);
    setSyncResult(null);
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadId.trim()}/values/${encodeURIComponent(title)}!A1:Z1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Lỗi tải dữ liệu dòng: ${res.statusText}`);
      }

      const data = await res.json();
      const rows: string[][] = data.values || [];
      if (rows.length > 0) {
        setRawData(rows);
        const firstRow = rows[0];
        setHeaders(firstRow);
        
        // Auto map columns based on target
        autoDetectMappings(firstRow, syncTarget);
      } else {
        throw new Error("Trang tính rỗng, không tìm thấy dữ liệu nào.");
      }
    } catch (err: any) {
      console.error("Fetch sheet data error:", err);
      setErrorLog(err.message || "Lỗi khi lấy dữ liệu các ô của Trang tính.");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Auto-detect index mappings
  const autoDetectMappings = (sheetHeaders: string[], target: "students" | "classes" | "songs") => {
    const mappings: { [key: string]: number } = {};
    
    if (target === "students") {
      // Find name
      const nameKeywords = ["họ tên", "tên học viên", "học viên", "tên", "ho ten", "name", "student name", "student"];
      mappings.tenHV = findBestHeaderIndex(sheetHeaders, nameKeywords);

      // Find phone
      const phoneKeywords = ["số điện thoại", "sđt", "sdt", "điện thoại", "phone", "telephone", "mobile"];
      mappings.sdt = findBestHeaderIndex(sheetHeaders, phoneKeywords);

      // Find class
      const classKeywords = ["lớp", "lop", "lớp học", "class"];
      mappings.lop = findBestHeaderIndex(sheetHeaders, classKeywords);

      // Find schedule
      const schedKeywords = ["ca học", "lịch học", "ca hoc", "lich hoc", "schedule", "time", "ca"];
      mappings.caHoc = findBestHeaderIndex(sheetHeaders, schedKeywords);

      // Find telegram
      const teleKeywords = ["telegram", "tele", "telegram id", "chat id"];
      mappings.telegramId = findBestHeaderIndex(sheetHeaders, teleKeywords);

      // Find tuition fee
      const feeKeywords = ["học phí", "hocphi", "hoc phi", "tiền", "tiền học", "fee", "amount", "price"];
      mappings.hocPhi = findBestHeaderIndex(sheetHeaders, feeKeywords);
    } else if (target === "classes") {
      const nameKeywords = ["tên lớp", "lớp", "ten lop", "class name", "class"];
      mappings.tenLop = findBestHeaderIndex(sheetHeaders, nameKeywords);

      const schedKeywords = ["lịch học", "lich hoc", "schedule", "thời gian", "lich"];
      mappings.lichHoc = findBestHeaderIndex(sheetHeaders, schedKeywords);

      const teacherKeywords = ["giáo viên", "giảng viên", "gv", "giao vien", "teacher", "instructor"];
      mappings.maGV = findBestHeaderIndex(sheetHeaders, teacherKeywords);
    } else if (target === "songs") {
      const nameKeywords = ["tên bài hát", "bài hát", "tên bài", "ten bai hat", "song title", "song", "title"];
      mappings.tenBH = findBestHeaderIndex(sheetHeaders, nameKeywords);

      const lyricsKeywords = ["lời", "lời bài hát", "loi bai hat", "lyrics", "nội dung", "mã cảm âm", "hợp âm"];
      mappings.loiBH = findBestHeaderIndex(sheetHeaders, lyricsKeywords);

      const catKeywords = ["phân loại", "thể loại", "loại", "category", "type"];
      mappings.phanLoai = findBestHeaderIndex(sheetHeaders, catKeywords);
    }

    setColumnMappings(mappings);
  };

  // When sync target changes, re-run auto-detector
  useEffect(() => {
    if (headers.length > 0) {
      autoDetectMappings(headers, syncTarget);
    }
  }, [syncTarget]);

  // Handle Sheet selection change
  const handleSheetChange = async (gid: string) => {
    setSelectedSheetGid(gid);
    const found = sheetList.find((s) => String(s.sheetId) === String(gid));
    if (found && accessToken) {
      setActiveSheetTitle(found.title);
      await fetchSheetValues(accessToken, spreadsheetId, found.title);
    }
  };

  // Change individual mapping
  const handleMappingChange = (field: string, columnIndex: number) => {
    setColumnMappings(prev => ({
      ...prev,
      [field]: columnIndex
    }));
  };

  // Get Mapped Records list for preview
  const getMappedRecords = () => {
    if (rawData.length <= 1) return [];
    
    return rawData.slice(1).map(row => {
      const record: any = {};
      
      if (syncTarget === "students") {
        const tenIdx = columnMappings.tenHV;
        const sdtIdx = columnMappings.sdt;
        const lopIdx = columnMappings.lop;
        const caIdx = columnMappings.caHoc;
        const teleIdx = columnMappings.telegramId;
        const feeIdx = columnMappings.hocPhi;

        record.tenHV = tenIdx !== undefined && tenIdx >= 0 ? row[tenIdx] : "";
        record.sdt = sdtIdx !== undefined && sdtIdx >= 0 ? row[sdtIdx] : "";
        record.lop = lopIdx !== undefined && lopIdx >= 0 ? row[lopIdx] : "";
        record.caHoc = caIdx !== undefined && caIdx >= 0 ? row[caIdx] : "";
        record.telegramId = teleIdx !== undefined && teleIdx >= 0 ? row[teleIdx] : "";
        record.hocPhi = feeIdx !== undefined && feeIdx >= 0 ? row[feeIdx] : "";
      } else if (syncTarget === "classes") {
        const tenIdx = columnMappings.tenLop;
        const schedIdx = columnMappings.lichHoc;
        const gvIdx = columnMappings.maGV;

        record.tenLop = tenIdx !== undefined && tenIdx >= 0 ? row[tenIdx] : "";
        record.lichHoc = schedIdx !== undefined && schedIdx >= 0 ? row[schedIdx] : "";
        record.maGV = gvIdx !== undefined && gvIdx >= 0 ? row[gvIdx] : "";
      } else if (syncTarget === "songs") {
        const tenIdx = columnMappings.tenBH;
        const lyricsIdx = columnMappings.loiBH;
        const catIdx = columnMappings.phanLoai;

        record.tenBH = tenIdx !== undefined && tenIdx >= 0 ? row[tenIdx] : "";
        const rawLyrics = lyricsIdx !== undefined && lyricsIdx >= 0 ? row[lyricsIdx] : "";
        const phanLoaiVal = catIdx !== undefined && catIdx >= 0 ? row[catIdx] : "Hợp Âm";
        record.phanLoai = phanLoaiVal;
        record.loiBH = phanLoaiVal === "Bài Học" ? rawLyrics : stripHtmlFromLyrics(rawLyrics);
      }

      return record;
    }).filter(rec => {
      // Filter out totally empty records
      if (syncTarget === "students") return rec.tenHV && rec.sdt;
      if (syncTarget === "classes") return rec.tenLop;
      if (syncTarget === "songs") return rec.tenBH && rec.loiBH;
      return false;
    });
  };

  // Perform bulk synchronization save
  const handleSyncSubmit = async () => {
    const records = getMappedRecords();
    if (records.length === 0) {
      setSyncResult({
        success: false,
        message: "Không có bản ghi hợp lệ nào để đồng bộ. Vui lòng kiểm tra lại ánh xạ cột."
      });
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: syncTarget,
          records
        })
      });

      if (!res.ok) {
        throw new Error(`Đồng bộ thất bại: ${res.statusText}`);
      }

      const result = await res.json();
      setSyncResult({
        success: result.success,
        message: result.message || "Đồng bộ dữ liệu thành công!"
      });
      
      // Notify parent component to reload datasets
      onRefresh();
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncResult({
        success: false,
        message: err.message || "Gặp lỗi trong quá trình ghi dữ liệu."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const mappedPreviewList = getMappedRecords();

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6 text-zinc-800 select-none">
      {/* Upper header summary */}
      <div className="border-b border-zinc-100 pb-4">
        <h4 className="font-display font-extrabold text-xl text-zinc-950 flex items-center gap-2.5">
          <FileSpreadsheet className="text-emerald-600" size={24} />
          Đồng Bộ Dữ Liệu Google Sheets
        </h4>
        <p className="text-zinc-400 text-xs mt-1">
          Kết nối với Google Sheets để nhập hàng loạt thông tin học viên, lớp học và kho bài hát của bạn tự động.
        </p>
      </div>

      {/* Spreadsheet and Auth Settings Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider">
            Liên Kết / ID Spreadsheet:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="Nhập ID Google Sheet hoặc liên kết..."
              className="flex-grow bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-sky-500 font-mono"
            />
            {user && accessToken && (
              <button
                onClick={() => fetchSpreadsheetMetadata(accessToken, spreadsheetId)}
                disabled={isLoadingSheets || !spreadsheetId}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {isLoadingSheets ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                Tải lại
              </button>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 block pl-1">
            Mặc định sử dụng bảng tính của bạn: <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-sky-600 font-semibold">{spreadsheetId.substring(0, 8)}...{spreadsheetId.substring(spreadsheetId.length - 8)}</code>
          </span>
        </div>

        {/* Account Authentication section */}
        <div className="flex flex-col justify-end">
          {isAuthLoading ? (
            <div className="h-11 flex items-center justify-center">
              <RefreshCw className="animate-spin text-zinc-400" size={20} />
            </div>
          ) : !user || !accessToken ? (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2.5 transition-all border border-zinc-800"
            >
              {isLoggingIn ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <LogIn size={16} />
              )}
              Kết Nối Google Account
            </button>
          ) : (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "Google User"} className="w-8 h-8 rounded-full border border-zinc-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600 font-bold text-sm">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-zinc-950 truncate leading-tight">{user.displayName}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="text-rose-500 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connection Notice / Errors */}
      {errorLog && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800">
          <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-bold">Lỗi kết nối / xác thực:</p>
            <p className="text-xs mt-0.5 text-rose-700 font-medium leading-relaxed">{errorLog}</p>
            <p className="text-[10px] text-rose-600/80 mt-1.5 leading-normal">
              * Mẹo: Hãy chắc chắn Google Sheet có quyền đọc, và khi đăng nhập Google bạn đã tích chọn cấp quyền "Xem tất cả Trang tính Google" cho ứng dụng.
            </p>
          </div>
        </div>
      )}

      {/* Sync Control Workspace */}
      {user && accessToken && sheetList.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-zinc-100">
          
          {/* 1-Click Sync All Section */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h5 className="font-display font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                  <CheckCircle className="text-emerald-600" size={18} />
                  Đồng Bộ Nhanh Toàn Bộ Trang Tính (1-Click Sync All)
                </h5>
                <p className="text-[11px] text-emerald-800 font-medium mt-1 leading-relaxed">
                  Quét toàn bộ các Tab trong Google Sheets để tự động đồng bộ song song Học viên, Lớp học & Bài hát bằng công nghệ tự động nhận diện cột thông minh. Không cần cấu hình thủ công!
                </p>
              </div>
              <button
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 flex-shrink-0"
              >
                {isSyncingAll ? (
                  <>
                    <RefreshCw className="animate-spin" size={15} />
                    Đang đồng bộ tất cả...
                  </>
                ) : (
                  <>
                    <Database size={15} />
                    Đồng Bộ Toàn Bộ Dữ Liệu
                  </>
                )}
              </button>
            </div>

            {syncAllStatus && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-emerald-100">
                {/* Students sync status */}
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  syncAllStatus.students?.success 
                    ? "bg-white border-emerald-100 text-emerald-900" 
                    : "bg-rose-50 border-rose-100 text-rose-900"
                }`}>
                  <p className="font-bold flex items-center gap-1.5 text-zinc-950 mb-1">
                    <span className={`w-2 h-2 rounded-full ${syncAllStatus.students?.success ? "bg-emerald-500" : "bg-rose-500"}`} />
                    Bảng Học Viên
                  </p>
                  {syncAllStatus.students?.success ? (
                    <>
                      <p className="text-emerald-700 text-[11px] leading-relaxed">{syncAllStatus.students.message}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 font-mono">Tổng: {syncAllStatus.students.count} dòng</p>
                    </>
                  ) : (
                    <p className="text-rose-600 text-[11px] leading-relaxed font-medium">Lỗi: {syncAllStatus.students?.error || "Không thể đồng bộ"}</p>
                  )}
                </div>

                {/* Classes sync status */}
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  syncAllStatus.classes?.success 
                    ? "bg-white border-emerald-100 text-emerald-900" 
                    : "bg-rose-50 border-rose-100 text-rose-900"
                }`}>
                  <p className="font-bold flex items-center gap-1.5 text-zinc-950 mb-1">
                    <span className={`w-2 h-2 rounded-full ${syncAllStatus.classes?.success ? "bg-emerald-500" : "bg-rose-500"}`} />
                    Bảng Lớp Học
                  </p>
                  {syncAllStatus.classes?.success ? (
                    <>
                      <p className="text-emerald-700 text-[11px] leading-relaxed">{syncAllStatus.classes.message}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 font-mono">Tổng: {syncAllStatus.classes.count} dòng</p>
                    </>
                  ) : (
                    <p className="text-rose-600 text-[11px] leading-relaxed font-medium">Lỗi: {syncAllStatus.classes?.error || "Không thể đồng bộ"}</p>
                  )}
                </div>

                {/* Songs sync status */}
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  syncAllStatus.songs?.success 
                    ? "bg-white border-emerald-100 text-emerald-900" 
                    : "bg-rose-50 border-rose-100 text-rose-900"
                }`}>
                  <p className="font-bold flex items-center gap-1.5 text-zinc-950 mb-1">
                    <span className={`w-2 h-2 rounded-full ${syncAllStatus.songs?.success ? "bg-emerald-500" : "bg-rose-500"}`} />
                    Bảng Kho Bài Hát
                  </p>
                  {syncAllStatus.songs?.success ? (
                    <>
                      <p className="text-emerald-700 text-[11px] leading-relaxed">{syncAllStatus.songs.message}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 font-mono">Tổng: {syncAllStatus.songs.count} dòng</p>
                    </>
                  ) : (
                    <p className="text-rose-600 text-[11px] leading-relaxed font-medium">Lỗi: {syncAllStatus.songs?.error || "Không thể đồng bộ"}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-200"></div>
            <span className="flex-shrink mx-4 text-xxs font-bold text-zinc-400 uppercase tracking-widest bg-white px-2">Hoặc cấu hình đồng bộ thủ công từng bảng</span>
            <div className="flex-grow border-t border-zinc-200"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 p-5 rounded-2xl border border-zinc-200/80">
            {/* Sheet/Tab Selection */}
            <div className="space-y-2">
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider">
                Chọn Trang Tính (Sheet Tab):
              </label>
              <select
                value={selectedSheetGid}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="w-full bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {sheetList.map((sheet) => (
                  <option key={sheet.sheetId} value={sheet.sheetId}>
                    {sheet.title} {String(sheet.sheetId) === "615025549" ? "(Bản Gốc Mặc Định)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync Destination Target */}
            <div className="space-y-2">
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider">
                Mục Tiêu Nhập Dữ Liệu:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["students", "classes", "songs"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSyncTarget(t)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                      syncTarget === t 
                        ? "bg-sky-600 border-sky-500 text-white shadow-xs" 
                        : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {t === "students" ? "Học Viên" : t === "classes" ? "Lớp Học" : "Kho Bài Hát"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column Mapping Section */}
          {headers.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <h5 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b pb-2">
                <Columns size={14} className="text-sky-500" />
                Cấu Hình Ánh Xạ Cột (Column Mapping)
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {syncTarget === "students" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Họ Tên Học Viên <span className="text-rose-500">*</span></label>
                      <select
                        value={columnMappings.tenHV !== undefined ? columnMappings.tenHV : -1}
                        onChange={(e) => handleMappingChange("tenHV", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Số Điện Thoại <span className="text-rose-500">*</span></label>
                      <select
                        value={columnMappings.sdt !== undefined ? columnMappings.sdt : -1}
                        onChange={(e) => handleMappingChange("sdt", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Tên Lớp Học</label>
                      <select
                        value={columnMappings.lop !== undefined ? columnMappings.lop : -1}
                        onChange={(e) => handleMappingChange("lop", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Lịch Học / Ca Học</label>
                      <select
                        value={columnMappings.caHoc !== undefined ? columnMappings.caHoc : -1}
                        onChange={(e) => handleMappingChange("caHoc", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Mức Học Phí (đ)</label>
                      <select
                        value={columnMappings.hocPhi !== undefined ? columnMappings.hocPhi : -1}
                        onChange={(e) => handleMappingChange("hocPhi", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Telegram Chat ID</label>
                      <select
                        value={columnMappings.telegramId !== undefined ? columnMappings.telegramId : -1}
                        onChange={(e) => handleMappingChange("telegramId", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {syncTarget === "classes" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Tên Lớp Học <span className="text-rose-500">*</span></label>
                      <select
                        value={columnMappings.tenLop !== undefined ? columnMappings.tenLop : -1}
                        onChange={(e) => handleMappingChange("tenLop", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Lịch Học / Thời Gian</label>
                      <select
                        value={columnMappings.lichHoc !== undefined ? columnMappings.lichHoc : -1}
                        onChange={(e) => handleMappingChange("lichHoc", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Mã Giáo Viên Dạy</label>
                      <select
                        value={columnMappings.maGV !== undefined ? columnMappings.maGV : -1}
                        onChange={(e) => handleMappingChange("maGV", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {syncTarget === "songs" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Tên Bài Hát <span className="text-rose-500">*</span></label>
                      <select
                        value={columnMappings.tenBH !== undefined ? columnMappings.tenBH : -1}
                        onChange={(e) => handleMappingChange("tenBH", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Nội dung Lời & Hợp âm <span className="text-rose-500">*</span></label>
                      <select
                        value={columnMappings.loiBH !== undefined ? columnMappings.loiBH : -1}
                        onChange={(e) => handleMappingChange("loiBH", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua hoặc không chọn --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-zinc-500 block">Phân Loại (Hợp Âm/Cảm Âm)</label>
                      <select
                        value={columnMappings.phanLoai !== undefined ? columnMappings.phanLoai : -1}
                        onChange={(e) => handleMappingChange("phanLoai", parseInt(e.target.value))}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-2 w-full focus:outline-none"
                      >
                        <option value={-1}>-- Bỏ qua (Mặc định: Hợp Âm) --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>Cột {i + 1}: {h}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Preview of Mapped Data */}
          {mappedPreviewList.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Database size={14} className="text-emerald-500" />
                  Xem Trước Dữ Liệu Đồng Bộ ({mappedPreviewList.length} Dòng Hợp Lệ)
                </h5>
                <button
                  onClick={handleSyncSubmit}
                  disabled={isSyncing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  Xác Nhận & Đẩy Dữ Liệu
                </button>
              </div>

              {syncResult && (
                <div className={`p-4 rounded-xl border flex gap-3 text-xs font-semibold ${
                  syncResult.success 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {syncResult.success ? (
                    <CheckCircle className="text-emerald-500 flex-shrink-0" size={16} />
                  ) : (
                    <AlertCircle className="text-rose-500 flex-shrink-0" size={16} />
                  )}
                  <span>{syncResult.message}</span>
                </div>
              )}

              <div className="border border-zinc-200 rounded-xl overflow-x-auto max-h-72 shadow-2xs">
                <table className="w-full text-center border-collapse text-xs">
                  <thead className="bg-zinc-50 border-b sticky top-0 font-bold text-zinc-500">
                    {syncTarget === "students" && (
                      <tr>
                        <th className="py-2 px-3 text-left">Họ Tên</th>
                        <th className="py-2 px-3">SĐT</th>
                        <th className="py-2 px-3">Lớp</th>
                        <th className="py-2 px-3">Ca Học</th>
                        <th className="py-2 px-3 text-right">Học Phí (đ)</th>
                      </tr>
                    )}
                    {syncTarget === "classes" && (
                      <tr>
                        <th className="py-2 px-3 text-left">Tên Lớp Học</th>
                        <th className="py-2 px-3">Lịch Trình</th>
                        <th className="py-2 px-3">Giáo Viên</th>
                      </tr>
                    )}
                    {syncTarget === "songs" && (
                      <tr>
                        <th className="py-2 px-3 text-left">Tên Bài Hát</th>
                        <th className="py-2 px-3 text-left">Trích Lời</th>
                        <th className="py-2 px-3">Loại</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                    {mappedPreviewList.slice(0, 10).map((rec, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        {syncTarget === "students" && (
                          <>
                            <td className="py-2 px-3 text-left font-bold text-zinc-950">{rec.tenHV || <span className="text-zinc-300">Rỗng</span>}</td>
                            <td className="py-2 px-3 font-mono">{rec.sdt || <span className="text-zinc-300">Rỗng</span>}</td>
                            <td className="py-2 px-3 text-zinc-500">{rec.lop || <span className="text-zinc-300">--</span>}</td>
                            <td className="py-2 px-3 text-zinc-500">{rec.caHoc || <span className="text-zinc-300">--</span>}</td>
                            <td className="py-2 px-3 text-right font-mono text-sky-600 font-semibold">
                              {rec.hocPhi ? Number(rec.hocPhi).toLocaleString("vi-VN") : "0"}đ
                            </td>
                          </>
                        )}
                        {syncTarget === "classes" && (
                          <>
                            <td className="py-2 px-3 text-left font-bold text-zinc-950">{rec.tenLop || <span className="text-zinc-300">Rỗng</span>}</td>
                            <td className="py-2 px-3 text-zinc-500">{rec.lichHoc || <span className="text-zinc-300">Rỗng</span>}</td>
                            <td className="py-2 px-3 text-zinc-500 font-mono">{rec.maGV || <span className="text-zinc-300">--</span>}</td>
                          </>
                        )}
                        {syncTarget === "songs" && (
                          <>
                            <td className="py-2 px-3 text-left font-bold text-zinc-950">{rec.tenBH || <span className="text-zinc-300">Rỗng</span>}</td>
                            <td className="py-2 px-3 text-left text-zinc-500 truncate max-w-xs font-mono">{rec.loiBH ? rec.loiBH.substring(0, 50) + "..." : <span className="text-zinc-300">Rỗng</span>}</td>
                            <td className="py-2 px-3">
                              <span className="bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-600 border border-zinc-200">
                                {rec.phanLoai || "Hợp Âm"}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mappedPreviewList.length > 10 && (
                <p className="text-[10px] text-zinc-400 text-center italic mt-1">
                  Hiển thị tối đa 10 dòng đầu tiên của tổng số {mappedPreviewList.length} bản ghi hợp lệ tìm thấy...
                </p>
              )}
            </div>
          )}

          {/* If sheet loaded but 0 rows match */}
          {mappedPreviewList.length === 0 && rawData.length > 1 && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs">
              <Info className="text-sky-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold">Không trích xuất được dòng dữ liệu hợp lệ:</span>
                <p className="mt-1 leading-relaxed">
                  Trang tính có {rawData.length - 1} dòng dữ liệu thô, nhưng không dòng nào trích xuất thành công dựa trên cấu hình ánh xạ hiện tại. Vui lòng kiểm tra lại cấu hình ánh xạ cột để đảm bảo các cột quan trọng (Họ Tên và SĐT đối với Học viên, Tên lớp đối với Lớp học, Tên bài đối với Bài hát) được chọn chính xác.
                </p>
              </div>
            </div>
          )}

          {/* Raw sheet preview */}
          {rawData.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-zinc-100">
              <h5 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Info size={14} className="text-zinc-400" />
                Xem Thô Trang Tính (First 5 Rows)
              </h5>
              <div className="border border-zinc-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-center border-collapse text-xs">
                  <thead className="bg-zinc-100 border-b font-bold text-zinc-600">
                    <tr>
                      <th className="py-2 px-3 bg-zinc-200 text-zinc-700 font-bold border-r border-zinc-300 w-10">Dòng</th>
                      {headers.map((h, i) => (
                        <th key={i} className="py-2 px-3 border-r border-zinc-200">Cột {i + 1}: {h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-medium text-zinc-600">
                    {rawData.slice(1, 6).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3 bg-zinc-50 border-r border-zinc-300 font-bold text-zinc-400 font-mono">{rowIdx + 2}</td>
                        {headers.map((_, colIdx) => (
                          <td key={colIdx} className="py-2 px-3 border-r border-zinc-100 max-w-xs truncate">{row[colIdx] || ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* When auth is not completed */}
      {(!user || !accessToken) && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <Lock size={20} />
          </div>
          <div>
            <h5 className="font-display font-bold text-sm text-zinc-900">Yêu cầu Kết Nối Google Sheets</h5>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Bạn cần kết nối tài khoản Google có quyền truy cập vào Google Sheets để đồng bộ dữ liệu. Mọi liên kết truy xuất và lưu trữ đều tuân thủ nguyên tắc bảo mật.
            </p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
          >
            {isLoggingIn ? <RefreshCw className="animate-spin" size={14} /> : <LogIn size={14} />}
            Đăng Nhập & Kết Nối Ngay
          </button>
        </div>
      )}
    </div>
  );
}
