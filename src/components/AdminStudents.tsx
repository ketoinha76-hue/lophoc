import { useState, useEffect } from "react";
import { fetch } from "../lib/api";
import { Plus, Edit2, FolderOpen, Search, Download, Trash2, Mail, Award, CheckCircle, FileText, Sparkles, RefreshCw } from "lucide-react";
import { Student, ClassRoom, Song } from "../types";

interface AdminStudentsProps {
  students: Student[];
  classes: ClassRoom[];
  onRefresh: () => void;
}

export default function AdminStudents({ students, classes, onRefresh }: AdminStudentsProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterClass, setFilterClass] = useState<string>("");
  const [isEditingStudent, setIsEditingStudent] = useState<boolean>(false);

  // Form states Student
  const [editStudentId, setEditClassId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [studentPhone, setStudentPhone] = useState<string>("");
  const [studentClass, setStudentClass] = useState<string>("");
  const [studentTimeSlot, setStudentTimeSlot] = useState<string>("");
  const [studentTelegram, setStudentTelegram] = useState<string>("");
  const [studentTuitionFee, setStudentTuitionFee] = useState<string>("");

  // Student Details Modal states
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>({
    songs: [],
    attendanceCount: 0,
    attendanceDates: [],
    fees: []
  });
  const [allSongsCatalog, setAllSongsCatalog] = useState<Song[]>([]);
  const [assignSongId, setAssignSongId] = useState<string>("");
  const [isDetailsLoading, setIsDetailsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (viewingStudent) {
      fetchStudentDetails(viewingStudent.maHV);
      fetchSongsCatalog();
    }
  }, [viewingStudent]);

  const fetchStudentDetails = async (maHV: string) => {
    setIsDetailsLoading(true);
    try {
      const res = await fetch(`/api/students/${maHV}/details`);
      if (res.ok) {
        const data = await res.json();
        setStudentDetails(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const fetchSongsCatalog = async () => {
    try {
      const res = await fetch("/api/songs");
      if (res.ok) {
        const data = await res.json();
        setAllSongsCatalog(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditStudent = (st: Student) => {
    setEditClassId(st.maHV);
    setStudentName(st.tenHV);
    setStudentPhone(st.sdt);
    setStudentClass(st.lop);
    setStudentTimeSlot(st.caHoc);
    setStudentTelegram(st.telegramId || "");
    setStudentTuitionFee(st.hocPhi || "");
    setIsEditingStudent(true);
  };

  const handleSaveStudent = async () => {
    if (!studentName || !studentPhone) {
      alert("Vui lòng điền đủ Tên và Số Điện Thoại!");
      return;
    }

    const payload = {
      tenHV: studentName,
      sdt: studentPhone,
      lop: studentClass || "Chưa xếp lớp",
      caHoc: studentTimeSlot || "Chưa xếp ca",
      telegramId: studentTelegram,
      hocPhi: studentTuitionFee
    };

    const url = editStudentId ? `/api/students/${editStudentId}` : "/api/students";
    const method = editStudentId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editStudentId ? "Cập nhật hồ sơ học viên thành công!" : "Tạo học viên mới thành công!");
        resetStudentForm();
        onRefresh();
      }
    } catch (e) {
      alert("Lưu thông tin thất bại!");
    }
  };

  const resetStudentForm = () => {
    setEditClassId(null);
    setStudentName("");
    setStudentPhone("");
    setStudentClass("");
    setStudentTimeSlot("");
    setStudentTelegram("");
    setStudentTuitionFee("");
    setIsEditingStudent(false);
  };

  const handleAssignSong = async () => {
    if (!viewingStudent || !assignSongId) return;
    try {
      const res = await fetch(`/api/students/${viewingStudent.maHV}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maBH: assignSongId })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchStudentDetails(viewingStudent.maHV);
        setAssignSongId("");
      }
    } catch (e) {
      alert("Gán bài hát thất bại.");
    }
  };

  // CSV Excel Download list
  const exportToCSV = () => {
    let csvContent = "\uFEFFMã Học Viên,Tên Học Viên,Số Điện Thoại,Lớp Học,Ca Học,Telegram ID,Học Phí\n";
    students.forEach((st) => {
      csvContent += `"${st.maHV}","${st.tenHV}","${st.sdt}","${st.lop}","${st.caHoc}","${st.telegramId || ""}","${st.hocPhi || ""}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "DanhSachHocVien_HuynhLong.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search filter
  const filteredStudents = students.filter((st) => {
    const matchesSearch =
      st.tenHV.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.maHV.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.sdt.includes(searchTerm);
    const matchesClass = filterClass === "" || st.lop === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {!isEditingStudent ? (
        /* Regular Student List view */
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm">
            <div>
              <h5 className="font-display font-bold text-lg text-zinc-900 leading-tight">
                Hồ Sơ Học Viên
              </h5>
              <span className="text-zinc-400 text-xs">Quản lý và gán bài hát, xem lịch sử tài chính</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Download size={14} />
                Xuất Excel (CSV)
              </button>
              <button
                onClick={() => setIsEditingStudent(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                Thêm học viên mới
              </button>
            </div>
          </div>

          {/* Filtering bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-8">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm học viên theo họ tên, số điện thoại hoặc mã..."
                className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="md:col-span-4 select-none">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-sky-500"
              >
                <option value="" className="text-zinc-900 bg-white">Tất cả Lớp học</option>
                {classes.map((c) => (
                  <option key={c.maLop} value={c.tenLop} className="text-zinc-900 bg-white">
                    {c.tenLop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table display */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-center border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Mã HV</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Họ Tên</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Số Điện Thoại</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Lớp & Học Phí</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                {filteredStudents.map((st) => (
                  <tr key={st.maHV} className="hover:bg-zinc-50/50">
                    <td className="py-3.5 px-4 text-left font-mono text-zinc-400">{st.maHV}</td>
                    <td className="py-3.5 px-4 text-left font-bold text-zinc-950 flex items-center gap-1.5">
                      {st.tenHV}
                      {st.telegramId && (
                        <span className="p-0.5 bg-sky-50 text-sky-500 border border-sky-100 rounded" title="Có Telegram">
                          <Mail size={10} fill="currentColor" />
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-500">{st.sdt}</td>
                    <td className="py-3.5 px-4 text-left">
                      <span className="font-semibold text-zinc-800 block">{st.lop}</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        {st.hocPhi ? `${Number(st.hocPhi).toLocaleString("vi-VN")}đ/Tháng` : "Chưa cài học phí"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 flex justify-center gap-2">
                      <button
                        onClick={() => handleEditStudent(st)}
                        className="p-1.5 bg-zinc-50 border text-sky-600 border-zinc-100 hover:bg-sky-50 hover:border-sky-100 rounded-lg cursor-pointer transition-all"
                        title="Sửa hồ sơ"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setViewingStudent(st)}
                        className="p-1.5 bg-zinc-50 border text-sky-600 border-zinc-100 hover:bg-sky-50 hover:border-sky-100 rounded-lg cursor-pointer transition-all"
                        title="Xem chi tiết"
                      >
                        <FolderOpen size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs italic">
                      Không tìm thấy học viên nào phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Create or Edit student Profile Form */
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
          <h5 className="font-display font-bold text-lg text-zinc-900 mb-6 pb-2 border-b border-zinc-100">
            {editStudentId ? "Chỉnh sửa thông tin học viên" : "Hồ sơ học viên mới"}
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Họ Tên Học Viên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Anh"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Số Điện Thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="0912345678"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Xếp Lớp
              </label>
              <select
                value={studentClass}
                onChange={(e) => {
                  setStudentClass(e.target.value);
                  const cls = classes.find((c) => c.tenLop === e.target.value);
                  if (cls) {
                    setStudentTimeSlot(cls.lichHoc);
                  }
                }}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
              >
                <option value="" className="text-zinc-900 bg-white">-- Chọn Lớp --</option>
                {classes.map((c) => (
                  <option key={c.maLop} value={c.tenLop} className="text-zinc-900 bg-white">
                    {c.tenLop}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Ca Học / Lịch Học Cụ Thể
              </label>
              <input
                type="text"
                value={studentTimeSlot}
                onChange={(e) => setStudentTimeSlot(e.target.value)}
                placeholder="Ví dụ: Thứ 2 & Thứ 4 (17:00 - 18:30)"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={studentTelegram}
                onChange={(e) => setStudentTelegram(e.target.value)}
                placeholder="987654321"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Mức Học Phí Đóng Định Kỳ (₫)
              </label>
              <input
                type="number"
                value={studentTuitionFee}
                onChange={(e) => setStudentTuitionFee(e.target.value)}
                placeholder="500000"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              onClick={resetStudentForm}
              className="px-5 py-2.5 border border-zinc-200 rounded-full text-xs font-semibold text-zinc-500 hover:bg-zinc-50 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSaveStudent}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-bold cursor-pointer shadow-sm"
            >
              Lưu Hồ Sơ
            </button>
          </div>
        </div>
      )}

      {/* Viewing details dialog panel */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            {/* Left overview */}
            <div className="md:w-5/12 min-w-0 bg-zinc-50 border-r border-zinc-100 p-6 flex flex-col justify-between overflow-x-hidden overflow-y-auto">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                  {viewingStudent.tenHV.charAt(0)}
                </div>
                <div>
                  <h6 className="font-display font-bold text-base text-zinc-950">{viewingStudent.tenHV}</h6>
                  <span className="text-xxs text-zinc-400 font-mono block mt-1">{viewingStudent.maHV}</span>
                </div>

                <div className="p-4 bg-white border border-zinc-200 rounded-xl text-left space-y-3 shadow-xxs">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-semibold">Lớp học:</span>
                    <span className="font-bold text-zinc-800 text-right">{viewingStudent.lop}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-semibold">Chuyên cần:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={14} />
                      {studentDetails.attendanceCount} buổi
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions receipts summaries */}
              <div className="mt-6">
                <h6 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider mb-2 pb-1 border-b">
                  Giao dịch nộp phí gần đây
                </h6>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {isDetailsLoading ? (
                    <div className="text-xxs text-zinc-400 text-center py-4">Đang tải chi tiết...</div>
                  ) : studentDetails.fees.length === 0 ? (
                    <div className="text-xxs text-zinc-400 text-center py-4 italic">Chưa có lịch sử nộp học phí</div>
                  ) : (
                    studentDetails.fees.map((f: any) => (
                      <div key={f.maHD} className="p-2 bg-white rounded-lg border text-xxs flex justify-between items-center">
                        <div>
                          <span className="font-bold text-zinc-700 block">{f.ngayThu.split(" ")[0]}</span>
                          <span className="text-[10px] text-zinc-400">{f.ghiChu}</span>
                        </div>
                        <span className="font-extrabold text-rose-500">
                          {Number(f.soTien).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right assigned songs book */}
            <div className="md:w-7/12 min-w-0 p-6 flex flex-col justify-between overflow-x-hidden overflow-y-auto bg-white">
              <div>
                <h5 className="font-display font-bold text-zinc-950 text-sm mb-4 flex items-center gap-1.5">
                  <Sparkles className="text-sky-600 animate-spin" size={16} />
                  Sổ Tay Bài Hát Của Học Viên
                </h5>

                {/* Form to assign song */}
                <div className="flex gap-2 mb-6 w-full min-w-0 items-center">
                  <select
                    value={assignSongId}
                    onChange={(e) => setAssignSongId(e.target.value)}
                    className="w-full min-w-0 flex-grow bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-zinc-900"
                  >
                    <option value="" className="text-zinc-900 bg-white">-- Chọn bài hát từ kho để gán --</option>
                    {allSongsCatalog.map((song) => (
                      <option key={song.maBH} value={song.maBH} className="text-zinc-900 bg-white">
                        [{song.phanLoai}] {song.tenBH}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignSong}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs text-nowrap"
                  >
                    Gán bài
                  </button>
                </div>

                {/* Assigned songs lists */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {studentDetails.songs.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 text-xs italic">
                      Học viên này chưa được gán bài hát nào.
                    </div>
                  ) : (
                    studentDetails.songs.map((song: Song) => (
                      <div
                        key={song.maBH}
                        className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between"
                      >
                        <span className="font-semibold text-zinc-800 text-xs flex items-center gap-2">
                          <FileText className="text-sky-500" size={14} />
                          {song.tenBH}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 bg-white border px-2 py-0.5 rounded-full uppercase">
                          {song.phanLoai}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs font-bold cursor-pointer"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
