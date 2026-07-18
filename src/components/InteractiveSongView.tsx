import { useState, useEffect, useRef } from "react";
import { Play, Pause, ArrowLeft, ArrowUp, ArrowDown, Sparkles, Volume2 } from "lucide-react";
import { Song } from "../types";
import { stripHtmlFromLyrics } from "../lib/api";

interface InteractiveSongViewProps {
  song: Song;
  onClose: () => void;
}

const NOTE_LIST = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_MAP: { [key: string]: string } = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

const VN_NOTES_SHARP = ["Đô", "Đô#", "Rê", "Rê#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const VN_NOTES_FLAT = ["Đô", "Rê♭", "Rê", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"];

const NORMALIZED_NOTE_TO_IDX: { [key: string]: number } = {
  "đô": 0, "do": 0, "đo": 0,
  "đô#": 1, "do#": 1, "rê♭": 1, "reb": 1,
  "rê": 2, "re": 2,
  "rê#": 3, "re#": 3, "mi♭": 3, "mib": 3,
  "mi": 4,
  "fa": 5,
  "fa#": 6, "sol♭": 6, "solb": 6,
  "sol": 7,
  "sol#": 8, "la♭": 8, "lab": 8,
  "la": 9,
  "la#": 10, "si♭": 10, "sib": 10,
  "si": 11
};

const CHORD_SHAPES: any = {
  guitar: {
    C: { frets: [-1, 3, 2, 0, 1, 0] },
    Am: { frets: [-1, 0, 2, 2, 1, 0] },
    Em: { frets: [0, 2, 2, 0, 0, 0] },
    G: { frets: [3, 2, 0, 0, 0, 3] },
    D: { frets: [-1, -1, 0, 2, 3, 2] },
    F: { frets: [1, 3, 3, 2, 1, 1] },
    Dm: { frets: [-1, -1, 0, 2, 3, 1] },
    E: { frets: [0, 2, 2, 1, 0, 0] },
    A: { frets: [-1, 0, 2, 2, 2, 0] },
    Bm: { frets: [-1, 2, 4, 4, 3, 2] },
    C7: { frets: [-1, 3, 2, 3, 1, 0] },
    G7: { frets: [3, 2, 0, 0, 0, 1] },
    D7: { frets: [-1, -1, 0, 2, 1, 2] },
    E7: { frets: [0, 2, 0, 1, 0, 0] },
    A7: { frets: [-1, 0, 2, 0, 2, 0] },
    B7: { frets: [-1, 2, 1, 2, 0, 2] }
  },
  ukulele: {
    C: { frets: [0, 0, 0, 3] },
    Am: { frets: [2, 0, 0, 0] },
    Em: { frets: [0, 4, 3, 2] },
    G: { frets: [0, 2, 3, 2] },
    D: { frets: [2, 2, 2, 0] },
    F: { frets: [2, 0, 1, 0] },
    Dm: { frets: [2, 2, 1, 0] },
    E: { frets: [4, 4, 4, 2] },
    A: { frets: [2, 1, 0, 0] },
    Bm: { frets: [4, 2, 2, 2] },
    C7: { frets: [0, 0, 0, 1] },
    G7: { frets: [0, 2, 1, 2] },
    D7: { frets: [2, 0, 2, 0] },
    E7: { frets: [1, 2, 0, 2] },
    A7: { frets: [1, 0, 0, 0] },
    B7: { frets: [4, 3, 2, 0] }
  },
  piano: {
    C: "C - E - G",
    Am: "A - C - E",
    Em: "E - G - B",
    G: "G - B - D",
    D: "D - F# - A",
    F: "F - A - C",
    Dm: "D - F - A",
    E: "E - G# - B",
    A: "A - C# - E",
    Bm: "B - D - F#",
    C7: "C - E - G - Bb",
    G7: "G - B - D - F",
    D7: "D - F# - A - C",
    E7: "E - G# - B - D",
    A7: "A - C# - E - G",
    B7: "B - D# - F# - A"
  }
};

export default function InteractiveSongView({ song, onClose }: InteractiveSongViewProps) {
  const [transposeOffset, setTransposeOffset] = useState<number>(0);
  const [chordMode, setChordMode] = useState<"guitar" | "ukulele" | "piano">("guitar");
  const [autoscrollPlaying, setAutoscrollPlaying] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(5);
  const [voiceControlEnabled, setVoiceControlEnabled] = useState<boolean>(false);
  const [voiceLog, setVoiceLog] = useState<string>("Trạng thái: Tắt");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoscrollIntervalRef = useRef<any | null>(null);

  useEffect(() => {
    if (autoscrollPlaying) {
      startScrollTimer();
    } else {
      stopScrollTimer();
    }
    return () => stopScrollTimer();
  }, [autoscrollPlaying, scrollSpeed]);

  const startScrollTimer = () => {
    stopScrollTimer();
    autoscrollIntervalRef.current = setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollBy({ top: 1.5, behavior: "smooth" });
      }
    }, 110 - scrollSpeed * 4);
  };

  const stopScrollTimer = () => {
    if (autoscrollIntervalRef.current) {
      clearInterval(autoscrollIntervalRef.current);
      autoscrollIntervalRef.current = null;
    }
  };

  const handleToggleScroll = () => {
    setAutoscrollPlaying(!autoscrollPlaying);
  };

  // Autoscroll speech simulation logic
  const handleSimulateVoice = (cmd: string) => {
    if (!voiceControlEnabled) {
      alert("Hãy bật công tắc nhận diện giọng nói trước khi sử dụng!");
      return;
    }
    setVoiceLog(`Nhận diện được: "${cmd.toUpperCase()}"`);

    if (cmd === "cuon") {
      setAutoscrollPlaying(true);
    } else if (cmd === "dung") {
      setAutoscrollPlaying(false);
    } else if (cmd === "nhanh") {
      setScrollSpeed((prev) => Math.min(20, prev + 3));
    } else if (cmd === "cham") {
      setScrollSpeed((prev) => Math.max(1, prev - 3));
    }

    setTimeout(() => {
      setVoiceLog("Trạng thái: Đang lắng nghe...");
    }, 2000);
  };

  const handleToggleVoiceControl = () => {
    const nextState = !voiceControlEnabled;
    setVoiceControlEnabled(nextState);
    setVoiceLog(nextState ? "Trạng thái: Đang lắng nghe..." : "Trạng thái: Tắt");
  };

  // Chord shifting logic
  const shiftChordKey = (chord: string, offset: number) => {
    if (offset === 0) return chord;
    return chord.replace(/^([A-G]#?|D[b-b]|E[b-b]|G[b-b]|A[b-b]|B[b-b])(.*)/, (match, root, suffix) => {
      const rootNorm = FLAT_MAP[root] || root;
      const idx = NOTE_LIST.indexOf(rootNorm);
      if (idx === -1) return match;
      const newIdx = (idx + offset + 12) % 12;
      return NOTE_LIST[newIdx] + suffix;
    });
  };

  // Vietnamese pitch note transposing helper with multi-octave support (e.g. Do -> Do2 -> Do3 and back)
  const transposeVNNote = (note: string, octaveStr: string, offset: number) => {
    const pitchIdx = NORMALIZED_NOTE_TO_IDX[note.toLowerCase()];
    if (pitchIdx === undefined) {
      return { note, octave: octaveStr };
    }
    
    // Default octave is 1 if none is specified
    const currentOctave = octaveStr ? parseInt(octaveStr, 10) : 1;
    
    // Absolute pitch in semitones
    const absolutePitch = currentOctave * 12 + pitchIdx;
    const newAbsolutePitch = absolutePitch + offset;
    
    const newOctave = Math.floor(newAbsolutePitch / 12);
    const newPitchIdx = ((newAbsolutePitch % 12) + 12) % 12;
    
    // Decide whether to use flat or sharp based on offset direction
    const newNoteName = offset < 0 ? VN_NOTES_FLAT[newPitchIdx] : VN_NOTES_SHARP[newPitchIdx];
    
    // Keep standard: octave 1 is represented by empty string ""
    const newOctaveStr = newOctave > 1 ? newOctave.toString() : "";
    
    return { note: newNoteName, octave: newOctaveStr };
  };

  // Render SVG Fretboards for interactive hovering tooltips
  const drawGuitarSVG = (frets: number[]) => {
    return (
      <svg width="90" height="110" viewBox="0 0 90 110" xmlns="http://www.w3.org/2000/svg" className="bg-white rounded-lg p-1.5 mx-auto block">
        {/* Frets horizontal lines */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 18 + i * 20;
          return <line key={i} x1="12" y1={y} x2="78" y2={y} stroke="#333" strokeWidth={i === 0 ? 3 : 1} />;
        })}
        {/* Strings vertical lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = 12 + i * 13.2;
          return <line key={i} x1={x} y1="18" x2={x} y2="98" stroke="#555" strokeWidth="1" />;
        })}
        {/* Dots placement */}
        {frets.map((fret, str) => {
          const x = 12 + str * 13.2;
          if (fret === -1) {
            return (
              <text key={str} x={x - 4} y="12" fontSize="9" fontFamily="Arial" fontWeight="bold" fill="#ef4444">
                X
              </text>
            );
          } else if (fret === 0) {
            return <circle key={str} cx={x} cy="10" r="3" stroke="#10b981" strokeWidth="1.5" fill="none" />;
          } else {
            const y = 18 + (fret - 0.5) * 20;
            return <circle key={str} cx={x} cy={y} r="4" fill="#6366f1" />;
          }
        })}
      </svg>
    );
  };

  const drawUkuleleSVG = (frets: number[]) => {
    return (
      <svg width="80" height="110" viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg" className="bg-white rounded-lg p-1.5 mx-auto block">
        {/* Frets horizontal */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 18 + i * 20;
          return <line key={i} x1="12" y1={y} x2="68" y2={y} stroke="#333" strokeWidth={i === 0 ? 3 : 1} />;
        })}
        {/* Strings vertical */}
        {[0, 1, 2, 3].map((i) => {
          const x = 12 + i * 18.6;
          return <line key={i} x1={x} y1="18" x2={x} y2="98" stroke="#555" strokeWidth="1" />;
        })}
        {/* Dots */}
        {frets.map((fret, str) => {
          const x = 12 + str * 18.6;
          if (fret === -1) {
            return (
              <text key={str} x={x - 4} y="12" fontSize="9" fontFamily="Arial" fontWeight="bold" fill="#ef4444">
                X
              </text>
            );
          } else if (fret === 0) {
            return <circle key={str} cx={x} cy="10" r="3" stroke="#10b981" strokeWidth="1.5" fill="none" />;
          } else {
            const y = 18 + (fret - 0.5) * 20;
            return <circle key={str} cx={x} cy={y} r="4" fill="#06b6d4" />;
          }
        })}
      </svg>
    );
  };

  // High performance custom HTML parsing for chords / notes / lessons
  const renderInteractiveLyrics = () => {
    if (song.phanLoai === "Bài Học") {
      return (
        <div 
          className="whitespace-pre-wrap leading-relaxed select-text font-sans text-zinc-200 text-sm md:text-base prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: song.loiBH }}
        />
      );
    }

    if (song.phanLoai === "Cảm Âm") {
      const cleanLyrics = stripHtmlFromLyrics(song.loiBH);
      // Match Vietnamese note names in any case (case-insensitive) and transpose or style them smoothly
      const noteRegex = /(?<!\p{L}|\p{N})(Sol#|Sol♭|Solb|Đô#|Do#|Rê#|Rê♭|Re#|Reb|Mi♭|Mib|Fa#|La#|La♭|Lab|Si#|Si♭|Sib|Sol|Rê|Re|Mi|Fa|La|Si|Đô|Do)([0-9]?)(?!\p{L}|\p{N})/gui;
      
      const lyricsTransposed = cleanLyrics.replace(noteRegex, (match, note, octave) => {
        const transposed = transposeVNNote(note, octave, transposeOffset);
        return `<span class="text-red-600 font-bold font-mono inline-block mx-0.5">${transposed.note}${transposed.octave}</span>`;
      });

      return <div className="leading-relaxed whitespace-pre-wrap select-text text-zinc-800 text-sm md:text-base font-semibold" dangerouslySetInnerHTML={{ __html: lyricsTransposed }} />;
    }

    // Default: "Hợp Âm" (Chord display)
    // Map bracketed [Chord] items to interactive tooltip spans
    const cleanLyrics = stripHtmlFromLyrics(song.loiBH);
    const parts = cleanLyrics.split(/(\[[^\]]+\])/);
    
    return (
      <div className="whitespace-pre-wrap leading-relaxed select-text font-display">
        {parts.map((part, idx) => {
          if (part.startsWith("[") && part.endsWith("]")) {
            const chord = part.substring(1, part.length - 1);
            const transposedChord = shiftChordKey(chord, transposeOffset);

            // Fetch fret shape
            const strippedChord = transposedChord.replace(/(m|7|maj7|min7|dim|sus\d?|add\d?)$/, "");
            const shapeObj = CHORD_SHAPES[chordMode]?.[strippedChord] || CHORD_SHAPES[chordMode]?.[transposedChord];

            return (
              <span key={idx} className="relative group inline-block mx-0.5 cursor-pointer font-extrabold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md select-none transition-all hover:bg-sky-100">
                {transposedChord}
                {/* Visual tooltip box */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all origin-bottom bg-white text-zinc-800 rounded-xl p-3 border border-zinc-200 shadow-xl z-50 pointer-events-none w-32 text-center text-xs">
                  <div className="text-xxs font-bold uppercase text-zinc-400 mb-2">{transposedChord}</div>
                  {chordMode === "piano" ? (
                    <div className="font-semibold text-sky-600 py-1 font-mono">
                      {CHORD_SHAPES.piano[transposedChord] || "Cập nhật"}
                    </div>
                  ) : shapeObj ? (
                    chordMode === "guitar" ? (
                      drawGuitarSVG(shapeObj.frets)
                    ) : (
                      drawUkuleleSVG(shapeObj.frets)
                    )
                  ) : (
                    <span className="text-zinc-500 text-xxs block py-2">Đang thiết lập thế tay</span>
                  )}
                </span>
              </span>
            );
          }
          return <span key={idx} dangerouslySetInnerHTML={{ __html: part }} />;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-zinc-50 z-[1100] flex flex-col h-screen overflow-hidden text-zinc-800">
      {/* Header bar controls */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 md:px-6 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-white border border-zinc-200 text-zinc-700 rounded-full hover:bg-zinc-50 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h4 className="font-display font-bold text-base md:text-lg text-zinc-900 leading-tight truncate">
              {song.tenBH}
            </h4>
            <span className={`text-[10px] md:text-xxs font-semibold uppercase rounded-full px-2.5 py-0.5 inline-block mt-0.5 border ${
              song.phanLoai === "Bài Học"
                ? "bg-sky-50 border-sky-200 text-sky-700"
                : song.phanLoai === "Cảm Âm"
                ? "bg-cyan-50 border-cyan-200 text-cyan-700"
                : "bg-sky-50 border-sky-200 text-sky-700"
            }`}>
              {song.phanLoai}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Fret chords select option */}
          {song.phanLoai === "Hợp Âm" && (
            <select
              value={chordMode}
              onChange={(e: any) => setChordMode(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-900 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 shadow-sm"
            >
              <option value="guitar" className="text-zinc-900 bg-white">Guitar</option>
              <option value="ukulele" className="text-zinc-900 bg-white">Ukulele</option>
              <option value="piano" className="text-zinc-900 bg-white">Piano</option>
            </select>
          )}

          {/* Transpose button offsets */}
          {song.phanLoai !== "Bài Học" && (
            <div className="flex items-center gap-2 flex-wrap">
              {song.phanLoai === "Cảm Âm" && (
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setTransposeOffset((prev) => Math.max(-24, prev - 12))}
                    className="px-2 py-1 text-[10px] font-bold bg-zinc-50 hover:bg-zinc-100 rounded text-zinc-600 transition-all cursor-pointer border border-zinc-100"
                    title="Hạ 1 quãng tám (-12 bán âm)"
                  >
                    -1 Oct
                  </button>
                  <button
                    onClick={() => setTransposeOffset((prev) => Math.min(24, prev + 12))}
                    className="px-2 py-1 text-[10px] font-bold bg-zinc-50 hover:bg-zinc-100 rounded text-zinc-600 transition-all cursor-pointer border border-zinc-100"
                    title="Tăng 1 quãng tám (+12 bán âm)"
                  >
                    +1 Oct
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => {
                    if (song.phanLoai === "Cảm Âm") {
                      setTransposeOffset((prev) => (prev <= -24 ? 24 : prev - 1));
                    } else {
                      setTransposeOffset((prev) => (prev <= -6 ? 5 : prev - 1));
                    }
                  }}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  title="Hạ 1/2 cung / Nốt"
                >
                  <ArrowDown size={14} />
                </button>
                <span className="text-xs font-mono font-bold text-zinc-700 min-w-16 text-center">
                  {song.phanLoai === "Hợp Âm"
                    ? `Tone: ${transposeOffset === 0 ? "Gốc" : transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}`
                    : `Dịch: ${transposeOffset === 0 ? "Gốc" : transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}`}
                </span>
                <button
                  onClick={() => {
                    if (song.phanLoai === "Cảm Âm") {
                      setTransposeOffset((prev) => (prev >= 24 ? -24 : prev + 1));
                    } else {
                      setTransposeOffset((prev) => (prev >= 6 ? -5 : prev + 1));
                    }
                  }}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  title="Tăng 1/2 cung / Nốt"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main split scrolling and voice simulator panels */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0 bg-zinc-50/50">
        {/* Right floating helper toolbar: Hands-free vocal triggers and autoscroller */}
        <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-zinc-200 p-3 md:p-5 flex flex-col sm:flex-row md:flex-col justify-between md:justify-start gap-3 md:gap-6 shrink-0 overflow-y-auto max-h-[180px] md:max-h-none shadow-xs">
          <div className="space-y-2 md:space-y-4 flex-grow min-w-0">
            <h6 className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider hidden md:block">
              Trình cuộn rảnh tay
            </h6>

            {/* Speed slider autoscroll bar */}
            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl shadow-xs space-y-2 md:space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-600 font-semibold">
                <span>Tự động cuộn:</span>
                <span className="font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded font-bold border border-sky-100">
                  {scrollSpeed}s
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <button
                onClick={handleToggleScroll}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  autoscrollPlaying
                    ? "bg-rose-50 border border-rose-200 text-rose-600"
                    : "bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                }`}
              >
                {autoscrollPlaying ? (
                  <>
                    <Pause size={12} fill="currentColor" />
                    Tạm dừng cuộn
                  </>
                ) : (
                  <>
                    <Play size={12} fill="currentColor" />
                    Bắt đầu cuộn
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Voice triggers emulator panel */}
          <div className="space-y-2 md:space-y-3 flex-grow min-w-0 max-w-sm md:max-w-none">
            <h6 className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider hidden md:block">
              Giọng Nói (Giả lập)
            </h6>
            <div className="bg-zinc-50 border border-zinc-200 p-2 md:p-3 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-600 font-bold flex items-center gap-1 truncate">
                  <Volume2 size={14} className="text-sky-600 animate-bounce shrink-0" />
                  Giọng nói:
                </span>
                <button
                  onClick={handleToggleVoiceControl}
                  className={`text-[10px] md:text-xxs px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    voiceControlEnabled
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300"
                  }`}
                >
                  {voiceControlEnabled ? "ĐANG BẬT" : "TẮT"}
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-2 gap-1 text-center">
                <button
                  onClick={() => handleSimulateVoice("cuon")}
                  className="bg-white hover:bg-zinc-100 text-zinc-700 text-[10px] md:text-xxs font-bold py-1 rounded cursor-pointer transition-all border border-zinc-200 shadow-xxs"
                >
                  Cuộn
                </button>
                <button
                  onClick={() => handleSimulateVoice("dung")}
                  className="bg-white hover:bg-zinc-100 text-zinc-700 text-[10px] md:text-xxs font-bold py-1 rounded cursor-pointer transition-all border border-zinc-200 shadow-xxs"
                >
                  Dừng
                </button>
                <button
                  onClick={() => handleSimulateVoice("nhanh")}
                  className="bg-white hover:bg-zinc-100 text-zinc-700 text-[10px] md:text-xxs font-bold py-1 rounded cursor-pointer transition-all border border-zinc-200 shadow-xxs truncate"
                >
                  Nhanh
                </button>
                <button
                  onClick={() => handleSimulateVoice("cham")}
                  className="bg-white hover:bg-zinc-100 text-zinc-700 text-[10px] md:text-xxs font-bold py-1 rounded cursor-pointer transition-all border border-zinc-200 shadow-xxs truncate"
                >
                  Chậm
                </button>
              </div>

              <div className="bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-[10px] md:text-xxs p-1.5 rounded-lg tracking-wide select-none truncate">
                <span className="text-zinc-400 mr-1">$</span> {voiceLog}
              </div>
            </div>
          </div>
        </div>

        {/* Content lyrics page */}
        <div
          ref={containerRef}
          className="flex-grow p-4 md:p-8 overflow-y-auto bg-zinc-100/40 select-text text-zinc-800 text-sm md:text-base h-full"
        >
          <div className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded-2xl p-5 md:p-8 shadow-md">
            <h2 className="text-center font-display font-bold text-lg md:text-2xl text-zinc-900 border-b border-dashed border-zinc-200 pb-4 mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="text-sky-500 fill-amber-500/10 shrink-0 animate-pulse" size={18} />
              {song.phanLoai === "Bài Học" ? "Nội dung bài học" : song.phanLoai === "Cảm Âm" ? "Lời bài hát & Cảm Âm" : "Lời bài hát & Hợp Âm"}
            </h2>
            {renderInteractiveLyrics()}
          </div>
        </div>
      </div>
    </div>
  );
}
