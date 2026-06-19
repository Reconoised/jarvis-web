"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Calendar, Smile, Meh, Frown, CheckCircle2, Briefcase, Sparkles, ChevronDown, Send, ArrowRight } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

export default function JournalView() {
  const [selectedDate, setSelectedDate] = useState("");
  const [inputText, setInputText] = useState("");
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/journal/list`)
      .then(res => res.json())
      .then(data => {
        if (data.days && data.days.length > 0) {
          setDays(data.days);
          setSelectedDate(data.days[0].date);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Errore fetch journal:", err);
        setLoading(false);
      });
  }, []);

  const data = days.find(d => d.date === selectedDate) || {
    summary: loading ? "Caricamento in corso..." : "Nessun riassunto ancora disponibile per questa giornata. Raccontami com'è andata!",
    reflections: [],
    tasks: [],
    projects: [],
    tip: "Raccontami la tua giornata per ricevere un consiglio per domani.",
    chat: []
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.chat]);

  const getMoodIcon = (mood) => {
    switch (mood) {
      case "great": return <Smile size={18} style={{ color: "#4ade80" }} />;
      case "good": return <Smile size={18} style={{ color: "#facc15" }} />;
      case "bad": return <Frown size={18} style={{ color: "#f87171" }} />;
      default: return <Meh size={18} style={{ color: "#9ca3af" }} />;
    }
  };

  return (
    <div className="journal-container">
      {/* Top Nav dei Giorni */}
      <div className="journal-top-nav">
        <h2 className="journal-top-nav-title"><Calendar size={18} /> Cronologia</h2>
        <div className="journal-days-list">
          {days.map((day) => (
            <div 
              key={day.date} 
              className={`journal-day-item ${selectedDate === day.date ? "active" : ""}`}
              onClick={() => setSelectedDate(day.date)}
            >
              <div className="day-info">
                <span className="day-label">{day.label}</span>
                <span className="day-date">{day.date}</span>
              </div>
              <div className="day-mood">
                {getMoodIcon(day.mood)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Day View */}
      <div className="journal-main">
        <div className="journal-header">
          <h1>Diario — {days.find(d => d.date === selectedDate)?.label || selectedDate}</h1>
          <div className="mood-selector">
            <button className="mood-btn active"><Smile size={20} /></button>
            <button className="mood-btn"><Meh size={20} /></button>
            <button className="mood-btn"><Frown size={20} /></button>
          </div>
        </div>

        <div className="journal-bento-grid">
          
          {/* Riassunto */}
          <motion.div className="bento-item journal-summary" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>
            <h3 className="widget-title"><MessageSquare size={16} /> Riassunto della Giornata</h3>
            <p className="summary-text">{data.summary}</p>
          </motion.div>

          {/* Riflessioni */}
          <motion.div className="bento-item journal-reflections" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}}>
            <h3 className="widget-title"><Sparkles size={16} /> Riflessioni</h3>
            <div className="reflections-list">
              {data.reflections.length > 0 ? data.reflections.map((r, i) => (
                <div key={i} className="reflection-item">
                  <span className="reflection-q">{r.q}</span>
                  <span className="reflection-a">{r.a}</span>
                </div>
              )) : <span className="empty-state">Nessuna riflessione inserita.</span>}
            </div>
          </motion.div>

          {/* Deduzioni IA: Task e Progetti */}
          <motion.div className="bento-item journal-insights" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}}>
            <h3 className="widget-title"><Briefcase size={16} /> Insight di Friday</h3>
            
            <div className="insight-section">
              <span className="insight-label">Task Dedotti</span>
              {data.tasks.length > 0 ? (
                <div className="task-list-mini">
                  {data.tasks.map((t, i) => (
                    <div key={i} className="task-mini"><CheckCircle2 size={14} style={{ color: "var(--accent)" }} /> {t}</div>
                  ))}
                </div>
              ) : <span className="empty-state">Nessuna task.</span>}
            </div>

            <div className="insight-section" style={{marginTop: '15px'}}>
              <span className="insight-label">Progetti Menzionati</span>
              <div className="project-tags">
                {data.projects.map((p, i) => (
                  <span key={i} className="project-tag">{p}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Consiglio per Domani */}
          <motion.div className="bento-item journal-tip" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}}>
            <h3 className="widget-title"><Sparkles size={16} style={{ color: "var(--accent)" }} /> Consiglio per Domani</h3>
            <div className="tip-box">
              <p>{data.tip}</p>
            </div>
          </motion.div>

          {/* Chiacchierata / Input */}
          <motion.div className="bento-item journal-chat" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.4}}>
            <h3 className="widget-title">Racconta a Friday</h3>
            
            <div className="chat diary-chat">
              {data.chat.length === 0 && (
                <div className="empty-state">Scrivi per raccontare la tua giornata. Friday compilerà automaticamente il diario per te.</div>
              )}
              {data.chat.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <span className="msg-label">{m.role === "user" ? "Tu" : "Friday"}</span>
                  <span style={{whiteSpace: "pre-wrap"}}>{m.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-bar" style={{marginTop: '10px'}}>
              <input 
                className="text-input" 
                placeholder="Com'è andata oggi?" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
              />
              <button className="send-btn">
                <Send size={16} />
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
