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
        <div className="zen-orb-wrapper">
          <motion.div 
            className="zen-orb"
            animate={{ scale, opacity }}
            transition={{ duration: currentDuration, ease: "easeInOut" }}
          />
          <div className="zen-orb-core" />
        </div>
        
        <div className="zen-text-layer">
          <h3 className="zen-instruction">{currentPhaseName}</h3>
          {isRunning && <span className="zen-timer">{timeLeft}</span>}
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
