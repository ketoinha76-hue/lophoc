import React, { useState, useEffect, useRef } from "react";
import { fetch } from "../lib/api";
import { Video, Square, Film, Award, Download, AlertCircle, RefreshCw, UploadCloud, FileUp, Check, Loader2 } from "lucide-react";
import { PracticeLog, Song } from "../types";

interface PerformancePortfolioProps {
  studentId: string;
  studentName: string;
  songs: Song[];
  onStreakUpdate: (newStreak: number) => void;
}

export default function PerformancePortfolio({
  studentId,
  studentName,
  songs,
  onStreakUpdate,
}: PerformancePortfolioProps) {
  const [practices, setPractices] = useState<PracticeLog[]>([]);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // File upload state variables
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadTab, setUploadTab] = useState<"record" | "upload">("record");
  const [dragActive, setDragActive] = useState<boolean>(false);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIdRef = useRef<any | null>(null);

  useEffect(() => {
    fetchPractices();
    return () => {
      stopCamera();
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, [studentId]);

  const fetchPractices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/practices?maHV=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setPractices(data);
      }
    } catch (err) {
      console.error("Failed to fetch practice portfolio logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (!selectedSong) {
        alert("Vui lòng chọn bài hát bạn muốn biểu diễn để ghi hình!");
        return;
      }
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(e => console.error(e));
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
        setIsUploading(true);
        
        const reader = new FileReader();
        reader.readAsDataURL(videoBlob);
        reader.onloadend = async () => {
          const base64Str = reader.result as string;
          const customFileName = `${studentName} - ${selectedSong}.webm`;
          
          try {
            const saveRes = await fetch("/api/upload-drive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileBase64: base64Str,
                fileName: customFileName,
                mimeType: "video/webm",
                maHV: studentId,
                tenHV: studentName,
                tenBH: selectedSong,
              }),
            });
            
            if (saveRes.ok) {
              const result = await saveRes.json();
              onStreakUpdate(result.streak);
              if (result.success) {
                alert(`Biểu diễn thành công! Tác phẩm "${selectedSong}" đã được ghi hình và tải lên Google Drive của lớp học.`);
              } else {
                alert(`Đã lưu biểu diễn: ${result.message}`);
              }
              fetchPractices();
            } else {
              alert("Lỗi máy chủ khi lưu bài biểu diễn.");
            }
          } catch (error) {
            console.error("Failed to save practice record log", error);
            alert("Lỗi kết nối khi nộp bài.");
          } finally {
            setIsUploading(false);
          }
        };
      };

      setRecordSeconds(0);
      setIsRecording(true);
      mediaRecorder.start();

      timerIdRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert("Không thể mở camera / microphone: " + (err.message || "Xin vui lòng kiểm tra quyền truy cập"));
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      alert("Vui lòng chọn hoặc kéo thả tệp tin vào vùng tải lên!");
      return;
    }
    if (!selectedSong) {
      alert("Vui lòng chọn bài hát bạn muốn trả bài!");
      return;
    }

    setIsUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64Str = reader.result as string;
        const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf("."));
        // File name format based on user request: Tên học viên + Tên bài trả bài
        const customFileName = `${studentName} - ${selectedSong}${fileExt}`;

        const res = await fetch("/api/upload-drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64Str,
            fileName: customFileName,
            mimeType: selectedFile.type || "application/octet-stream",
            maHV: studentId,
            tenHV: studentName,
            tenBH: selectedSong
          })
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            onStreakUpdate(result.streak);
            alert(`Nộp bài thành công! Bài "${selectedSong}" đã được tải lên Google Drive của lớp học.`);
            setSelectedFile(null);
            fetchPractices();
          } else {
            // Handled fallback if drive is not configured
            onStreakUpdate(result.streak);
            alert(result.message);
            setSelectedFile(null);
            fetchPractices();
          }
        } else {
          alert("Lỗi máy chủ khi nộp bài.");
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert("Lỗi đọc tệp tin.");
        setIsUploading(false);
      };
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối đến máy chủ.");
      setIsUploading(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Video capture / upload card */}
      <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-md flex flex-col justify-between">
        <div>
          <h5 className="font-display font-bold text-lg text-zinc-900 mb-3 flex items-center gap-2">
            <Video className="text-rose-500" size={20} />
            Quay Hình & Tải Lên Trả Bài
          </h5>
          <p className="text-zinc-500 text-xs mb-6">
            Thu âm, ghi hình bài đệm hát của bạn hoặc tải lên tệp tin video/audio từ máy của bạn để lưu vào thư mục Google Drive.
          </p>
        </div>

        {/* Tabs Switch */}
        <div className="flex bg-zinc-100 p-1 rounded-xl gap-1 mb-6 border border-zinc-200/50">
          <button
            onClick={() => {
              stopCamera();
              setUploadTab("record");
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              uploadTab === "record" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Video size={14} />
            Quay Trực Tiếp
          </button>
          <button
            onClick={() => {
              stopCamera();
              setUploadTab("upload");
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              uploadTab === "upload" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <UploadCloud size={14} />
            Tải Lên File
          </button>
        </div>

        {/* Tab content */}
        {uploadTab === "record" ? (
          /* Video preview arena */
          <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200 aspect-video w-full flex items-center justify-center mb-6">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            {!isRecording && !streamRef.current && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-zinc-900/60 backdrop-blur-xs">
                <Film className="text-zinc-400 mb-2" size={40} />
                <span className="text-zinc-350 text-xs">Camera đang tắt. Hãy chọn bài hát và ấn bắt đầu.</span>
              </div>
            )}

            {isRecording && (
              <div className="absolute top-4 left-4 bg-black/75 text-rose-500 text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 border border-zinc-850">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>REC</span>
                <span className="text-white border-l border-zinc-700 pl-2 ml-1">
                  {formatTime(recordSeconds)}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Drag and Drop Upload Zone */
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed aspect-video w-full flex flex-col items-center justify-center mb-6 p-4 transition-all text-center ${
              dragActive
                ? "border-sky-500 bg-sky-50/50"
                : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
            }`}
          >
            <input
              type="file"
              id="file-upload-input"
              className="hidden"
              onChange={handleFileChange}
              accept="video/*,audio/*,image/*"
            />
            
            {!selectedFile ? (
              <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center justify-center h-full w-full">
                <UploadCloud className="text-zinc-400 mb-2 animate-bounce" size={40} />
                <span className="text-zinc-600 text-xs font-medium">Nhấp để chọn tệp hoặc kéo thả vào đây</span>
                <span className="text-zinc-450 text-[10px] mt-1">Chấp nhận tệp Video, Âm thanh, Hình ảnh</span>
              </label>
            ) : (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-full mb-3 border border-sky-100">
                  <FileUp size={24} />
                </div>
                <span className="text-zinc-800 text-xs font-bold truncate max-w-[240px]">{selectedFile.name}</span>
                <span className="text-zinc-450 text-xxs mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="mt-3 text-rose-500 hover:text-rose-600 text-xxs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Chọn tệp khác
                </button>
              </div>
            )}
          </div>
        )}

        {/* Selection options and trigger */}
        <div className="space-y-4">
          <div>
            <label className="block text-xxs font-bold text-zinc-450 uppercase tracking-wider mb-2">
              Chọn Bài Hát Trả Bài:
            </label>
            <select
              value={selectedSong}
              onChange={(e) => setSelectedSong(e.target.value)}
              disabled={isRecording || isUploading}
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-sky-500 shadow-sm disabled:opacity-50"
            >
              <option value="" className="text-zinc-900 bg-white">-- Chọn bài hát từ Sổ tay --</option>
              {songs.map((song) => (
                <option key={song.maBH} value={song.tenBH} className="text-zinc-900 bg-white">
                  {song.tenBH}
                </option>
              ))}
            </select>
          </div>

          {uploadTab === "record" ? (
            <button
              onClick={handleToggleRecord}
              className={`w-full py-3.5 rounded-xl font-display font-bold text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isRecording
                  ? "bg-zinc-800 hover:bg-zinc-900 text-white shadow-md"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              }`}
            >
              {isRecording ? (
                <>
                  <Square size={16} fill="currentColor" />
                  DỪNG GHI HÌNH & LƯU ALBUM
                </>
              ) : (
                <>
                  <Video size={16} />
                  BẮT ĐẦU QUAY BIỂU DIỄN
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleUploadFile}
              disabled={isUploading}
              className={`w-full py-3.5 rounded-xl font-display font-bold text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isUploading
                  ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  : "bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-100"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  ĐANG TẢI LÊN DRIVE...
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  NỘP BÀI TRẢ BÀI LÊN DRIVE
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Practices history card */}
      <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-md flex flex-col h-[480px]">
        <div className="flex justify-between items-center mb-4">
          <h5 className="font-display font-bold text-lg text-zinc-900 flex items-center gap-2">
            <Award className="text-cyan-600" size={20} />
            Bộ Sưu Tập Bài Biểu Diễn (Portfolio)
          </h5>
          <button
            onClick={fetchPractices}
            className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer"
            title="Làm mới album"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Scrollable grid of recordings */}
        <div className="flex-grow overflow-y-auto space-y-4 pr-1">
          {isLoading && practices.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
              Đang tải Album biểu diễn...
            </div>
          ) : practices.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6">
              <Film size={36} className="mb-2 opacity-50 text-zinc-300" />
              <p className="text-xs font-semibold text-zinc-700">Chưa có video biểu diễn nào được lưu.</p>
              <p className="text-xxs text-zinc-400 mt-1 max-w-[280px]">
                Hãy thực hiện quay biểu diễn ở bảng bên trái để lưu lại những tác phẩm tuyệt vời của bạn.
              </p>
            </div>
          ) : (
            practices.map((item) => (
              <div
                key={item.maPractice}
                className="p-4 rounded-xl bg-zinc-50/50 border border-zinc-200/80 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h6 className="text-zinc-800 font-bold text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      {item.tenBH}
                    </h6>
                    <span className="text-xxs text-zinc-400 block mt-1">
                      Ngày biểu diễn: {item.ngay}
                    </span>
                  </div>
                  <span className="text-xxs font-semibold bg-white border border-zinc-200 px-2.5 py-1 rounded-full text-zinc-600 shadow-xxs">
                    {item.duration} phút
                  </span>
                </div>

                {/* Video replay elements */}
                <div className="mt-3 flex items-center justify-between gap-4">
                  {item.videoUrl ? (
                    item.videoUrl.includes("drive.google.com") ? (
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xxs font-semibold text-emerald-750 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <UploadCloud size={12} className="text-emerald-600" />
                        Xem bài trả trên Google Drive
                      </a>
                    ) : (
                      <video
                        src={item.videoUrl}
                        controls
                        className="max-h-16 max-w-[65%] rounded-lg bg-black border border-zinc-200"
                      />
                    )
                  ) : (
                    <span className="text-zinc-400 text-xxs italic flex items-center gap-1">
                      <AlertCircle size={12} />
                      Tác phẩm demo (không lưu file vật lý)
                    </span>
                  )}

                  {item.videoUrl && !item.videoUrl.includes("drive.google.com") && (
                    <a
                      href={item.videoUrl}
                      download={`BieuDien_${item.maPractice}_${item.tenBH.replace(/\s+/g, "")}.webm`}
                      className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-700 transition-all cursor-pointer shadow-xxs"
                      title="Tải video về máy"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
