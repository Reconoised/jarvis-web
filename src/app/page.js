"use client";

import { useState, useEffect, useRef } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

export default function Dashboard() {
  const [theme, setTheme] = useState("dark");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const transcriptRef = useRef("");
  const listeningRef = useRef(false);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Data + Speech setup
  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks); }).catch(() => {});
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.projects) setProjects(d.projects); }).catch(() => {});
    fetch("/api/recent").then(r => r.json()).then(d => { if (d.files) setRecentFiles(d.files); }).catch(() => {});

    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "it-IT";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let final = "";
          let interim = "";
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript;
            else interim += event.results[i][0].transcript;
          }
          const combined = final || interim;
          transcriptRef.current = combined;
          setTranscript(combined);
        };

        recognition.onerror = (event) => {
          if (event.error === "not-allowed") {
            alert("Permesso microfono negato. Vai nelle impostazioni del browser e abilita il microfono per questo sito.");
          }
          if (event.error !== "aborted" && event.error !== "no-speech") {
            listeningRef.current = false;
            setIsListening(false);
          }
        };

        // AUTO-RESTART: se il browser chiude la sessione ma l'utente non ha premuto stop, riavvia
        recognition.onend = () => {
          if (listeningRef.current) {
            try { recognition.start(); } catch(e) {}
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  async function sendToBackend(text) {
    if (!text.trim() || isLoading) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsLoading(true);
    setTranscript("");
    transcriptRef.current = "";

    try {
      const res = await fetch(`${BACKEND_URL}/api/jarvis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      if (data.response) {
        setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(data.response);
          u.lang = "it-IT";
          u.rate = 1.05;
          window.speechSynthesis.speak(u);
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: `Errore: ${data.error}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Connessione fallita: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleListen() {
    if (!recognitionRef.current) {
      alert("Usa Chrome per il riconoscimento vocale.");
      return;
    }
    if (isListening) {
      // STOP
      listeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      const finalText = transcriptRef.current;
      if (finalText.trim()) setTimeout(() => sendToBackend(finalText), 150);
    } else {
      // START
      transcriptRef.current = "";
      setTranscript("");
      listeningRef.current = true;
      try { recognitionRef.current.start(); setIsListening(true); } catch (e) {}
    }
  }

  function handleSendText() {
    if (inputText.trim()) { sendToBackend(inputText); setInputText(""); }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => sendToBackend(`[FILE: ${file.name}]\n\n${reader.result}`);
    reader.readAsText(file);
    e.target.value = "";
  }

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

        <div className={`orb-wrapper ${isListening ? "active" : ""}`}>
          <div className="orb-ring" />
          <div
            className={`orb ${isListening ? "listening" : ""} ${isLoading ? "thinking" : ""}`}
            onClick={toggleListen}
          />
        </div>

        <p className="status">
          {isListening ? (transcript || "In ascolto...") : isLoading ? "Elaborazione..." : "Tocca per parlare"}
        </p>

        <div className="chat">
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
          <h3 className="widget-title">{"\u23F0"} Ultime Modifiche</h3>
          {recentFiles.length === 0 && <p className="empty">Nessun file recente</p>}
          {recentFiles.map((f, i) => (
            <div key={i} className="recent-item">
              <span>{"\u2022"}</span>
              <span>{f}</span>
            </div>
          ))}
        </section>
        <section>
          <h3 className="widget-title">{"\u{1F4AC}"} Risposte Recenti</h3>
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
