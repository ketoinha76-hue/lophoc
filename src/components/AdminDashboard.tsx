import { useState, useEffect } from "react";
import { fetch } from "../lib/api";
import { DollarSign, Users, Award, CheckCircle, Cpu, AlertTriangle, MessageSquare, Trash2, Mail, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChurnRisk, TelegramLog, ZaloLog } from "../types";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({
    tongDoanhThu: 0,
    tongHocSinh: 0,
    tongLopHoc: 0,
    tongLuotDiemDanh: 0,
    chartData: { labels: [], hocVien: [], doanhThu: [] },
  });

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("2026");
  const [churnList, setChurnList] = useState<ChurnRisk[]>([]);
  const [telegramLogs, setTelegramLogs] = useState<TelegramLog[]>([]);
  const [zaloLogs, setZaloLogs] = useState<ZaloLog[]>([]);
  const [activeLogTab, setActiveLogTab] = useState<"telegram" | "zalo">("telegram");
  const [isChurnLoading, setIsChurnLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchStats();
    fetchChurnData();
    fetchTelegramLogs();
    fetchZaloLogs();
    
    // Auto-poll logs every 3 seconds for live preview experience
    const interval = setInterval(() => {
      fetchTelegramLogs();
      fetchZaloLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [filterMonth, filterYear]);

  const fetchStats = async () => {
    try {
      const q = `?month=${filterMonth}&year=${filterYear}`;
      const res = await fetch(`/api/reports/stats${q}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch admin statistics metrics", err);
    }
  };

  const fetchChurnData = async () => {
    setIsChurnLoading(true);
    try {
      const res = await fetch("/api/reports/churn");
      if (res.ok) {
        const data = await res.json();
        setChurnList(data);
      }
    } catch (err) {
      console.error("Failed to calculate AI drop-out risk forecasts", err);
    } finally {
      setIsChurnLoading(false);
    }
  };

  const fetchTelegramLogs = async () => {
    try {
      const res = await fetch("/api/telegram-logs");
      if (res.ok) {
        const data = await res.json();
        setTelegramLogs(data);
      }
    } catch (err) {
      console.error("Failed to pull simulated telegram log logs", err);
    }
  };

  const clearTelegramLogs = async () => {
    if (!confirm("Bạn muốn xóa sạch hộp thư giả lập Telegram?")) return;
    try {
      const res = await fetch("/api/telegram-logs/clear", { method: "POST" });
      if (res.ok) {
        setTelegramLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchZaloLogs = async () => {
    try {
      const res = await fetch("/api/zalo-logs");
      if (res.ok) {
        const data = await res.json();
        setZaloLogs(data);
      }
    } catch (err) {
      console.error("Failed to pull simulated zalo logs", err);
    }
  };

  const clearZaloLogs = async () => {
    if (!confirm("Bạn muốn xóa sạch hộp thư giả lập Zalo?")) return;
    try {
      const res = await fetch("/api/zalo-logs/clear", { method: "POST" });
      if (res.ok) {
        setZaloLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendTelegramAdminReport = async () => {
    try {
      const res = await fetch("/api/reports/admin-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: filterMonth, year: filterYear }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchTelegramLogs();
      }
    } catch (err) {
      alert("Gửi báo cáo qua Telegram lỗi.");
    }
  };

  // Recharts payload converters
  const getBarChartData = () => {
    const { labels, doanhThu } = stats.chartData;
    return (labels || []).map((label: string, idx: number) => ({
      name: label,
      "Doanh thu (₫)": doanhThu[idx] || 0,
    }));
  };

  const getPieChartData = () => {
    const { labels, hocVien } = stats.chartData;
    return (labels || []).map((label: string, idx: number) => ({
      name: label,
      value: hocVien[idx] || 0,
    }));
  };

  return (
    <div className="space-y-6 select-none text-zinc-800">
      {/* Header filters */}
      <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-display font-bold text-xl text-zinc-950 flex items-center gap-2">
            <Award className="text-sky-600 animate-pulse" size={24} />
            Bảng Số Liệu Hệ Thống
          </h4>
          <span className="text-zinc-400 text-xs">Phân tích tình hình tài chính và chuyên cần của con</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500"
          >
            <option value="" className="text-zinc-900 bg-white">Cả Năm</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1} className="text-zinc-900 bg-white">
                Tháng {i + 1}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500"
          >
            <option value="2025" className="text-zinc-900 bg-white">Năm 2025</option>
            <option value="2026" className="text-zinc-900 bg-white">Năm 2026</option>
            <option value="2027" className="text-zinc-900 bg-white">Năm 2027</option>
          </select>

          <button
            onClick={sendTelegramAdminReport}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Mail size={14} />
            Gửi Telegram Admin
          </button>
        </div>
      </div>

      {/* Grid of badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Doanh Thu
            </span>
            <span className="text-xl font-display font-extrabold text-zinc-950">
              {Number(stats.tongDoanhThu).toLocaleString("vi-VN")}đ
            </span>
          </div>
          <div className="w-11 h-11 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Học Viên
            </span>
            <span className="text-xl font-display font-extrabold text-zinc-950">
              {stats.tongHocSinh}
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Lớp Học
            </span>
            <span className="text-xl font-display font-extrabold text-zinc-950">
              {stats.tongLopHoc}
            </span>
          </div>
          <div className="w-11 h-11 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
            <Award size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Điểm Danh
            </span>
            <span className="text-xl font-display font-extrabold text-zinc-950">
              {stats.tongLuotDiemDanh}
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Split Charts panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm lg:col-span-8 flex flex-col justify-between min-h-[360px]">
          <h5 className="font-display font-bold text-sm text-zinc-900 mb-4">Doanh Thu Theo Từng Lớp</h5>
          <div className="w-full h-64 flex-grow">
            {getBarChartData().length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
                Chưa có dữ liệu thống kê
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getBarChartData()}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString("vi-VN")}₫`} />
                  <Bar dataKey="Doanh thu (₫)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm lg:col-span-4 flex flex-col justify-between min-h-[360px]">
          <h5 className="font-display font-bold text-sm text-zinc-900 mb-4">Phân Bổ Số Học Viên</h5>
          <div className="w-full h-64 flex items-center justify-center flex-grow">
            {getPieChartData().length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
                Chưa có dữ liệu phân bổ
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={getPieChartData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                    {getPieChartData().map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend panel */}
          <div className="flex flex-wrap gap-2.5 justify-center mt-3 text-xxs font-semibold">
            {getPieChartData().map((item: any, idx: number) => (
              <span key={item.name} className="flex items-center gap-1 text-zinc-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                {item.name} ({item.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Split: AI Churn Risk advisor & simulated Telegram logs feed */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* AI Churn advisor card */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h5 className="font-display font-bold text-sm text-zinc-900 flex items-center gap-1.5">
                <Cpu className="text-sky-600" size={18} />
                Học Viên Có Nguy Cơ Nghỉ (AI Advisor)
              </h5>
              <p className="text-zinc-400 text-xxs block mt-0.5">Dự báo nguy cơ dựa trên chuyên cần & học phí</p>
            </div>
            <button
              onClick={fetchChurnData}
              className="text-xxs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Cập nhật lại
            </button>
          </div>

          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            {isChurnLoading ? (
              <div className="py-16 text-center text-zinc-500 text-xs">Đang phân tích chuyên cần...</div>
            ) : churnList.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">Chưa có dữ liệu phân tích học viên</div>
            ) : (
              <table className="w-full text-center border-collapse">
                <thead className="bg-zinc-50 text-xxs font-bold text-zinc-500 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-3 px-4 text-left">Học Viên</th>
                    <th className="py-3 px-4">Độ rủi ro</th>
                    <th className="py-3 px-4 text-left">Nguyên nhân chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium">
                  {churnList.map((item) => (
                    <tr key={item.maHV} className="hover:bg-zinc-50/50">
                      <td className="py-3.5 px-4 text-left font-semibold">
                        {item.tenHV}
                        <span className="text-xxs text-zinc-400 block font-normal mt-0.5">{item.lop}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xxs font-bold border ${
                            item.risk === "Cao"
                              ? "bg-rose-50 border-rose-200 text-rose-600"
                              : item.risk === "Trung Bình"
                              ? "bg-sky-50 border-sky-200 text-sky-600"
                              : "bg-emerald-50 border-emerald-200 text-emerald-600"
                          }`}
                        >
                          {item.risk} ({item.score}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left text-zinc-500 max-w-[240px] truncate" title={item.reasons}>
                        {item.reasons}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tabbed simulation box */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="font-display font-bold text-sm text-zinc-900 flex items-center gap-1.5">
                <MessageSquare className="text-sky-500 animate-pulse" size={18} />
                Hộp Thư Giả Lập Hệ Thống
              </h5>
              <p className="text-zinc-400 text-xxs block mt-0.5">Kiểm tra tin nhắn gửi đến Phụ huynh / Giáo viên</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-zinc-100 p-0.5 rounded-lg border text-xxs font-bold">
                <button
                  onClick={() => setActiveLogTab("telegram")}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeLogTab === "telegram" ? "bg-white text-sky-600 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Telegram ({telegramLogs.length})
                </button>
                <button
                  onClick={() => setActiveLogTab("zalo")}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeLogTab === "zalo" ? "bg-white text-sky-600 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Zalo OA ({zaloLogs.length})
                </button>
              </div>

              {activeLogTab === "telegram" && telegramLogs.length > 0 && (
                <button
                  onClick={clearTelegramLogs}
                  className="text-xxs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-0.5"
                >
                  <Trash2 size={11} />
                  Xóa
                </button>
              )}

              {activeLogTab === "zalo" && zaloLogs.length > 0 && (
                <button
                  onClick={clearZaloLogs}
                  className="text-xxs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-0.5"
                >
                  <Trash2 size={11} />
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Logs feed scrolling */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[320px] min-h-[320px] bg-zinc-950 flex flex-col">
            {activeLogTab === "telegram" ? (
              telegramLogs.length === 0 ? (
                <div className="m-auto text-center p-6 text-zinc-600 flex flex-col items-center">
                  <MessageSquare size={30} className="mb-2 opacity-35" />
                  <span className="text-xxs">Hộp thư giả lập Telegram trống.</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Điểm danh, gửi nhắc hoặc thu phí học viên để xem tin nhắn Telegram!</span>
                </div>
              ) : (
                telegramLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-zinc-300 font-mono text-[11px] leading-relaxed relative">
                    <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-800 pb-1.5 mb-2 text-xxs">
                      <span className="font-semibold text-sky-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        Chat ID: {log.chatId}
                      </span>
                      <span>{log.time}</span>
                    </div>
                    <div className="whitespace-pre-wrap select-text break-words" dangerouslySetInnerHTML={{ __html: log.text }} />
                  </div>
                ))
              )
            ) : (
              zaloLogs.length === 0 ? (
                <div className="m-auto text-center p-6 text-zinc-600 flex flex-col items-center">
                  <MessageSquare size={30} className="mb-2 opacity-35" />
                  <span className="text-xxs">Hộp thư giả lập Zalo OA trống.</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Gửi bảng lương cho giáo viên để xem tin nhắn Zalo mô phỏng tại đây!</span>
                </div>
              ) : (
                zaloLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-zinc-300 font-mono text-[11px] leading-relaxed relative">
                    <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-800 pb-1.5 mb-2 text-xxs">
                      <span className="font-semibold text-sky-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        Zalo SĐT: {log.phone}
                      </span>
                      <span>{log.time}</span>
                    </div>
                    <div className="whitespace-pre-wrap select-text break-words">{log.text}</div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
