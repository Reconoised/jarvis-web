"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Paperclip, CheckCircle2, Circle, ListTodo, BrainCircuit, MessageSquare, MicOff, Book, GitGraph, BookOpen, Compass, Target, Briefcase, Calendar, ChevronDown, PanelRightClose, PanelRightOpen, Volume2, VolumeX } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import MeditationView from "./components/MeditationView";
import ResourceView from "./components/ResourceView";
import JournalView from "./components/JournalView";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

export default function Dashboard() {
  const [currentView, setCurrentView] = useState("OS"); // OS | Meditazione | Risorse | Manuali | Grafo | Diario | Progetti | Obiettivi
  const [isFocusOpen, setIsFocusOpen] = useState(true);
  const [mode, setMode] = useState("idle"); // idle | recording | thinking | speaking
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [inputText, setInputText] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [wakeHeard, setWakeHeard] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const modeRef = useRef("idle");
  const audioPlayerRef = useRef(null);

  const wakeStreamRef = useRef(null);
  const wakeEnabledRef = useRef(false);

  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem("friday_chat_history");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("friday_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks); }).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); handleOrbClick(); }
      if (e.code === "Escape") stopSpeaking();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  useEffect(() => {
    audioPlayerRef.current = new Audio();
    audioPlayerRef.current.addEventListener("ended", () => setMode("idle"));
    audioPlayerRef.current.addEventListener("error", () => setMode("idle"));
  }, []);

  function toggleWake() {
    if (wakeEnabled) stopWake();
    else startWake();
  }

  async function startWake() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      wakeStreamRef.current = stream;
      wakeEnabledRef.current = true;
      setWakeEnabled(true);
      runWakeLoop(stream);
    } catch(err) {
      alert("Errore microfono: " + err.message);
    }
  }

  function runWakeLoop(stream) {
    if (!wakeEnabledRef.current || !stream.active) return;
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = async () => {
      if (!wakeEnabledRef.current) return;
      const blob = new Blob(chunks, { type: "audio/webm" });
      if (blob.size < 500) {
        if (wakeEnabledRef.current && modeRef.current === "idle") runWakeLoop(stream);
        return;
      }
      
      try {
        const fd = new FormData();
        fd.append("audio", blob, "wake.webm");
        const res = await fetch(`${BACKEND_URL}/api/wake-check`, { method: "POST", body: fd });
        const data = await res.json();
        
        if (data.transcript) {
            setWakeHeard(data.transcript.substring(0, 20));
        }
        
        if (data.detected && wakeEnabledRef.current && modeRef.current === "idle") {
          setWakeHeard("Friday!");
          stream.getTracks().forEach(t => t.stop());
          wakeStreamRef.current = null;
          startRec();
          return;
        }
      } catch(e) {}
      
      if (wakeEnabledRef.current && modeRef.current === "idle") runWakeLoop(stream);
    };

    rec.start();
    setTimeout(() => { if (rec.state === "recording") rec.stop(); }, 3000);
  }

  function stopWake() {
    wakeEnabledRef.current = false;
    setWakeEnabled(false);
    setWakeHeard("");
    if (wakeStreamRef.current) {
      wakeStreamRef.current.getTracks().forEach(t => t.stop());
      wakeStreamRef.current = null;
    }
  }

  function restartWake() {
    if (!wakeEnabledRef.current) return;
    setTimeout(() => { if (modeRef.current === "idle") startWake(); }, 1000);
  }

  function handleOrbClick() {
    if (mode === "recording") stopRec();
    else if (mode === "speaking") stopSpeaking();
    else if (mode === "idle") startRec();
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioCtxRef.current = ctx;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart = 0;
      let hasSpoken = false;
      const MAX_RECORDING_MS = 60000; // max 60s
      const SILENCE_THRESHOLD_MS = 3000; // 3 secondi di silenzio chiudono
      const recStart = Date.now();

      function tick() {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setAudioLevel(Math.min(avg / 100, 1));
        
        // Logica Auto-Stop
        const now = Date.now();
        if (avg > 10) {
            hasSpoken = true;
            silenceStart = 0;
        } else if (hasSpoken) {
            if (silenceStart === 0) silenceStart = now;
            else if (now - silenceStart > SILENCE_THRESHOLD_MS) {
                // Ha finito di parlare
                stopRec();
                return;
            }
        }
        
        // Timeout di sicurezza
        if (now - recStart > MAX_RECORDING_MS || (now - recStart > 8000 && !hasSpoken)) {
            stopRec();
            return;
        }

        animFrameRef.current = requestAnimationFrame(tick);
      }
      tick();

      const rec = new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = () => {
        cancelAnimationFrame(animFrameRef.current);
        ctx.close().catch(() => {});
        stream.getTracks().forEach(t => t.stop());
        setAudioLevel(0);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 1000) sendAudio(blob);
        else { setMode("idle"); restartWake(); }
      };

      rec.start();
      mediaRecorderRef.current = rec;
      setMode("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      alert("Errore microfono: " + err.message);
      setMode("idle"); restartWake();
    }
  }

  function stopRec() {
    clearInterval(timerRef.current);
    setRecordingTime(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function sendAudio(blob) {
    setMode("thinking");
    setMessages(prev => [...prev, { role: "user", text: "🎙️ Messaggio vocale" }]);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "rec.webm");
      const res = await fetch(`${BACKEND_URL}/api/jarvis/voice`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.response) {
        let text = data.response;
        const match = text.match(/\[OPEN_RESOURCE:\s*(.*?)\]/);
        if (match) {
          const resourceId = match[1].trim();
          text = text.replace(/\[OPEN_RESOURCE:\s*.*?\]/, "").trim();
          
          const isWebUrl = resourceId.startsWith("http://") || resourceId.startsWith("https://") || /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(resourceId);
          if (isWebUrl) {
            if (!text) text = "Apro subito il sito.";
            const finalUrl = resourceId.startsWith("http") ? resourceId : "https://" + resourceId;
            window.open(finalUrl, '_blank');
          } else {
            if (!text) text = "Apro subito la risorsa.";
            setCurrentView("Risorse");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('friday_open_resource', { detail: resourceId }));
            }, 600);
          }
        }
        setMessages(prev => [...prev, { role: "assistant", text: text }]);
        if (ttsEnabled) {
          speakNeural(text);
        } else {
          setMode("idle"); restartWake();
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: "Errore: " + (data.error || "risposta vuota") }]);
        setMode("idle"); restartWake();
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connessione fallita: " + err.message }]);
      setMode("idle"); restartWake();
    }
  }

  async function sendText(text_input) {
    if (!text_input.trim() || mode === "thinking") return;
    setMessages(prev => [...prev, { role: "user", text: text_input }]);
    setMode("thinking");
    try {
      const res = await fetch(`${BACKEND_URL}/api/jarvis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text_input })
      });
      const data = await res.json();
      if (data.response) {
        let text = data.response;
        const match = text.match(/\[OPEN_RESOURCE:\s*(.*?)\]/);
        if (match) {
          const resourceId = match[1].trim();
          text = text.replace(/\[OPEN_RESOURCE:\s*.*?\]/, "").trim();
          
          const isWebUrl = resourceId.startsWith("http://") || resourceId.startsWith("https://") || /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(resourceId);
          if (isWebUrl) {
            if (!text) text = "Apro subito il sito.";
            const finalUrl = resourceId.startsWith("http") ? resourceId : "https://" + resourceId;
            window.open(finalUrl, '_blank');
          } else {
            if (!text) text = "Apro subito la risorsa.";
            setCurrentView("Risorse");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('friday_open_resource', { detail: resourceId }));
            }, 600);
          }
        }
        setMessages(prev => [...prev, { role: "assistant", text: text }]);
        if (ttsEnabled) {
          speakNeural(text);
        } else {
          setMode("idle"); restartWake();
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: "Errore: " + (data.error || "risposta vuota") }]);
        setMode("idle"); restartWake();
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connessione fallita: " + err.message }]);
      setMode("idle"); restartWake();
    }
  }

  async function speakNeural(text) {
    setMode("speaking");
    try {
      const res = await fetch(`${BACKEND_URL}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("TTS fallito");
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      const player = audioPlayerRef.current;
      player.src = url;
      player.onended = () => { setMode("idle"); URL.revokeObjectURL(url); restartWake(); };
      player.onerror = () => { setMode("idle"); URL.revokeObjectURL(url); restartWake(); };
      player.play();
    } catch (err) {
      fallbackSpeak(text);
    }
  }

  function fallbackSpeak(text) {
    if (!("speechSynthesis" in window)) { setMode("idle"); restartWake(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT"; u.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith("it"));
    if (v) u.voice = v;
    u.onend = () => { setMode("idle"); restartWake(); };
    u.onerror = () => { setMode("idle"); restartWake(); };
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current.currentTime = 0; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setMode("idle");
    restartWake();
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

  const renderMessageContent = (text) => {
    const chartMatch = text.match(/```json\s+chart\s*([\s\S]*?)```/);
    if (chartMatch) {
      try {
        const chartData = JSON.parse(chartMatch[1]);
        const beforeText = text.substring(0, chartMatch.index);
        const afterText = text.substring(chartMatch.index + chartMatch[0].length);
        
        let ChartComponent = null;
        const chartStyle = { width: "100%", height: 200, marginTop: 10, marginBottom: 10, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 10, backdropFilter: "blur(10px)" };
        
        if (chartData.type === "pie") {
          const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
          ChartComponent = (
            <div className="chart-container" style={chartStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                    {chartData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 5, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        } else if (chartData.type === "bar") {
          ChartComponent = (
             <div className="chart-container" style={chartStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.data}>
                  <XAxis dataKey="name" stroke="#ffffff88" fontSize={12} />
                  <YAxis stroke="#ffffff88" fontSize={12} />
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 5, color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.1)" }} />
                  <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        }

        return (
          <>
            {beforeText && <span style={{ whiteSpace: "pre-wrap" }}>{beforeText}</span>}
            {ChartComponent}
            {afterText && <span style={{ whiteSpace: "pre-wrap" }}>{afterText}</span>}
          </>
        );
      } catch (e) {
        return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
      }
    }
    return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
  };

  const STATUS = {
    idle: wakeEnabled ? "In ascolto..." : "Pronto",
    recording: `Ascoltando... ${ft(recordingTime)}`,
    thinking: "Elaborazione...",
    speaking: "Risposta in corso...",
  };

  const navItems = [
    { id: "OS", icon: <BrainCircuit size={22} />, label: "OS" },
    { id: "Meditazione", icon: <Compass size={22} />, label: "Meditazione" },
    { id: "Risorse", icon: <Book size={22} />, label: "Risorse" },
    { id: "Task", icon: <ListTodo size={22} />, label: "Task" },
    { id: "Grafo", icon: <GitGraph size={22} />, label: "Grafo" },
    { id: "Calendario", icon: <Calendar size={22} />, label: "Calendario" },
    { id: "Diario", icon: <MessageSquare size={22} />, label: "Diario" },
    { id: "Progetti", icon: <Briefcase size={22} />, label: "Progetti" },
    { id: "Obiettivi", icon: <Target size={22} />, label: "Obiettivi" }
  ];

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-logo-container">
          <img src="/logo.png" alt="Friday OS" style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 0 15px rgba(0, 150, 255, 0.3)' }} />
          <div className="sidebar-logo-text">
            FRIDAY
            <span>Workspace</span>
          </div>
        </div>
        {navItems.map(item => (
          <div 
            key={item.id} 
            className={`nav-item ${currentView === item.id ? "active" : ""}`}
            onClick={() => setCurrentView(item.id)}
          >
            <div className="nav-icon-box">{item.icon}</div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <main className="dashboard">
        
        {currentView === "OS" ? (
          <div className="os-layout">
            
            {/* CENTER COLUMN: Friday Core + Brain Inbox */}
            <motion.div className="center-column" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}>
              
              <div className="particles-bg" />

              {/* Friday Core Header */}
              <div className="core-header">
                <div className="core-controls">
                  <div className="status-text">
                    {mode === "recording" && <span className="rec-dot" />}
                    {wakeEnabled && mode === "idle" && <span className="wake-dot" />}
                    {STATUS[mode]}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={`wake-btn ${wakeEnabled ? "active" : ""}`} onClick={toggleWake}>
                      {wakeEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                      {wakeEnabled ? "Wake: ON" : "Wake: OFF"}
                    </button>
                    <button className={`wake-btn ${ttsEnabled ? "active" : ""}`} onClick={() => setTtsEnabled(!ttsEnabled)}>
                      {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      {ttsEnabled ? "Voice: ON" : "Voice: OFF"}
                    </button>
                  </div>
                  {wakeHeard && <div className="wake-debug">🎧 {wakeHeard}</div>}
                </div>

                <div className="orb-container">
                  <div className="orb-rings" />
                  <div className="orb-core-geo" />
                  <div 
                    className={`orb ${mode}`} 
                    onClick={handleOrbClick}
                    style={mode === "recording" ? { transform: `scale(${1 + audioLevel * 0.2})` } : {}}
                  />
                  {mode === "recording" && (
                    <div className="audio-visualizer" style={{ position: 'absolute', bottom: '-20px', alignItems: 'flex-end', height: '50px' }}>
                      {[0.5, 0.8, 1.2, 0.9, 0.6].map((mult, idx) => (
                        <div key={idx} style={{ 
                          height: `${Math.max(6, 50 * audioLevel * mult)}px`,
                          width: '5px', background: 'var(--accent)', borderRadius: '4px',
                          boxShadow: '0 0 10px var(--accent)', transition: 'height 0.05s ease'
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Brain Inbox (Chat) */}
              <div className="chat fade-out-mask" ref={chatContainerRef} onScroll={handleChatScroll}>
                {messages.length === 0 && (
                  <div className="empty-state">Invia un pensiero veloce o chiedi qualcosa a Friday.</div>
                )}
                <div className="chat-messages-scroll">
                  <AnimatePresence>
                    {messages.map((m, i) => (
                      <motion.div 
                        key={i} 
                        initial={{opacity:0, y: 20}} 
                        animate={{opacity:1, y:0}}
                        className={`msg ${m.role}`}
                      >
                        <span className="msg-label">{m.role === "user" ? "Tu" : "Friday"}</span>
                        {renderMessageContent(m.text)}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
                
                {showScrollBtn && (
                  <button 
                    onClick={scrollToBottom}
                    className="scroll-bottom-btn"
                    style={{
                      position: 'absolute', bottom: '80px', right: '20px', 
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '50%', padding: '10px', color: '#fff', cursor: 'pointer',
                      backdropFilter: 'blur(10px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <ChevronDown size={20} />
                  </button>
                )}
              </div>

              {/* Input Bar */}
              <div className="input-bar">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{display:"none"}} accept=".txt,.md,.pdf,.csv,.json" />
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()}><Paperclip size={18} /></button>
                <input 
                  className="text-input" 
                  placeholder="Scrivi a Friday..." 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  onKeyDown={e => { if (e.key === "Enter") handleSendText(); }} 
                />
                <button className="send-btn" onClick={handleSendText} disabled={mode === "thinking"}>
                  <Send size={16} />
                </button>
              </div>
            </motion.div>

            {/* RIGHT PANEL: Focus del Giorno */}
            <div className={`right-panel ${isFocusOpen ? 'open' : 'closed'}`}>
              <div className="right-panel-header">
                {isFocusOpen && <h3 className="widget-title"><ListTodo size={16} /> Focus</h3>}
                <button className="toggle-panel-btn" onClick={() => setIsFocusOpen(!isFocusOpen)}>
                  {isFocusOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>
              </div>

              {isFocusOpen && (
                <div className="right-panel-content">
                  {tasks.length === 0 ? (
                    <div className="empty-state" style={{fontSize: '0.85rem'}}>Nessuna task.</div>
                  ) : (
                    <div className="task-list micro">
                      {tasks.map((t, i) => (
                        <div key={i} className={`task micro-task ${t.isDone ? "done" : ""}`}>
                          {t.isDone ? <CheckCircle2 size={16} className="dot checked" /> : <Circle size={16} className="dot" />}
                          <span>{t.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : currentView === "Meditazione" ? (
          <MeditationView />
        ) : currentView === "Risorse" ? (
          <ResourceView />
        ) : currentView === "Diario" ? (
          <JournalView />
        ) : (
          <div className="placeholder-view">
             <h1>🚧 Lavori in corso</h1>
             <p>Il modulo <strong>{currentView}</strong> sarà disponibile a breve.</p>
          </div>
        )}
      </main>
    </div>
  );
}
