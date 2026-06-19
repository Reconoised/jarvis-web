"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Square, Wind } from "lucide-react";

const PATTERNS = {
  stress: { name: "Stress Relief", desc: "4-4-4-4", phases: [{name:"Inspira", time:4}, {name:"Trattieni", time:4}, {name:"Espira", time:4}, {name:"Pausa", time:4}] },
  relax: { name: "Rilassamento", desc: "4-7-8", phases: [{name:"Inspira", time:4}, {name:"Trattieni", time:7}, {name:"Espira", time:8}, {name:"Pausa", time:4}] },
  progressive: { name: "Progressivo", desc: "3-1-3-1", phases: [{name:"Inspira", time:3}, {name:"Trattieni", time:1}, {name:"Espira", time:3}, {name:"Pausa", time:1}] }
};

export default function MeditationView() {
  const [activePattern, setActivePattern] = useState("stress");
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef(null);

  const playChime = (phaseName) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Frequenze Zen (Solfeggio)
      const freqs = { "Inspira": 432, "Trattieni": 528, "Espira": 396, "Pausa": 396 };
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freqs[phaseName] || 432, ctx.currentTime);
      
      // Campana tibetana morbida (ADSR envelope)
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 3);
    } catch(e) {}
  };

  const startMeditation = () => {
    setIsRunning(true);
    setPhaseIndex(0);
    const pattern = PATTERNS[activePattern].phases;
    setTimeLeft(pattern[0].time);
    playChime(pattern[0].name);
  };

  const stopMeditation = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) return prev - 1;
        
        // Cambio fase
        const pattern = PATTERNS[activePattern].phases;
        const nextIndex = (phaseIndex + 1) % pattern.length;
        setPhaseIndex(nextIndex);
        playChime(pattern[nextIndex].name);
        return pattern[nextIndex].time;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRunning, activePattern, phaseIndex]);

  const currentPhaseName = isRunning ? PATTERNS[activePattern].phases[phaseIndex].name : "Respira.";
  
  // Animazione super fluida
  let scale = 1;
  let opacity = 0.5;
  if (isRunning) {
    if (currentPhaseName === "Inspira") { scale = 1.8; opacity = 0.9; }
    else if (currentPhaseName === "Espira") { scale = 0.6; opacity = 0.3; }
    else if (phaseIndex === 1) { scale = 1.8; opacity = 0.9; } // Trattieni (pieno)
    else { scale = 0.6; opacity = 0.3; } // Pausa (vuoto)
  }

  const currentDuration = isRunning ? PATTERNS[activePattern].phases[phaseIndex].time : 2;

  return (
    <div className="meditation-container">
      
      <div className="meditation-top">
        <div className="pattern-selectors">
          {Object.keys(PATTERNS).map(k => (
            <div 
              key={k} 
              className={`zen-pill ${activePattern === k ? "active" : ""}`}
              onClick={() => !isRunning && setActivePattern(k)}
              style={{ opacity: isRunning && activePattern !== k ? 0.3 : 1 }}
            >
              <span className="zen-name">{PATTERNS[k].name}</span>
              <span className="zen-desc">{PATTERNS[k].desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="meditation-center">
        <div className="zen-orb-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '240px', height: '240px' }}>
          
          <svg className="zen-progress-ring" viewBox="0 0 100 100" style={{position: 'absolute', width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none'}}>
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            {isRunning && (
              <motion.circle 
                cx="50" cy="50" r="48" 
                fill="none" stroke="var(--accent)" strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="301.59"
                initial={{ strokeDashoffset: 301.59 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: currentDuration, ease: "linear" }}
                key={phaseIndex}
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            )}
          </svg>

          <motion.div 
            className="zen-orb"
            animate={{ scale, opacity }}
            transition={{ duration: currentDuration, ease: "easeInOut" }}
            style={{ width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0,150,255,0.6) 0%, rgba(0,50,150,0) 70%)', borderRadius: '50%', position: 'absolute' }}
          />
          <style>{`
            @keyframes blob-morph {
              0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
              50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
              100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
            }
          `}</style>
          <div className="zen-orb-core" style={{ width: '80px', height: '80px', background: 'var(--accent)', animation: 'blob-morph 4s ease-in-out infinite', boxShadow: '0 0 30px var(--accent), inset 0 0 15px rgba(255,255,255,0.8)', position: 'absolute', zIndex: 2 }} />
          
          <div className="zen-text-layer" style={{ position: 'absolute', zIndex: 20, textAlign: 'center', pointerEvents: 'none' }}>
            <motion.h3 
              key={currentPhaseName}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="zen-instruction" 
              style={{ margin: 0, fontSize: '1rem', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
            >
              {currentPhaseName}
            </motion.h3>
            {isRunning && (
              <motion.span 
                key={timeLeft}
                initial={{ opacity: 0.5, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="zen-timer" 
                style={{ display: 'block', fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
              >
                {timeLeft}
              </motion.span>
            )}
          </div>
        </div>
      </div>

      <div className="meditation-bottom">
        {!isRunning ? (
          <button className="zen-btn play" onClick={startMeditation}>Inizia</button>
        ) : (
          <button className="zen-btn stop" onClick={stopMeditation}>Termina</button>
        )}
      </div>
    </div>
  );
}
