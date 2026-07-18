import { useState, useEffect } from "react";
import {
  Guitar,
  User,
  Users,
  Compass,
  FileText,
  DollarSign,
  MessageSquare,
  Award,
  Calendar,
  LogOut,
  Mail,
  Lock,
  Plus,
  Phone,
  LogIn,
  Trash2,
  Edit2,
  FolderOpen,
  Info,
  Clock,
  Volume2,
  Flame,
  CheckCircle,
  FileCheck,
  Smartphone,
  ChevronRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  QrCode,
  AlertCircle,
  FileSpreadsheet,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Heading,
  Sparkles,
  ChevronDown,
  Search,
  Smile,
  Type,
  Copy,
  Check
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { Student, ClassRoom, Song, Teacher, Booking, Attendance, FeeReceipt, SystemSettings } from "./types";
import { fetch, stripHtmlFromLyrics } from "./lib/api";
import Metronome from "./components/Metronome";
import Tuner from "./components/Tuner";
import PerformancePortfolio from "./components/PerformancePortfolio";
import InteractiveSongView from "./components/InteractiveSongView";
import AdminDashboard from "./components/AdminDashboard";
import AdminClasses from "./components/AdminClasses";
import AdminStudents from "./components/AdminStudents";
import AdminAttendance from "./components/AdminAttendance";
import AdminSheetsSync from "./components/AdminSheetsSync";

// Simple helper for rich interactive sci-fi synthesized sound effects (Web Audio API)
const playCyberSound = (freq: number, type: OscillatorType = "sine", duration: number = 0.2) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Smooth pitch sweep or envelope for extra tech vibe
    if (type === "sine") {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + duration * 0.8);
    } else {
      osc.frequency.linearRampToValueAtTime(freq * 0.9, ctx.currentTime + duration * 0.5);
    }
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Graceful fallback if autoplay or browser block occurs
  }
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';

export default function App() {
  const [role, setRole] = useState<"welcome" | "student" | "admin">("welcome");
  const [loginTab, setLoginTab] = useState<"student" | "admin">("student");
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  
  // Student Login States
  const [studentPhone, setStudentPhone] = useState<string>("");
  const [currentStudent, setCurrentStudent] = useState<any | null>(null);
  const [isStudentLoading, setIsStudentLoading] = useState<boolean>(false);
  const [studentTab, setStudentTab] = useState<"songbook" | "practice" | "parent" | "portfolio">("songbook");
  
  // Admin Login States
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<"dashboard" | "classes" | "students" | "teachers" | "attendance" | "songs" | "fees" | "telegram" | "settings" | "sheets">("dashboard");
  const [isAdminMoreOpen, setIsAdminMoreOpen] = useState<boolean>(false);

  // Global Data catalog
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    botToken: "",
    adminChatId: "",
    bankName: "MBBank",
    bankAcc: "0071001234567",
    bankOwner: "HUYNH BA LONG"
  });

  // Student songbook state
  const [studentSongs, setStudentSongs] = useState<Song[]>([]);
  const [studentCategory, setStudentCategory] = useState<"Hợp Âm" | "Cảm Âm" | "Bài Học">("Hợp Âm");
  const [activeSongView, setActiveSongView] = useState<Song | null>(null);
  const [studentAttendanceCount, setStudentAttendanceCount] = useState<number>(0);
  const [studentAttendanceDates, setStudentAttendanceDates] = useState<string[]>([]);
  const [studentFeeHistory, setStudentFeeHistory] = useState<FeeReceipt[]>([]);

  // Admin states - Chords catalog CRUD
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [songFormTitle, setSongFormTitle] = useState<string>("");
  const [songFormCategory, setSongFormCategory] = useState<"Hợp Âm" | "Cảm Âm" | "Bài Học">("Hợp Âm");
  const [songFormLyrics, setSongFormLyrics] = useState<string>("");
  const [isAddingSong, setIsAddingSong] = useState<boolean>(false);

  // Admin states - Tuition fee collector
  const [feeStudentId, setFeeStudentId] = useState<string>("");
  const [feeAmount, setFeeAmount] = useState<string>("");
  const [feeExtra, setFeeExtra] = useState<string>("");
  const [feeNote, setFeeNote] = useState<string>("");
  const [feeReceiptHistory, setFeeReceiptHistory] = useState<FeeReceipt[]>([]);
  const [invoicePreview, setInvoicePreview] = useState<any | null>(null);

  // Admin states - Bulk Telegram notice
  const [bulkMsgType, setBulkMsgType] = useState<"all" | "class" | "individual">("all");
  const [bulkMsgTarget, setBulkMsgTarget] = useState<string>("");
  const [bulkMsgContent, setBulkMsgContent] = useState<string>("");

  // Search & Replace / Text editing utility states
  const [editorSearchQuery, setEditorSearchQuery] = useState<string>("");
  const [editorReplaceQuery, setEditorReplaceQuery] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const [songEditorSearchQuery, setSongEditorSearchQuery] = useState<string>("");
  const [songEditorReplaceQuery, setSongEditorReplaceQuery] = useState<string>("");
  const [isSongCopied, setIsSongCopied] = useState<boolean>(false);

  const copySongToClipboard = () => {
    navigator.clipboard.writeText(songFormLyrics).then(() => {
      setIsSongCopied(true);
      setTimeout(() => setIsSongCopied(false), 2000);
    });
  };

  const handleSongSearchReplace = (all: boolean = true) => {
    if (!songEditorSearchQuery) return;
    const textarea = document.getElementById("song-lyrics-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const text = textarea.value;
    let newValue = "";
    if (all) {
      const escapedSearch = songEditorSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'g');
      newValue = text.replace(regex, songEditorReplaceQuery);
    } else {
      const index = text.indexOf(songEditorSearchQuery);
      if (index !== -1) {
        newValue = text.substring(0, index) + songEditorReplaceQuery + text.substring(index + songEditorSearchQuery.length);
      } else {
        newValue = text;
      }
    }
    setSongFormLyrics(newValue);
  };

  const handleSearchReplace = (all: boolean = true) => {
    if (!editorSearchQuery) return;
    const textarea = document.getElementById("bulk-message-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const text = textarea.value;
    let newValue = "";
    if (all) {
      const escapedSearch = editorSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'g');
      newValue = text.replace(regex, editorReplaceQuery);
    } else {
      const index = text.indexOf(editorSearchQuery);
      if (index !== -1) {
        newValue = text.substring(0, index) + editorReplaceQuery + text.substring(index + editorSearchQuery.length);
      } else {
        newValue = text;
      }
    }
    setBulkMsgContent(newValue);
  };

  const changeCase = (type: "upper" | "lower" | "title") => {
    const textarea = document.getElementById("bulk-message-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    if (!selectedText) return;

    let replacement = "";
    if (type === "upper") {
      replacement = selectedText.toUpperCase();
    } else if (type === "lower") {
      replacement = selectedText.toLowerCase();
    } else {
      replacement = selectedText.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setBulkMsgContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 0);
  };

  const changeSongCase = (type: "upper" | "lower" | "title") => {
    const textarea = document.getElementById("song-lyrics-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    if (!selectedText) return;

    let replacement = "";
    if (type === "upper") {
      replacement = selectedText.toUpperCase();
    } else if (type === "lower") {
      replacement = selectedText.toLowerCase();
    } else {
      replacement = selectedText.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setSongFormLyrics(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 0);
  };

  const convertUnaccentedNotes = () => {
    const textarea = document.getElementById("song-lyrics-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const text = textarea.value;
    if (!text) return;

    // Match unaccented notes using unicode-aware boundary checks
    const convertRegex = /(?<!\p{L}|\p{N})(Sol#|Solb|Do#|Re#|Reb|Sol|Re|Do)([0-9]?)(?!\p{L}|\p{N})/gui;

    const mapNote = (note: string) => {
      const lower = note.toLowerCase();
      if (lower === "do") return note[0] === "D" ? (note[1] === "O" ? "ĐÔ" : "Đô") : "đô";
      if (lower === "re") return note[0] === "R" ? (note[1] === "E" ? "RÊ" : "Rê") : "rê";
      if (lower === "do#") return note[0] === "D" ? (note[1] === "O" ? "ĐÔ#" : "Đô#") : "đô#";
      if (lower === "re#") return note[0] === "R" ? (note[1] === "E" ? "RÊ#" : "Rê#") : "rê#";
      if (lower === "reb") return note[0] === "R" ? (note[1] === "E" ? "RÊ♭" : "Rê♭") : "rê♭";
      if (lower === "sol#") return note[0] === "S" ? (note[1] === "O" && note[2] === "L" ? "SOL#" : "Sol#") : "sol#";
      if (lower === "solb") return note[0] === "S" ? (note[1] === "O" && note[2] === "L" ? "SOL♭" : "Sol♭") : "sol♭";
      return note;
    };

    const newValue = text.replace(convertRegex, (match, note, octave) => {
      const convertedNote = mapNote(note);
      return convertedNote + (octave || "");
    });

    if (newValue === text) {
      alert("Nội dung đã được chuẩn hóa hoặc không phát hiện cảm âm cần chuyển đổi.");
      return;
    }

    setSongFormLyrics(newValue);
    alert("Đã tự động chuyển đổi định dạng cảm âm thông minh thành công!");
  };

  const insertTextAtCursor = (insertedText: string) => {
    const textarea = document.getElementById("bulk-message-textarea") as HTMLTextAreaElement;
    if (!textarea) {
      setBulkMsgContent((prev) => prev + insertedText);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newValue = text.substring(0, start) + insertedText + text.substring(end);
    setBulkMsgContent(newValue);

    setTimeout(() => {
      textarea.focus();
      const cursorPosition = start + insertedText.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bulkMsgContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const applyFormatting = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById("bulk-message-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = tagOpen + selectedText + tagClose;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setBulkMsgContent(newValue);

    // Put focus back and select/place cursor
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        const newStart = start + tagOpen.length;
        const newEnd = newStart + selectedText.length;
        textarea.setSelectionRange(newStart, newEnd);
      } else {
        const cursorPosition = start + tagOpen.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const applySongFormatting = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById("song-lyrics-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = tagOpen + selectedText + tagClose;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setSongFormLyrics(newValue);

    // Put focus back and select/place cursor
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        const newStart = start + tagOpen.length;
        const newEnd = newStart + selectedText.length;
        textarea.setSelectionRange(newStart, newEnd);
      } else {
        const cursorPosition = start + tagOpen.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const insertSongTextAtCursor = (insertedText: string) => {
    const textarea = document.getElementById("song-lyrics-textarea") as HTMLTextAreaElement;
    if (!textarea) {
      setSongFormLyrics((prev) => prev + insertedText);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newValue = text.substring(0, start) + insertedText + text.substring(end);
    setSongFormLyrics(newValue);

    setTimeout(() => {
      textarea.focus();
      const cursorPosition = start + insertedText.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  // Admin states - Settings
  const [setBotToken, setSetBotToken] = useState<string>("");
  const [setAdminId, setSetAdminId] = useState<string>("");
  const [setBankName, setSetBankName] = useState<string>("MBBank");
  const [setBankAcc, setSetBankAcc] = useState<string>("");
  const [setBankOwner, setSetBankOwner] = useState<string>("");
  const [setZaloOaId, setSetZaloOaId] = useState<string>("");
  const [setZaloAccessToken, setSetZaloAccessToken] = useState<string>("");
  const [setZaloActive, setSetZaloActive] = useState<boolean>(true);
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string>(() => localStorage.getItem("gas_web_app_url") || "");

  // Admin states - Teachers list
  const [isAddingTeacher, setIsAddingTeacher] = useState<boolean>(false);
  const [editTeacherId, setEditTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("");
  const [teacherEmail, setTeacherEmail] = useState<string>("");
  const [teacherSalary, setTeacherSalary] = useState<string>("");
  const [teacherSdt, setTeacherSdt] = useState<string>("");
  const [payrollReport, setPayrollReport] = useState<any[]>([]);

  // Modals status triggers
  const [showTelegramGuide, setShowTelegramGuide] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    // Override window.alert to capture native alerts as beautiful non-blocking toasts
    const originalAlert = window.alert;
    window.alert = (msg: string) => {
      let type: "success" | "error" | "info" = "info";
      const lowercaseMsg = String(msg).toLowerCase();
      if (
        lowercaseMsg.includes("thành công") || 
        lowercaseMsg.includes("hoàn tất") || 
        lowercaseMsg.includes("ok") || 
        lowercaseMsg.includes("gửi tin") ||
        lowercaseMsg.includes("kích hoạt")
      ) {
        type = "success";
      } else if (
        lowercaseMsg.includes("lỗi") || 
        lowercaseMsg.includes("thất bại") || 
        lowercaseMsg.includes("không") || 
        lowercaseMsg.includes("chưa") || 
        lowercaseMsg.includes("vui lòng")
      ) {
        type = "error";
      }
      setToast({ message: msg, type });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      const stRes = await fetch(`${API_BASE}/api/students`);
      if (stRes.ok) setStudents(await stRes.json());

      const clRes = await fetch(`${API_BASE}/api/classes`);
      if (clRes.ok) setClasses(await clRes.json());

      const sgRes = await fetch(`${API_BASE}/api/songs`);
      if (sgRes.ok) setSongs(await sgRes.json());

      const tcRes = await fetch(`${API_BASE}/api/teachers`);
      if (tcRes.ok) setTeachers(await tcRes.json());

      const seRes = await fetch(`${API_BASE}/api/settings`);
      if (seRes.ok) {
        const s = await seRes.json();
        setSettings(s);
        setSetBotToken(s.botToken || "");
        setSetAdminId(s.adminChatId || "");
        setSetBankName(s.bankName || "MBBank");
        setSetBankAcc(s.bankAcc || "");
        setSetBankOwner(s.bankOwner || "");
        setSetZaloOaId(s.zaloOaId || "");
        setSetZaloAccessToken(s.zaloAccessToken || "");
        setSetZaloActive(s.zaloActive !== false);
      }
    } catch (e) {
      console.error("Failed to load catalogs", e);
    }
  };

  // Student specific data pulling
  const fetchStudentData = async (maHV: string) => {
    try {
      const songsRes = await fetch(`${API_BASE}/api/students/${maHV}/songs`);
      if (songsRes.ok) setStudentSongs(await songsRes.json());

      const detailsRes = await fetch(`${API_BASE}/api/students/${maHV}/details`);
      if (detailsRes.ok) {
        const d = await detailsRes.json();
        setStudentAttendanceCount(d.attendanceCount);
        setStudentAttendanceDates(d.attendanceDates);
        setStudentFeeHistory(d.fees);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStudentLogin = async () => {
    if (!studentPhone) {
      alert("Vui lòng nhập Số Điện Thoại!");
      return;
    }
    setIsStudentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/students/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdt: studentPhone })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentStudent(data);
          setRole("student");
          setStudentTab("songbook");
          fetchStudentData(data.maHV);
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsStudentLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === "Vietnam@123") {
      setIsAdminLoggedIn(true);
      setRole("admin");
      setAdminTab("dashboard");
      fetchGlobalData();
      fetchFeeHistory();
    } else {
      alert("Mật khẩu không chính xác!");
    }
  };

  const handleAdminLogout = () => {
    setAdminPassword("");
    setIsAdminLoggedIn(false);
    setRole("welcome");
  };

  // Student specific song bookmark filtering
  const getFilteredStudentSongs = () => {
    return studentSongs.filter((s) => s.phanLoai === studentCategory);
  };

  // Admin Tuition Receipts
  const fetchFeeHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/fees`);
      if (res.ok) setFeeReceiptHistory(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleFeeStudentChange = (maHV: string) => {
    setFeeStudentId(maHV);
    const st = students.find((s) => s.maHV === maHV);
    if (st && st.hocPhi) {
      setFeeAmount(st.hocPhi);
    } else {
      setFeeAmount("");
    }
    setFeeExtra("");
    setFeeNote("");
  };

  const handleSaveFeeReceipt = async () => {
    const student = students.find((s) => s.maHV === feeStudentId);
    if (!student || !feeAmount) {
      alert("Vui lòng chọn Học Viên và nhập Số Tiền!");
      return;
    }

    const baseVal = parseFloat(feeAmount) || 0;
    const extraVal = parseFloat(feeExtra) || 0;
    const total = baseVal + extraVal;

    let finalNote = `Học phí cơ bản: ${baseVal.toLocaleString("vi-VN")}đ`;
    if (extraVal > 0) finalNote += ` | Phụ thu phát sinh: ${extraVal.toLocaleString("vi-VN")}đ`;
    if (feeNote) finalNote += ` - Ghi chú: ${feeNote}`;

    try {
      const res = await fetch(`${API_BASE}/api/fees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maHV: student.maHV,
          tenHV: student.tenHV,
          soTien: total,
          ghiChu: finalNote
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setInvoicePreview(data);
        setFeeStudentId("");
        setFeeAmount("");
        setFeeExtra("");
        setFeeNote("");
        fetchFeeHistory();
      }
    } catch (e) {
      alert("Giao dịch thất bại.");
    }
  };

  // Admin Songs CRUD methods
  const handleSaveSongForm = async () => {
    if (!songFormTitle || !songFormLyrics) {
      alert("Vui lòng điền đủ Tên Bài Hát và Lời!");
      return;
    }

    const cleanLyrics = songFormCategory === "Bài Học" ? songFormLyrics : stripHtmlFromLyrics(songFormLyrics);

    const payload = {
      tenBH: songFormTitle,
      loiBH: cleanLyrics,
      phanLoai: songFormCategory
    };

    const url = editingSong ? `/api/songs/${editingSong.maBH}` : "/api/songs";
    const method = editingSong ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingSong ? "Cập nhật bài hát thành công!" : "Thêm bài hát mới thành công!");
        resetSongForm();
        fetchGlobalData();
      }
    } catch (e) {
      alert("Lưu bài hát thất bại.");
    }
  };

  const handleEditSongInit = (song: Song) => {
    setEditingSong(song);
    setSongFormTitle(song.tenBH);
    setSongFormCategory(song.phanLoai);
    const lyrics = song.phanLoai === "Bài Học" ? song.loiBH : stripHtmlFromLyrics(song.loiBH);
    setSongFormLyrics(lyrics);
    setIsAddingSong(true);
  };

  const handleDeleteSong = async (maBH: string) => {
    if (!confirm("Bạn muốn xóa bài hát này ra khỏi kho?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${maBH}`, { method: "DELETE" });
      if (res.ok) {
        alert("Đã xóa bài hát khỏi kho!");
        fetchGlobalData();
      }
    } catch (e) {
      alert("Xóa bài hát lỗi.");
    }
  };

  const resetSongForm = () => {
    setEditingSong(null);
    setSongFormTitle("");
    setSongFormCategory("Hợp Âm");
    setSongFormLyrics("");
    setIsAddingSong(false);
  };

  // Admin Bulk notifications sending simulation
  const handleSendBulkMessage = async () => {
    if (!bulkMsgContent) {
      alert("Nhập nội dung thông điệp cần gửi!");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/reports/bulk-telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: bulkMsgType,
          target: bulkMsgTarget,
          message: bulkMsgContent
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setBulkMsgContent("");
      }
    } catch (e) {
      alert("Gửi hàng loạt lỗi.");
    }
  };

  // Save Settings panel
  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: setBotToken,
          adminChatId: setAdminId,
          bankName: setBankName,
          bankAcc: setBankAcc,
          bankOwner: setBankOwner,
          zaloOaId: setZaloOaId,
          zaloAccessToken: setZaloAccessToken,
          zaloActive: setZaloActive
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchGlobalData();
      }
    } catch (e) {
      alert("Lưu cấu hình lỗi.");
    }
  };

  const handleActiveAutoScheduler = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/scheduler`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      }
    } catch (e) {
      alert("Lỗi máy chủ.");
    }
  };

  // Admin Payroll calculators
  const fetchPayrollReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/payroll`);
      if (res.ok) setPayrollReport(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTeacher = async () => {
    if (!teacherName || !teacherEmail || !teacherSalary) {
      alert("Vui lòng nhập đầy đủ họ tên, email và mức lương!");
      return;
    }

    const payload = {
      tenGV: teacherName,
      email: teacherEmail,
      luongCoBan: teacherSalary,
      sdt: teacherSdt
    };

    const url = editTeacherId ? `/api/teachers/${editTeacherId}` : "/api/teachers";
    const method = editTeacherId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editTeacherId ? "Cập nhật thành công!" : "Tạo giáo viên thành công!");
        resetTeacherForm();
        fetchGlobalData();
        fetchPayrollReport();
      }
    } catch (e) {
      alert("Lưu lỗi.");
    }
  };

  const handleEditTeacherInit = (t: Teacher) => {
    setEditTeacherId(t.maGV);
    setTeacherName(t.tenGV);
    setTeacherEmail(t.email);
    setTeacherSalary(t.luongCoBan.toString());
    setTeacherSdt(t.sdt || "");
    setIsAddingTeacher(true);
  };

  const handleDeleteTeacher = async (maGV: string) => {
    if (!confirm("Bạn muốn xóa hồ sơ giáo viên này?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/teachers/${maGV}`, { method: "DELETE" });
      if (res.ok) {
        alert("Đã xóa giáo viên thành công!");
        fetchGlobalData();
        fetchPayrollReport();
      }
    } catch (e) {
      alert("Xóa lỗi.");
    }
  };

  const resetTeacherForm = () => {
    setEditTeacherId(null);
    setTeacherName("");
    setTeacherEmail("");
    setTeacherSalary("");
    setTeacherSdt("");
    setIsAddingTeacher(false);
  };

  const handleSendZaloSalary = async (p: any) => {
    const teacherObj = teachers.find(t => t.maGV === p.maGV);
    const phone = teacherObj?.sdt || "";
    
    if (!phone) {
      alert(`Giáo viên ${p.tenGV} chưa được cấu hình Số điện thoại! Vui lòng chỉnh sửa hồ sơ giáo viên để thêm Số điện thoại trước khi gửi.`);
      return;
    }

    const messageText = `🎶 [LỚP NHẠC HUỲNH LONG] - THÔNG BÁO LƯƠNG GIẢNG VIÊN 🎶\n` +
      `-------------------------------------------\n` +
      `Kính gửi Thầy/Cô ${p.tenGV},\n\n` +
      `Hệ thống xin gửi bảng kê chi tiết lương tháng này như sau:\n` +
      `- Mức lương thỏa thuận: ${p.luongCoBan.toLocaleString("vi-VN")}đ / buổi\n` +
      `- Số buổi đứng lớp: ${p.soBuoiDay} buổi\n` +
      `- Lượt học viên check-in: ${p.soLuotHocVien} lượt\n` +
      `👉 Tổng lương thực nhận: ${p.tongLuong.toLocaleString("vi-VN")} VNĐ\n\n` +
      `Học viện đã hoàn tất đối soát. Vui lòng phản hồi nếu có bất kỳ thắc mắc nào. Trân trọng cảm ơn sự cống hiến của Thầy/Cô!`;

    const confirmSend = confirm(`Bạn muốn gửi tin nhắn Zalo thông báo lương cho Thầy/Cô ${p.tenGV} (${phone})?\n\nNội dung tin nhắn:\n${messageText}`);
    if (!confirmSend) return;

    try {
      const res = await fetch(`${API_BASE}/api/teachers/zalo-salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maGV: p.maGV,
          message: messageText
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      } else {
        alert("Gửi Zalo thất bại. Vui lòng kiểm tra cấu hình Zalo OA.");
      }
    } catch (e) {
      console.error(e);
      alert("Đã xảy ra lỗi khi gửi tin nhắn Zalo.");
    }
  };

  // Mock parenting attendance line chart metrics
  const getAttendanceChartData = () => {
    const monthlyCheckIns = new Array(12).fill(0);
    studentAttendanceDates.forEach((record) => {
      const parts = record.split(" ")[0].split("/");
      if (parts.length === 3) {
        const monthIdx = parseInt(parts[1]) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyCheckIns[monthIdx]++;
        }
      }
    });

    const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
    return months.map((m, idx) => ({
      name: m,
      "Số buổi": monthlyCheckIns[idx]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-[#05070f] text-slate-100 transition-colors duration-500 relative overflow-x-hidden">
      {/* Universal Cyberpunk Laser Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(28,133,166,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(28,133,166,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none z-0" />
      
      {/* Floating Ambient Spheres */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-[#1c85a6]/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#f05a28]/5 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* 1. WELCOME OR ROLE SELECT WINDOW */}
      {role === "welcome" && (
        <div className="container mx-auto min-h-screen flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden select-none z-10">
          
          {/* Cyberpunk Laser Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(28,133,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(28,133,166,0.05)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
          
          {/* Neon Floating Ambient Spheres */}
          <div className="absolute top-10 left-1/4 w-80 h-80 bg-[#1c85a6]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#f05a28]/10 rounded-full blur-[130px] animate-pulse duration-[8000ms] pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-64 h-64 bg-[#f9a01b]/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Glowing Digital Waveforms (Bottom Background) */}
          <div className="absolute bottom-0 inset-x-0 h-32 opacity-10 bg-[radial-gradient(circle_at_bottom,rgba(28,133,166,0.3),transparent_70%)] pointer-events-none" />

          {/* Premium Sci-Fi Cyber Deck Card */}
          <div className="bg-slate-900/80 backdrop-blur-2xl border-2 border-[#1c85a6]/30 p-8 rounded-[40px] shadow-[0_0_50px_rgba(28,133,166,0.15)] text-center max-w-sm w-full relative z-10 transition-all duration-500 hover:border-[#1c85a6]/50 hover:shadow-[0_0_60px_rgba(28,133,166,0.25)]">
            
            {/* Hologram System Status Header */}
            <div className="flex justify-between items-center text-[9px] font-mono text-sky-400/80 mb-6 border-b border-[#1c85a6]/10 pb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1c85a6] animate-ping" />
                SYS STATUS: ONLINE
              </span>
              <span>PORT: 3000 // CORE: V8</span>
            </div>

            {/* Glowing Cyber Instrument Orb */}
            <div className="mb-6 relative inline-flex items-center justify-center p-5 bg-gradient-to-tr from-[#1c85a6] via-[#f9a01b] to-[#f05a28] text-white rounded-3xl shadow-lg shadow-[#1c85a6]/20 transform hover:rotate-6 transition-transform cursor-pointer group">
              <div className="absolute inset-0 bg-[#1c85a6] opacity-0 group-hover:opacity-30 rounded-3xl blur-md transition-opacity" />
              <Guitar size={44} className="group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <h1 className="font-display font-black text-3xl tracking-tight mb-1 bg-gradient-to-r from-[#1c85a6] via-[#f9a01b] to-[#f05a28] bg-clip-text text-transparent filter drop-shadow-[0_2px_8px_rgba(28,133,166,0.3)]">
              Lớp Nhạc Huỳnh Long
            </h1>
            
            <p className="font-mono text-[9px] font-bold tracking-[0.25em] mb-6 text-sky-400/90 flex items-center justify-center gap-1">
              <span>[</span> CYBER-ACOUSTICS CONSOLE <span>]</span>
            </p>

            {/* INTERACTIVE CYBER PIANO KEYBOARD SECTION */}
            <div className="mb-6 bg-slate-950/90 border border-[#1c85a6]/20 rounded-2xl p-3 shadow-inner">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[9px] font-mono text-[#1c85a6]/70 tracking-wider">CYBER PIANO DECK</span>
                <span className="text-[8px] font-mono text-[#f9a01b]/70 animate-pulse">TAP TO PLAY SOUNDS</span>
              </div>
              <div className="relative h-16 w-full flex bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                {/* 7 White Keys */}
                {[
                  { note: "C4", freq: 261.63 },
                  { note: "D4", freq: 293.66 },
                  { note: "E4", freq: 329.63 },
                  { note: "F4", freq: 349.23 },
                  { note: "G4", freq: 392.00 },
                  { note: "A4", freq: 440.00 },
                  { note: "B4", freq: 493.88 },
                ].map((key, i) => (
                  <button
                    key={key.note}
                    type="button"
                    onClick={() => playCyberSound(key.freq, "sine", 0.35)}
                    onMouseEnter={() => playCyberSound(key.freq, "sine", 0.2)}
                    className="flex-1 bg-gradient-to-b from-slate-800 to-slate-950 border-r border-slate-900 last:border-r-0 h-full relative group cursor-pointer transition-all hover:to-[#1c85a6]/10"
                  >
                    <span className="absolute bottom-1 inset-x-0 text-[8px] font-mono text-slate-500 group-hover:text-[#1c85a6] transition-colors">
                      {key.note}
                    </span>
                    <div className="absolute inset-0 bg-[#1c85a6]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}

                {/* 5 Overlapping Black Keys (positioned absolutely) */}
                {[
                  { note: "C#4", freq: 277.18, left: "10.5%" },
                  { note: "D#4", freq: 311.13, left: "24.5%" },
                  { note: "F#4", freq: 369.99, left: "53.5%" },
                  { note: "G#4", freq: 415.30, left: "67.5%" },
                  { note: "A#4", freq: 466.16, left: "81.5%" },
                ].map((bKey) => (
                  <button
                    key={bKey.note}
                    type="button"
                    onClick={() => playCyberSound(bKey.freq, "triangle", 0.35)}
                    onMouseEnter={() => playCyberSound(bKey.freq, "triangle", 0.2)}
                    style={{ left: bKey.left }}
                    className="absolute top-0 w-[10%] h-[60%] bg-slate-950 border border-[#1c85a6]/30 rounded-b-md shadow-md z-20 cursor-pointer hover:bg-amber-950 hover:border-[#f9a01b] transition-all flex items-end justify-center pb-1 group"
                  >
                    <span className="text-[6px] font-mono text-[#f9a01b]/80 group-hover:text-[#f9a01b]">
                      #
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* INTERACTIVE LASER GUITAR STRINGS SECTION */}
            <div className="mb-8 bg-slate-950/90 border border-[#f05a28]/20 rounded-2xl p-3 shadow-inner">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[9px] font-mono text-[#f9a01b]/70 tracking-wider">LASER STRUM STRINGS</span>
                <span className="text-[8px] font-mono text-[#1c85a6]/70 animate-pulse">STRUM TO PLUCK</span>
              </div>
              <div className="flex flex-col gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                {[
                  { note: "E2", freq: 82.41, color: "bg-red-500/40 shadow-red-500/50" },
                  { note: "A2", freq: 110.00, color: "bg-orange-500/40 shadow-orange-500/50" },
                  { note: "D3", freq: 146.83, color: "bg-yellow-500/40 shadow-yellow-500/50" },
                  { note: "G3", freq: 196.00, color: "bg-green-500/40 shadow-green-500/50" },
                  { note: "B3", freq: 246.94, color: "bg-cyan-500/40 shadow-cyan-500/50" },
                  { note: "E4", freq: 329.63, color: "bg-[#f05a28]/40 shadow-[#f05a28]/50" },
                ].map((str, index) => (
                  <div
                    key={index}
                    onMouseEnter={() => playCyberSound(str.freq, "sawtooth", 0.4)}
                    className="h-1.5 relative w-full flex items-center group cursor-pointer"
                  >
                    {/* Glowing String Wire */}
                    <div className={`w-full h-[2px] rounded-full transition-all duration-150 ${str.color} shadow-[0_0_8px_currentColor] group-hover:h-[4px] group-hover:bg-white`} />
                    {/* String label on side */}
                    <span className="absolute -left-1 text-[7px] font-mono text-slate-500 group-hover:text-white transition-colors">
                      {str.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Glowing System Activation Button */}
            <button
              onClick={() => {
                setLoginTab("student");
                setIsLoginOpen(true);
                playCyberSound(600, "sine", 0.15);
              }}
              className="w-full bg-gradient-to-r from-[#1c85a6] via-[#f9a01b] to-[#f05a28] hover:brightness-110 text-white font-display font-black text-xs py-4 px-6 rounded-2xl tracking-widest uppercase shadow-lg shadow-[#1c85a6]/20 cursor-pointer flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn size={18} className="animate-pulse text-white" />
              <span>KÍCH HOẠT HỆ THỐNG</span>
            </button>

            <button
              onClick={() => {
                setShowTelegramGuide(true);
                playCyberSound(450, "sine", 0.1);
              }}
              className="w-full text-slate-500 hover:text-[#1c85a6] text-xxs underline mt-6 cursor-pointer font-bold tracking-wide transition-colors"
            >
              Hướng dẫn đăng ký Telegram nhận thông báo
            </button>
          </div>

          <div className="text-slate-500 text-center text-[10px] mt-8 leading-normal font-bold tracking-wide z-10 bg-slate-950/60 px-4 py-2 rounded-full backdrop-blur-md border border-[#1c85a6]/10 shadow-lg">
            Phiên bản 8.0 Node.js • Hỗ trợ Metronome, Pitch Tuner, Camera Video Capture &amp; VietQR
          </div>

          {/* Bottom Sheet Slide-Up Modal with High Tech Dark Aesthetic */}
          <div 
            className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md transition-all duration-300 flex items-end justify-center ${
              isLoginOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => {
              setIsLoginOpen(false);
              playCyberSound(300, "sine", 0.15);
            }}
          >
            {/* Sheet Container */}
            <div
              className={`bg-slate-950 w-full max-w-md rounded-t-[40px] border-t-2 border-[#1c85a6]/40 shadow-[0_-15px_45px_rgba(28,133,166,0.3)] transition-transform duration-300 ease-out transform pb-10 ${
                isLoginOpen ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle Indicator */}
              <div 
                className="py-4 cursor-pointer group" 
                onClick={() => {
                  setIsLoginOpen(false);
                  playCyberSound(300, "sine", 0.15);
                }}
                title="Vuốt hoặc click để đóng"
              >
                <div className="w-16 h-1 bg-gradient-to-r from-[#1c85a6] to-[#f05a28] rounded-full mx-auto opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Title Header with branded sunset gradient style */}
              <div className="px-6 pb-5 text-center">
                <h2 className="font-display font-black text-2xl bg-gradient-to-r from-[#1c85a6] via-[#f9a01b] to-[#f05a28] bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(28,133,166,0.3)]">
                  CHÀO MỪNG TRỞ LẠI
                </h2>

              </div>

              {/* Vibrant Tab Selector */}
              <div className="grid grid-cols-2 bg-slate-900 p-1.5 rounded-2xl mx-6 mb-5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab("student");
                    playCyberSound(500, "sine", 0.1);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    loginTab === "student"
                      ? "bg-gradient-to-r from-[#1c85a6] to-sky-700 text-white shadow-md shadow-[#1c85a6]/30 font-black"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <User size={14} />
                  <span>HỌC VIÊN</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab("admin");
                    playCyberSound(650, "sine", 0.1);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    loginTab === "admin"
                      ? "bg-gradient-to-r from-[#f9a01b] to-[#f05a28] text-white shadow-md shadow-[#f05a28]/30 font-black"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Lock size={14} />
                  <span>QUẢN TRỊ</span>
                </button>
              </div>

              {/* Modal Body & Inputs with glowing rings */}
              <div>
                {loginTab === "student" ? (
                  /* Trigger Student login */
                  <div className="space-y-4 px-6 text-left animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="block text-xxs font-black text-sky-400 uppercase tracking-wider pl-1 font-mono">
                        Số Điện Thoại Học Viên
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500">
                          <Phone size={16} />
                        </span>
                        <input
                          type="tel"
                          value={studentPhone}
                          onChange={(e) => setStudentPhone(e.target.value)}
                          placeholder="Ví dụ: 0912345678"
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#1c85a6] focus:ring-4 focus:ring-[#1c85a6]/20 focus:bg-slate-900/90 transition-all shadow-inner"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-slate-500 font-mono">GỢI Ý KẾT NỐI:</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setStudentPhone("0912345678");
                            playCyberSound(400, "sine", 0.08);
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg transition-all font-mono"
                        >
                          0912345678
                        </button>
                        <button
                          onClick={() => {
                            setStudentPhone("0987654321");
                            playCyberSound(400, "sine", 0.08);
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg transition-all font-mono"
                        >
                          0987654321
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleStudentLogin();
                        playCyberSound(800, "sine", 0.25);
                      }}
                      disabled={isStudentLoading}
                      className="w-full bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-500 hover:to-indigo-600 text-slate-950 font-display font-black text-xs py-4 rounded-2xl tracking-widest uppercase cursor-pointer shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5 transition-all mt-4 transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <User size={16} />
                      {isStudentLoading ? "KẾT NỐI..." : "ĐĂNG NHẬP HỌC VIÊN"}
                    </button>
                  </div>
                ) : (
                  /* Trigger Admin login */
                  <div className="space-y-4 px-6 text-left animate-fade-in">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center pr-1">
                        <label className="block text-xxs font-black text-[#f9a01b] uppercase tracking-wider pl-1 font-mono">
                          MẬT MÃ QUẢN TRỊ
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            alert("Vui lòng liên hệ Thầy Huỳnh Long để lấy lại hoặc đổi mật khẩu quản lý!");
                            playCyberSound(300, "sine", 0.2);
                          }}
                          className="text-[10px] text-[#f9a01b] hover:text-[#f05a28] font-bold transition-colors cursor-pointer font-mono"
                        >
                          QUÊN MẬT KHẨU?
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#f9a01b]">
                          <Lock size={16} />
                        </span>
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Mã khóa truy cập..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#f9a01b] focus:ring-4 focus:ring-[#f9a01b]/20 focus:bg-slate-900/90 transition-all shadow-inner"
                        />
                      </div>
                    </div>



                    <button
                      onClick={() => {
                        handleAdminLogin();
                        playCyberSound(900, "sine", 0.25);
                      }}
                      className="w-full bg-gradient-to-r from-[#f9a01b] to-[#f05a28] hover:brightness-110 text-white font-display font-black text-xs py-4 rounded-2xl tracking-widest uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all mt-4 shadow-lg shadow-[#f05a28]/10 transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Lock size={14} />
                      KÍCH HOẠT QUẢN TRỊ
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENT VIEW PANEL */}
      {role === "student" && currentStudent && (
        <div className="container mx-auto py-6 px-4 pb-24 md:pb-6 relative z-10 animate-fade-in text-slate-150">
          
          {/* Mobile Top App Bar */}
          <div className="md:hidden sticky top-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex justify-between items-center z-40 -mx-4 -mt-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-indigo-600 text-slate-950 border border-cyan-300 font-black rounded-full flex items-center justify-center text-xs shadow-md shadow-cyan-500/20">
                {currentStudent.tenHV.charAt(0)}
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 block font-mono">HỌC VIÊN</span>
                <span className="text-xs font-black text-slate-200 tracking-wide truncate max-w-[130px] block">{currentStudent.tenHV}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentStudent.streak > 0 && (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-2.5 py-0.5 font-bold font-mono text-[10px] shadow-sm animate-pulse">
                  <Flame size={12} className="text-amber-400 fill-amber-500" />
                  <span>{currentStudent.streak}d</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  setRole("welcome");
                  playCyberSound(400, "sine", 0.15);
                }}
                className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Màn hình chính"
              >
                <Compass size={14} />
              </button>
            </div>
          </div>

          {/* Desktop/Tablet Top Bar */}
          <div className="hidden md:flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setRole("welcome");
                playCyberSound(400, "sine", 0.15);
              }}
              className="px-4 py-2.5 bg-slate-900/80 border border-cyan-500/30 text-cyan-400 rounded-full text-xs font-black hover:bg-cyan-500 hover:text-slate-950 transition-all cursor-pointer shadow-lg shadow-cyan-500/10 hover:scale-105 active:scale-95 font-mono uppercase tracking-wider"
            >
              ← Màn hình chính
            </button>
            
            {currentStudent.streak > 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 rounded-full px-4 py-1.5 font-bold shadow-lg shadow-amber-500/5 font-mono text-xs">
                <Flame size={16} className="text-amber-400 fill-amber-500 animate-pulse" />
                <span>Streak {currentStudent.streak} ngày!</span>
              </div>
            )}
          </div>

          {/* Desktop/Tablet Navigation Bar */}
          <div className="hidden md:flex gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl mb-6 flex-wrap shadow-xl">
            <button
              onClick={() => {
                setStudentTab("songbook");
                playCyberSound(500, "sine", 0.1);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
                studentTab === "songbook"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-600 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              🎵 SỔ TAY ĐỆM HÁT
            </button>
            <button
              onClick={() => {
                setStudentTab("practice");
                playCyberSound(600, "sine", 0.1);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
                studentTab === "practice"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-600 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              ⚡ GÓC LUYỆN TẬP
            </button>
            <button
              onClick={() => {
                setStudentTab("parent");
                playCyberSound(700, "sine", 0.1);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
                studentTab === "parent"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-600 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              🛡️ CỔNG PHỤ HUYNH
            </button>
            <button
              onClick={() => {
                setStudentTab("portfolio");
                playCyberSound(800, "sine", 0.1);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
                studentTab === "portfolio"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-600 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              👑 HỒ SƠ BIỂU DIỄN
            </button>
          </div>

          {/* Mobile Fixed Bottom Navigation Bar */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg flex justify-around py-3 px-1 pb-safe z-50 shadow-[0_-10px_30px_rgba(6,182,212,0.1)]">
            <button
              onClick={() => {
                setStudentTab("songbook");
                playCyberSound(500, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                studentTab === "songbook" ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <FileText size={18} className={studentTab === "songbook" ? "text-cyan-400" : "text-slate-600"} />
              <span>SỔ TAY</span>
            </button>
            <button
              onClick={() => {
                setStudentTab("practice");
                playCyberSound(600, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                studentTab === "practice" ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Flame size={18} className={studentTab === "practice" ? "text-cyan-400 animate-pulse" : "text-slate-600"} />
              <span>LUYỆN TẬP</span>
            </button>
            <button
              onClick={() => {
                setStudentTab("parent");
                playCyberSound(700, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                studentTab === "parent" ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Smartphone size={18} className={studentTab === "parent" ? "text-cyan-400" : "text-slate-600"} />
              <span>PHỤ HUYNH</span>
            </button>
            <button
              onClick={() => {
                setStudentTab("portfolio");
                playCyberSound(800, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                studentTab === "portfolio" ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Award size={18} className={studentTab === "portfolio" ? "text-cyan-400" : "text-slate-600"} />
              <span>HỒ SƠ</span>
            </button>
          </div>

          {/* TAB: SONGBOOK */}
          {studentTab === "songbook" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Profile log details */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/80 border border-cyan-500/10 p-6 rounded-3xl text-center relative overflow-hidden shadow-xl shadow-cyan-500/5 backdrop-blur-md">
                  <button
                    onClick={() => {
                      setCurrentStudent(null);
                      setRole("welcome");
                      playCyberSound(300, "sine", 0.2);
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-slate-950 text-rose-400 rounded-full transition-all cursor-pointer shadow-lg shadow-rose-500/5 hover:scale-110 active:scale-90"
                    title="Đăng xuất"
                  >
                    <LogOut size={16} />
                  </button>

                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-indigo-600 text-slate-950 border-2 border-cyan-300 font-black rounded-full flex items-center justify-center text-xl mx-auto mb-4 shadow-lg shadow-cyan-500/35">
                    {currentStudent.tenHV.charAt(0)}
                  </div>

                  <h3 className="font-display font-extrabold text-lg text-slate-100 mb-2">{currentStudent.tenHV}</h3>
                  <div className="flex flex-col items-center gap-1.5 text-xs">
                    <span className="font-semibold bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-500/20 text-cyan-400 font-mono">Lớp: {currentStudent.lop}</span>
                    <span className="font-semibold bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-500/20 text-cyan-400 font-mono">Ca học: {currentStudent.caHoc}</span>
                  </div>

                  <button
                    onClick={() => {
                      setShowQRModal(true);
                      playCyberSound(650, "sine", 0.15);
                    }}
                    className="mt-6 w-full py-2.5 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/5 font-mono uppercase tracking-wider"
                  >
                    <QrCode size={14} />
                    Mã QR Check-in Điểm Danh
                  </button>
                </div>

                {/* Checked ins */}
                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-xl backdrop-blur-md">
                  <h6 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 mb-3 font-mono">
                    Lịch sử chuyên cần ({studentAttendanceCount} buổi)
                  </h6>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {studentAttendanceDates.map((d, i) => (
                      <span key={i} className="text-[10px] bg-slate-950 border border-cyan-500/20 px-2.5 py-1 rounded-full text-cyan-300 font-mono font-medium shadow-md">
                        {d}
                      </span>
                    ))}
                    {studentAttendanceCount === 0 && (
                      <span className="text-slate-500 text-xxs italic">Chưa có dữ liệu điểm danh.</span>
                    )}
                  </div>
                </div>

                {/* Tuition receipt history */}
                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-xl backdrop-blur-md">
                  <h6 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 mb-3 font-mono">
                    Lịch sử học phí
                  </h6>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {studentFeeHistory.map((receipt) => (
                      <div key={receipt.maHD} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xxs flex justify-between items-center shadow-inner">
                        <div>
                          <span className="font-bold text-slate-300 block">{receipt.ngayThu.split(" ")[0]}</span>
                          <span className="text-slate-500 text-[10px] block mt-0.5 max-w-[160px] truncate" title={receipt.ghiChu}>
                            {receipt.ghiChu}
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-400 font-mono">
                          +{Number(receipt.soTien).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    ))}
                    {studentFeeHistory.length === 0 && (
                      <span className="text-slate-500 text-xxs italic">Chưa có dữ liệu học phí đóng.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Songs listings */}
              <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md flex flex-col min-h-[480px]">
                <div className="flex justify-between items-center mb-6">
                  <h5 className="font-display font-extrabold text-slate-100 text-sm font-mono tracking-wider">🎵 SỔ TAY ĐỆM HÁT CÁ NHÂN</h5>
                  <div className="p-1 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-1 shadow-inner">
                    <button
                      onClick={() => {
                        setStudentCategory("Hợp Âm");
                        playCyberSound(450, "sine", 0.08);
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono ${
                        studentCategory === "Hợp Âm"
                          ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      HỢP ÂM
                    </button>
                    <button
                      onClick={() => {
                        setStudentCategory("Cảm Âm");
                        playCyberSound(500, "sine", 0.08);
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono ${
                        studentCategory === "Cảm Âm"
                          ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      CẢM ÂM
                    </button>
                    <button
                      onClick={() => {
                        setStudentCategory("Bài Học");
                        playCyberSound(550, "sine", 0.08);
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono ${
                        studentCategory === "Bài Học"
                          ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      BÀI HỌC
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                  {getFilteredStudentSongs().map((song) => (
                    <div
                      key={song.maBH}
                      onClick={() => {
                        setActiveSongView(song);
                        playCyberSound(650, "sine", 0.15);
                      }}
                      className="p-4 bg-slate-950/60 border border-slate-800 hover:border-cyan-400 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:translate-x-1 hover:bg-slate-950 hover:shadow-md hover:shadow-cyan-500/5 group"
                    >
                      <span className="text-slate-300 text-xs font-semibold flex items-center gap-2 group-hover:text-cyan-400 transition-colors">
                        <FileText size={15} className="text-cyan-500 group-hover:animate-pulse" />
                        {song.tenBH}
                      </span>
                      <ChevronRight className="text-slate-500 group-hover:text-cyan-400 transition-colors" size={15} />
                    </div>
                  ))}

                  {getFilteredStudentSongs().length === 0 && (
                    <div className="text-center py-20 text-slate-500 text-xs italic font-mono">
                      Chưa có bài hát {studentCategory} nào trong sổ tay của bạn.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRACTICE CORNER */}
          {studentTab === "practice" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Metronome />
                <Tuner />
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex flex-col justify-center text-center space-y-4 shadow-xl backdrop-blur-md">
                <Flame size={44} className="text-cyan-400 animate-pulse mx-auto shadow-cyan-500/20 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                <h4 className="font-display font-black text-slate-100 text-base tracking-wider">⚡ GÓC TỰ LUYỆN TẬP TẠI NHÀ</h4>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  Hãy kết hợp gõ nhịp Metronome cùng dò dây đàn chuẩn Tuner để nâng cao nhạc cảm, giữ phách, giữ nhịp chuẩn mực!
                </p>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">
                    Lời khuyên từ giảng viên:
                  </span>
                  <p className="text-xxs font-semibold text-slate-300 leading-relaxed">
                    "Tập luyện gõ nhịp phách tối thiểu 15-20 phút hàng ngày cùng máy Metronome sẽ giúp giữ vững tempo, tránh nản nhịp và đệm hát đều đặn mượt mà."
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PARENT PORTAL */}
          {studentTab === "parent" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl text-center space-y-4 shadow-xl backdrop-blur-md">
                  <div className="w-12 h-12 bg-slate-950 text-cyan-400 rounded-full flex items-center justify-center text-lg mx-auto border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h5 className="font-display font-black text-slate-100 text-sm tracking-wider uppercase font-mono">Chào quý phụ huynh!</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">Theo dõi sự tiến bộ học tập nhạc của các bé</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1 font-mono">Chuyên cần</span>
                      <span className="font-black text-emerald-400 text-sm font-mono">
                        {Math.min(100, Math.floor((studentAttendanceCount % 8) * 100 / 8)) || 100}%
                      </span>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1 font-mono">Học phí</span>
                      <span className={`font-black text-sm font-mono ${studentFeeHistory.length > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {studentFeeHistory.length > 0 ? "Đầy đủ" : "Trễ đóng"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md">
                  <h6 className="font-display font-extrabold text-slate-300 text-xs mb-3 pb-2 border-b border-slate-800 font-mono tracking-wider">
                    📝 LỜI PHÊ TỪ GIÁO VIÊN
                  </h6>
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 text-xxs leading-relaxed font-semibold">
                    "Con giữ nhịp phách vững vàng, siêng năng tự luyện bài ở nhà. Đã hoàn thiện tốt các phím hợp âm chặn F, Bm. Tinh thần tiếp thu tốt."
                  </div>
                </div>
              </div>

              {/* Interactive graph Recharts */}
              <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between h-[360px] shadow-xl backdrop-blur-md">
                <h5 className="font-display font-extrabold text-slate-400 text-xs uppercase tracking-wider mb-4 font-mono">
                  📊 Biểu Đồ Buổi Đi Học Của Con Trong Năm (2026)
                </h5>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getAttendanceChartData()}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f1f5f9" }} />
                      <Line type="monotone" dataKey="Số buổi" stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PORTFOLIO VIDEO RECORDINGS */}
          {studentTab === "portfolio" && (
            <PerformancePortfolio
              studentId={currentStudent.maHV}
              studentName={currentStudent.tenHV}
              songs={studentSongs}
              onStreakUpdate={(streak) => {
                setCurrentStudent((prev: any) => ({ ...prev, streak }));
              }}
            />
          )}
        </div>
      )}

      {/* 3. TEACHER / ADMIN MANAGE PANEL */}
      {role === "admin" && isAdminLoggedIn && (
        <div className="flex-grow flex flex-col relative z-10">
          
          {/* Mobile Top App Bar for Admin */}
          <div className="lg:hidden sticky top-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex justify-between items-center z-40 -mx-4 -mt-6 mb-4 shadow-md">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-[#1c85a6] via-[#f9a01b] to-[#f05a28] text-white rounded-lg shadow-md shadow-[#1c85a6]/20">
                <Guitar size={16} className="animate-pulse" />
              </div>
              <div>
                <h6 className="font-display font-black text-xs text-slate-100 tracking-wider font-mono">HUỲNH LONG ADMIN</h6>
                <span className="text-[8px] font-black text-[#f9a01b] block tracking-widest uppercase font-mono">
                  {adminTab === "dashboard" && "THỐNG KÊ"}
                  {adminTab === "classes" && "LỚP HỌC & CA"}
                  {adminTab === "students" && "QUẢN LÝ HỌC VIÊN"}
                  {adminTab === "teachers" && "GIÁO VIÊN & LƯƠNG"}
                  {adminTab === "attendance" && "ĐIỂM DANH HÀNG NGÀY"}
                  {adminTab === "songs" && "KHO BÀI HÁT"}
                  {adminTab === "fees" && "THU HỌC PHÍ & VIETQR"}
                  {adminTab === "telegram" && "GỬI THÔNG BÁO"}
                  {adminTab === "settings" && "CẤU HÌNH HỆ THỐNG"}
                  {adminTab === "sheets" && "ĐỒNG BỘ SHEETS"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setRole("welcome");
                  playCyberSound(400, "sine", 0.15);
                }}
                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-[#1c85a6] rounded-lg text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                title="Màn hình chính"
              >
                <Compass size={14} />
              </button>
            </div>
          </div>

          {/* Main Workspace Frame container */}
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-12">
            {/* Sidebar navigation */}
            <div className="hidden lg:flex lg:col-span-3 bg-slate-950/80 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 space-y-6 flex-col justify-between select-none backdrop-blur-md">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-[#1c85a6] via-[#f9a01b] to-[#f05a28] text-white rounded-xl shadow-lg shadow-[#1c85a6]/20">
                    <Guitar size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h6 className="font-display font-black text-sm text-slate-100 tracking-wider font-mono">GUITAR HUỲNH LONG</h6>
                    <span className="text-[10px] font-black text-[#f9a01b] block tracking-widest uppercase font-mono">ADMIN CONTROL v8.0</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 my-4" />

                <div className="space-y-1.5 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-2 lg:gap-1.5 font-mono">
                  <button
                    onClick={() => {
                      setAdminTab("dashboard");
                      playCyberSound(500, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "dashboard"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <TrendingUp size={14} className="shrink-0" />
                    THỐNG KÊ
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("classes");
                      fetchGlobalData();
                      playCyberSound(550, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "classes"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <Calendar size={14} className="shrink-0" />
                    LỚP HỌC & CA
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("students");
                      fetchGlobalData();
                      playCyberSound(600, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "students"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <Users size={14} className="shrink-0" />
                    HỌC VIÊN
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("teachers");
                      fetchPayrollReport();
                      playCyberSound(650, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "teachers"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <User size={14} className="shrink-0" />
                    GIÁO VIÊN & LƯƠNG
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("attendance");
                      fetchGlobalData();
                      playCyberSound(700, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "attendance"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <CheckCircle size={14} className="shrink-0" />
                    ĐIỂM DANH
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("songs");
                      playCyberSound(750, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "songs"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <FileText size={14} className="shrink-0" />
                    KHO BÀI HÁT
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("fees");
                      fetchFeeHistory();
                      fetchGlobalData();
                      playCyberSound(800, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "fees"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <DollarSign size={14} className="shrink-0" />
                    THU HỌC PHÍ
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("telegram");
                      playCyberSound(850, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "telegram"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare size={14} className="shrink-0" />
                    THÔNG BÁO
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("settings");
                      playCyberSound(900, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "settings"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <Compass size={14} className="shrink-0" />
                    CÀI ĐẶT
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("sheets");
                      playCyberSound(950, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "sheets"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md shadow-[#1c85a6]/30 font-black"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <FileSpreadsheet size={14} className="shrink-0" />
                    ĐỒNG BỘ SHEETS
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  handleAdminLogout();
                  playCyberSound(300, "sine", 0.2);
                }}
                className="w-full text-center px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 rounded-xl text-xs font-black tracking-widest uppercase transition-all cursor-pointer mt-4 font-mono shadow-lg shadow-rose-500/5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogOut size={14} className="inline-block mr-1.5 -translate-y-0.5" />
                ĐĂNG XUẤT ADMIN
              </button>
            </div>

            {/* Workplace body */}
            <div className="lg:col-span-9 bg-transparent p-4 lg:p-6 pb-24 lg:pb-6 overflow-y-auto">
              {adminTab === "dashboard" && <AdminDashboard />}

              {adminTab === "classes" && (
                <AdminClasses
                  students={students}
                  teachers={teachers}
                  classes={classes}
                  onRefresh={fetchGlobalData}
                />
              )}

              {adminTab === "students" && (
                <AdminStudents
                  students={students}
                  classes={classes}
                  onRefresh={fetchGlobalData}
                />
              )}

              {adminTab === "teachers" && (
                <div className="space-y-6">
                  {isAddingTeacher ? (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-4">
                      <h5 className="font-display font-bold text-lg text-zinc-900 pb-2 border-b">
                        {editTeacherId ? "Chỉnh Sửa Giáo Viên" : "Tạo Hồ Sơ Giáo Viên Mới"}
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Họ Tên Giáo Viên <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={teacherName}
                            onChange={(e) => setTeacherName(e.target.value)}
                            placeholder="Ví dụ: Lê Thanh Sơn"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 text-zinc-900 placeholder-zinc-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Email Liên Hệ <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={teacherEmail}
                            onChange={(e) => setTeacherEmail(e.target.value)}
                            placeholder="sonlt@gmail.com"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 text-zinc-900 placeholder-zinc-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Mức Lương / Buổi Dạy (₫) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={teacherSalary}
                            onChange={(e) => setTeacherSalary(e.target.value)}
                            placeholder="150000"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono text-zinc-900 placeholder-zinc-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Số Điện Thoại / Zalo (Nhận bảng lương)
                          </label>
                          <input
                            type="text"
                            value={teacherSdt}
                            onChange={(e) => setTeacherSdt(e.target.value)}
                            placeholder="Ví dụ: 0912345678"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono text-zinc-900 placeholder-zinc-400"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                          onClick={resetTeacherForm}
                          className="px-4 py-2 border rounded-full text-xs font-semibold text-zinc-500"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveTeacher}
                          className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-bold"
                        >
                          Lưu Hồ Sơ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex gap-2 p-1 bg-zinc-100 border rounded-xl w-fit">
                        <button
                          onClick={() => {
                            setIsAddingTeacher(false);
                            fetchGlobalData();
                          }}
                          className="px-4 py-2 bg-white text-sky-600 shadow-sm rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Hồ sơ giáo viên
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingTeacher(false);
                            fetchPayrollReport();
                          }}
                          className="px-4 py-2 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Tính lương tự động
                        </button>
                      </div>

                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-zinc-50/50">
                          <h6 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400">
                            Danh Sách Giảng Viên
                          </h6>
                          <button
                            onClick={() => setIsAddingTeacher(true)}
                            className="bg-sky-600 hover:bg-sky-700 text-white text-xxs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                          >
                            + Thêm GV
                          </button>
                        </div>
                        <table className="w-full text-center border-collapse">
                          <thead className="bg-zinc-50 border-b">
                            <tr>
                              <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Mã GV</th>
                              <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 text-left">Họ Tên</th>
                              <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Email</th>
                              <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Số Điện Thoại</th>
                              <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Lương / Buổi</th>
                              <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Hành động</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                            {teachers.map((t) => (
                              <tr key={t.maGV} className="hover:bg-zinc-50/50">
                                <td className="py-3 px-4 font-mono text-zinc-400">{t.maGV}</td>
                                <td className="py-3 px-4 text-left font-bold text-zinc-950">{t.tenGV}</td>
                                <td className="py-3 px-4 text-zinc-500">{t.email}</td>
                                <td className="py-3 px-4 text-zinc-600 font-mono">{t.sdt || "—"}</td>
                                <td className="py-3 px-4 text-sky-600 font-bold font-mono">{t.luongCoBan.toLocaleString("vi-VN")}đ</td>
                                <td className="py-3 px-4 flex justify-center gap-2">
                                  <button
                                    onClick={() => handleEditTeacherInit(t)}
                                    className="p-1 hover:bg-sky-50 text-sky-600 rounded cursor-pointer"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTeacher(t.maGV)}
                                    className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Display payroll calculation preview */}
                      {payrollReport.length > 0 && (
                        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden mt-6">
                          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                            <h6 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400">
                              Lương Thực Nhận Tháng Này
                            </h6>
                          </div>
                          <table className="w-full text-center border-collapse">
                            <thead className="bg-zinc-50 border-b">
                              <tr>
                                <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 text-left">Giảng Viên</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Mức lương thỏa thuận</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Số buổi đứng lớp</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Lượt học viên check-in</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Thực nhận</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Gửi Zalo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                              {payrollReport.map((p) => (
                                <tr key={p.maGV} className="hover:bg-zinc-50/50">
                                  <td className="py-3 px-4 text-left font-bold text-zinc-950">{p.tenGV}</td>
                                  <td className="py-3 px-4 font-mono text-zinc-500">{p.luongCoBan.toLocaleString("vi-VN")}đ</td>
                                  <td className="py-3 px-4">
                                    <span className="bg-zinc-100 border border-zinc-200 rounded px-2.5 py-0.5 text-zinc-700 font-semibold font-mono">
                                      {p.soBuoiDay} Buổi
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="bg-sky-50 border border-sky-100 rounded px-2.5 py-0.5 text-sky-700 font-semibold font-mono">
                                      {p.soLuotHocVien} Lượt
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-extrabold text-rose-500 font-mono fs-6">
                                    {p.tongLuong.toLocaleString("vi-VN")} VNĐ
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => handleSendZaloSalary(p)}
                                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xxs font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-sm"
                                    >
                                      <MessageSquare size={11} />
                                      Gửi Zalo
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {adminTab === "attendance" && (
                <AdminAttendance students={students} classes={classes} />
              )}

              {/* TAB: SONGS CRUD LIST */}
              {adminTab === "songs" && (
                <div className="space-y-6">
                  {isAddingSong ? (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-4">
                      <h5 className="font-display font-bold text-lg text-zinc-900 pb-2 border-b">
                        {editingSong ? "Cập Nhật Bài Hát" : "Soạn Bài Hát Mới Vào Kho"}
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Tên Bài Hát <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={songFormTitle}
                            onChange={(e) => setSongFormTitle(e.target.value)}
                            placeholder="Ví dụ: Diễm Xưa"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-900 placeholder-zinc-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Phân Loại <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={songFormCategory}
                            onChange={(e: any) => setSongFormCategory(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-800"
                          >
                            <option value="Hợp Âm">Hợp Âm (Chords)</option>
                            <option value="Cảm Âm">Cảm Âm (Notes)</option>
                            <option value="Bài Học">Bài Học (Lesson)</option>
                          </select>
                        </div>

                        <div className="md:col-span-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-xxs font-bold text-zinc-500 uppercase tracking-wider">
                              Nội Dung Lời & Hợp Âm / Cảm Âm / Bài Học <span className="text-rose-500">*</span>
                            </label>
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-3">
                              <span>Số từ: <b>{songFormLyrics.trim() ? songFormLyrics.trim().split(/\s+/).length : 0}</b></span>
                              <span>Ký tự: <b>{songFormLyrics.length}</b></span>
                            </div>
                          </div>

                          <div className="flex flex-col border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-sky-200 transition-all">
                            {/* 1. Primary Rich Toolbar */}
                            <div className="flex items-center gap-1.5 p-2 bg-zinc-50 border-b border-zinc-150 flex-wrap">
                              {/* Format buttons */}
                              <button
                                type="button"
                                onClick={() => applySongFormatting("<b>", "</b>")}
                                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 font-bold text-xs transition-all cursor-pointer"
                                title="In đậm (Bold)"
                              >
                                <Bold size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => applySongFormatting("<i>", "</i>")}
                                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 italic text-xs transition-all cursor-pointer"
                                title="In nghiêng (Italic)"
                              >
                                <Italic size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => applySongFormatting("<u>", "</u>")}
                                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 underline text-xs transition-all cursor-pointer"
                                title="Gạch chân (Underline)"
                              >
                                <Underline size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => applySongFormatting("<s>", "</s>")}
                                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 line-through text-xs transition-all cursor-pointer"
                                title="Gạch ngang (Strikethrough)"
                              >
                                <Strikethrough size={14} />
                              </button>

                              <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" />

                              <button
                                type="button"
                                onClick={() => applySongFormatting("<code>", "</code>")}
                                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 font-mono text-xs transition-all cursor-pointer"
                                title="Định dạng mã Code"
                              >
                                <Code size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => applySongFormatting("<pre>", "</pre>")}
                                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 font-mono text-[11px] transition-all cursor-pointer"
                                title="Đoạn văn Monospace"
                              >
                                <FileText size={14} />
                              </button>

                              <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" />

                              {/* Wrap in [ ] (Chord Helper) */}
                              <button
                                type="button"
                                onClick={() => applySongFormatting("[", "]")}
                                className="px-2 py-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md transition-all cursor-pointer"
                                title="Bao bọc cụm từ được chọn bằng dấu ngoặc vuông làm Hợp âm []"
                              >
                                [Hợp âm]
                              </button>

                              {/* Song Sections quick insertion */}
                              <div className="flex gap-1">
                                {["[Intro]", "[Chorus]", "[Verse 1]", "[Bridge]", "[Outro]"].map((sec) => (
                                  <button
                                    key={sec}
                                    type="button"
                                    onClick={() => insertSongTextAtCursor(sec + "\n")}
                                    className="px-1.5 py-0.5 text-[9px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded border border-zinc-200 transition-all cursor-pointer"
                                    title={`Chèn phân đoạn ${sec}`}
                                  >
                                    {sec.replace(/[\[\]]/g, "")}
                                  </button>
                                ))}
                              </div>

                              <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" />

                              {/* Smart Note Auto-Convert */}
                              <button
                                type="button"
                                onClick={convertUnaccentedNotes}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md transition-all cursor-pointer shadow-3xs"
                                title="Tự động sửa lỗi cảm âm không dấu thông minh (Ví dụ: Do -> Đô, Re -> Rê, Re3 -> Rê3...)"
                              >
                                <Sparkles size={11} className="text-amber-500 animate-pulse animate-duration-1000" />
                                <span>Định Dạng Nốt Thông Minh</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Hành động này sẽ dọn dẹp các thẻ định dạng HTML/XML lỗi (như <p>, </p>, <br>) chỉ giữ lại văn bản lời bài hát. Bạn có muốn thực hiện?")) {
                                    setSongFormLyrics(stripHtmlFromLyrics(songFormLyrics));
                                  }
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition-all cursor-pointer shadow-3xs"
                                title="Loại bỏ toàn bộ các thẻ định dạng HTML lỗi (như <p>, </p>, <br>...) chỉ giữ lại nội dung văn bản sạch"
                              >
                                <Trash2 size={11} className="text-rose-500" />
                                <span>Lọc Thẻ HTML</span>
                              </button>

                              <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" />

                              {/* Song Templates Dropdown */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md transition-all cursor-pointer border border-sky-100"
                                  title="Chọn mẫu bài viết soạn sẵn"
                                >
                                  <Sparkles size={11} className="text-sky-500 animate-pulse" />
                                  <span>Chọn Mẫu Soạn Sẵn</span>
                                  <ChevronDown size={10} />
                                </button>
                                <div className="absolute left-0 mt-1 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg py-1.5 z-20 hidden group-hover:block hover:block">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm("Hành động này sẽ ghi đè toàn bộ nội dung hiện tại. Bạn có chắc chắn muốn áp dụng mẫu Bài Hát Hợp Âm?")) {
                                        setSongFormLyrics(`[Intro]\n[C] [G] [Am] [F]\n\n[Verse 1]\n[C]Ngày xuân nâng chén [G]ta chúc mừng\n[Am]Chúc thầy chúc cô [F]nhiều niềm vui\n[C]Cùng nhau học đàn [G]qua năm tháng\n[Am]Phím tơ rộn rã [F]tiếng cười vui.\n\n[Chorus]\n[C]Hãy ca hát [G]vang bài ca học trò\n[Am]Lớp nhạc Huỳnh Long [F]mãi trong tim ta!\n[C]Đắp xây những [G]giai điệu tuổi thơ\n[Am]Ước mơ bay xa [F]với những cung đàn.\n\n[Outro]\n[C] [G] [C]`);
                                      }
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 flex flex-col gap-0.5 cursor-pointer text-zinc-700"
                                  >
                                    <span className="font-bold text-zinc-900 flex items-center gap-1">🎸 Bài Hát Có Hợp Âm</span>
                                    <span className="text-[10px] text-zinc-400">Mẫu tiêu chuẩn bao gồm Intro, Verse, Chorus, Outro.</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm("Hành động này sẽ ghi đè toàn bộ nội dung hiện tại. Bạn có chắc chắn muốn áp dụng mẫu Cảm Âm?")) {
                                        setSongFormLyrics(`[Intro]\nC D E G A - C2 A G E D C\n\n[Verse 1]\nKìa con bướm vàng, kìa con bướm vàng\nC D E C - C D E C\n\nXòe đôi cánh, xòe đôi cánh\nE F G - E F G\n\n[Chorus]\nBướm bay rồi kìa, bướm bay rồi kìa\nG A G F E C - G A G F E C\n\nTa vỗ tay chào, ta vỗ tay chào\nC G C - C G C`);
                                      }
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 border-t border-zinc-100 flex flex-col gap-0.5 cursor-pointer text-zinc-700"
                                  >
                                    <span className="font-bold text-zinc-900 flex items-center gap-1">🎵 Mẫu Cảm Âm (Notes)</span>
                                    <span className="text-[10px] text-zinc-400">Được sắp xếp theo ký tự nốt nhạc (C D E F G A B)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm("Hành động này sẽ ghi đè toàn bộ nội dung hiện tại. Bạn có chắc chắn muốn áp dụng mẫu Giáo Án / Bài Học?")) {
                                        setSongFormLyrics(`<b>Chủ đề bài học:</b> Thực hành rải ngón cơ bản (Arpeggio)\n\n<b>1. Lý Thuyết Cơ Bản</b>\n• Hợp âm rải là kỹ thuật chơi từng nốt của hợp âm một cách liên tiếp thay vì bấm phát ra âm thanh cùng lúc.\n• Giúp bản nhạc nghe mềm mại, bay bổng hơn.\n\n<b>2. Quy Trình Luyện Tập (Fingerstyle Pattern)</b>\n• Tay phải gảy dây theo thứ tự: P - I - M - A - M - I\n• Trong đó: P (Ngón cái), I (Ngón trỏ), M (Ngón giữa), A (Ngón áp út).\n• Luyện tập với chuỗi vòng hợp âm: [C] -> [Am] -> [F] -> [G]\n\n<b>3. Bài Tập Về Nhà</b>\n• Tập luyện tối thiểu 15 phút mỗi ngày.\n• Chạy ngón đều nhịp với Metronome ở tốc độ 75 - 90 Bpm.\n• Quay video thực hành gửi lại giáo viên qua Telegram để nhận phản hồi.`);
                                      }
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 border-t border-zinc-100 flex flex-col gap-0.5 cursor-pointer text-zinc-700"
                                  >
                                    <span className="font-bold text-zinc-900 flex items-center gap-1">📘 Giáo Án / Bài Học</span>
                                    <span className="text-[10px] text-zinc-400">Thích hợp cho việc viết tài liệu hướng dẫn giảng dạy.</span>
                                  </button>
                                </div>
                              </div>

                              <div className="ml-auto flex items-center gap-1">
                                {/* Copy button */}
                                <button
                                  type="button"
                                  onClick={copySongToClipboard}
                                  className={`p-1.5 rounded transition-all cursor-pointer ${isSongCopied ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 border border-transparent"}`}
                                  title="Sao chép văn bản (Copy)"
                                >
                                  {isSongCopied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                
                                {/* Clear button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Bạn có chắc chắn muốn xóa sạch nội dung bài soạn thảo?")) {
                                      setSongFormLyrics("");
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded transition-all cursor-pointer"
                                  title="Xóa toàn bộ (Clear)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* 2. Song Chords Quick-Insertion Bar */}
                            <div className="px-3 py-1.5 bg-sky-50/40 border-b border-zinc-150 flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="font-bold text-sky-700 shrink-0">Hợp âm nhanh:</span>
                              <div className="flex flex-wrap gap-1">
                                {["[C]", "[D]", "[Dm]", "[E]", "[Em]", "[F]", "[G]", "[Am]", "[A]", "[Bm]", "[Bb]", "[C7]", "[D7]", "[G7]", "[A7]"].map((ch) => (
                                  <button
                                    key={ch}
                                    type="button"
                                    onClick={() => insertSongTextAtCursor(ch + " ")}
                                    className="px-1.5 py-0.5 font-mono font-bold bg-white hover:bg-sky-500 hover:text-white text-sky-700 rounded border border-sky-100 hover:border-sky-500 transition-all cursor-pointer shadow-3xs"
                                    title={`Chèn nhanh ${ch}`}
                                  >
                                    {ch.replace(/[\[\]]/g, "")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 3. Advanced Utilities Sub-Panel */}
                            <div className="p-3 bg-zinc-50/50 border-b border-zinc-150 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                              {/* Col 1: Search & Replace */}
                              <div className="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-2 shadow-xs">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                  <Search size={12} className="text-sky-500" />
                                  Tìm & Thay Thế Trong Bài
                                </div>
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    placeholder="Từ cần tìm..."
                                    value={songEditorSearchQuery}
                                    onChange={(e) => setSongEditorSearchQuery(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:bg-white text-zinc-900 placeholder-zinc-400"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Thay thế bằng..."
                                    value={songEditorReplaceQuery}
                                    onChange={(e) => setSongEditorReplaceQuery(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:bg-white text-zinc-900 placeholder-zinc-400"
                                  />
                                  <div className="flex gap-1.5 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSongSearchReplace(false)}
                                      className="flex-1 py-1 px-2 text-[10px] font-semibold bg-zinc-100 hover:bg-zinc-200 rounded transition-all cursor-pointer text-zinc-700"
                                    >
                                      Thay đầu
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSongSearchReplace(true)}
                                      className="flex-1 py-1 px-2 text-[10px] font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded transition-all cursor-pointer"
                                    >
                                      Thay tất cả
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Col 2: Text Case Changer & Emoji Palette */}
                              <div className="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-2.5 shadow-xs flex flex-col justify-between">
                                {/* Case converter */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                    <Type size={12} className="text-sky-500" />
                                    Chuyển Đổi Kiểu Chữ (Bôi đen để đổi)
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => changeSongCase("upper")}
                                      className="flex-1 py-1 px-1 text-[9px] font-bold bg-zinc-50 hover:bg-zinc-150 rounded border border-zinc-200 text-zinc-700 uppercase"
                                      title="CHỮ HOA TOÀN BỘ"
                                    >
                                      IN HOA
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => changeSongCase("lower")}
                                      className="flex-1 py-1 px-1 text-[9px] font-bold bg-zinc-50 hover:bg-zinc-150 rounded border border-zinc-200 text-zinc-700 lowercase"
                                      title="chữ thường toàn bộ"
                                    >
                                      thường
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => changeSongCase("title")}
                                      className="flex-1 py-1 px-1 text-[9px] font-bold bg-zinc-50 hover:bg-zinc-150 rounded border border-zinc-200 text-zinc-700 capitalize"
                                      title="Viết Hoa Chữ Cái Đầu"
                                    >
                                      In Đầu
                                    </button>
                                  </div>
                                </div>

                                {/* Quick Emojis Palette */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                    <Smile size={12} className="text-sky-500" />
                                    Biểu Tượng Cảm Xúc Nhanh
                                  </div>
                                  <div className="flex flex-wrap gap-1 bg-zinc-50 p-1 rounded-md justify-between">
                                    {["🎸", "🎹", "🎤", "🎵", "🎶", "🔔", "🌸", "💡", "🎉", "⚠️", "📅", "✅"].map((emo) => (
                                      <button
                                        key={emo}
                                        type="button"
                                        onClick={() => insertSongTextAtCursor(emo)}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 rounded text-xs transition-all cursor-pointer shadow-3xs"
                                        title={`Chèn ${emo}`}
                                      >
                                        {emo}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Textarea */}
                            <textarea
                              id="song-lyrics-textarea"
                              value={songFormLyrics}
                              onChange={(e) => setSongFormLyrics(e.target.value)}
                              rows={14}
                              placeholder="Nhập nội dung bài hát hoặc mã cảm âm tại đây..."
                              className="w-full p-4 text-xs font-mono focus:outline-none min-h-[300px] resize-y text-zinc-900 bg-white placeholder-zinc-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                          onClick={resetSongForm}
                          className="px-4 py-2 border rounded-full text-xs font-semibold text-zinc-500"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          onClick={handleSaveSongForm}
                          className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-bold"
                        >
                          Lưu trữ kho
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="p-4 border-b flex justify-between items-center bg-zinc-50/50">
                        <h6 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400">
                          Kho Lưu Trữ Tác Phẩm
                        </h6>
                        <button
                          onClick={() => setIsAddingSong(true)}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xxs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          + Soạn bài mới
                        </button>
                      </div>
                      <table className="w-full text-center border-collapse">
                        <thead className="bg-zinc-50 border-b">
                          <tr>
                            <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 text-left">Mã Bài</th>
                            <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 text-left">Tên Bài Hát</th>
                            <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Phân Loại</th>
                            <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                          {songs.map((s) => (
                            <tr key={s.maBH} className="hover:bg-zinc-50/50">
                              <td className="py-3 px-4 text-left font-mono text-zinc-400">{s.maBH}</td>
                              <td className="py-3 px-4 text-left font-bold text-zinc-950">{s.tenBH}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-bold border ${
                                  s.phanLoai === "Bài Học"
                                    ? "bg-sky-50 border-sky-200 text-sky-600"
                                    : s.phanLoai === "Cảm Âm"
                                    ? "bg-cyan-50 border-cyan-200 text-cyan-600"
                                    : "bg-sky-50 border-sky-200 text-sky-600"
                                }`}>
                                  {s.phanLoai}
                                </span>
                              </td>
                              <td className="py-3 px-4 flex justify-center gap-2">
                                <button
                                  onClick={() => handleEditSongInit(s)}
                                  className="p-1.5 bg-zinc-50 border text-sky-600 border-zinc-100 hover:bg-sky-50 rounded-lg cursor-pointer"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSong(s.maBH)}
                                  className="p-1.5 bg-zinc-50 border text-rose-500 border-zinc-100 hover:bg-rose-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: TUITION BILLS GENERATOR */}
              {adminTab === "fees" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Form invoice details input */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm border-t-4 border-t-sky-600">
                      <h5 className="font-display font-bold text-sm text-zinc-900 mb-4 text-center">Thu Học Phí Lớp Nhạc</h5>

                      <div className="space-y-3.5 mb-5">
                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Chọn Học Viên Đóng Phí:
                          </label>
                          <select
                            value={feeStudentId}
                            onChange={(e) => handleFeeStudentChange(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-800"
                          >
                            <option value="">-- Chọn học viên nộp phí --</option>
                            {students.map((st) => (
                              <option key={st.maHV} value={st.maHV}>
                                {st.maHV} - {st.tenHV}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                              Học Phí Cơ Bản (₫):
                            </label>
                            <input
                              type="number"
                              value={feeAmount}
                              onChange={(e) => setFeeAmount(e.target.value)}
                              placeholder="500000"
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold text-zinc-900 placeholder-zinc-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                              Phát Sinh Trừ / Thêm (₫):
                            </label>
                            <input
                              type="number"
                              value={feeExtra}
                              onChange={(e) => setFeeExtra(e.target.value)}
                              placeholder="0"
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold text-zinc-900 placeholder-zinc-400"
                            />
                          </div>
                        </div>

                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex justify-between items-center text-xs">
                          <span className="font-bold text-rose-800">TỔNG CỘNG THU:</span>
                          <span className="font-extrabold text-rose-600 text-sm font-mono">
                            {( (parseFloat(feeAmount) || 0) + (parseFloat(feeExtra) || 0) ).toLocaleString("vi-VN")} VNĐ
                          </span>
                        </div>

                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Ghi Chú Hóa Đơn:
                          </label>
                          <textarea
                            value={feeNote}
                            onChange={(e) => setFeeNote(e.target.value)}
                            rows={3}
                            placeholder="Ví dụ: Đóng học phí khóa tháng 7/2026..."
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSaveFeeReceipt}
                        className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <DollarSign size={14} />
                        THU TIỀN & IN BIÊN LAI
                      </button>
                    </div>
                  </div>

                  {/* History billing receipts logs */}
                  <div className="lg:col-span-7 space-y-4">
                    {invoicePreview && (
                      <div className="bg-white border border-dashed border-zinc-300 p-6 rounded-2xl shadow-sm text-center relative space-y-4 animate-fade-in select-text">
                        <span className="absolute top-2.5 right-3 text-xxs text-emerald-500 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Đã thanh toán
                        </span>
                        <h6 className="font-display font-extrabold text-zinc-950 text-sm">BẢN XEM TRƯỚC HÓA ĐƠN ĐIỆN TỬ</h6>
                        
                        <div className="border border-zinc-200 p-4 rounded-xl text-left text-xs bg-zinc-50/50 space-y-2 leading-relaxed">
                          <div>
                            <span className="text-zinc-400 font-bold">Mã số:</span> <span className="font-bold text-zinc-800">{invoicePreview.maHD}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 font-bold">Học viên:</span> <span className="font-bold text-zinc-800">{students.find(s=>s.maHV===feeStudentId)?.tenHV || "Học Viên"}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 font-bold">Số tiền:</span> <span className="font-bold text-rose-600">{Number((parseFloat(feeAmount) || 0) + (parseFloat(feeExtra) || 0)).toLocaleString("vi-VN")}₫</span>
                          </div>
                          <div className="flex justify-center border-t border-dashed pt-4 mt-3">
                            <img src={invoicePreview.vietqrUrl} className="max-h-24 rounded-lg border bg-white" alt="QR Pay" />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 text-xxs font-bold">
                          <button
                            onClick={() => {
                              const printWindow = window.open("", "_blank");
                              if(printWindow) {
                                printWindow.document.write(`
                                  <html>
                                    <head><title>In biên lai học phí</title></head>
                                    <body style="margin:0; padding:20px; font-family:sans-serif;" onload="window.print(); window.close();">
                                      ${invoicePreview.htmlInvoice}
                                    </body>
                                  </html>
                                `);
                                printWindow.document.close();
                              }
                            }}
                            className="px-4 py-2 border rounded-full hover:bg-zinc-50 cursor-pointer"
                          >
                            In Hóa Đơn PDF
                          </button>
                          <button
                            onClick={() => setInvoicePreview(null)}
                            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-850 text-white rounded-full cursor-pointer"
                          >
                            Đóng xem trước
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                        <h6 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400">
                          Lịch Sử Hóa Đơn Gần Đây
                        </h6>
                      </div>
                      <table className="w-full text-center border-collapse">
                        <thead className="bg-zinc-50 border-b">
                          <tr>
                            <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 text-left">Mã Số</th>
                            <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 text-left">Học Viên</th>
                            <th className="py-2.5 px-4 text-xs font-bold text-zinc-500">Số Tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                          {feeReceiptHistory.map((receipt) => (
                            <tr key={receipt.maHD} className="hover:bg-zinc-50/50">
                              <td className="py-3 px-4 text-left">
                                <span className="font-mono text-zinc-400 block">{receipt.maHD}</span>
                                <span className="text-[10px] text-zinc-400 block font-normal">{receipt.ngayThu}</span>
                              </td>
                              <td className="py-3 px-4 text-left font-bold text-zinc-950">
                                {receipt.tenHV}
                                <span className="text-xxs text-zinc-400 font-normal block mt-0.5">{receipt.maHV}</span>
                              </td>
                              <td className="py-3 px-4 font-extrabold text-rose-500 font-mono">
                                {Number(receipt.soTien).toLocaleString("vi-VN")}đ
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BULK TELEGRAM CHANNELS */}
              {adminTab === "telegram" && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto border-t-4 border-t-sky-400 space-y-4">
                  <h5 className="font-display font-bold text-lg text-zinc-950 flex items-center gap-2 pb-2 border-b">
                    <Mail className="text-sky-500 animate-bounce" size={20} />
                    Gửi Thông Báo Hàng Loạt Qua Telegram
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Phạm vi gửi tin:
                      </label>
                      <select
                        value={bulkMsgType}
                        onChange={(e: any) => {
                          setBulkMsgType(e.target.value);
                          setBulkMsgTarget("");
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="all">Tất cả Học Viên</option>
                        <option value="class">Theo Lớp Học</option>
                        <option value="individual">Từng Cá Nhân</option>
                      </select>
                    </div>

                    {bulkMsgType !== "all" && (
                      <div className="md:col-span-2">
                        <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                          Lựa chọn đối tượng:
                        </label>
                        {bulkMsgType === "class" ? (
                          <select
                            value={bulkMsgTarget}
                            onChange={(e) => setBulkMsgTarget(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          >
                            <option value="">-- Chọn lớp học --</option>
                            {classes.map((c) => (
                              <option key={c.maLop} value={c.tenLop}>
                                {c.tenLop}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={bulkMsgTarget}
                            onChange={(e) => setBulkMsgTarget(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          >
                            <option value="">-- Chọn học viên cá nhân --</option>
                            {students.map((st) => (
                              <option key={st.maHV} value={st.maHV}>
                                {st.maHV} - {st.tenHV}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="md:col-span-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xxs font-bold text-zinc-500 uppercase tracking-wider">
                          Nội Dung Tin Nhắn Thông Báo
                        </label>
                        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-3">
                          <span>Số từ: <b>{bulkMsgContent.trim() ? bulkMsgContent.trim().split(/\s+/).length : 0}</b></span>
                          <span>Ký tự: <b>{bulkMsgContent.length}</b></span>
                        </div>
                      </div>

                      <div className="flex flex-col border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-sky-200 transition-all">
                        {/* 1. Primary Rich Toolbar */}
                        <div className="flex items-center gap-1.5 p-2 bg-zinc-50 border-b border-zinc-150 flex-wrap">
                          {/* Format buttons */}
                          <button
                            type="button"
                            onClick={() => applyFormatting("<b>", "</b>")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 font-bold transition-all cursor-pointer"
                            title="Chữ đậm (Bold)"
                          >
                            <Bold size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting("<i>", "</i>")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 italic transition-all cursor-pointer"
                            title="Chữ nghiêng (Italic)"
                          >
                            <Italic size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting("<u>", "</u>")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 underline transition-all cursor-pointer"
                            title="Gạch chân (Underline)"
                          >
                            <Underline size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting("<s>", "</s>")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 line-through transition-all cursor-pointer"
                            title="Gạch đè (Strikethrough)"
                          >
                            <Strikethrough size={14} />
                          </button>
                          
                          <span className="w-px h-5 bg-zinc-200 mx-1" />
                          
                          <button
                            type="button"
                            onClick={() => applyFormatting("<code>", "</code>")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 font-mono text-[11px] transition-all cursor-pointer"
                            title="Mã Code (Inline Code)"
                          >
                            <Code size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting("<pre>", "</pre>")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 font-mono text-[11px] transition-all cursor-pointer"
                            title="Đoạn văn Monospace"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt("Nhập đường dẫn liên kết (URL):", "https://");
                              if (url) {
                                applyFormatting(`<a href="${url}">`, "</a>");
                              }
                            }}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 transition-all cursor-pointer"
                            title="Chèn liên kết (Link)"
                          >
                            <Link size={14} />
                          </button>
                          
                          <span className="w-px h-5 bg-zinc-200 mx-1" />
                          
                          <button
                            type="button"
                            onClick={() => applyFormatting("<b>🔔 ", "</b>")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-sky-700 hover:text-sky-900 transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                            title="Tiêu đề thông báo"
                          >
                            <Heading size={12} /> Tiêu đề
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting("• ", "")}
                            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-700 hover:text-zinc-950 transition-all text-[11px] font-bold cursor-pointer"
                            title="Dấu đầu dòng (Bullet list)"
                          >
                            • Danh sách
                          </button>
                          
                          <span className="w-px h-5 bg-zinc-200 mx-1" />
                          
                          {/* Quick template selector */}
                          <div className="relative group">
                            <button
                              type="button"
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md transition-all cursor-pointer border border-sky-100"
                              title="Chọn tin nhắn mẫu soạn sẵn"
                            >
                              <Sparkles size={11} className="animate-pulse" />
                              Mẫu có sẵn
                              <ChevronDown size={10} />
                            </button>
                            <div className="absolute left-0 mt-1 hidden group-hover:block group-focus-within:block bg-white border border-zinc-200 rounded-xl shadow-lg p-1 w-64 z-50 animate-fade-in divide-y divide-zinc-50">
                              <button
                                type="button"
                                onClick={() => setBulkMsgContent(`<b>🔔 THÔNG BÁO NGHỈ HỌC & HỌC BÙ</b>\n\nKính gửi quý Phụ huynh,\n\nDo có lịch đột xuất, lớp học vào ngày <b>[Ngày nghỉ]</b> sẽ tạm nghỉ.\nLịch học bù dự kiến sẽ diễn ra vào lúc: <b>[Giờ học] - [Ngày học bù]</b>.\n\nKính mong quý phụ huynh lưu ý sắp xếp thời gian cho các con.\n\n<i>Trân trọng,\nLớp Nhạc Huỳnh Long 🎸</i>`)}
                                className="w-full text-left px-3 py-2 text-[11px] hover:bg-zinc-50 text-zinc-700 rounded-lg font-medium block"
                              >
                                📅 Thông báo Nghỉ học / Học bù
                              </button>
                              <button
                                type="button"
                                onClick={() => setBulkMsgContent(`<b>🔔 THÔNG BÁO HOÀN THÀNH HỌC PHÍ</b>\n\nKính gửi quý Phụ huynh học viên,\n\nNhà trường xin thông báo và gửi chi tiết học phí khóa học tháng này:\n• Số tiền cần thanh toán: <b>[Số tiền]đ</b>\n• Hạn hoàn thành: <b>Trước ngày [Hạn đóng]</b>\n\nQuý phụ huynh vui lòng đóng trực tiếp hoặc chuyển khoản về tài khoản lớp nhạc.\n\n<i>Xin chân thành cảm ơn sự đồng hành của quý phụ huynh! 🌸</i>`)}
                                className="w-full text-left px-3 py-2 text-[11px] hover:bg-zinc-50 text-zinc-700 rounded-lg font-medium block"
                              >
                                💰 Nhắc hoàn thành học phí
                              </button>
                              <button
                                type="button"
                                onClick={() => setBulkMsgContent(`<b>🎉 CHÀO MỪNG HỌC VIÊN MỚI</b>\n\nLớp Nhạc Huỳnh Long nồng nhiệt chào đón con gia nhập câu lạc bộ âm nhạc!\n• Lớp học đăng ký: <b>[Tên lớp]</b>\n• Lịch học: <b>[Giờ học] - [Thứ] hàng tuần</b>\n\nChúc con sẽ có những buổi học bổ ích, tràn đầy cảm hứng âm nhạc và phát triển kỹ năng thật tốt!\n\n<i>Let's play together! 🎸🎹🎤</i>`)}
                                className="w-full text-left px-3 py-2 text-[11px] hover:bg-zinc-50 text-zinc-700 rounded-lg font-medium block"
                              >
                                🎉 Chào mừng Học viên mới
                              </button>
                            </div>
                          </div>

                          <div className="ml-auto flex items-center gap-1">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={copyToClipboard}
                              className={`p-1.5 rounded transition-all cursor-pointer ${isCopied ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 border border-transparent"}`}
                              title="Sao chép văn bản (Copy)"
                            >
                              {isCopied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            
                            {/* Clear button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Bạn có chắc chắn muốn xóa toàn bộ văn bản?")) {
                                  setBulkMsgContent("");
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded transition-all cursor-pointer"
                              title="Xóa toàn bộ (Clear)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* 2. Advanced Utilities Sub-Panel */}
                        <div className="p-3 bg-zinc-50/50 border-b border-zinc-150 grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                          {/* Col 1: Search & Replace */}
                          <div className="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-2 shadow-xs">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              <Search size={12} className="text-sky-500" />
                              Tìm & Thay Thế
                            </div>
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                placeholder="Từ cần tìm..."
                                value={editorSearchQuery}
                                onChange={(e) => setEditorSearchQuery(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:bg-white text-zinc-900 placeholder-zinc-400"
                              />
                              <input
                                type="text"
                                placeholder="Thay thế bằng..."
                                value={editorReplaceQuery}
                                onChange={(e) => setEditorReplaceQuery(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:bg-white text-zinc-900 placeholder-zinc-400"
                              />
                              <div className="flex gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSearchReplace(false)}
                                  className="flex-1 py-1 px-2 text-[10px] font-semibold bg-zinc-100 hover:bg-zinc-200 rounded transition-all cursor-pointer text-zinc-700"
                                >
                                  Thay đầu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSearchReplace(true)}
                                  className="flex-1 py-1 px-2 text-[10px] font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded transition-all cursor-pointer"
                                >
                                  Thay tất cả
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Text Case Changer & Emoji Palette */}
                          <div className="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-2.5 shadow-xs">
                            {/* Case converter */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                <Type size={12} className="text-sky-500" />
                                Chuyển Đổi Kiểu Chữ (Bôi đen để đổi)
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => changeCase("upper")}
                                  className="flex-1 py-1 px-1 text-[9px] font-bold bg-zinc-50 hover:bg-zinc-150 rounded border border-zinc-200 text-zinc-700 uppercase"
                                  title="CHỮ HOA TOÀN BỘ"
                                >
                                  IN HOA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => changeCase("lower")}
                                  className="flex-1 py-1 px-1 text-[9px] font-bold bg-zinc-50 hover:bg-zinc-150 rounded border border-zinc-200 text-zinc-700 lowercase"
                                  title="chữ thường toàn bộ"
                                >
                                  thường
                                </button>
                                <button
                                  type="button"
                                  onClick={() => changeCase("title")}
                                  className="flex-1 py-1 px-1 text-[9px] font-bold bg-zinc-50 hover:bg-zinc-150 rounded border border-zinc-200 text-zinc-700 capitalize"
                                  title="Viết Hoa Chữ Cái Đầu"
                                >
                                  In Đầu
                                </button>
                              </div>
                            </div>

                            {/* Quick Emojis Palette */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                <Smile size={12} className="text-sky-500" />
                                Chèn Biểu Tượng Cảm Xúc nhanh
                              </div>
                              <div className="flex flex-wrap gap-1 bg-zinc-50 p-1.5 rounded-md">
                                {["🎸", "🎹", "🎤", "🎵", "🎶", "🔔", "🌸", "💰", "🎉", "⚠️", "📅", "✅"].map((emo) => (
                                  <button
                                    key={emo}
                                    type="button"
                                    onClick={() => insertTextAtCursor(emo)}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 rounded text-xs transition-all cursor-pointer shadow-2xs"
                                    title={`Chèn ${emo}`}
                                  >
                                    {emo}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Col 3: Personalization Variables (Cá nhân hóa) */}
                          <div className="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-2 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                <Sparkles size={12} className="text-amber-500" />
                                Cá Nhân Hóa Tin Nhắn
                              </div>
                              <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">
                                Nhấp chọn từ khóa dưới đây để chèn. Khi gửi, hệ thống tự thay bằng thông tin tương ứng:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => insertTextAtCursor("{TenHV}")}
                                  className="px-2 py-1 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 rounded-md transition-all cursor-pointer"
                                  title="Chèn Tên Học Viên thực tế"
                                >
                                  {"{TenHV}"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => insertTextAtCursor("{MaHV}")}
                                  className="px-2 py-1 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 rounded-md transition-all cursor-pointer"
                                  title="Chèn Mã Học Viên thực tế"
                                >
                                  {"{MaHV}"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => insertTextAtCursor("{Lop}")}
                                  className="px-2 py-1 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 rounded-md transition-all cursor-pointer"
                                  title="Chèn Lớp học thực tế"
                                >
                                  {"{Lop}"}
                                </button>
                              </div>
                            </div>
                            <div className="text-[9px] text-amber-600 bg-amber-50/50 border border-amber-100 rounded p-1 leading-relaxed mt-1">
                              VD: <i>Nhắc {"{TenHV}"} nộp học phí</i>
                            </div>
                          </div>
                        </div>

                        {/* Textarea */}
                        <textarea
                          id="bulk-message-textarea"
                          value={bulkMsgContent}
                          onChange={(e) => setBulkMsgContent(e.target.value)}
                          rows={6}
                          placeholder="Soạn thảo thông báo của bạn tại đây hoặc chọn các nút định dạng ở trên..."
                          className="w-full bg-transparent p-3 text-xs font-sans text-zinc-800 focus:outline-none min-h-[120px] resize-y leading-relaxed"
                        />
                      </div>

                      {/* Live Telegram Preview */}
                      <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 shadow-inner">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                            <Mail size={12} className="text-sky-500" />
                            Xem trước tin nhắn trên Telegram của Phụ huynh
                          </div>
                          <span className="text-[9px] text-zinc-400 italic">Tự động mô phỏng trộn thư</span>
                        </div>
                        
                        <div className="flex items-start gap-2 max-w-full">
                          {/* Bot Avatar */}
                          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                            HL
                          </div>
                          
                          {/* Chat bubble */}
                          <div className="relative bg-white border border-zinc-150 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm max-w-[85%] animate-fade-in">
                            <div className="text-[11px] font-bold text-sky-600 mb-0.5">Huỳnh Long Music School</div>
                            
                            {/* Render HTML content with replacements */}
                            <div 
                              className="text-xs text-zinc-800 leading-relaxed break-words whitespace-pre-wrap select-text"
                              dangerouslySetInnerHTML={{ 
                                __html: (() => {
                                  if (!bulkMsgContent) {
                                    return `<span class="text-zinc-400 italic">Tin nhắn trống. Sử dụng thanh công cụ soạn thảo ở trên để làm nổi bật tin nhắn...</span>`;
                                  }
                                  let rendered = bulkMsgContent;
                                  rendered = rendered.replace(/\{TenHV\}/g, `<b class="text-sky-600 font-bold bg-sky-50 px-1 rounded">Nguyễn Văn A</b>`);
                                  rendered = rendered.replace(/\{MaHV\}/g, `<code class="bg-zinc-100 text-zinc-800 px-1 rounded font-mono font-bold">HV001</code>`);
                                  rendered = rendered.replace(/\{Lop\}/g, `<b class="text-sky-600 font-bold bg-sky-50 px-1 rounded">Lớp Guitar Bass 1</b>`);
                                  return rendered.replace(/\n/g, "<br/>");
                                })()
                              }}
                            />
                            
                            {/* Bubble footer */}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-zinc-400 font-mono">
                              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-sky-500 font-bold">✓✓</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSendBulkMessage}
                    className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl tracking-wide uppercase transition-all shadow-md shadow-sky-950/20 cursor-pointer"
                  >
                    GỬI TIN NHẮN CHUYÊN BIỆT
                  </button>
                </div>
              )}

              {/* TAB: SYSTEM CONFIGS */}
              {adminTab === "settings" && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-5 border-t-4 border-t-zinc-600 select-none">
                  <h5 className="font-display font-bold text-lg text-zinc-950 pb-2 border-b">
                    Cấu Hình Tích Hợp Hệ Thống
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Telegram Bot Token (Lấy từ @BotFather)
                      </label>
                      <input
                        type="text"
                        value={setBotToken}
                        onChange={(e) => setSetBotToken(e.target.value)}
                        placeholder="123456789:AAHxxxxxxxxxxxxx"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-900 placeholder-zinc-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Admin Chat ID nhận báo cáo tổng hợp
                      </label>
                      <input
                        type="text"
                        value={setAdminId}
                        onChange={(e) => setSetAdminId(e.target.value)}
                        placeholder="Ví dụ: 987654321"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-900 placeholder-zinc-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Tên Ngân Hàng VietQR nhận học phí
                      </label>
                      <select
                        value={setBankName}
                        onChange={(e) => setSetBankName(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none font-semibold text-zinc-700"
                      >
                        <option value="MBBank">MBBank (Quân Đội)</option>
                        <option value="Vietcombank">Vietcombank</option>
                        <option value="Techcombank">Techcombank</option>
                        <option value="ACB">ACB</option>
                        <option value="Viettinbank">Vietinbank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Số Tài Khoản Ngân Hàng
                      </label>
                      <input
                        type="text"
                        value={setBankAcc}
                        onChange={(e) => setSetBankAcc(e.target.value)}
                        placeholder="007100xxxxxxxx"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono text-zinc-900 placeholder-zinc-400"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Tên Chủ Tài Khoản (In hoa không dấu)
                      </label>
                      <input
                        type="text"
                        value={setBankOwner}
                        onChange={(e) => setSetBankOwner(e.target.value)}
                        placeholder="HUYNH BA LONG"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono text-zinc-900 placeholder-zinc-400"
                      />
                    </div>

                    {/* Zalo OA Configuration Block */}
                    <div className="md:col-span-2 mt-4 pt-4 border-t border-zinc-100">
                      <h6 className="font-display font-bold text-xs text-sky-600 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
                        Cấu hình tích hợp Zalo OA (Official Account)
                      </h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Zalo Official Account ID (OA ID)
                          </label>
                          <input
                            type="text"
                            value={setZaloOaId}
                            onChange={(e) => setSetZaloOaId(e.target.value)}
                            placeholder="Ví dụ: 228394857602938475"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-900 placeholder-zinc-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Zalo OA Access Token (Mã truy cập)
                          </label>
                          <input
                            type="text"
                            value={setZaloAccessToken}
                            onChange={(e) => setSetZaloAccessToken(e.target.value)}
                            placeholder="Mã token OAuth của Zalo App..."
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono text-zinc-900 placeholder-zinc-400"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="zaloActiveCheckbox"
                            checked={setZaloActive}
                            onChange={(e) => setSetZaloActive(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                          <label htmlFor="zaloActiveCheckbox" className="text-xs font-semibold text-zinc-600 cursor-pointer select-none">
                            Bật tính năng gửi tin nhắn Zalo tự động (Gửi bảng lương cho giáo viên, học phí cho học viên)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Google Apps Script Integration for Serverless/Mobile App */}
                  <div className="mt-4 pt-4 border-t border-zinc-100">
                    <h6 className="font-display font-bold text-xs text-emerald-600 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Cấu hình độc lập Google Sheet (Dành cho bản cài APK điện thoại)
                    </h6>
                    <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                      Khi chạy app độc lập (file APK cài đặt) trên điện thoại không cần máy chủ Node.js, bạn hãy dán URL Web App Google Apps Script bên dưới. Hệ thống sẽ kết nối trực tiếp đến Google Sheet của bạn làm cơ sở dữ liệu!
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                          Google Apps Script Web App URL (Đuôi /exec)
                        </label>
                        <input
                          type="text"
                          value={gasWebAppUrl}
                          onChange={(e) => {
                            setGasWebAppUrl(e.target.value);
                            localStorage.setItem("gas_web_app_url", e.target.value);
                          }}
                          placeholder="https://script.google.com/macros/s/xxxxxxxxxxxxxx/exec"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono text-zinc-900 placeholder-zinc-400"
                        />
                      </div>
                      {gasWebAppUrl && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                          <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                            Chế độ Google Sheets Độc lập đang HOẠT ĐỘNG
                          </span>
                          <button
                            onClick={() => {
                              setGasWebAppUrl("");
                              localStorage.removeItem("gas_web_app_url");
                              alert("Đã tắt chế độ độc lập, app sẽ dùng máy chủ API mặc định!");
                            }}
                            className="text-[10px] font-bold text-rose-500 hover:underline ml-auto cursor-pointer"
                          >
                            Tắt & Dùng máy chủ mặc định
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-4 border-t">
                    <button
                      onClick={handleActiveAutoScheduler}
                      className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-zinc-950 rounded-full text-xs font-bold cursor-pointer transition-all"
                    >
                      Kích hoạt báo cáo tự động
                    </button>
                    <button
                      onClick={handleSaveSettings}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-bold cursor-pointer shadow-sm transition-all"
                    >
                      Lưu Cấu Hình
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "sheets" && (
                <div className="max-w-4xl mx-auto">
                  <AdminSheetsSync onRefresh={fetchGlobalData} />
                </div>
              )}
            </div>
          </div>

          {/* Mobile Fixed Bottom Navigation Bar for Admin */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg flex justify-around py-3 px-1 pb-safe z-50 shadow-[0_-10px_30px_rgba(28,133,166,0.1)]">
            <button
              onClick={() => {
                setAdminTab("dashboard");
                playCyberSound(500, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                adminTab === "dashboard" ? "text-[#f9a01b] scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <TrendingUp size={18} className={adminTab === "dashboard" ? "text-[#f9a01b]" : "text-slate-600"} />
              <span>THỐNG KÊ</span>
            </button>
            <button
              onClick={() => {
                setAdminTab("classes");
                fetchGlobalData();
                playCyberSound(550, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                adminTab === "classes" ? "text-[#f9a01b] scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Calendar size={18} className={adminTab === "classes" ? "text-[#f9a01b]" : "text-slate-600"} />
              <span>LỚP HỌC</span>
            </button>
            <button
              onClick={() => {
                setAdminTab("students");
                fetchGlobalData();
                playCyberSound(600, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                adminTab === "students" ? "text-[#f9a01b] scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Users size={18} className={adminTab === "students" ? "text-[#f9a01b]" : "text-slate-600"} />
              <span>HỌC VIÊN</span>
            </button>
            <button
              onClick={() => {
                setAdminTab("attendance");
                fetchGlobalData();
                playCyberSound(650, "sine", 0.08);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                adminTab === "attendance" ? "text-[#f9a01b] scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <CheckCircle size={18} className={adminTab === "attendance" ? "text-[#f9a01b] animate-pulse" : "text-slate-600"} />
              <span>ĐIỂM DANH</span>
            </button>
            <button
              onClick={() => {
                setIsAdminMoreOpen(true);
                playCyberSound(700, "sine", 0.1);
              }}
              className={`flex flex-col items-center gap-1.5 flex-1 py-0.5 text-[9px] font-black font-mono tracking-wider transition-all ${
                ["teachers", "songs", "fees", "telegram", "settings", "sheets"].includes(adminTab) || isAdminMoreOpen ? "text-[#f9a01b] scale-105" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Compass size={18} className={["teachers", "songs", "fees", "telegram", "settings", "sheets"].includes(adminTab) || isAdminMoreOpen ? "text-[#f9a01b]" : "text-slate-600"} />
              <span>XEM THÊM</span>
            </button>
          </div>

          {/* Mobile Admin More Menu Slide-Up Sheet */}
          <div 
            className={`lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md transition-all duration-300 flex items-end justify-center ${
              isAdminMoreOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => {
              setIsAdminMoreOpen(false);
              playCyberSound(300, "sine", 0.15);
            }}
          >
            <div
              className={`bg-slate-950 w-full rounded-t-[32px] border-t-2 border-[#1c85a6]/40 shadow-[0_-15px_45px_rgba(28,133,166,0.2)] transition-transform duration-300 ease-out transform pb-12 ${
                isAdminMoreOpen ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle Indicator */}
              <div 
                className="py-4 cursor-pointer group" 
                onClick={() => {
                  setIsAdminMoreOpen(false);
                  playCyberSound(300, "sine", 0.15);
                }}
              >
                <div className="w-16 h-1 bg-gradient-to-r from-[#1c85a6] via-[#f9a01b] to-[#f05a28] rounded-full mx-auto opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="px-6 pb-4">
                <h3 className="font-display font-black text-sm text-slate-400 tracking-wider font-mono text-center mb-4 uppercase">
                  ⚡ CÔNG CỤ QUẢN TRỊ MỞ RỘNG
                </h3>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <button
                    onClick={() => {
                      setAdminTab("teachers");
                      fetchPayrollReport();
                      setIsAdminMoreOpen(false);
                      playCyberSound(650, "sine", 0.08);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "teachers"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <User size={16} className="shrink-0" />
                    <span>GIÁO VIÊN & LƯƠNG</span>
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("songs");
                      setIsAdminMoreOpen(false);
                      playCyberSound(750, "sine", 0.08);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "songs"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <FileText size={16} className="shrink-0" />
                    <span>KHO BÀI HÁT</span>
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("fees");
                      fetchFeeHistory();
                      fetchGlobalData();
                      setIsAdminMoreOpen(false);
                      playCyberSound(800, "sine", 0.08);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "fees"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <DollarSign size={16} className="shrink-0" />
                    <span>THU HỌC PHÍ</span>
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("telegram");
                      setIsAdminMoreOpen(false);
                      playCyberSound(850, "sine", 0.08);
                    }}
                    className={`shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal text-left px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 lg:gap-3 ${
                      adminTab === "telegram"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <MessageSquare size={16} className="shrink-0" />
                    <span>GỬI THÔNG BÁO</span>
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("settings");
                      setIsAdminMoreOpen(false);
                      playCyberSound(900, "sine", 0.08);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "settings"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <Compass size={16} className="shrink-0" />
                    <span>CÀI ĐẶT CHUNG</span>
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab("sheets");
                      setIsAdminMoreOpen(false);
                      playCyberSound(950, "sine", 0.08);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "sheets"
                        ? "bg-gradient-to-r from-[#1c85a6] to-[#f05a28] text-white shadow-md"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <FileSpreadsheet size={16} className="shrink-0" />
                    <span>ĐỒNG BỘ SHEETS</span>
                  </button>
                </div>

                <div className="border-t border-slate-900 my-5" />

                <button
                  onClick={() => {
                    setIsAdminMoreOpen(false);
                    handleAdminLogout();
                    playCyberSound(300, "sine", 0.2);
                  }}
                  className="w-full text-center py-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 rounded-2xl text-xs font-black tracking-widest uppercase transition-all cursor-pointer font-mono shadow-md"
                >
                  <LogOut size={14} className="inline-block mr-1.5 -translate-y-0.5" />
                  ĐĂNG XUẤT ADMIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FOOTER CREDITS */}
      <footer className="w-full py-4 bg-zinc-950 text-center text-zinc-500 text-[10px] select-none border-t border-zinc-900 leading-normal font-medium tracking-wide">
        &copy; 2026 Lớp Nhạc Guitar Huỳnh Long. Crafted inside Node.js Cloud Runtime Environment. All rights reserved.
      </footer>

      {/* 5. FLOATING COMPONENT OR DETAILED SONG READER OVERLAYS */}
      {activeSongView && (
        <InteractiveSongView
          song={activeSongView}
          onClose={() => setActiveSongView(null)}
        />
      )}

      {/* MODAL: TELEGRAM GUIDE */}
      {showTelegramGuide && (
        <div className="fixed inset-0 bg-black/60 z-[1250] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative select-none">
            <h5 className="font-display font-extrabold text-zinc-950 text-base mb-2 flex items-center gap-1.5">
              <Mail className="text-sky-500" size={18} />
              Hướng dẫn liên kết Telegram
            </h5>
            <p className="text-zinc-400 text-xs mb-6">
              Lớp nhạc Huỳnh Long tự động nhắn tin điểm danh, học phí qua Telegram. Ba mẹ thực hiện 3 bước sau:
            </p>

            <div className="space-y-4 text-xs font-semibold text-zinc-700">
              <div className="flex gap-3">
                <span className="w-5 h-5 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center flex-shrink-0 text-xxs">1</span>
                <div>
                  <span className="block text-zinc-900 font-bold mb-0.5">Tìm Bot của trung tâm</span>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    Mở Telegram gõ tìm <strong className="text-sky-500">@huynhlong_guitar_bot</strong> và bấm nút <strong className="text-sky-500">START</strong> để kích hoạt kết nối.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center flex-shrink-0 text-xxs">2</span>
                <div>
                  <span className="block text-zinc-900 font-bold mb-0.5">Lấy ID Telegram của bạn</span>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    Gõ tìm <strong className="text-sky-500">@userinfobot</strong> và bấm <strong className="text-sky-500">START</strong>. Bot sẽ gửi lại ID gồm 9-10 chữ số.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center flex-shrink-0 text-xxs">3</span>
                <div>
                  <span className="block text-zinc-900 font-bold mb-0.5">Gửi ID cho Thầy Long</span>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    Nhập ID Telegram này vào thông tin hồ sơ của bạn trên hệ thống để hoàn tất đăng ký.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTelegramGuide(false)}
              className="mt-6 w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE CARD DISPLAYER */}
      {showQRModal && currentStudent && (
        <div className="fixed inset-0 bg-black/60 z-[1250] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center select-none space-y-4">
            <h5 className="font-display font-extrabold text-zinc-900 text-sm">Thẻ Học Viên & QR Check-in</h5>
            <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl inline-block">
              {/* Dynamic QR API creation */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${currentStudent.maHV}`}
                className="w-40 h-44 rounded border bg-white"
                alt="QR Code"
              />
            </div>
            <div>
              <h6 className="font-display font-bold text-sm text-zinc-950">{currentStudent.tenHV}</h6>
              <span className="text-xxs font-mono text-zinc-400">Mã Số: {currentStudent.maHV}</span>
            </div>
            <p className="text-zinc-400 text-xxs leading-relaxed font-medium">
              Đưa mã QR này trước camera tại lớp học để tự động điểm danh chuyên cần có mặt cực nhanh!
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Đóng thẻ
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL SAFER TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[3000] max-w-sm w-full p-4">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md transition-all ${
            toast.type === "success" 
              ? "bg-zinc-900/95 border-emerald-500/30 text-emerald-200" 
              : toast.type === "error" 
              ? "bg-zinc-900/95 border-rose-500/30 text-rose-200" 
              : "bg-zinc-900/95 border-zinc-700/50 text-zinc-100"
          }`}>
            <div className="mt-0.5 flex-shrink-0">
              {toast.type === "success" ? (
                <CheckCircle className="text-emerald-400" size={18} />
              ) : toast.type === "error" ? (
                <AlertCircle className="text-rose-400" size={18} />
              ) : (
                <Info className="text-zinc-400" size={18} />
              )}
            </div>
            <div className="flex-grow">
              <p className="text-xs font-semibold leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
