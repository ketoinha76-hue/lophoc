import { useState, useEffect, useRef } from "react";
import { fetch } from "../lib/api";
import { CheckCircle, QrCode, Calendar, Clock, RefreshCw, AlertTriangle, Play, Sparkles } from "lucide-react";
import { Student, ClassRoom, Attendance } from "../types";

interface AdminAttendanceProps {
  students: Student[];
  classes: ClassRoom[];
}

export default function AdminAttendance({ students, classes }: AdminAttendanceProps) {
  const [activeSubTab, setActiveSubTab] = useState<"today" | "qr" | "bu" | "history">("today");
  
  // Today states
  const [selectedClassToday, setSelectedClassToday] = useState<string>("");
  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>([]);
  const [fadeStudentsList, setFadeStudentsList] = useState<string[]>([]);

  // Bù states
  const [buDate, setBuDate] = useState<string>("");
  const [buClass, setBuClass] = useState<string>("");

  // QR States
  const [qrManualInput, setQrInputManual] = useState<string>("");
  const [qrSuccessMsg, setQrSuccessMsg] = useState<string>("");

  // History states
  const [histDay, setHistDay] = useState<string>("");
  const [histMonth, setHistMonth] = useState<string>("");
  const [histYear, setHistYear] = useState<string>("2026");

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        setAttendanceLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Automated checks
  const getTodayFormattedDate = () => {
    const d = new Date();
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  };

  const getStudentsInClass = (className: string) => {
    return students.filter((s) => s.lop === className);
  };

  const checkTodayMarked = (maHV: string) => {
    const today = getTodayFormattedDate();
    return attendanceLogs.some((a) => a.maHV.toUpperCase() === maHV.toUpperCase() && a.ngay === today);
  };

  const checkCustomMarked = (maHV: string, customDate: string) => {
    return attendanceLogs.some((a) => a.maHV.toUpperCase() === maHV.toUpperCase() && a.ngay === customDate);
  };

  // Submit check-in
  const handleMarkPresent = async (maHV: string, className: string, customDate?: string) => {
    const dateVal = customDate || getTodayFormattedDate();
    
    // Add visual fade effect
    setFadeStudentsList((prev) => [...prev, maHV]);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maHV,
          ngayFormatted: dateVal,
          caLop: className
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          fetchAttendance();
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      console.error("Attendance submission failed", err);
    } finally {
      // Remove fade track
      setTimeout(() => {
        setFadeStudentsList((prev) => prev.filter((id) => id !== maHV));
      }, 500);
    }
  };

  const handleSendClassReport = async () => {
    if (!selectedClassToday) {
      alert("Vui lòng chọn lớp học trước khi gửi báo cáo!");
      return;
    }

    const classStudents = getStudentsInClass(selectedClassToday);
    const today = getTodayFormattedDate();
    
    const absents = classStudents.filter((st) => !checkTodayMarked(st.maHV));
    const presentCount = classStudents.length - absents.length;
    
    const absentNames = absents.map((s) => s.tenHV).join(", ") || "Không có (Đủ 100%)";
    const absentIds = absents.map((s) => s.maHV);

    if (!confirm(`Xác nhận gửi báo cáo điểm danh lớp "${selectedClassToday}" qua Telegram? Hệ thống cũng sẽ nhắn tin nhắc nhở các học viên vắng mặt.`)) return;

    try {
      const res = await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lop: selectedClassToday,
          siso: classStudents.length,
          dahoc: presentCount,
          chuahoc: absents.length,
          ngay: today,
          absentNames,
          absentIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      }
    } catch (e) {
      alert("Gửi báo cáo lỗi.");
    }
  };

  // Beep Audio Tone generator for QR simulations
  const playBeepAudio = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerQRScan = async (maHV: string) => {
    const student = students.find((s) => s.maHV.toUpperCase() === maHV.trim().toUpperCase());
    if (!student) {
      alert("Không tìm thấy mã học viên!");
      return;
    }

    playBeepAudio();
    const today = getTodayFormattedDate();

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maHV: student.maHV,
          ngayFormatted: today,
          caLop: student.lop
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQrSuccessMsg(`Quét QR Thành Công: [${student.maHV}] ${student.tenHV} đã điểm danh ca ${student.lop}.`);
          fetchAttendance();
          setTimeout(() => setQrSuccessMsg(""), 5000);
        } else {
          setQrSuccessMsg(`Cảnh báo: ${data.message}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter history records
  const filteredAttendance = attendanceLogs.filter((item) => {
    const parts = item.ngay.split("/");
    if (parts.length !== 3) return false;
    const matchesDay = histDay === "" || parseInt(parts[0]) === parseInt(histDay);
    const matchesMonth = histMonth === "" || parseInt(parts[1]) === parseInt(histMonth);
    const matchesYear = histYear === "" || parseInt(parts[2]) === parseInt(histYear);
    return matchesDay && matchesMonth && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm">
        <div className="flex gap-2 p-1 bg-zinc-100 border rounded-xl">
          <button
            onClick={() => setActiveSubTab("today")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "today" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setActiveSubTab("qr")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "qr" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Quét QR Code
          </button>
          <button
            onClick={() => setActiveSubTab("bu")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "bu" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Điểm danh bù
          </button>
          <button
            onClick={() => {
              setActiveSubTab("history");
              fetchAttendance();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "history" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Lịch sử
          </button>
        </div>

        {activeSubTab === "today" && selectedClassToday && (
          <button
            onClick={handleSendClassReport}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            Gửi báo cáo lớp học
          </button>
        )}
      </div>

      {/* TODAY TAB */}
      {activeSubTab === "today" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm">
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Chọn Lớp Học Điểm Danh:
              </label>
              <select
                value={selectedClassToday}
                onChange={(e) => setSelectedClassToday(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Chọn lớp học cần điểm danh hôm nay --</option>
                {classes.map((c) => (
                  <option key={c.maLop} value={c.tenLop}>
                    {c.tenLop}
                  </option>
                ))}
              </select>
            </div>

            {selectedClassToday ? (
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-zinc-50 border-b">
                    <tr>
                      <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Học viên</th>
                      <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Trạng thái điểm danh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                    {getStudentsInClass(selectedClassToday).map((st) => {
                      const isMarked = checkTodayMarked(st.maHV);
                      const isFading = fadeStudentsList.includes(st.maHV);

                      return (
                        <tr
                          key={st.maHV}
                          className={`hover:bg-zinc-50/50 transition-all duration-300 ${
                            isFading ? "opacity-30 scale-95 translate-x-2" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-left font-bold text-zinc-950">
                            {st.tenHV}
                            <span className="text-xxs text-zinc-400 font-normal block mt-0.5">
                              {st.maHV} - Ca: {st.caHoc}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {isMarked ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 font-bold tracking-wide">
                                <CheckCircle size={14} />
                                Đã có mặt
                              </span>
                            ) : (
                              <button
                                onClick={() => handleMarkPresent(st.maHV, selectedClassToday)}
                                className="bg-sky-600 hover:bg-sky-700 border border-sky-500 text-white rounded-full px-5 py-1.5 font-bold cursor-pointer transition-all shadow-xxs"
                              >
                                Điểm danh
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {getStudentsInClass(selectedClassToday).length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-8 text-center text-zinc-400 text-xs italic">
                          Lớp này chưa có học viên nào xếp lớp
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 p-12 rounded-2xl shadow-sm text-center text-zinc-400 text-xs italic">
                Hãy lựa chọn một lớp học phía trên để hiển thị danh sách điểm danh
              </div>
            )}
          </div>

          {/* Quick stats board today */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h6 className="font-display font-bold text-sm text-zinc-900 border-b pb-2 mb-2">Thống Kê Điểm Danh Hôm Nay</h6>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Lớp học chọn:</span>
                  <span className="font-bold text-zinc-900 truncate max-w-44">
                    {selectedClassToday || "Chưa chọn"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Tổng sĩ số:</span>
                  <span className="font-bold text-zinc-900">
                    {selectedClassToday ? getStudentsInClass(selectedClassToday).length : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Đã có mặt:</span>
                  <span className="font-bold text-emerald-600">
                    {selectedClassToday ? getStudentsInClass(selectedClassToday).filter(s => checkTodayMarked(s.maHV)).length : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Chưa điểm danh:</span>
                  <span className="font-bold text-sky-500">
                    {selectedClassToday ? getStudentsInClass(selectedClassToday).filter(s => !checkTodayMarked(s.maHV)).length : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR CAMERA SIMULATOR TAB */}
      {activeSubTab === "qr" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <h5 className="font-display font-medium text-lg text-white mb-4 flex items-center gap-2">
              <QrCode className="text-rose-500" size={20} />
              Trực Quan Quét QR Điểm Danh Học Viên
            </h5>

            <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-video w-full flex items-center justify-center mb-6">
              {/* Scan lasers and overlays */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
                <QrCode className="text-zinc-700 mb-2" size={40} />
                <span className="text-zinc-500 text-xs">Camera quét mã QR đang hoạt động.</span>
              </div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 border-2 border-dashed border-emerald-400/80 rounded-xl" />
              <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_#10b981] animate-laser" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Nhập Mã Học Viên Thủ Công:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrManualInput}
                    onChange={(e) => setQrInputManual(e.target.value)}
                    placeholder="Ví dụ: HV100"
                    className="flex-grow bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => {
                      triggerQRScan(qrManualInput);
                      setQrInputManual("");
                    }}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl px-5 py-3 transition-all cursor-pointer shadow-xs"
                  >
                    Điểm danh
                  </button>
                </div>
              </div>

              {qrSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center font-semibold">
                  {qrSuccessMsg}
                </div>
              )}
            </div>
          </div>

          {/* QR Scan quick triggers simulator list */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h5 className="font-display font-bold text-zinc-950 text-sm mb-2 flex items-center gap-1.5">
                <Sparkles className="text-sky-600 animate-bounce" size={16} />
                Trình Giả Lập Quét QR Nhanh
              </h5>
              <p className="text-zinc-400 text-xs mb-6">
                Bấm vào một học viên bất kỳ dưới đây để mô phỏng sự kiện quét mã QR thành công:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[300px] flex-grow pr-1">
              {students.map((st) => (
                <button
                  key={st.maHV}
                  onClick={() => triggerQRScan(st.maHV)}
                  className="p-3.5 bg-zinc-50 border border-zinc-100 hover:bg-sky-50 hover:border-sky-200 text-left rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-zinc-800 text-xs block group-hover:text-sky-900">
                      {st.tenHV}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{st.maHV}</span>
                  </div>
                  <Play size={10} className="text-zinc-400 group-hover:text-sky-500" fill="currentColor" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LATE BÙ ADJUST TAB */}
      {activeSubTab === "bu" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
          <h5 className="font-display font-bold text-lg text-zinc-900 mb-6 pb-2 border-b border-zinc-100">
            Cập Nhật Bổ Sung Điểm Danh (Học Bù / Trễ)
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Chọn ngày cần bổ sung (dd/mm/yyyy):
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  value={buDate}
                  onChange={(e) => setBuDate(e.target.value)}
                  placeholder="Ví dụ: 10/07/2026"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Chọn lớp học:
              </label>
              <select
                value={buClass}
                onChange={(e) => setBuClass(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Chọn lớp học --</option>
                {classes.map((c) => (
                  <option key={c.maLop} value={c.tenLop}>
                    {c.tenLop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {buClass && buDate ? (
            <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xxs">
              <table className="w-full text-center border-collapse">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Học viên</th>
                    <th className="py-2.5 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                  {getStudentsInClass(buClass).map((st) => {
                    const isMarked = checkCustomMarked(st.maHV, buDate);
                    return (
                      <tr key={st.maHV} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-4 text-left">
                          <span className="font-bold text-zinc-950 block">{st.tenHV}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{st.maHV}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isMarked ? (
                            <span className="text-emerald-500 font-bold bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1 inline-block">
                              Đã có mặt ngày {buDate}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkPresent(st.maHV, buClass, buDate)}
                              className="bg-sky-500 hover:bg-sky-600 border border-amber-400 text-white rounded-full px-4 py-1 font-bold cursor-pointer shadow-xxs"
                            >
                              Điểm danh bù
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-400 text-xs italic bg-zinc-50 rounded-xl border border-dashed">
              Lựa chọn Ngày bổ sung và lớp để xem danh sách học bù
            </div>
          )}
        </div>
      )}

      {/* HISTORY TABLE TAB */}
      {activeSubTab === "history" && (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Quick history filters */}
          <div className="bg-zinc-50 border-b border-zinc-200 p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-zinc-700">Bộ lọc ngày:</span>
            <input
              type="number"
              value={histDay}
              onChange={(e) => setHistDay(e.target.value)}
              placeholder="Ngày (1-31)"
              className="bg-white border rounded-lg px-3 py-1.5 text-xs text-zinc-800 w-24 focus:outline-none font-mono"
            />
            <input
              type="number"
              value={histMonth}
              onChange={(e) => setHistMonth(e.target.value)}
              placeholder="Tháng (1-12)"
              className="bg-white border rounded-lg px-3 py-1.5 text-xs text-zinc-800 w-24 focus:outline-none font-mono"
            />
            <input
              type="number"
              value={histYear}
              onChange={(e) => setHistYear(e.target.value)}
              placeholder="Năm (YYYY)"
              className="bg-white border rounded-lg px-3 py-1.5 text-xs text-zinc-800 w-24 focus:outline-none font-mono"
            />
            <button
              onClick={fetchAttendance}
              className="p-2 text-sky-600 bg-white border rounded-lg hover:bg-zinc-50 transition-all cursor-pointer"
              title="Làm mới lịch sử"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <table className="w-full text-center border-collapse">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Ngày tháng</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Học viên có mặt</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Lớp học / Ca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
              {filteredAttendance.map((item, i) => {
                const student = students.find((s) => s.maHV.toUpperCase() === item.maHV.toUpperCase());
                return (
                  <tr key={i} className="hover:bg-zinc-50/50">
                    <td className="py-3.5 px-4 text-left font-bold text-zinc-950 font-mono">{item.ngay}</td>
                    <td className="py-3.5 px-4 text-left">
                      <span className="font-semibold text-zinc-900 block">{student ? student.tenHV : "Không rõ"}</span>
                      <span className="text-xxs text-zinc-400 font-mono block mt-0.5">{item.maHV}</span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 italic">{item.ca}</td>
                  </tr>
                );
              })}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-zinc-400 text-xs italic">
                    Chưa có lịch sử điểm danh khớp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* QR scan animation helper styles */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 5%; }
          50% { top: 95%; }
          100% { top: 5%; }
        }
        .animate-laser {
          animation: scanLaser 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
