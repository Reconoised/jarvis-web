"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Square, Wind } from "lucide-react";

const PATTERNS = {
  stress: { name: "Stress Relief (4-4-4-4)", phases: [{name:"Inspira", time:4}, {name:"Trattieni", time:4}, {name:"Espira", time:4}, {name:"Pausa", time:4}] },
  relax: { name: "Rilassamento (4-7-8)", phases: [{name:"Inspira", time:4}, {name:"Trattieni", time:7}, {name:"Espira", time:8}, {name:"Pausa", time:4}] },
  progressive: { name: "Progressivo (3-1-3-1)", phases: [{name:"Inspira", time:3}, {name:"Trattieni", time:1}, {name:"Espira", time:3}, {name:"Pausa", time:1}] }
};

export default function MeditationView() {
  const [activePattern, setActivePattern] = useState("stress");
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.9; // Leggermente più lento per rilassamento
    utterance.pitch = 0.8;
    synthRef.current.speak(utterance);
  };

  const startMeditation = () => {
    setIsRunning(true);
    setPhaseIndex(0);
    const pattern = PATTERNS[activePattern].phases;
    setTimeLeft(pattern[0].time);
    speak(pattern[0].name);
  };

  const stopMeditation = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (synthRef.current) synthRef.current.cancel();
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
        speak(pattern[nextIndex].name);
        return pattern[nextIndex].time;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, activePattern, phaseIndex]);

  const currentPhaseName = isRunning ? PATTERNS[activePattern].phases[phaseIndex].name : "Pronto";
  
  // Calcolo Scala Orb
  let scale = 1;
  if (isRunning) {
    if (currentPhaseName === "Inspira") scale = 1.6;
    else if (currentPhaseName === "Espira") scale = 0.7;
    else if (phaseIndex === 1) scale = 1.6; // Trattieni dopo inspira (grande)
    else scale = 0.7; // Pausa dopo espira (piccolo)
  }

  const currentDuration = isRunning ? PATTERNS[activePattern].phases[phaseIndex].time : 1;

  return (
    <div className="meditation-container">
      <div className="meditation-header">
        <h2><Wind size={24} /> Respiro Guidato</h2>
        <div className="pattern-selectors">
          {Object.keys(PATTERNS).map(k => (
            <button 
              key={k} 
              className={`pattern-btn ${activePattern === k ? "active" : ""}`}
              onClick={() => !isRunning && setActivePattern(k)}
              disabled={isRunning}
            >
              {PATTERNS[k].name}
            </button>
          ))}
        </div>
      </div>

      <div className="meditation-orb-wrapper">
        <motion.div 
          className="breathing-orb"
          animate={{ scale }}
          transition={{ duration: currentDuration, ease: "easeInOut" }}
        />
        <div className="orb-text">
          <h3>{currentPhaseName}</h3>
          {isRunning && <span className="time-left">{timeLeft}s</span>}
        </div>
      </div>

      <div className="meditation-controls">
        {!isRunning ? (
          <button className="play-btn" onClick={startMeditation}><Play size={18} /> Inizia Sessione</button>
        ) : (
          <button className="stop-btn" onClick={stopMeditation}><Square size={18} /> Termina</button>
        )}
      </div>
    </div>
  );
}
