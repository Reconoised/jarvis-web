"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, FileText, Loader2, CheckCircle2, Video, Globe, BookOpen, Search, Tag, X, Send, Trash2, Network, BrainCircuit, MessageSquare, PlayCircle, Share2, Maximize, Minimize, Paperclip, Download, Image as ImageIcon, Mic, User } from "lucide-react";
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const EMPTY_ARRAY = [];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://antigravitycloudserver-production.up.railway.app";

export default function ResourceView({ isMobile }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
  const [isFullscreenTranscript, setIsFullscreenTranscript] = useState(false);
  const graphContainerRef = useRef(null);
  const fgRef = useRef();
  const messagesEndRef = useRef(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 500, height: 400 });

  useEffect(() => {
    if (activeTab === 'graph' && graphContainerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setGraphDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      });
      resizeObserver.observe(graphContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [activeTab, isFullscreenTranscript]);

  useEffect(() => {
    if (activeTab === 'graph' && fgRef.current) {
      // Imposta le forze del grafo per renderlo più largo ed elegante stile Obsidian
      fgRef.current.d3Force('charge').strength(-400);
      fgRef.current.d3Force('link').distance(80);
      
      // Assicura che il grafo sia ben centrato e scalato
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 50);
        }
      }, 500);
    }
  }, [activeTab, selectedResource]);

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

  const [attachmentUrl, setAttachmentUrl] = useState(null);

  useEffect(() => {
    const handleOpenResource = (e) => {
      const targetId = e.detail;
      const targetResource = resources.find(r => r.id === targetId || r.id.includes(targetId) || (r.title && r.title.toLowerCase().includes(targetId.toLowerCase())));
      if (targetResource) {
        setSelectedResource(targetResource);
      }
    };
    window.addEventListener('friday_open_resource', handleOpenResource);
    return () => window.removeEventListener('friday_open_resource', handleOpenResource);
  }, [resources]);

  useEffect(() => {
    if (selectedResource && selectedResource.type === 'document' && selectedResource.attachment_link) {
      setAttachmentUrl(null); // Reset
      fetch(`${BACKEND_URL}/api/resources/attachment?path=${encodeURIComponent(selectedResource.attachment_link)}`)
        .then(res => res.json())
        .then(data => {
          if (data.url) setAttachmentUrl(data.url);
        })
        .catch(err => console.error(err));
    } else {
      setAttachmentUrl(null);
    }
  }, [selectedResource]);

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

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("loading");
    setMessage(`Caricamento e analisi di ${file.name} in corso...`);

    const formData = new FormData();
    formData.append('file', file);

    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BACKEND_URL}/api/resources/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
        if (percentComplete === 100) {
          setMessage(`Upload completato. Analisi IA di ${file.name} in corso...`);
        } else {
          setMessage(`Caricamento di ${file.name}: ${percentComplete}%`);
        }
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.status === "success") {
          setStatus("success");
          setMessage(`Documento assimilato con successo nel Vault!`);
          fetchResources();
          setTimeout(() => {
            setStatus("idle");
            setUploadProgress(0);
          }, 5000);
        } else {
          setStatus("error");
          setMessage(data.error || "Errore durante l'assimilazione del documento");
          setUploadProgress(0);
        }
      } catch (e) {
        setStatus("error");
        setMessage("Risposta del server non valida.");
        setUploadProgress(0);
      }
    };

    xhr.onerror = () => {
      setStatus("error");
      setMessage("Errore di connessione durante l'upload.");
      setUploadProgress(0);
    };

    xhr.send(formData);
    
    // Reset the input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
  const [resourceChats, setResourceChats] = useState({});
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    const savedChats = localStorage.getItem('friday_resource_chats');
    if (savedChats) {
      try {
        setResourceChats(JSON.parse(savedChats));
      } catch (e) {
        console.error("Error parsing saved chats", e);
      }
    }
  }, []);

  const updateChatMessages = (resourceId, newMessages) => {
    setResourceChats(prev => {
      const nextState = {
        ...prev,
        [resourceId]: typeof newMessages === 'function' ? newMessages(prev[resourceId] || []) : newMessages
      };
      localStorage.setItem('friday_resource_chats', JSON.stringify(nextState));
      return nextState;
    });
  };

  const chatMessages = selectedResource ? (resourceChats[selectedResource.id] || EMPTY_ARRAY) : EMPTY_ARRAY;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [isRecordingDictation, setIsRecordingDictation] = useState(false);
  const dictationRecRef = useRef(null);
  const dictationStreamRef = useRef(null);
  const dictationTextRef = useRef("");

  const stopVoiceDictation = (shouldSend = false) => {
    if (dictationRecRef.current) {
      try { dictationRecRef.current.stop(); } catch(e) {}
      dictationRecRef.current = null;
    }
    if (dictationStreamRef.current) {
      dictationStreamRef.current.getTracks().forEach(t => t.stop());
      dictationStreamRef.current = null;
    }
    setIsRecordingDictation(false);

    if (shouldSend && dictationTextRef.current) {
      handleSendChat(dictationTextRef.current);
      dictationTextRef.current = "";
    }
  };

  const startVoiceDictation = async () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      alert("Il tuo browser non supporta la dettatura vocale.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      dictationStreamRef.current = stream;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      dictationRecRef.current = recognition;

      recognition.lang = 'it-IT';
      recognition.continuous = true;
      recognition.interimResults = true;

      let currentBaseInput = chatInput;
      dictationTextRef.current = chatInput;

      recognition.onstart = () => {
        setIsRecordingDictation(true);
      };

      recognition.onresult = (event) => {
        let finalTrans = "";
        let interimTrans = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTrans += event.results[i][0].transcript + " ";
          else interimTrans += event.results[i][0].transcript + " ";
        }
        
        if (finalTrans) {
          currentBaseInput = (currentBaseInput + " " + finalTrans).trim();
        }
        
        const fullText = (currentBaseInput + " " + interimTrans).trim();
        dictationTextRef.current = fullText;
        setChatInput(fullText);
      };

      recognition.onerror = (event) => {
        console.error("Errore riconoscimento vocale:", event.error);
        stopVoiceDictation(false);
        if (event.error === 'network') {
          alert("Errore di rete del microfono. Prova a ricaricare o controllare i permessi.");
        }
      };

      recognition.onend = () => {
        stopVoiceDictation(true);
      };

      recognition.start();
    } catch (e) {
      console.error("Accesso microfono negato", e);
      alert("Permesso microfono negato.");
    }
  };

  const handleSendChat = async (textOverride = null) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : chatInput;
    if (!textToSend.trim() || !selectedResource) return;
    const userMsg = textToSend.trim();
    updateChatMessages(selectedResource.id, prev => [...prev, { role: "user", text: userMsg }]);
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
        updateChatMessages(selectedResource.id, prev => [...prev, { role: "friday", text: data.response }]);
      } else {
        updateChatMessages(selectedResource.id, prev => [...prev, { role: "friday", text: "Si è verificato un errore." }]);
      }
    } catch (err) {
      updateChatMessages(selectedResource.id, prev => [...prev, { role: "friday", text: "Errore di rete." }]);
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
    setIsDeleting(false);
  };

  return (
    <div className="resource-container" style={{ position: 'relative', height: '100%' }}>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
      `}</style>
      
      {/* Zen Particles Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            background: 'var(--accent)',
            borderRadius: '50%',
            opacity: 0,
            animation: `float ${Math.random() * 10 + 5}s linear infinite`,
            animationDelay: `${Math.random() * 5}s`
          }} />
        ))}
      </div>

      <div className="resource-header" style={{ position: 'relative', zIndex: 10 }}>
        <div className="icon-glow-wrapper" style={{ boxShadow: '0 0 40px rgba(0, 150, 255, 0.3)' }}>
          <BookOpen size={48} className="resource-icon" style={{ color: 'var(--accent)' }} />
        </div>
        <h2 style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', fontWeight: 600 }}>Recall Memory</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Incolla un link YouTube o un sito web. Friday estrarrà i concetti chiave e li salverà nel tuo Secondo Cervello.</p>
      </div>

      <div className="resource-input-wrapper" style={{ position: 'relative', zIndex: 10 }}>
        <div className="resource-input-box" style={{ 
          display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.6)', 
          border: '1px solid rgba(0, 150, 255, 0.3)', borderRadius: '16px', padding: '6px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,150,255,0.1)', backdropFilter: 'blur(12px)'
        }}>
          <Link2 className="input-icon" size={20} style={{ color: 'var(--accent)' }} />
          <input 
            type="url" 
            placeholder="https://youtube.com/watch?v=... o https://..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === "loading"}
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', padding: '12px', outline: 'none' }}
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            accept="application/pdf,image/*,.doc,.docx,.txt"
          />
          <button 
            className="upload-file-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "loading"}
            title="Carica un PDF, immagine o documento"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              padding: '8px 12px',
              marginRight: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <Paperclip size={18} />
          </button>
          <button 
            className="assimilate-btn" 
            onClick={handleAssimilate}
            disabled={!url.trim() || status === "loading"}
            style={{
              background: 'var(--accent)', color: '#000', fontWeight: 'bold', border: 'none', padding: '10px 24px',
              borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,150,255,0.3)', transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {status === "loading" ? <Loader2 className="spinner" size={18} /> : "Assimila"}
          </button>
        </div>

        <AnimatePresence>
          {status !== "idle" && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className={`status-message ${status}`}
              style={{ marginTop: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {status === "loading" && <Loader2 className="spinner" size={16} style={{ color: 'var(--accent)' }} />}
                {status === "success" && <CheckCircle2 size={16} style={{ color: '#10b981' }} />}
                {status === "error" && <X size={16} style={{ color: '#ef4444' }} />}
                <span style={{ fontWeight: 500 }}>{message}</span>
              </div>
              
              {uploadProgress > 0 && uploadProgress < 100 && status === "loading" && (
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.2 }}
                    style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px', boxShadow: '0 0 10px var(--accent)' }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GALLERIA RISORSE */}
      <div className="resource-library" style={{ position: 'relative', zIndex: 10, background: 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '40px' }}>
        <div className="library-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: '#fff' }}>Libreria Salvata</h3>
          <div className="library-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="search-box" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.05)', minWidth: '350px' }}>
              <Search size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <input 
                type="text" 
                placeholder="Cerca risorse o tag..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', marginLeft: '8px', outline: 'none', fontSize: '0.9rem', width: '100%' }}
              />
            </div>
            
            <div className="filter-chips" style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '30px', padding: '4px', position: 'relative', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)', gap: 0 }}>
              {['all', 'video', 'web'].map(f => (
                <div 
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    position: 'relative', padding: '8px 20px', cursor: 'pointer', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {filter === f && (
                    <motion.div
                      layoutId="active-filter"
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 150, 255, 0.15)', borderRadius: '30px', border: '1px solid var(--accent)', boxShadow: '0 0 15px rgba(0, 150, 255, 0.2)' }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: filter === f ? '#fff' : 'rgba(255,255,255,0.5)', zIndex: 2, transition: 'color 0.3s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {f === 'video' && <Video size={14}/>}
                    {f === 'web' && <Globe size={14}/>}
                    {f === 'all' && "Tutti"}
                    {f === 'video' && "Video"}
                    {f === 'web' && "Web"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {loadingList ? (
          <div className="library-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
            <Loader2 className="spinner" size={20} style={{ color: 'var(--accent)' }} />
            Sincronizzazione col Vault...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="library-empty" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <BookOpen size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            Nessuna risorsa trovata per i criteri di ricerca.
          </div>
        ) : (
          <div className="resource-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredResources.map((res, idx) => (
              <motion.div 
                key={res.id || idx} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  setSelectedResource(res);
                  setChatInput("");
                }}
                style={{ 
                  cursor: 'pointer', background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px',
                  padding: '20px', transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)',
                  display: 'flex', flexDirection: 'column', gap: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0,150,255,0.3)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,150,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: res.type === 'video' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: res.type === 'video' ? '#ef4444' : '#3b82f6' }}>
                    {res.type === 'video' ? <Video size={18} /> : <Globe size={18} />}
                  </div>
                  <h4 title={res.title} style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.title}</h4>
                </div>
                {res.summary && <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{res.summary}</p>}
                {res.tags && (Array.isArray(res.tags) ? res.tags : res.tags.split(',')).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
                    {(Array.isArray(res.tags) ? res.tags : res.tags.split(',')).slice(0, 3).map(t => (
                      <span key={t.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600, padding: '4px 8px', background: 'rgba(59,130,246,0.1)', borderRadius: '20px', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 0 10px rgba(59,130,246,0.1)', backdropFilter: 'blur(10px)', whiteSpace: 'nowrap' }}><Tag size={10} style={{ color: '#3b82f6' }}/> {t.trim()}</span>
                    ))}
                    {(Array.isArray(res.tags) ? res.tags : res.tags.split(',')).length > 3 && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', padding: '4px' }}>+{(Array.isArray(res.tags) ? res.tags : res.tags.split(',')).length - 3}</span>}
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
              className={`resource-modal ${isFullscreenTranscript ? 'fullscreen-transcript' : ''}`} 
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
                    {selectedResource.tags && (Array.isArray(selectedResource.tags) ? selectedResource.tags : selectedResource.tags.split(',')).length > 0 ? (
                      (Array.isArray(selectedResource.tags) ? selectedResource.tags : selectedResource.tags.split(',')).map(t => (
                        <span key={t.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: '20px', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 0 10px rgba(59,130,246,0.1)', backdropFilter: 'blur(10px)', whiteSpace: 'nowrap', marginRight: '12px', marginBottom: '8px' }}>
                          <Tag size={12} style={{ color: '#3b82f6' }} />
                          {t.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/40 italic text-xs">Nessun tag</span>
                    )}
                  </div>
                </div>

                {/* TABS NAVIGATION */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '6px', position: 'relative', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)', gap: 0, marginBottom: '24px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'reader', label: 'Reader', icon: FileText, color: '#3b82f6' },
                    { id: 'connections', label: 'Connessioni', icon: Network, color: '#a855f7' },
                    { id: 'graph', label: 'Mini Grafo', icon: BrainCircuit, color: '#10b981' },
                    ...(selectedResource.type === 'video' ? [{ id: 'raw', label: 'Raw Transcript', icon: FileText, color: '#f43f5e' }] : [])
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <div 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          position: 'relative', padding: '10px 20px', cursor: 'pointer', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center'
                        }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-modal-tab"
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `rgba(${tab.color === '#3b82f6' ? '59,130,246' : tab.color === '#a855f7' ? '168,85,247' : tab.color === '#10b981' ? '16,185,129' : '244,63,94'}, 0.15)`, borderRadius: '12px', border: `1px solid ${tab.color}`, boxShadow: `0 0 15px rgba(${tab.color === '#3b82f6' ? '59,130,246' : tab.color === '#a855f7' ? '168,85,247' : tab.color === '#10b981' ? '16,185,129' : '244,63,94'}, 0.2)` }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.5)', zIndex: 2, transition: 'color 0.3s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={16} style={{ color: isActive ? tab.color : 'inherit' }} />
                          {tab.label}
                        </span>
                      </div>
                    );
                  })}
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
                          ) : selectedResource.type === 'document' ? (
                            <div className="web-preview-box" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
                              {attachmentUrl ? (
                                selectedResource.attachment_link?.toLowerCase().endsWith('.pdf') ? (
                                  <iframe 
                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(attachmentUrl)}&embedded=true`}
                                    className="w-full h-full"
                                    style={{ border: 'none' }}
                                  />
                                ) : selectedResource.attachment_link?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                                    <img src={attachmentUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                                    <FileText size={48} className="text-blue-500/50 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"/>
                                    <p className="text-white/80 font-medium">Documento Salvato</p>
                                  </div>
                                )
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                                  <Loader2 className="spinner mb-4 text-blue-500" size={32} />
                                  <p className="text-white/80 font-medium">Recupero file originale in corso...</p>
                                </div>
                              )}
                              
                              {attachmentUrl && (
                                <a 
                                  href={attachmentUrl} 
                                  download 
                                  target="_blank"
                                  rel="noreferrer"
                                  className="download-fab hover:scale-105 transition-transform"
                                  style={{
                                    position: 'absolute',
                                    bottom: '16px',
                                    right: '16px',
                                    background: '#3b82f6',
                                    color: '#fff',
                                    padding: '10px 16px',
                                    borderRadius: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                                    textDecoration: 'none',
                                    zIndex: 10
                                  }}
                                >
                                  <Download size={16} /> Scarica File
                                </a>
                              )}
                            </div>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h4 style={{ margin: 0 }}>
                              <FileText size={16} /> Appunti / Transcript
                            </h4>
                            <button 
                              onClick={() => setIsFullscreenTranscript(!isFullscreenTranscript)}
                              style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' }}
                            >
                              {isFullscreenTranscript ? <><Minimize size={14} /> Riduci</> : <><Maximize size={14} /> Espandi</>}
                            </button>
                          </div>
                          <div className="prose">
                            {/* Mockup for Timestamps if it's a video */}
                            {selectedResource.type === 'video' && (
                              <div className="timestamp-box">
                                <PlayCircle size={18} className="text-blue-400 shrink-0" />
                                <p style={{ margin: 0 }}>
                                  Clicca sui timestamp (es. <button onClick={() => setVideoTime(0)} className="timestamp-btn">00:00</button>) generati dall'IA qui sotto per saltare direttamente a quella parte del video.
                                </p>
                              </div>
                            )}
                            
                            {selectedResource.content ? (
                              <div 
                                className="prose markdown-body" 
                                dangerouslySetInnerHTML={{ 
                                  __html: (selectedResource.content.split('=== RAW_TRANSCRIPT ===')[0])
                                    .replace(/\[(\d+):(\d{2})\]/g, (match, m, s) => {
                                      const totalSeconds = parseInt(m) * 60 + parseInt(s);
                                      return `<button class="timestamp-btn" data-time="${totalSeconds}">${match}</button>`;
                                    })
                                    .replace(/\n/g, '<br/>')
                                    .replace(/## (.*?)(<br\/>|$)/g, '<h3>$1</h3>')
                                    .replace(/# (.*?)(<br\/>|$)/g, '<h2>$1</h2>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                }} 
                                onClick={(e) => {
                                  if (e.target.classList.contains('timestamp-btn')) {
                                    const time = parseInt(e.target.getAttribute('data-time'));
                                    setVideoTime(time);
                                  }
                                }}
                              />
                            ) : (
                              <p>{selectedResource.summary || "Riassunto non disponibile. Questa risorsa potrebbe essere stata salvata prima dell'aggiornamento."}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'connections' && (
                      <motion.div key="connections" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="mockup-view" style={{justifyContent: 'flex-start', textAlign: 'left', overflowY: 'auto', height: '100%', border: 'none', background: 'transparent'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
                          <Network size={32} className="text-purple-500" />
                          <h4 style={{margin: 0, color: '#fff', fontSize: '1.2rem'}}>Connessioni Neurali</h4>
                        </div>
                        <p style={{color: 'rgba(255,255,255,0.6)', marginBottom: '24px', maxWidth: '100%', marginLeft: 0}}>Risorse collegate a "{selectedResource.title}"</p>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                          {resources.filter(r => r.id !== selectedResource.id && (
                            (Array.isArray(r.tags) && Array.isArray(selectedResource.tags) && r.tags.some(t => selectedResource.tags.includes(t))) || 
                            (Array.isArray(r.topics) && Array.isArray(selectedResource.topics) && r.topics.some(t => selectedResource.topics.includes(t)))
                          )).slice(0, 5).map(r => (
                            <div key={r.id} style={{padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'}} onClick={() => setSelectedResource(r)}>
                              <h5 style={{color: '#60a5fa', margin: '0 0 8px 0', fontSize: '0.95rem'}}>{r.title}</h5>
                              <p style={{color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.85rem'}}>{r.summary}</p>
                            </div>
                          ))}
                          {resources.filter(r => r.id !== selectedResource.id && (
                            (Array.isArray(r.tags) && Array.isArray(selectedResource.tags) && r.tags.some(t => selectedResource.tags.includes(t))) || 
                            (Array.isArray(r.topics) && Array.isArray(selectedResource.topics) && r.topics.some(t => selectedResource.topics.includes(t)))
                          )).length === 0 && (
                            <p style={{color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', margin: 0}}>Nessuna connessione trovata.</p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'graph' && (
                      <motion.div key="graph" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', height: '100%', border: 'none', background: 'transparent', padding: 0, width: '100%'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 24px 0 24px', flexShrink: 0}}>
                          <Share2 size={32} className="text-green-500" />
                          <h4 style={{margin: 0, color: '#fff', fontSize: '1.2rem'}}>Topologia Neurale</h4>
                        </div>
                        <p style={{color: 'rgba(255,255,255,0.6)', padding: '0 24px', marginBottom: '12px', maxWidth: '100%', flexShrink: 0}}>Esplora visivamente i concetti e le risorse collegate interagendo con il grafo.</p>
                        <div ref={graphContainerRef} style={{flex: 1, height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex'}}>
                          <ForceGraph2D
                            width={graphDimensions.width || 600}
                            height={graphDimensions.height || 400}
                            graphData={(() => {
                              if (!selectedResource) return { nodes: [], links: [] };
                              const nodes = [{ id: selectedResource.id, name: selectedResource.title, val: 20, color: '#3b82f6' }];
                              const links = [];
                              const tags = Array.isArray(selectedResource.topics) ? selectedResource.topics : Array.isArray(selectedResource.tags) ? selectedResource.tags : [];
                              
                              tags.forEach(tag => {
                                const tagId = `tag_${tag}`;
                                nodes.push({ id: tagId, name: `#${tag}`, val: 10, color: '#10b981' });
                                links.push({ source: selectedResource.id, target: tagId });

                                resources.forEach(r => {
                                  if (r.id !== selectedResource.id) {
                                    const rTags = Array.isArray(r.topics) ? r.topics : Array.isArray(r.tags) ? r.tags : [];
                                    if (rTags.includes(tag)) {
                                      if (!nodes.find(n => n.id === r.id)) {
                                        nodes.push({ id: r.id, name: r.title.substring(0, 20) + '...', val: 5, color: '#8b5cf6' });
                                      }
                                      links.push({ source: tagId, target: r.id });
                                    }
                                  }
                                });
                              });
                              return { nodes, links };
                            })()}
                            ref={fgRef}
                            nodeLabel=""
                            nodeCanvasObject={(node, ctx, globalScale) => {
                              const label = node.name;
                              const fontSize = Math.max(12/globalScale, 2);
                              ctx.font = `${fontSize}px Sans-Serif`;
                              
                              const radius = node.val ? Math.sqrt(node.val) * 1.5 : 4;
                              
                              ctx.beginPath();
                              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                              ctx.fillStyle = node.color || '#ffffff';
                              ctx.fill();
                              
                              ctx.beginPath();
                              ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI, false);
                              ctx.strokeStyle = `${node.color || '#ffffff'}40`;
                              ctx.lineWidth = 1;
                              ctx.stroke();

                              if (globalScale > 1 || node.val === 20) {
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = node.val === 20 ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.6)';
                                ctx.fillText(label, node.x, node.y + radius + fontSize);
                              }
                            }}
                            linkColor={() => 'rgba(255,255,255,0.1)'}
                            linkWidth={0.5}
                            backgroundColor="transparent"
                            onNodeClick={node => {
                              if (node.id.startsWith('tag_')) return;
                              const res = resources.find(r => r.id === node.id);
                              if (res) setSelectedResource(res);
                            }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'raw' && (
                      <motion.div key="raw" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', textAlign: 'left', overflowY: 'auto', height: '100%', border: 'none', background: 'transparent', padding: 0}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '24px 24px 0 24px'}}>
                          <FileText size={32} className="text-rose-500" />
                          <h4 style={{margin: 0, color: '#fff', fontSize: '1.2rem'}}>Trascrizione Integrale</h4>
                        </div>
                        <div className="prose markdown-body" style={{fontSize: '0.9rem', lineHeight: 1.8, padding: '0 24px 24px 24px'}}
                          dangerouslySetInnerHTML={{ 
                            __html: selectedResource.content && selectedResource.content.includes('=== RAW_TRANSCRIPT ===')
                              ? selectedResource.content.split('=== RAW_TRANSCRIPT ===')[1].replace(/\[(\d+):(\d{2})\]/g, (match, m, s) => {
                                  const totalSeconds = parseInt(m) * 60 + parseInt(s);
                                  return `<button class="timestamp-btn" data-time="${totalSeconds}">${match}</button>`;
                                }).replace(/\n/g, '<br/>')
                              : "<p style='color: rgba(255,255,255,0.5); font-style: italic;'>Nessuna trascrizione integrale salvata per questo video. Ricrealo o aggiornalo.</p>"
                          }} 
                          onClick={(e) => {
                            if (e.target.classList.contains('timestamp-btn')) {
                              const time = parseInt(e.target.getAttribute('data-time'));
                              setVideoTime(time);
                            }
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="modal-right" style={{ flex: '1', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '30px' }}>
                <div className="modal-chat-header border-b border-white/10 pb-4 shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
                      <h4 className="font-semibold tracking-wide text-white">Focus Chat</h4>
                    </div>
                  </div>
                </div>

                <div className="chat-messages-scroll" style={{ minHeight: 0, flex: 1, overflowY: 'auto' }}>
                  {chatMessages.length === 0 ? (
                    <div className="empty-chat h-full flex flex-col items-center justify-center text-center px-4">
                      <MessageSquare size={32} className="text-blue-500/30 mb-3" />
                      <p className="text-white/40 text-sm">Fai una domanda a Friday riguardo a questa specifica risorsa.</p>
                      <p className="text-blue-400/60 text-xs mt-2">Contesto: {chatContext === 'resource' ? 'Solo questo documento' : 'Documento + Ricerca Web'}</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className="flex w-full mb-4" style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div className={`msg ${msg.role === 'user' ? 'user' : 'assistant'}`} style={{ 
                          position: 'relative',
                          background: msg.role === 'user' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 150, 255, 0.05)',
                          border: msg.role === 'user' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 150, 255, 0.2)',
                          padding: '16px 20px', 
                          borderRadius: '20px',
                          borderTopRightRadius: msg.role === 'user' ? '4px' : '20px',
                          borderTopLeftRadius: msg.role !== 'user' ? '4px' : '20px',
                          color: '#fff',
                          fontSize: '0.95rem', lineHeight: 1.6,
                          maxWidth: '85%',
                          boxShadow: msg.role === 'user' ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,150,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="msg-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#60a5fa' }}>
                              {msg.role === "user" ? <User size={12} /> : <BrainCircuit size={12} />}
                              {msg.role === "user" ? "Tu" : "Friday"}
                            </span>
                            {msg.timestamp && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>{msg.timestamp}</span>}
                          </div>
                          <div className="prose markdown-body" style={{ color: '#fff', fontSize: '0.95rem' }} dangerouslySetInnerHTML={{ __html: msg.text ? msg.text.replace(/\n/g, '<br/>') : '' }} />
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex w-full mb-4" style={{ justifyContent: 'flex-start' }}>
                      <div className="msg assistant" style={{ position: 'relative', padding: '16px 20px', borderRadius: '20px', borderTopLeftRadius: '4px', background: 'rgba(0, 150, 255, 0.05)', border: '1px solid rgba(0, 150, 255, 0.2)', color: '#5e9cff', display: 'flex', alignItems: 'center' }}>
                        <Loader2 size={16} className="spinner animate-spin" />
                        <span className="ml-2 text-xs font-medium opacity-70">Analizzando ({chatContext})...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <div className="chat-input-wrapper">
                    <div className="chat-context-selector">
                      <Globe size={14} className={chatContext === 'internet' ? 'text-blue-400' : 'text-gray-500'} />
                      <select 
                        value={chatContext} 
                        onChange={e => setChatContext(e.target.value)}
                      >
                        <option value="resource">Solo Risorsa</option>
                        <option value="internet">Web + Risorsa</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      placeholder={chatContext === 'resource' ? "Chiedi dettagli sulla risorsa..." : "Cerca online e nella risorsa..."}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                      disabled={isChatting}
                    />
                    <button 
                      type="button"
                      onClick={isRecordingDictation ? () => stopVoiceDictation(true) : startVoiceDictation} 
                      title={isRecordingDictation ? "Ferma e Invia" : "Dettatura Vocale"}
                      style={{ background: isRecordingDictation ? 'rgba(239,68,68,0.2)' : 'transparent', color: isRecordingDictation ? '#ef4444' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
                    >
                      <Mic size={16} className={isRecordingDictation ? "animate-pulse" : ""} />
                    </button>
                    <button 
                      type="button"
                      onClick={handleSendChat} 
                      disabled={isChatting || !chatInput.trim()}
                      style={{ marginLeft: '4px' }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
