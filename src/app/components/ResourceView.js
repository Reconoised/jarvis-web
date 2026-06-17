"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, FileText, Loader2, CheckCircle2, Youtube, Globe, BookOpen } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

export default function ResourceView() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleAssimilate = async () => {
    if (!url.trim()) return;
    setStatus("loading");
    setMessage("Analisi ed estrazione concetti chiave in corso...");

    try {
      const res = await fetch(`${BACKEND_URL}/api/resources/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await res.json();
      
      if (res.ok && data.status === "success") {
        setStatus("success");
        setMessage(`Risorsa "${data.title}" assimilata con successo nel Vault!`);
        setUrl("");
      } else {
        setStatus("error");
        setMessage(data.error || "Errore durante l'assimilazione");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Errore di connessione al server neurale.");
    }
  };

  return (
    <div className="resource-container">
      <div className="resource-header">
        <div className="icon-glow-wrapper">
          <BookOpen size={48} className="resource-icon" />
        </div>
        <h2>Recall Memory</h2>
        <p>Incolla un link YouTube o un sito web. Friday estrarrà i concetti chiave e li salverà nel tuo Secondo Cervello.</p>
      </div>

      <div className="resource-input-wrapper">
        <div className="resource-input-box">
          <Link2 className="input-icon" size={20} />
          <input 
            type="url" 
            placeholder="https://youtube.com/watch?v=... o https://..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === "loading"}
          />
          <button 
            className="assimilate-btn" 
            onClick={handleAssimilate}
            disabled={!url.trim() || status === "loading"}
          >
            {status === "loading" ? <Loader2 className="spinner" size={18} /> : "Assimila"}
          </button>
        </div>
      </div>

      {status !== "idle" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`status-message ${status}`}
        >
          {status === "loading" && <Loader2 className="spinner-large" size={24} />}
          {status === "success" && <CheckCircle2 size={24} />}
          <span>{message}</span>
        </motion.div>
      )}

      <div className="resource-suggestions">
        <h3>Fonti Supportate:</h3>
        <div className="sug-tags">
          <span className="sug-tag"><Youtube size={14}/> Video YouTube</span>
          <span className="sug-tag"><Globe size={14}/> Articoli Web e Blog</span>
          <span className="sug-tag disabled"><FileText size={14}/> File PDF (Coming Soon)</span>
        </div>
      </div>
    </div>
  );
}
