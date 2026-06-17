"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, FileText, Loader2, CheckCircle2, Video, Globe, BookOpen, Search, Tag, X, Send, Trash2, Network, BrainCircuit, MessageSquare, PlayCircle } from "lucide-react";

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
  const [isDeleting, setIsDeleting] = useState(false);

  // New states for NotebookLM layout
  const [activeTab, setActiveTab] = useState("reader"); // "reader", "connections", "graph"
  const [chatContext, setChatContext] = useState("resource"); // "resource", "internet"
  const [videoTime, setVideoTime] = useState(0);

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
        body: JSON.stringify({ message: userMsg, resource_path: selectedResource.id, context: chatContext })
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

  const handleDeleteConfirm = async (id) => {
    try {
      setIsDeleting(false);
      const res = await fetch(`${BACKEND_URL}/api/resources/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      });
      if (res.ok) {
        setResources(prev => prev.filter(r => r.id !== id));
        setSelectedResource(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseModal = () => {
    setSelectedResource(null);
    setChatMessages([]);
    setIsDeleting(false);
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
                onClick={() => {
                  setSelectedResource(res);
                  setChatMessages([]);
                  setChatInput("");
                }}
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
              {/* Absolute Close & Delete Buttons */}
              <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50, display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}>
                <AnimatePresence mode="wait">
                  {isDeleting ? (
                    <motion.div 
                      key="delete-confirm"
                      initial={{ width: 0, opacity: 0, scale: 0.8 }}
                      animate={{ width: "auto", opacity: 1, scale: 1 }}
                      exit={{ width: 0, opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(26, 5, 5, 0.8)', padding: '6px 12px',
                        borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.3)',
                        boxShadow: '0 0 15px rgba(239, 68, 68, 0.15)',
                        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        overflow: 'hidden'
                      }}
                    >
                      <span style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', marginRight: '4px' }}>
                        Sicuro?
                      </span>
                      <button 
                        onClick={() => handleDeleteConfirm(selectedResource.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '6px 16px', background: '#ef4444', color: '#fff',
                          borderRadius: '20px', border: 'none', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap',
                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        Sì
                      </button>
                      <button 
                        onClick={() => setIsDeleting(false)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '6px 16px', background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: '20px', border: 'none', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap'
                        }}
                      >
                        No
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button 
                      key="delete-trigger"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsDeleting(true)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '40px', height: '40px', background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(248, 113, 113, 0.8)',
                        borderRadius: '50%', cursor: 'pointer', backdropFilter: 'blur(10px)'
                      }}
                      title="Elimina Risorsa"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  )}
                </AnimatePresence>
                
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedResource(null);
                    setIsDeleting(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '40px', height: '40px', background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '50%', cursor: 'pointer', backdropFilter: 'blur(10px)'
                  }}
                  title="Chiudi (Esc)"
                >
                  <X size={20} />
                </motion.button>
              </div>
              
              <div className="modal-left">
                <div className="modal-header-info pr-20 shrink-0">
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{selectedResource.title}</h3>
                  <div className="flex items-center flex-wrap gap-2 text-sm">
                    {selectedResource.tags && selectedResource.tags.length > 0 ? (
                      selectedResource.tags.map(t => (
                        <span key={t} className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/70 text-xs font-medium">
                          <Tag size={12} className="text-blue-400" />
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/40 italic text-xs">Nessun tag</span>
                    )}
                  </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="tabs-nav">
                  <button 
                    onClick={() => setActiveTab('reader')}
                    className={`tab-btn ${activeTab === 'reader' ? 'active reader' : ''}`}
                  >
                    <FileText size={16} /> Reader
                  </button>
                  <button 
                    onClick={() => setActiveTab('connections')}
                    className={`tab-btn ${activeTab === 'connections' ? 'active connections' : ''}`}
                  >
                    <Network size={16} /> Connessioni
                  </button>
                  <button 
                    onClick={() => setActiveTab('graph')}
                    className={`tab-btn ${activeTab === 'graph' ? 'active graph' : ''}`}
                  >
                    <BrainCircuit size={16} /> Mini Grafo
                  </button>
                </div>

                {/* TAB CONTENT */}
                <div className="tab-content-area">
                  <AnimatePresence mode="wait">
                    {activeTab === 'reader' && (
                      <motion.div key="reader" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="tab-content-area">
                        <div className="modal-media">
                          {selectedResource.type === 'video' && selectedResource.video_id ? (
                            <iframe 
                              src={`https://www.youtube.com/embed/${selectedResource.video_id}?autoplay=0&start=${videoTime}`} 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                              className="w-full h-full"
                            ></iframe>
                          ) : selectedResource.type === 'video' && selectedResource.id.includes('YouTube_') ? (
                            <iframe 
                              src={`https://www.youtube.com/embed/${selectedResource.id.split('YouTube_')[1].replace('.md', '')}?autoplay=0&start=${videoTime}`} 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                              className="w-full h-full"
                            ></iframe>
                          ) : (
                            <div className="web-preview-box">
                              <Globe size={48} className="text-blue-500/50 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"/>
                              <p className="text-white/80 font-medium">{selectedResource.type === 'video' ? "Video Salvato" : "Articolo Web Salvato"}</p>
                              {selectedResource.url && (
                                <a href={selectedResource.url} target="_blank" rel="noreferrer" className="mt-4 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium hover:bg-blue-500/30 transition-all border border-blue-500/30">
                                  Apri Originale ↗
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="modal-summary">
                          <h4>
                            <FileText size={16} /> Appunti / Transcript
                          </h4>
                          <div className="prose">
                            {/* Mockup for Timestamps if it's a video */}
                            {selectedResource.type === 'video' && (
                              <div className="timestamp-box">
                                <PlayCircle size={18} className="text-blue-400 shrink-0" />
                                <p style={{ margin: 0 }}>
                                  Clicca sui timestamp (es. <button onClick={() => setVideoTime(120)} className="text-blue-400 font-bold hover:underline" style={{background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem'}}>02:00</button>) per saltare a quella parte del video. I timestamp verranno generati dall'AI in futuro.
                                </p>
                              </div>
                            )}
                            <p>{selectedResource.summary || "Riassunto non disponibile. Questa risorsa potrebbe essere stata salvata prima dell'aggiornamento."}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'connections' && (
                      <motion.div key="connections" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="mockup-view">
                        <Network size={48} className="text-purple-500/50 mb-4" />
                        <h4>Connessioni Neurali</h4>
                        <p>Questa sezione mostrerà automaticamente altre risorse del tuo Vault collegate a questo argomento, in stile Recall.</p>
                      </motion.div>
                    )}

                    {activeTab === 'graph' && (
                      <motion.div key="graph" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="mockup-view">
                        <BrainCircuit size={48} className="text-emerald-500/50 mb-4" />
                        <h4>Mini Grafo Tematico</h4>
                        <p>Qui vedrai una mappa visiva ed interattiva dei concetti estratti da questa risorsa.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="modal-right">
                <div className="modal-chat-header border-b border-white/10 pb-4 shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
                      <h4 className="font-semibold tracking-wide text-white">Focus Chat</h4>
                    </div>
                  </div>
                  {/* CONTEXT TOGGLE */}
                  <div className="chat-context-toggle">
                    <button 
                      onClick={() => setChatContext('resource')}
                      className={`context-btn ${chatContext === 'resource' ? 'active resource' : ''}`}
                    >
                      Solo Risorsa
                    </button>
                    <button 
                      onClick={() => setChatContext('internet')}
                      className={`context-btn ${chatContext === 'internet' ? 'active internet' : ''}`}
                    >
                      <Globe size={12} /> Web + Risorsa
                    </button>
                  </div>
                </div>

                <div className="chat-messages-scroll">
                  {chatMessages.length === 0 ? (
                    <div className="empty-chat h-full flex flex-col items-center justify-center text-center px-4">
                      <MessageSquare size={32} className="text-blue-500/30 mb-3" />
                      <p className="text-white/40 text-sm">Fai una domanda a Friday riguardo a questa specifica risorsa.</p>
                      <p className="text-blue-400/60 text-xs mt-2">Contesto attuale: {chatContext === 'resource' ? 'Solo questo documento' : 'Questo documento + Ricerca Web'}</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className="flex w-full mb-4" style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div className="chat-msg relative" style={{ 
                          background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(40,40,40,0.8), rgba(20,20,20,0.8))' : 'linear-gradient(135deg, rgba(0,122,255,0.15), rgba(0,80,200,0.1))',
                          padding: '12px 16px', 
                          borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                          border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,122,255,0.2)',
                          color: msg.role === 'friday' ? '#e2e8f0' : '#ffffff',
                          fontSize: '0.9rem', lineHeight: 1.6,
                          maxWidth: '90%',
                          boxShadow: msg.role === 'friday' ? '0 4px 20px rgba(0,122,255,0.05)' : '0 4px 20px rgba(0,0,0,0.2)',
                          backdropFilter: 'blur(10px)'
                        }}>
                          {msg.role === 'friday' && <div className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.8)]"><span className="text-[10px] font-bold text-white">F</span></div>}
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex w-full mb-4" style={{ justifyContent: 'flex-start' }}>
                      <div className="chat-msg relative flex items-center justify-center" style={{ padding: '12px 16px', borderRadius: '20px 20px 20px 4px', background: 'linear-gradient(135deg, rgba(0,122,255,0.1), rgba(0,80,200,0.05))', border: '1px solid rgba(0,122,255,0.1)', color: '#5e9cff' }}>
                        <Loader2 size={16} className="spinner animate-spin" />
                        <span className="ml-2 text-xs font-medium opacity-70">Analizzando ({chatContext})...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="chat-input-wrapper">
                  <input 
                    type="text" 
                    placeholder={chatContext === 'resource' ? "Chiedi dettagli sulla risorsa..." : "Cerca online e nella risorsa..."}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    disabled={isChatting}
                  />
                  <button 
                    onClick={handleSendChat} 
                    disabled={isChatting || !chatInput.trim()}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
