"use client";

import { useState, useEffect, useRef } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

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
  const [statusText, setStatusText] = useState("Tocca per parlare");
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  // Theme
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Load data
  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks); }).catch(() => {});
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.projects) setProjects(d.projects); }).catch(() => {});
    fetch("/api/recent").then(r => r.json()).then(d => { if (d.files) setRecentFiles(d.files); }).catch(() => {});
  }, []);

  // === INVIO TESTO AL BACKEND ===
  async function sendText(text) {
    if (!text.trim() || isLoading) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsLoading(true);
    setStatusText("Elaborazione...");

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
      setStatusText("Tocca per parlare");
    }
  }

  // === INVIO AUDIO AL BACKEND ===
  async function sendAudio(audioBlob) {
    setIsLoading(true);
    setStatusText("Sto trascrivendo e pensando...");
    setMessages(prev => [...prev, { role: "user", text: "\uD83C\uDF99\uFE0F [Messaggio vocale]" }]);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch(`${BACKEND_URL}/api/jarvis/voice`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      handleResponse(data);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Errore audio: ${err.message}` }]);
    } finally {
      setIsLoading(false);
      setStatusText("Tocca per parlare");
    }
  }

  // === GESTIONE RISPOSTA + TTS ===
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
    utterance.rate = 1.05;
    utterance.onstart = () => { setIsSpeaking(true); setStatusText("Jarvis sta parlando..."); };
    utterance.onend = () => { setIsSpeaking(false); setStatusText("Tocca per parlare"); };
    window.speechSynthesis.speak(utterance);
  }

  // === REGISTRAZIONE AUDIO ===
  async function toggleRecording() {
    if (isLoading) return;

    if (isRecording) {
      // STOP RECORDING
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
    } else {
      // START RECORDING
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (audioBlob.size > 0) sendAudio(audioBlob);
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        setStatusText("Sto registrando... tocca per inviare");
        setRecordingTime(0);
        timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      } catch (err) {
        alert("Permesso microfono negato. Abilita il microfono nelle impostazioni del browser per questo sito.");
      }
    }
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
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const orbClass = isRecording ? "recording" : isLoading ? "thinking" : isSpeaking ? "speaking" : "";

  return (
    <main className="dashboard">

      {/* LEFT */}
      <aside className="panel">
        <section>
          <h3 className="widget-title">{"\u2713"} Task Attive</h3>
          {tasks.length === 0 && <p className="empty">Nessuna task trovata</p>}
          {tasks.map((t, i) => (
            <div key={i} className={`task ${t.isDone ? "done" : ""}`}>
              <span className={`dot ${t.isDone ? "checked" : ""}`} />
              <span>{t.text}</span>
            </div>
          ))}
        </section>
        <section>
          <h3 className="widget-title">{"\u25B6"} Progetti Attivi</h3>
          {projects.length === 0 && <p className="empty">Nessun progetto</p>}
          {projects.map((p, i) => (
            <div key={i} className="project-item">
              <span className="project-status">{p.status === "In Sviluppo" ? "\u25CF" : "\u25CB"}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </section>
      </aside>

      {/* CENTER */}
      <div className="center">
        <button className="theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "\u2600" : "\u263D"}
        </button>

        <div className={`orb-wrapper ${isRecording || isSpeaking ? "active" : ""}`}>
          <div className="orb-ring" />
          <div className={`orb ${orbClass}`} onClick={toggleRecording} />
        </div>

        <p className="status">
          {isRecording && <span className="rec-dot" />}
          {isRecording ? `${statusText} (${formatTime(recordingTime)})` : statusText}
        </p>

        <div className="chat">
          {messages.length === 0 && (
            <div className="empty-chat">
              <p>Tocca l{"'"}orb per parlare o scrivi un comando in basso.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <span className="label">{m.role === "user" ? "Tu" : "Jarvis"}</span>
              <p>{m.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* RIGHT */}
      <aside className="panel">
        <section>
          <h3 className="widget-title">{"\u23F0"} File Recenti</h3>
          {recentFiles.length === 0 && <p className="empty">Nessun file</p>}
          {recentFiles.map((f, i) => (
            <div key={i} className="recent-item"><span>{"\u2022"}</span><span>{f}</span></div>
          ))}
        </section>
        <section>
          <h3 className="widget-title">{"\uD83D\uDCAC"} Risposte Recenti</h3>
          {messages.filter(m => m.role === "assistant").slice(-5).map((m, i) => (
            <div key={i} className="recent-item">
              <span>{m.text.substring(0, 55)}{m.text.length > 55 ? "..." : ""}</span>
            </div>
          ))}
        </section>
      </aside>

      {/* BOTTOM */}
      <div className="bar">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{display:"none"}} accept=".txt,.md,.pdf,.csv,.json" />
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Allega file">{"\uD83D\uDCCE"}</button>
        <input
          className="text-input"
          placeholder="Scrivi un comando..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSendText(); }}
        />
        <button className="send" onClick={handleSendText} disabled={isLoading}>{isLoading ? "\u2026" : "\u2192"}</button>
      </div>
    </main>
  );
}
