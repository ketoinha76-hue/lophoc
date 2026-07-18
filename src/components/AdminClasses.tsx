import { useState, useEffect } from "react";
import { fetch } from "../lib/api";
import { Plus, Trash2, Edit2, Calendar, Clock, RefreshCw, Layers, CheckCircle } from "lucide-react";
import { ClassRoom, Teacher, Booking, Student } from "../types";

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

interface AdminClassesProps {
  students: Student[];
  teachers: Teacher[];
  classes: ClassRoom[];
  onRefresh: () => void;
}

export default function AdminClasses({ students, teachers, classes, onRefresh }: AdminClassesProps) {
  const [activeTab, setActiveTab] = useState<"ds-lop" | "timetable" | "dat-cho">("ds-lop");
  const [isAddingClass, setIsRecordingClass] = useState<boolean>(false);
  const [isAddingBooking, setIsAddingBooking] = useState<boolean>(false);

  // Form states class
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const [className, setClassName] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [isFreeSchedule, setIsFreeSchedule] = useState<boolean>(false);
  const [day1, setDay1] = useState<string>("Thứ 2");
  const [timeStart1, setTimeStart1] = useState<string>("17:00");
  const [timeEnd1, setTimeEnd1] = useState<string>("18:30");
  const [day2, setDay2] = useState<string>("");
  const [timeStart2, setTimeStart2] = useState<string>("17:00");
  const [timeEnd2, setTimeEnd2] = useState<string>("18:30");

  // Form states booking
  const [bookingStudentId, setBookingStudentId] = useState<string>("");
  const [bookingClassId, setBookingClassId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");

  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClass = (c: ClassRoom) => {
    setEditClassId(c.maLop);
    setClassName(c.tenLop);
    setTeacherId(c.maGV);
    
    // Parse times
    if (c.lichHoc.includes("Tự do") || c.lichHoc.includes("Linh động")) {
      setIsFreeSchedule(true);
    } else {
      setIsFreeSchedule(false);
      // Simple parse mapping
      const parts = c.lichHoc.split("&");
      if (parts[0]) {
        const dayMatch = parts[0].match(/(Thứ \d|Chủ Nhật)/);
        const timeMatch = parts[0].match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/);
        if (dayMatch) setDay1(dayMatch[0]);
        if (timeMatch) {
          setTimeStart1(timeMatch[1]);
          setTimeEnd1(timeMatch[2]);
        }
      }
      if (parts[1]) {
        const dayMatch = parts[1].match(/(Thứ \d|Chủ Nhật)/);
        const timeMatch = parts[1].match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/);
        if (dayMatch) setDay2(dayMatch[0]);
        if (timeMatch) {
          setTimeStart2(timeMatch[1]);
          setTimeEnd2(timeMatch[2]);
        }
      } else {
        setDay2("");
      }
    }
    setIsRecordingClass(true);
  };

  const handleSaveClass = async () => {
    if (!className) {
      alert("Vui lòng điền đủ Tên Lớp!");
      return;
    }

    let lichHoc = "";
    if (isFreeSchedule) {
      lichHoc = "Tự do (Linh động thời gian)";
    } else {
      lichHoc = `${day1} (${timeStart1} - ${timeEnd1})`;
      if (day2) {
        lichHoc += ` & ${day2} (${timeStart2} - ${timeEnd2})`;
      }
    }

    const payload = { tenLop: className, lichHoc, maGV: teacherId || "GV100" };
    const url = editClassId ? `/api/classes/${editClassId}` : "/api/classes";
    const method = editClassId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editClassId ? "Cập nhật lớp thành công!" : "Tạo lớp mới thành công!");
        resetClassForm();
        onRefresh();
      }
    } catch (error) {
      alert("Lưu thông tin thất bại!");
    }
  };

  const handleDeleteClass = async (maLop: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lớp học này? Hành động không thể hoàn tác!")) return;
    try {
      const res = await fetch(`/api/classes/${maLop}`, { method: "DELETE" });
      if (res.ok) {
        alert("Đã xóa lớp thành công!");
        onRefresh();
      }
    } catch (e) {
      alert("Lỗi khi xóa lớp!");
    }
  };

  const resetClassForm = () => {
    setEditClassId(null);
    setClassName("");
    setTeacherId("");
    setIsFreeSchedule(false);
    setDay1("Thứ 2");
    setTimeStart1("17:00");
    setTimeEnd1("18:30");
    setDay2("");
    setIsRecordingClass(false);
  };

  // Bookings scheduler logic
  const handleSaveBooking = async () => {
    const student = students.find((s) => s.maHV === bookingStudentId);
    const cls = classes.find((c) => c.maLop === bookingClassId);

    if (!student || !cls || !bookingDate || !bookingTime) {
      alert("Vui lòng điền đầy đủ tất cả thông tin!");
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maHV: student.maHV,
          tenHV: student.tenHV,
          maLop: cls.maLop,
          tenLop: cls.tenLop,
          caHoc: bookingTime,
          ngay: bookingDate,
        }),
      });

      if (res.ok) {
        alert("Đã đăng ký ca học linh động thành công!");
        setIsAddingBooking(false);
        fetchBookings();
      }
    } catch (err) {
      alert("Đặt lịch thất bại.");
    }
  };

  const handleDeleteBooking = async (maBooking: string) => {
    if (!confirm("Xác nhận hủy đặt chỗ cho ca học này?")) return;
    try {
      const res = await fetch(`/api/bookings/${maBooking}`, { method: "DELETE" });
      if (res.ok) {
        alert("Đã hủy thành công!");
        fetchBookings();
      }
    } catch (e) {
      alert("Hủy đặt lịch lỗi.");
    }
  };

  // Build automatic weekly timetable slot lists
  const renderTimetableGrid = () => {
    const schedule: { [key: string]: { tenLop: string; time: string }[] } = {};
    DAYS_OF_WEEK.forEach((d) => (schedule[d] = []));
    const freeClasses: string[] = [];

    classes.forEach((c) => {
      if (c.lichHoc.includes("Tự do") || c.lichHoc.toLowerCase().includes("linh động")) {
        freeClasses.push(c.tenLop);
        return;
      }
      const regex = /(Thứ 2|Thứ 3|Thứ 4|Thứ 5|Thứ 6|Thứ 7|Chủ Nhật)\s*\(([^)]+)\)/g;
      let match;
      let found = false;
      while ((match = regex.exec(c.lichHoc)) !== null) {
        found = true;
        schedule[match[1]].push({ tenLop: c.tenLop, time: match[2] });
      }
      if (!found) {
        freeClasses.push(`${c.tenLop} (${c.lichHoc})`);
      }
    });

    return (
      <div className="space-y-6">
        <div className="overflow-x-auto bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <table className="w-full text-center border-collapse" style={{ minWidth: "750px" }}>
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                {DAYS_OF_WEEK.map((d) => (
                  <th key={d} className="py-3.5 px-2 text-xs font-bold text-zinc-600 w-[14.28%] border-r border-zinc-200 last:border-0">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {DAYS_OF_WEEK.map((d) => (
                  <td key={d} className="p-3 border-r border-zinc-100 last:border-0 valign-top align-top">
                    {schedule[d].length === 0 ? (
                      <span className="text-zinc-300 text-xxs italic block py-4">-</span>
                    ) : (
                      schedule[d].map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-sky-50/50 border border-sky-100 p-2.5 rounded-xl text-left mb-2 last:mb-0"
                        >
                          <span className="font-semibold text-sky-900 text-xxs block leading-snug">
                            {item.tenLop}
                          </span>
                          <span className="text-[10px] text-sky-500 font-medium block mt-1 flex items-center gap-1 font-mono">
                            <Clock size={10} />
                            {item.time}
                          </span>
                        </div>
                      ))
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {freeClasses.length > 0 && (
          <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs">
            <h6 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Lớp Học Khung Giờ Tự Do:
            </h6>
            <div className="flex flex-wrap gap-2">
              {freeClasses.map((fc, i) => (
                <span key={i} className="inline-block bg-zinc-50 text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  {fc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab navigation pills */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
          <button
            onClick={() => setActiveTab("ds-lop")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ds-lop" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Layers size={14} className="inline-block mr-1.5 -translate-y-0.5" />
            Lớp học
          </button>
          <button
            onClick={() => setActiveTab("timetable")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "timetable" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Calendar size={14} className="inline-block mr-1.5 -translate-y-0.5" />
            Thời khóa biểu
          </button>
          <button
            onClick={() => setActiveTab("dat-cho")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "dat-cho" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <CheckCircle size={14} className="inline-block mr-1.5 -translate-y-0.5" />
            Lịch đặt chỗ
          </button>
        </div>

        {activeTab === "ds-lop" && !isAddingClass && (
          <button
            onClick={() => setIsRecordingClass(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            Thêm lớp mới
          </button>
        )}

        {activeTab === "dat-cho" && !isAddingBooking && (
          <button
            onClick={() => setIsAddingBooking(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            Đăng ký ca học
          </button>
        )}
      </div>

      {/* Content panel */}
      {activeTab === "ds-lop" && (
        <>
          {isAddingClass ? (
            /* Create or Edit class form */
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
              <h5 className="font-display font-bold text-lg text-zinc-900 mb-6 pb-2 border-b border-zinc-100">
                {editClassId ? "Chỉnh sửa thông tin lớp học" : "Tạo lớp học mới"}
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Tên Lớp Học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Ví dụ: Guitar Cơ Bản 2"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Giáo Viên Phụ Trách
                  </label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
                  >
                    <option value="" className="text-zinc-900 bg-white">-- Chọn giáo viên --</option>
                    {teachers.map((t) => (
                      <option key={t.maGV} value={t.maGV} className="text-zinc-900 bg-white">
                        {t.tenGV}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4 bg-zinc-50 p-3.5 rounded-xl border">
                    <input
                      type="checkbox"
                      id="class-tu-do"
                      checked={isFreeSchedule}
                      onChange={(e) => setIsFreeSchedule(e.target.checked)}
                      className="w-4 h-4 text-sky-600 border-zinc-300 rounded-sm focus:ring-sky-500"
                    />
                    <label htmlFor="class-tu-do" className="text-xs font-semibold text-zinc-700">
                      Lớp học khung giờ tự do (Linh động thời gian học)
                    </label>
                  </div>
                </div>

                {/* Sub schedule picking settings */}
                {!isFreeSchedule && (
                  <div className="col-span-1 md:col-span-2 p-4 bg-zinc-50 rounded-2xl border space-y-4">
                    <h6 className="text-xs font-bold text-sky-600 mb-2">Cài Đặt Lịch Học Buổi Cố Định</h6>

                    {/* Day 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-3 border-b border-zinc-200">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold block mb-1">Buổi 1</label>
                        <select
                          value={day1}
                          onChange={(e) => setDay1(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-sky-500"
                        >
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d} className="text-zinc-900 bg-white">
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold block mb-1">Bắt đầu lúc</label>
                        <input
                          type="text"
                          value={timeStart1}
                          onChange={(e) => setTimeStart1(e.target.value)}
                          placeholder="17:00"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold block mb-1">Kết thúc lúc</label>
                        <input
                          type="text"
                          value={timeEnd1}
                          onChange={(e) => setTimeEnd1(e.target.value)}
                          placeholder="18:30"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Day 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold block mb-1">Buổi 2 (Nếu có)</label>
                        <select
                          value={day2}
                          onChange={(e) => setDay2(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-sky-500"
                        >
                          <option value="" className="text-zinc-900 bg-white">-- Không có --</option>
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d} className="text-zinc-900 bg-white">
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      {day2 && (
                        <>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Bắt đầu lúc</label>
                            <input
                              type="text"
                              value={timeStart2}
                              onChange={(e) => setTimeStart2(e.target.value)}
                              placeholder="17:00"
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Kết thúc lúc</label>
                            <input
                              type="text"
                              value={timeEnd2}
                              onChange={(e) => setTimeEnd2(e.target.value)}
                              placeholder="18:30"
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  onClick={resetClassForm}
                  className="px-5 py-2.5 border border-zinc-200 rounded-full text-xs font-semibold text-zinc-500 hover:bg-zinc-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveClass}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-bold cursor-pointer shadow-sm"
                >
                  Lưu Lớp Học
                </button>
              </div>
            </div>
          ) : (
            /* Normal Class Grid List */
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Mã Lớp</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Tên Lớp Học</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Lịch Học Cố Định</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Giáo Viên Phụ Trách</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                  {classes.map((c) => {
                    const teacher = teachers.find((t) => t.maGV === c.maGV);
                    return (
                      <tr key={c.maLop} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-4 text-left font-mono text-zinc-400">{c.maLop}</td>
                        <td className="py-3.5 px-4 text-left font-bold text-zinc-900">{c.tenLop}</td>
                        <td className="py-3.5 px-4">{c.lichHoc}</td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-600">{teacher ? teacher.tenGV : "Không có"}</td>
                        <td className="py-3.5 px-4 flex justify-center gap-2">
                          <button
                            onClick={() => handleEditClass(c)}
                            className="p-1.5 bg-zinc-50 border text-sky-600 border-zinc-100 hover:bg-sky-50 hover:border-sky-100 rounded-lg cursor-pointer transition-all"
                            title="Sửa thông tin"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(c.maLop)}
                            className="p-1.5 bg-zinc-50 border text-rose-500 border-zinc-100 hover:bg-rose-50 hover:border-rose-100 rounded-lg cursor-pointer transition-all"
                            title="Xóa lớp"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "timetable" && renderTimetableGrid()}

      {activeTab === "dat-cho" && (
        <>
          {isAddingBooking ? (
            /* Custom Booking form panel */
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-4">
              <h5 className="font-display font-bold text-lg text-zinc-900 pb-2 border-b border-zinc-100">
                Đăng Ký Đặt Ca Học Linh Động
              </h5>

              <div className="space-y-3">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Học Viên Đăng Ký:
                  </label>
                  <select
                    value={bookingStudentId}
                    onChange={(e) => setBookingStudentId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-900"
                  >
                    <option value="" className="text-zinc-900 bg-white">-- Chọn học viên --</option>
                    {students.map((st) => (
                      <option key={st.maHV} value={st.maHV} className="text-zinc-900 bg-white">
                        {st.maHV} - {st.tenHV}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Lớp Đăng Ký:
                  </label>
                  <select
                    value={bookingClassId}
                    onChange={(e) => {
                      setBookingClassId(e.target.value);
                      const cls = classes.find((c) => c.maLop === e.target.value);
                      if (cls) {
                        setBookingTime(cls.lichHoc);
                      }
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-zinc-900"
                  >
                    <option value="" className="text-zinc-900 bg-white">-- Chọn lớp học --</option>
                    {classes.map((cls) => (
                      <option key={cls.maLop} value={cls.maLop} className="text-zinc-900 bg-white">
                        {cls.tenLop}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Ngày Học (dd/mm/yyyy):
                  </label>
                  <input
                    type="text"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    placeholder="Ví dụ: 21/07/2026"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Khung Giờ Đặt Lịch:
                  </label>
                  <input
                    type="text"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    placeholder="Thứ 3 (19:00 - 20:30)"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-100">
                <button
                  onClick={() => setIsAddingBooking(false)}
                  className="px-4 py-2 border rounded-full text-xs font-semibold text-zinc-500 hover:bg-zinc-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveBooking}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-bold cursor-pointer"
                >
                  Đăng Ký
                </button>
              </div>
            </div>
          ) : (
            /* Bookings lists */
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Mã Booking</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Học Viên</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Lớp Đăng Ký</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Ngày & Khung Giờ</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Hủy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                  {bookings.map((b) => (
                    <tr key={b.maBooking} className="hover:bg-zinc-50/50">
                      <td className="py-3.5 px-4 text-left font-mono text-zinc-400">{b.maBooking}</td>
                      <td className="py-3.5 px-4 text-left font-bold text-zinc-900">
                        {b.tenHV}
                        <span className="text-xxs text-zinc-400 font-normal block mt-0.5">{b.maHV}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-600">{b.tenLop}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1 text-zinc-700 font-semibold mb-1">
                          {b.ngay}
                        </span>
                        <span className="block text-xxs text-zinc-400 font-medium">{b.caHoc}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleDeleteBooking(b.maBooking)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-500 rounded-lg text-zinc-400 cursor-pointer transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs italic">
                        Chưa có lịch đăng ký tự học linh động nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
