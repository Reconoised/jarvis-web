"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

export default function Dashboard() {
  const [theme, setTheme] = useState("dark");
  const [mode, setMode] = useState("idle"); // idle | recording | thinking | speaking
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [inputText, setInputText] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks); }).catch(() => {});
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.projects) setProjects(d.projects); }).catch(() => {});
    fetch("/api/recent").then(r => r.json()).then(d => { if (d.files) setRecentFiles(d.files); }).catch(() => {});
  }, []);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Shortcut
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); handleOrbClick(); }
      if (e.code === "Escape") stopSpeaking();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // ===== ORB CLICK: gestisce tutti gli stati =====
  function handleOrbClick() {
    if (mode === "recording") {
      stopRec();
    } else if (mode === "speaking") {
      stopSpeaking();
    } else if (mode === "idle") {
      startRec();
    }
    // se "thinking", ignora
  }

  // ===== REGISTRAZIONE =====
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio level monitor
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioCtxRef.current = ctx;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setAudioLevel(Math.min(avg / 100, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      }
      tick();

      // MediaRecorder
      const rec = new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = () => {
        // Cleanup
        cancelAnimationFrame(animFrameRef.current);
        ctx.close().catch(() => {});
        stream.getTracks().forEach(t => t.stop());
        setAudioLevel(0);
        
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 1000) {
          sendAudio(blob);
        } else {
          setMode("idle");
        }
      };

      rec.start();
      mediaRecorderRef.current = rec;
      setMode("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Errore microfono: " + err.message + "\n\nVerifica che il browser abbia il permesso di usare il microfono.");
    }
  }

  function stopRec() {
    clearInterval(timerRef.current);
    setRecordingTime(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  // ===== INVIO AUDIO =====
  async function sendAudio(blob) {
    setMode("thinking");
    setMessages(prev => [...prev, { role: "user", text: "\uD83C\uDF99\uFE0F Messaggio vocale" }]);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "rec.webm");
      const res = await fetch(`${BACKEND_URL}/api/jarvis/voice`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
        speak(data.response);
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: "Errore: " + (data.error || "risposta vuota") }]);
        setMode("idle");
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connessione fallita: " + err.message }]);
      setMode("idle");
    }
  }

  // ===== INVIO TESTO =====
  async function sendText(text) {
    if (!text.trim() || mode === "thinking") return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setMode("thinking");
    try {
      const res = await fetch(`${BACKEND_URL}/api/jarvis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
        speak(data.response);
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: "Errore: " + (data.error || "risposta vuota") }]);
        setMode("idle");
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connessione fallita: " + err.message }]);
      setMode("idle");
    }
  }

  // ===== TTS =====
  function speak(text) {
    if (!("speechSynthesis" in window)) { setMode("idle"); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT";
    u.rate = 1.0;
    u.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang === "it-IT" && v.name.includes("Google"))
      || voices.find(v => v.lang === "it-IT" && v.name.includes("Luca"))
      || voices.find(v => v.lang === "it-IT" && !v.localService)
      || voices.find(v => v.lang.startsWith("it"));
    if (v) u.voice = v;
    u.onstart = () => setMode("speaking");
    u.onend = () => setMode("idle");
    u.onerror = () => setMode("idle");
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setMode("idle");
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

  const ft = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  const scale = mode === "recording" ? 1 + audioLevel * 0.3 : 1;
  const glow = mode === "recording" ? 30 + audioLevel * 80 : 0;

  const STATUS = {
    idle: "Premi Spazio o tocca l'orb",
    recording: `Sto ascoltando... \u2022 ${ft(recordingTime)}`,
    thinking: "Sto pensando...",
    speaking: "Friday sta parlando...",
  };

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
              <span className="project-status">{"\u25CF"}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </section>
      </aside>

      <div className="center">
        <div className="top-bar">
          <span className="brand">FRIDAY</span>
          <button className="theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "\u2600" : "\u263D"}
          </button>
        </div>

        <div className={`orb-wrapper ${mode !== "idle" ? "active" : ""}`}>
          <div className="orb-ring" />
          <div className="orb-ring ring-2" />
          <div
            className={`orb ${mode}`}
            onClick={handleOrbClick}
            style={mode === "recording" ? {
              transform: `scale(${scale})`,
              boxShadow: `0 0 ${glow}px rgba(120,90,255,${0.3 + audioLevel * 0.5})`
            } : {}}
          />
        </div>

        <p className="status">
          {mode === "recording" && <span className="rec-dot" />}
          {STATUS[mode]}
        </p>

        <div className="chat">
          {messages.length === 0 && (
            <div className="empty-chat">
              <p>{"Premi Spazio o tocca l'orb per parlare a Friday."}</p>
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
        <button className="send" onClick={handleSendText} disabled={mode === "thinking"}>{mode === "thinking" ? "\u2026" : "\u2192"}</button>
      </div>
    </main>
  );
}
