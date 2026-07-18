import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface TunerString {
  note: string;
  freq: number;
}

const TUNER_STRINGS: TunerString[] = [
  { note: "E2 (Mì)", freq: 82.41 },
  { note: "A2 (Là)", freq: 110.0 },
  { note: "D3 (Rê)", freq: 146.83 },
  { note: "G3 (Sol)", freq: 196.0 },
  { note: "B3 (Si)", freq: 246.94 },
  { note: "E4 (Mí)", freq: 329.63 },
];

export default function Tuner() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [detectedNote, setDetectedNote] = useState<string>("--");
  const [statusMessage, setStatusMessage] = useState<string>("Sẵn sàng nhận âm thanh");
  const [centsOffset, setCentsOffset] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    return () => {
      stopTuner();
    };
  }, []);

  const handleToggle = async () => {
    if (isRunning) {
      stopTuner();
    } else {
      await startTuner();
    }
  };

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      bufferRef.current = new Float32Array(analyser.fftSize);

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsRunning(true);
      setStatusMessage("Đang lắng nghe... Hãy gảy một dây đàn");
      updateTunerLoop();
    } catch (error: any) {
      alert("Không thể truy cập Microphone: " + (error.message || "Hãy cấp quyền camera/mic trong trình duyệt"));
    }
  };

  const stopTuner = () => {
    setIsRunning(false);
    setDetectedNote("--");
    setStatusMessage("Sẵn sàng nhận âm thanh");
    setCentsOffset(0);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const updateTunerLoop = () => {
    if (!analyserRef.current || !bufferRef.current || !audioCtxRef.current) return;

    analyserRef.current.getFloatTimeDomainData(bufferRef.current);
    const frequency = autoCorrelate(bufferRef.current, audioCtxRef.current.sampleRate);

    if (frequency !== -1 && frequency > 60 && frequency < 450) {
      // Find the closest guitar standard string
      let closest = TUNER_STRINGS[0];
      let minDiff = Math.abs(frequency - closest.freq);

      for (let i = 1; i < TUNER_STRINGS.length; i++) {
        const diff = Math.abs(frequency - TUNER_STRINGS[i].freq);
        if (diff < minDiff) {
          minDiff = diff;
          closest = TUNER_STRINGS[i];
        }
      }

      // Calculate cents deviation
      const cents = Math.floor(1200 * Math.log2(frequency / closest.freq));
      setDetectedNote(closest.note);
      setCentsOffset(Math.max(-50, Math.min(50, cents)));

      if (Math.abs(cents) <= 3) {
        setStatusMessage(`Chuẩn xác! (${Math.round(frequency * 10) / 10} Hz)`);
      } else if (cents > 0) {
        setStatusMessage(`Căng quá (+${cents} cents)`);
      } else {
        setStatusMessage(`Chùng quá (${cents} cents)`);
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateTunerLoop);
  };

  // Pitch Autocorrelation formula
  const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // Too quiet

    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.15;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = SIZE - 1; i > SIZE / 2; i--) {
      if (Math.abs(buffer[i]) < thres) {
        r2 = i;
        break;
      }
    }
    const slicedBuffer = buffer.slice(r1, r2);
    const sizeSliced = slicedBuffer.length;

    const c = new Float32Array(sizeSliced);
    for (let i = 0; i < sizeSliced; i++) {
      for (let j = 0; j < sizeSliced - i; j++) {
        c[i] = c[i] + slicedBuffer[j] * slicedBuffer[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < sizeSliced; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Parabolic interpolation for fine frequency tuning
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  };

  return (
    <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm text-center">
      <h5 className="font-display font-medium text-lg text-left text-zinc-800 mb-6 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
        Máy Lên Dây Đàn (Tuner)
      </h5>

      {/* Tuner scale visualization dial */}
      <div className="relative w-full h-[120px] overflow-hidden flex items-end justify-center mb-4">
        {/* Curved scale frame */}
        <div className="absolute bottom-0 w-[220px] h-[110px] border-2 border-zinc-300 border-b-0 rounded-t-full" />
        
        {/* Reference markers */}
        <div className="absolute bottom-0 h-4 border-l border-zinc-400 left-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 h-2 border-l border-zinc-300 left-1/4" />
        <div className="absolute bottom-0 h-2 border-l border-zinc-300 right-1/4" />
        
        {/* Scale labels */}
        <span className="absolute bottom-0 left-[22%] text-xxs font-mono text-zinc-400">-50</span>
        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xxs font-mono text-zinc-500">0</span>
        <span className="absolute bottom-0 right-[22%] text-xxs font-mono text-zinc-400">+50</span>

        {/* Pointer Dial Needle */}
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-20 bg-rose-500 origin-bottom transition-transform duration-100 ease-out z-10"
          style={{ transform: `translateX(-50%) rotate(${centsOffset}deg)` }}
        />
        {/* Needle base pivot pin */}
        <div className="absolute bottom-0 w-3 h-3 bg-rose-600 rounded-full left-1/2 -translate-x-1/2 translate-y-1/2 z-20 shadow-sm" />
      </div>

      <div className="text-4xl font-display font-bold text-zinc-800 mb-1">
        {detectedNote}
      </div>

      <div className="text-xs font-semibold tracking-wide mb-4">
        {Math.abs(centsOffset) <= 3 && isRunning ? (
          <span className="text-emerald-600 flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            {statusMessage}
          </span>
        ) : isRunning ? (
          <span className="text-sky-600">{statusMessage}</span>
        ) : (
          <span className="text-zinc-400">{statusMessage}</span>
        )}
      </div>

      {/* Audio Wave spectrum visualization */}
      {isRunning && (
        <div className="flex justify-center items-center gap-0.5 h-6 mb-6">
          {[...Array(9)].map((_, i) => (
            <span
              key={i}
              className="w-0.5 bg-sky-600 rounded-full"
              style={{
                height: `${Math.random() * 100}%`,
                animation: `bounceWave 0.8s infinite alternate`,
                animationDelay: `${i * 0.08}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Trigger Microphone button */}
      <button
        onClick={handleToggle}
        className={`w-full py-3 rounded-xl font-display font-bold text-sm tracking-wide cursor-pointer transition-all flex items-center justify-center gap-2 ${
          isRunning
            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md"
            : "bg-zinc-100 hover:bg-zinc-200 text-sky-600 border border-zinc-200"
        }`}
      >
        {isRunning ? (
          <>
            <MicOff size={16} />
            Tắt Dò Dây Đàn
          </>
        ) : (
          <>
            <Mic size={16} />
            Bật Micro Dò Dây
          </>
        )}
      </button>

      {/* CSS Animation keyframe inline */}
      <style>{`
        @keyframes bounceWave {
          0% { height: 4px; }
          100% { height: 20px; }
        }
      `}</style>
    </div>
  );
}
