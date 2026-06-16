"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";
const WAKE_PHRASE = "friday";

export default function Dashboard() {
  const [theme, setTheme] = useState("dark");
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("Dì 'Hey Friday' o tocca l'orb");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [wakeListening, setWakeListening] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const wakeRecognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Dati
  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks); }).catch(() => {});
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.projects) setProjects(d.projects); }).catch(() => {});
    fetch("/api/recent").then(r => r.json()).then(d => { if (d.files) setRecentFiles(d.files); }).catch(() => {});
  }, []);

  // Voci TTS
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Shortcut tastiera
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); toggleRecording(); }
      if (e.code === "Escape") stopSpeaking();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  // ===== WAKE WORD "Hey Friday" =====
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const wake = new SR();
    wake.continuous = true;
    wake.interimResults = true;
    wake.lang = "it-IT";

    wake.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase();
        if (text.includes("friday") || text.includes("frai dei") || text.includes("frai day") || text.includes("hey friday")) {
          if (!isRecordingRef.current && !isLoadingRef.current) {
            // Wake word detected! Start recording
            wake.stop();
            setWakeListening(false);
            setTimeout(() => startRecording(), 300);
          }
        }
      }
    };

    wake.onerror = () => {};
    wake.onend = () => {
      // Auto-restart wake word listener (unless recording)
      if (!isRecordingRef.current && !isLoadingRef.current) {
        try { wake.start(); setWakeListening(true); } catch(e) {}
      }
    };

    wakeRecognitionRef.current = wake;

    // Start listening for wake word
    try { wake.start(); setWakeListening(true); } catch(e) {}

    return () => { try { wake.stop(); } catch(e) {} };
  }, []);

  // Monitor audio level
  const monitorAudio = useCallback((stream) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);
    analyserRef.current = { analyser, audioCtx };

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(avg / 128, 1));
      animFrameRef.current = requestAnimationFrame(tick);
    }
    tick();
  }, []);

  function stopAudioMonitor() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (analyserRef.current?.audioCtx) analyserRef.current.audioCtx.close().catch(() => {});
    setAudioLevel(0);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setStatusText("Dì 'Hey Friday' o tocca l'orb");
    restartWakeWord();
  }

  function restartWakeWord() {
    setTimeout(() => {
      if (wakeRecognitionRef.current && !isRecordingRef.current && !isLoadingRef.current) {
        try { wakeRecognitionRef.current.start(); setWakeListening(true); } catch(e) {}
      }
    }, 500);
  }

  async function sendText(text) {
    if (!text.trim() || isLoading) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsLoading(true);
    isLoadingRef.current = true;
    setStatusText("Sto pensando...");

    try {
      const res = await fetch(`${BACKEND_URL}/api/jarvis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      handleResponse(data);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Connessione fallita: ${err.message}` }]);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      setStatusText("Dì 'Hey Friday' o tocca l'orb");
      restartWakeWord();
    }
  }

  async function sendAudio(audioBlob) {
    setIsLoading(true);
    isLoadingRef.current = true;
    setStatusText("Sto pensando...");
    setMessages(prev => [...prev, { role: "user", text: "\uD83C\uDF99\uFE0F Messaggio vocale" }]);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const res = await fetch(`${BACKEND_URL}/api/jarvis/voice`, { method: "POST", body: formData });
      const data = await res.json();
      handleResponse(data);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Errore: ${err.message}` }]);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      setStatusText("Dì 'Hey Friday' o tocca l'orb");
      restartWakeWord();
    }
  }

  function handleResponse(data) {
    if (data.response) {
      setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
      speak(data.response);
    } else if (data.error) {
      setMessages(prev => [...prev, { role: "assistant", text: `Errore: ${data.error}` }]);
    }
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === "it-IT" && v.name.includes("Google"))
      || voices.find(v => v.lang === "it-IT" && v.name.includes("Luca"))
      || voices.find(v => v.lang === "it-IT" && !v.localService)
      || voices.find(v => v.lang.startsWith("it"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { setIsSpeaking(true); setStatusText("Friday sta parlando..."); };
    utterance.onend = () => { setIsSpeaking(false); setStatusText("Dì 'Hey Friday' o tocca l'orb"); restartWakeWord(); };
    utterance.onerror = () => { setIsSpeaking(false); restartWakeWord(); };
    window.speechSynthesis.speak(utterance);
  }

  async function startRecording() {
    try {
      // Stop wake word listener
      try { wakeRecognitionRef.current?.stop(); } catch(e) {}
      setWakeListening(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      monitorAudio(stream);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        stopAudioMonitor();
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) sendAudio(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      isRecordingRef.current = true;
      setStatusText("Sto ascoltando...");
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      alert("Permesso microfono negato. Abilita il microfono nelle impostazioni del browser.");
      restartWakeWord();
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    isRecordingRef.current = false;
    clearInterval(timerRef.current);
    setRecordingTime(0);
    stopAudioMonitor();
  }

  function toggleRecording() {
    if (isLoading) return;
    if (isSpeaking) stopSpeaking();
    if (isRecording) { stopRecording(); }
    else { startRecording(); }
  }

  function handleSendText() {
    if (inputText.trim()) { sendText(inputText); setInputText(""); }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => sendText(`[FILE: ${file.name}]\n\n${reader.result}`);
    reader.readAsText(file);
    e.target.value = "";
  }

  function formatTime(s) {
    return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  }

  const orbClass = isRecording ? "recording" : isLoading ? "thinking" : isSpeaking ? "speaking" : "";
  const dynamicScale = isRecording ? 1 + audioLevel * 0.25 : 1;
  const dynamicGlow = isRecording ? 40 + audioLevel * 60 : 0;

  return (
    <main className="dashboard">
      <aside className="panel">
        <section>
          <h3 className="widget-title">{"\u2713"} Task Attive</h3>
          {tasks.length === 0 && <p className="empty">Nessuna task</p>}
          {tasks.map((t, i) => (
            <div key={i} className={`task ${t.isDone ? "done" : ""}`}>
              <span className={`dot ${t.isDone ? "checked" : ""}`} />
              <span>{t.text}</span>
            </div>
          ))}
        </section>
        <section>
          <h3 className="widget-title">{"\u25B6"} Progetti</h3>
          {projects.length === 0 && <p className="empty">Nessun progetto</p>}
          {projects.map((p, i) => (
            <div key={i} className="project-item">
              <span className="project-status">{p.status === "In Sviluppo" ? "\u25CF" : "\u25CB"}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </section>
      </aside>

      <div className="center">
        <div className="top-bar">
          <span className="brand">FRIDAY</span>
          <div className="top-actions">
            {wakeListening && <span className="wake-badge">WAKE ON</span>}
            <button className="theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "\u2600" : "\u263D"}
            </button>
          </div>
        </div>

        <div className={`orb-wrapper ${isRecording || isSpeaking ? "active" : ""}`}>
          <div className="orb-ring" />
          <div className="orb-ring ring-2" />
          <div
            className={`orb ${orbClass}`}
            onClick={toggleRecording}
            style={isRecording ? {
              transform: `scale(${dynamicScale})`,
              boxShadow: `0 0 ${dynamicGlow}px rgba(120,90,255,${0.3 + audioLevel * 0.4})`
            } : {}}
          />
        </div>

        <p className="status">
          {isRecording && <span className="rec-dot" />}
          {isRecording ? `${statusText} \u2022 ${formatTime(recordingTime)}` : statusText}
        </p>

        <div className="chat">
          {messages.length === 0 && (
            <div className="empty-chat">
              <p>{"Dì \"Hey Friday\" o tocca l'orb per iniziare."}</p>
              <p className="hint">Spazio = mic \u2022 Esc = interrompi</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <span className="label">{m.role === "user" ? "Tu" : "Friday"}</span>
              <p>{m.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <aside className="panel">
        <section>
          <h3 className="widget-title">{"\u23F0"} File Recenti</h3>
          {recentFiles.length === 0 && <p className="empty">Nessun file</p>}
          {recentFiles.map((f, i) => (
            <div key={i} className="recent-item"><span>{"\u2022"}</span><span>{f}</span></div>
          ))}
        </section>
        <section>
          <h3 className="widget-title">{"\uD83D\uDCAC"} Ultime Risposte</h3>
          {messages.filter(m => m.role === "assistant").slice(-5).map((m, i) => (
            <div key={i} className="recent-item">
              <span>{m.text.substring(0, 55)}{m.text.length > 55 ? "..." : ""}</span>
            </div>
          ))}
        </section>
      </aside>

      <div className="bar">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{display:"none"}} accept=".txt,.md,.pdf,.csv,.json" />
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>{"\uD83D\uDCCE"}</button>
        <input className="text-input" placeholder="Scrivi a Friday..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSendText(); }} />
        <button className="send" onClick={handleSendText} disabled={isLoading}>{isLoading ? "\u2026" : "\u2192"}</button>
      </div>
    </main>
  );
}
