"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, FileText, Loader2, CheckCircle2, Video, Globe, BookOpen, Search, Tag, X, Send } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

export default function ResourceView() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");
  
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingList, setLoadingList] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);

  const fetchResources = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/resources/list?t=${new Date().getTime()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.status === "success") {
        setResources(data.resources);
      }
    } catch (err) {
      console.error("Errore recupero risorse:", err);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

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
        setMessage(`Risorsa assimilata con successo nel Vault!`);
        setUrl("");
        fetchResources(); // Refresh the list
        setTimeout(() => setStatus("idle"), 5000); // Nascondi dopo 5s
      } else {
        setStatus("error");
        setMessage(data.error || "Errore durante l'assimilazione");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Errore di connessione al server neurale.");
    }
  };

  const filteredResources = resources.filter(r => {
    if (filter !== "all" && r.type !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title && r.title.toLowerCase().includes(q);
      const matchTags = r.tags && r.tags.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchTags;
    }
    return true;
  });

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatting, setIsChatting] = useState(false);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedResource) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/resources/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, resource_path: selectedResource.id })
      });
      const data = await res.json();
      
      if (res.ok && data.response) {
        setChatMessages(prev => [...prev, { role: "friday", text: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: "friday", text: "Si è verificato un errore." }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "friday", text: "Errore di rete." }]);
    }
    setIsChatting(false);
  };

  const handleCloseModal = () => {
    setSelectedResource(null);
    setChatMessages([]);
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

      {/* GALLERIA RISORSE */}
      <div className="resource-library">
        <div className="library-header">
          <h3>Libreria Salvata</h3>
          <div className="library-controls">
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Cerca risorse o tag..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-chips">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tutti</button>
              <button className={filter === 'video' ? 'active' : ''} onClick={() => setFilter('video')}><Video size={14}/> Video</button>
              <button className={filter === 'web' ? 'active' : ''} onClick={() => setFilter('web')}><Globe size={14}/> Web</button>
            </div>
          </div>
        </div>

        {loadingList ? (
          <div className="library-loading">
            <Loader2 className="spinner" size={20} />
            Sincronizzazione col Vault...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="library-empty">
            Nessuna risorsa trovata per i criteri di ricerca.
          </div>
        ) : (
          <div className="resource-grid">
            {filteredResources.map((res, idx) => (
              <motion.div 
                key={res.id || idx} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="resource-card"
                onClick={() => setSelectedResource(res)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-top">
                  <div className={`card-icon-wrapper ${res.type}`}>
                    {res.type === 'video' ? <Video size={18} /> : <Globe size={18} />}
                  </div>
                  <h4 title={res.title}>{res.title}</h4>
                </div>
                {res.summary && <p className="card-summary">{res.summary}</p>}
                {res.tags && res.tags.length > 0 && (
                  <div className="card-tags">
                    {res.tags.map(t => (
                      <span key={t} className="card-tag"><Tag size={10} style={{marginRight:3}}/> {t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* RESOURCE INSPECTOR MODAL */}
      <AnimatePresence>
        {selectedResource && (
          <div className="resource-modal-overlay" onClick={handleCloseModal}>
            <motion.div 
              className="resource-modal" 
              onClick={e => e.stopPropagation()} 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
            >
              <button className="close-modal-btn" onClick={handleCloseModal}>
                <X size={20} />
              </button>
              
              <div className="modal-left">
                <div className="modal-header-info">
                  <h3>{selectedResource.title}</h3>
                  {selectedResource.tags && (
                    <div className="modal-tags">
                      {selectedResource.tags.map(t => <span key={t} className="card-tag">{t}</span>)}
                    </div>
                  )}
                </div>
                
                <div className="modal-media">
                  {selectedResource.type === 'video' && selectedResource.id.includes('YouTube_') ? (
                    <iframe 
                      src={`https://www.youtube.com/embed/${selectedResource.id.split('YouTube_')[1].replace('.md', '')}`} 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="web-preview-box">
                      <Globe size={40} className="web-icon" style={{ opacity: 0.5, marginBottom: 10 }}/>
                      <p>Articolo Web Salvato</p>
                      {selectedResource.url && <a href={selectedResource.url} target="_blank" rel="noreferrer" style={{color: 'var(--accent)', marginTop: 10, textDecoration: 'none'}}>Apri Originale ↗</a>}
                    </div>
                  )}
                </div>
                <div className="modal-summary">
                  <h4>Executive Summary</h4>
                  <p>{selectedResource.summary || "Riassunto non disponibile. Questa risorsa potrebbe essere stata salvata prima dell'aggiornamento."}</p>
                </div>
              </div>

              <div className="modal-right">
                <div className="modal-chat-header">
                  <div className="glow-dot"></div>
                  <h4>Chat con Friday</h4>
                </div>
                <div className="modal-chat-area">
                  {chatMessages.length === 0 ? (
                    <div className="empty-chat">Fai una domanda a Friday riguardo a questa specifica risorsa. Il contesto sarà focalizzato al 100% su questo documento.</div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className="chat-msg" style={{ 
                        background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(0,122,255,0.15)',
                        padding: '10px 15px', borderRadius: 12, marginBottom: 10,
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        color: msg.role === 'friday' ? '#5e9cff' : '#fff',
                        fontSize: '0.9rem', lineHeight: 1.5,
                        marginLeft: msg.role === 'user' ? '20%' : '0',
                        marginRight: msg.role === 'friday' ? '20%' : '0'
                      }}>
                        {msg.text}
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="chat-msg" style={{ padding: '10px 15px', borderRadius: 12, marginBottom: 10, alignSelf: 'flex-start', color: '#5e9cff', fontSize: '0.9rem'}}>
                      <Loader2 size={16} className="spinner" />
                    </div>
                  )}
                </div>
                <div className="modal-chat-input">
                  <input 
                    type="text" 
                    placeholder="Chiedi qualcosa sul testo..." 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    disabled={isChatting}
                  />
                  <button onClick={handleSendChat} disabled={isChatting}><Send size={16}/></button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
