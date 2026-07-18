import { useState, useEffect, useRef } from "react";
import { Play, Square, Keyboard } from "lucide-react";

export default function Metronome() {
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beatCount, setBeatCount] = useState<number>(0);
  const [flash, setFlash] = useState<"tick" | "tock" | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalIdRef = useRef<any | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Calculate tempo classification
  const getTempoCategory = (val: number) => {
    if (val < 60) return "Largo (Rất chậm)";
    if (val < 76) return "Adagio (Chậm)";
    if (val < 108) return "Andante (Thong thả)";
    if (val < 120) return "Moderato (Vừa phải)";
    if (val < 168) return "Allegro (Nhanh)";
    return "Presto (Rất nhanh)";
  };

  useEffect(() => {
    if (isPlaying) {
      startTicker();
    } else {
      stopTicker();
    }
    return () => stopTicker();
  }, [isPlaying, bpm]);

  const playTick = (time: number, freq: number) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    osc.start(time);
    osc.stop(time + 0.06);
  };

  const startTicker = () => {
    stopTicker();
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const interval = 60000 / bpm;
    let localCount = beatCount;

    intervalIdRef.current = setInterval(() => {
      if (!audioCtxRef.current) return;
      const time = audioCtxRef.current.currentTime;
      const isDownbeat = localCount % 2 === 0;
      const freq = isDownbeat ? 1000 : 700;

      playTick(time, freq);

      // Trigger visual flash
      setFlash(isDownbeat ? "tick" : "tock");
      setTimeout(() => setFlash(null), 80);

      localCount++;
      setBeatCount(localCount);
    }, interval);
  };

  const stopTicker = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  const handleToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTap = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length > 1) {
      let sum = 0;
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        sum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      }
      const avg = sum / (tapTimesRef.current.length - 1);
      const calculatedBpm = Math.round(60000 / avg);
      if (calculatedBpm >= 40 && calculatedBpm <= 220) {
        setBpm(calculatedBpm);
      }
    }
  };

  return (
    <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm text-center">
      <h5 className="font-display font-medium text-lg text-left text-zinc-800 mb-6 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
        Máy Gõ Nhịp (Metronome)
      </h5>

      {/* Flashing dual beat visualizer */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <div
          className={`w-12 h-12 rounded-full border-2 transition-all duration-75 ${
            flash === "tick"
              ? "bg-rose-500 border-rose-500 shadow-[0_0_20px_#f43f5e] scale-110"
              : "bg-zinc-100 border-zinc-200"
          }`}
        />
        <div
          className={`w-12 h-12 rounded-full border-2 transition-all duration-75 ${
            flash === "tock"
              ? "bg-cyan-400 border-cyan-400 shadow-[0_0_20px_#22d3ee] scale-110"
              : "bg-zinc-100 border-zinc-200"
          }`}
        />
      </div>

      <div className="text-3xl font-display font-bold text-zinc-800 mb-1">
        {bpm} <span className="text-base font-normal text-zinc-400">BPM</span>
      </div>
      <div className="text-xs text-zinc-500 font-medium mb-6 uppercase tracking-wider">
        {getTempoCategory(bpm)}
      </div>

      {/* BPM slider */}
      <div className="px-4 mb-6">
        <input
          type="range"
          min="40"
          max="220"
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-xxs text-zinc-400 mt-2">
          <span>40 BPM</span>
          <span>130 BPM</span>
          <span>220 BPM</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleTap}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full border border-zinc-200 text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-all cursor-pointer"
        >
          <Keyboard size={14} />
          Tap Tempo
        </button>
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 font-display font-semibold px-6 py-2.5 rounded-full text-white cursor-pointer shadow-md transition-all ${
            isPlaying
              ? "bg-rose-600 hover:bg-rose-700 shadow-rose-950/10"
              : "bg-sky-600 hover:bg-sky-700 shadow-sky-950/10"
          }`}
        >
          {isPlaying ? (
            <>
              <Square size={14} fill="white" />
              STOP
            </>
          ) : (
            <>
              <Play size={14} fill="white" />
              START
            </>
          )}
        </button>
      </div>
    </div>
  );
}
